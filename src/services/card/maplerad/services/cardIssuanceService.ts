import {
  CardModel,
  TransactionModel,
  CustomerModel,
  CompanyModel,
  UserModel,
} from "@/models";
import fnOutput, { OutputProps } from "@/utils/shared/fnOutputHandler";
import mapleradUtils from "@/utils/cards/maplerad";
import {
  adaptMapleradFinalResponse,
  autoFillUserInfo,
  convertBrandToMapleradFormat,
  generateClientReference,
  validateRetailCardRequest,
} from "@/utils/cards/maplerad/tools";
import { v4 as uuidv4 } from "uuid";
import { utcToLocalTime } from "@/utils/date";

import webhookWaitingService from "./webhookWaitingService";
import { FeeCalculationService } from "./feeCalculationService";
import { NotificationService } from "./notificationService";
import { UnifiedWalletService } from "./walletService";
import { CustomerEnrollmentService } from "./customerEnrollmentService";
import { ErrorRecoveryService } from "./errorRecoveryService";
import { AdvancedFeeService } from "./advancedFeeService";
import { BalanceSyncService } from "./balanceSyncService";
import {
  CardIssuanceRequest,
  CardIssuanceContext,
  IssuanceStatus,
  NotificationContext,
  EmailContext,
  CardIssuanceError,
  WebhookTimeoutError,
} from "../types/cardIssuance.types";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
} from "../types/transaction.types";

/**
 * Main Card Issuance Service
 * Orchestrates the entire card issuance process using unified services
 */
export class CardIssuanceService {
  private status: IssuanceStatus = "INITIATED";

  /**
   * Main method to issue a retail card
   */
  static async issueRetailCard(
    request: CardIssuanceRequest
  ): Promise<OutputProps> {
    const service = new CardIssuanceService();
    return service.processCardIssuance(request);
  }

  /**
   * Process the complete card issuance workflow
   */
  private async processCardIssuance(
    request: CardIssuanceRequest
  ): Promise<OutputProps> {
    try {
      console.log("🚀 Starting card issuance process", {
        customerId: request.customerId,
        initialBalance: request.initialBalance,
        cardBrand: request.cardBrand,
      });

      this.status = "INITIATED";

      // 1. Prepare context with enhanced customer enrollment
      const context = await this.prepareContext(request);
      this.status = "FUNDS_RESERVED";

      // 2. Enhanced validation and fund reservation with auto-rollback
      await this.validateAndReserveFunds(context);

      let mapleradCallSucceeded = false;
      try {
        // 3. Create Maplerad card
        const cardResult = await this.createMapleradCard(context);
        mapleradCallSucceeded = true;
        this.status = "MAPLERAD_REQUESTED";

        // 4. Wait for webhook
        const webhookResult = await this.waitForWebhook(context);
        this.status = "WEBHOOK_RECEIVED";

        // 5. Process successful card creation
        const result = await this.processSuccessfulIssuance(
          context,
          webhookResult
        );
        this.status = "COMPLETED";

        return result;
      } catch (error: any) {
        // Enhanced error recovery strategy
        await this.handleEnhancedErrorRecovery(request, error, {
          apiCallSucceeded: mapleradCallSucceeded,
          reservedAmount: context.feeCalculation.totalFee,
          context,
        });
        throw error;
      }

      console.log("✅ Card issuance completed successfully", {
        cardId: result.output?.card?.id,
        reference: context.clientReference,
      });

      return result;
    } catch (error: any) {
      console.error("❌ Card issuance failed", {
        customerId: request.customerId,
        error: error.message,
        status: this.status,
      });

      // Handle failure and cleanup
      await this.handleIssuanceFailure(request, error);
      this.status = "FAILED";

      if (error instanceof CardIssuanceError) {
        return fnOutput.error({
          code: 400,
          error: { message: error.message },
        });
      }

      return fnOutput.error({
        error: { message: `Card issuance failed: ${error.message}` },
      });
    }
  }

  /**
   * Prepare the issuance context
   */
  private async prepareContext(
    request: CardIssuanceRequest
  ): Promise<CardIssuanceContext> {
    // Get customer and company information
    const customerResult = await CustomerModel.getOne({
      id: request.customerId,
    });
    if (customerResult.error) {
      throw new CardIssuanceError(
        `Customer not found: ${request.customerId}`,
        "CUSTOMER_NOT_FOUND"
      );
    }
    const customer = customerResult.output;

    const companyResult = await CompanyModel.getOne({
      id: customer.company_id,
    });
    if (companyResult.error) {
      throw new CardIssuanceError(
        `Company not found: ${customer.company_id}`,
        "COMPANY_NOT_FOUND"
      );
    }
    const company = companyResult.output;

    // Enhanced customer enrollment with KYC validation
    const enrollmentResult = await CustomerEnrollmentService.enrollCustomer({
      customerId: request.customerId,
      autoCreateIfMissing: true,
    });

    if (!enrollmentResult.success) {
      throw new CardIssuanceError(
        `Customer enrollment failed: ${enrollmentResult.errors?.join(", ")}`,
        "ENROLLMENT_FAILED",
        enrollmentResult.errors
      );
    }

    // Get company USD wallet
    const companyWallet = await UnifiedWalletService.getCompanyWallet(
      company.id,
      "USD"
    );

    // Auto-fill user information
    const completeDto = await autoFillUserInfo(request.customerId, {
      cardBrand: request.cardBrand,
      initialBalance: request.initialBalance,
      clientReference: request.clientReference,
      name: request.name,
      color: request.color,
    });

    // Validate request
    validateRetailCardRequest(completeDto);

    // Enhanced fee calculation with business rules
    const feeCalculation = await AdvancedFeeService.calculateAdvancedFees(
      company.id,
      request.initialBalance,
      "USD",
      "issuance",
      {
        customerId: request.customerId,
        isFirstCard: await this.isFirstCardForCustomer(request.customerId),
        cardType: "retail",
      }
    );

    // Convert to expected format for backward compatibility
    const compatibleFeeCalculation = {
      issuanceFee: feeCalculation.finalFee,
      totalFee: feeCalculation.breakdown.totalAmount,
      breakdown: {
        issuanceFee: feeCalculation.finalFee,
        initialBalance: request.initialBalance,
      },
    };

    const clientReference =
      request.clientReference ||
      generateClientReference("CARD_ISSUE_REFACTORED");

    return {
      customer,
      company,
      companyWallet,
      completeDto,
      feeCalculation,
      clientReference,
    };
  }

  /**
   * Validate and reserve funds
   */
  private async validateAndReserveFunds(
    context: CardIssuanceContext
  ): Promise<void> {
    const { companyWallet, feeCalculation, clientReference } = context;

    // Check wallet balance
    const hasSufficientFunds =
      await UnifiedWalletService.validateSufficientFunds(
        companyWallet.id,
        feeCalculation.totalFee
      );

    if (!hasSufficientFunds) {
      throw new CardIssuanceError(
        "Company USD wallet balance insufficient for this operation. Please top up your wallet.",
        "INSUFFICIENT_FUNDS",
        {
          walletId: companyWallet.id,
          required: feeCalculation.totalFee,
          available: companyWallet.balance,
        }
      );
    }

    // Reserve funds
    await UnifiedWalletService.reserveFunds(
      companyWallet.id,
      feeCalculation.totalFee,
      `Card issuance reservation for customer ${context.customer.first_name} ${context.customer.last_name}`,
      clientReference
    );

    console.log("💰 Funds reserved successfully", {
      walletId: companyWallet.id,
      amount: feeCalculation.totalFee,
      reference: clientReference,
    });
  }

  /**
   * Create card via Maplerad API
   */
  private async createMapleradCard(context: CardIssuanceContext): Promise<any> {
    const { customer, completeDto, clientReference } = context;

    // Ensure Maplerad customer exists
    const customerIdResult = await this.ensureMapleradCustomer(customer);
    if (customerIdResult.error) {
      throw customerIdResult.error;
    }
    const mapleradCustomerId = customerIdResult.output;

    // Prepare card data
    const cardData = {
      customer_id: mapleradCustomerId,
      currency: "USD",
      type: "VIRTUAL",
      auto_approve: true,
      brand: convertBrandToMapleradFormat(completeDto.cardBrand),
      amount: Math.round(completeDto.initialBalance * 100), // Convert to cents
    };

    // Create card via Maplerad
    const mapleradResponseResult = await mapleradUtils.createCard(cardData);
    if (mapleradResponseResult.error) {
      throw mapleradResponseResult.error;
    }

    const mapleradResponse = mapleradResponseResult.output;
    const mapleradReference = mapleradResponse.data?.reference;

    if (!mapleradReference) {
      throw new CardIssuanceError(
        "Maplerad reference missing in response",
        "MISSING_REFERENCE"
      );
    }

    console.log("✅ Maplerad card creation initiated", {
      reference: mapleradReference,
      customerId: mapleradCustomerId,
      clientReference,
    });

    return { mapleradReference, mapleradCustomerId };
  }

  /**
   * Wait for webhook confirmation
   */
  private async waitForWebhook(context: CardIssuanceContext): Promise<any> {
    const { clientReference } = context;

    console.log("⏳ Waiting for Maplerad webhook", {
      reference: clientReference,
      timeout: 600000, // 10 minutes
    });

    const webhookResult = await webhookWaitingService.waitForWebhook(
      clientReference,
      600000
    );

    if (!webhookResult.success) {
      if (webhookResult.timeout) {
        throw new WebhookTimeoutError(clientReference, 600000);
      }
      throw new CardIssuanceError(
        webhookResult.error || "Failed to create card via webhook",
        "WEBHOOK_FAILED"
      );
    }

    if (!webhookResult.data?.card) {
      throw new CardIssuanceError(
        "Card data missing in webhook response",
        "MISSING_CARD_DATA"
      );
    }

    console.log("🎉 Webhook received - card created successfully", {
      reference: clientReference,
      cardId: webhookResult.data.card.id,
    });

    return webhookResult;
  }

  /**
   * Process successful card issuance
   */
  private async processSuccessfulIssuance(
    context: CardIssuanceContext,
    webhookResult: any
  ): Promise<OutputProps> {
    const {
      customer,
      company,
      companyWallet,
      completeDto,
      feeCalculation,
      clientReference,
    } = context;
    const finalCard = webhookResult.data.card;

    // Adapt response
    const response = adaptMapleradFinalResponse(finalCard, feeCalculation);

    // Create card in local database
    const cardId = uuidv4();
    const savedCard = await this.createLocalCard(cardId, context, finalCard);

    // Create transactions and balance records
    const transactionId = uuidv4();
    await this.createTransactionsAndRecords(
      transactionId,
      context,
      cardId,
      savedCard
    );

    // Update wallet balance
    const updatedWalletBalance =
      Number(companyWallet.balance) - feeCalculation.totalFee;
    await UnifiedWalletService.updateBalance(
      companyWallet.id,
      updatedWalletBalance
    );

    // Send notifications
    await this.sendSuccessNotifications(context, savedCard);

    return fnOutput.success({
      output: {
        card: savedCard,
        message: "Card issued successfully!",
        autoFilledFields: Object.keys(completeDto).filter(
          (key) =>
            !Object.keys(context.completeDto).includes(key) ||
            context.completeDto[key] === undefined
        ),
        companyWalletBalance: updatedWalletBalance,
      },
    });
  }

  /**
   * Create card in local database
   */
  private async createLocalCard(
    cardId: string,
    context: CardIssuanceContext,
    finalCard: any
  ): Promise<any> {
    const { customer, company, completeDto } = context;

    const newCardResult = await CardModel.create({
      id: cardId,
      company_id: company.id,
      customer_id: customer.id,
      status: finalCard.status?.toUpperCase() || "ACTIVE",
      balance: finalCard.balance || completeDto.initialBalance,
      number: "****",
      cvv: "***",
      expiry_month: 12,
      expiry_year: 2029,
      currency: "USD",
      country: customer.country,
      country_iso_code: customer.country_iso_code,
      provider_card_id: finalCard.id,
      masked_number: `${finalCard.firstSix}****${finalCard.lastFour}`,
      name: completeDto.name || `${customer.first_name} ${customer.last_name}`,
      provider: "maplerad",
      brand: finalCard.brand?.toUpperCase(),
      is_active: true,
      is_virtual: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (newCardResult.error) {
      console.error("❌ Error creating card in local DB:", newCardResult.error);
      throw new CardIssuanceError(
        "Failed to save card in local database",
        "DATABASE_ERROR",
        newCardResult.error
      );
    }

    return newCardResult.output;
  }

  /**
   * Create transactions and balance records
   */
  private async createTransactionsAndRecords(
    transactionId: string,
    context: CardIssuanceContext,
    cardId: string,
    savedCard: any
  ): Promise<void> {
    const {
      customer,
      company,
      companyWallet,
      feeCalculation,
      clientReference,
    } = context;

    // Create main transaction
    const transactionResult = await TransactionModel.create({
      id: transactionId,
      company_id: company.id,
      customer_id: customer.id,
      wallet_id: companyWallet.id,
      card_id: cardId,
      category: TRANSACTION_CATEGORY.CARD,
      type: TRANSACTION_TYPE.CARD_ISSUANCE_FIRST,
      status: TRANSACTION_STATUS.SUCCESS,
      description: `Card issuance for ${customer.first_name} ${customer.last_name}`,
      amount: feeCalculation.totalFee,
      currency: "USD",
      fee_amount: feeCalculation.issuanceFee,
      net_amount: context.completeDto.initialBalance,
      reference: clientReference,
      created_at: utcToLocalTime(new Date())?.toISOString(),
      updated_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (transactionResult.error) {
      throw new CardIssuanceError(
        "Failed to create transaction",
        "TRANSACTION_ERROR",
        transactionResult.error
      );
    }

    // Create balance records
    const originalWalletBalance = Number(companyWallet.balance);

    await UnifiedWalletService.createBalanceRecord(
      transactionId,
      "wallet",
      companyWallet.id,
      originalWalletBalance,
      originalWalletBalance - feeCalculation.totalFee,
      -feeCalculation.totalFee,
      "USD",
      "debit",
      `Card issuance fee and initial balance debit`
    );

    await UnifiedWalletService.createBalanceRecord(
      transactionId,
      "card",
      cardId,
      0,
      context.completeDto.initialBalance,
      context.completeDto.initialBalance,
      "USD",
      "credit",
      `Initial card balance credit`
    );
  }

  /**
   * Send success notifications
   */
  private async sendSuccessNotifications(
    context: CardIssuanceContext,
    savedCard: any
  ): Promise<void> {
    const { customer, company, completeDto, clientReference } = context;

    // Send notification
    const notificationContext: NotificationContext = {
      customerId: customer.id,
      companyId: company.id,
      cardId: savedCard?.id,
      amount: completeDto.initialBalance,
      currency: "USD",
      reference: clientReference,
    };

    await NotificationService.sendCardIssuanceSuccessNotification(
      notificationContext
    );

    // Send email
    if (company.email) {
      const emailContext: EmailContext = {
        company,
        customer,
        card: savedCard,
        amount: completeDto.initialBalance,
        currency: "USD",
        reference: clientReference,
      };

      await NotificationService.sendCardCreationEmail(emailContext);
    }
  }

  /**
   * Handle issuance failure and cleanup
   */
  private async handleIssuanceFailure(
    request: CardIssuanceRequest,
    error: any
  ): Promise<void> {
    try {
      // Get context for cleanup
      const context = await this.prepareContext(request);

      // Refund funds if they were reserved
      if (
        this.status === "FUNDS_RESERVED" ||
        this.status === "MAPLERAD_REQUESTED"
      ) {
        console.warn("💸 Refunding reserved funds due to failure", {
          walletId: context.companyWallet.id,
          amount: context.feeCalculation.totalFee,
          reference: context.clientReference,
          error: error.message,
        });

        await UnifiedWalletService.refundFunds(
          context.companyWallet.id,
          context.feeCalculation.totalFee,
          context.clientReference,
          error.message
        );
      }

      // Send failure notification
      const notificationContext: NotificationContext = {
        customerId: request.customerId,
        companyId: context.company.id,
        amount: request.initialBalance,
        currency: "USD",
        reference: context.clientReference,
      };

      await NotificationService.sendCardIssuanceFailureNotification(
        notificationContext,
        error.message
      );
    } catch (cleanupError: any) {
      console.error("❌ Error during failure cleanup:", cleanupError);
    }
  }

  /**
   * Ensure Maplerad customer exists
   */
  private async ensureMapleradCustomer(customer: any): Promise<OutputProps> {
    // This would implement the logic to create or get existing Maplerad customer
    // For now, return a mock customer ID
    return fnOutput.success({
      output: customer.sudo_customer_id || `maplerad_${customer.id}`,
    });
  }
}
