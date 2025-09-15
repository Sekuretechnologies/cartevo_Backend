import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CardStatus, Customer } from "@prisma/client";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import { v4 as uuidv4 } from "uuid";
import {
  decodeText,
  encodeText,
  signToken,
  decodeToken,
} from "@/utils/shared/encryption";
import { utcToLocalTime } from "@/utils/date";
import { CreateCardDto } from "../dto/create-card.dto";
import { MapleradUtils } from "../utils/maplerad.utils";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import BalanceTransactionRecordModel from "@/models/prisma/balanceTransactionRecordModel";
import { TransactionCategory, TransactionType } from "@/types";
import { CustomerProviderMappingModel } from "@/models";
import { getFormattedDate } from "@/utils/shared/common";

/**
 * Advanced Card Issuance Service for Maplerad
 * Implements sophisticated card creation with auto-fill, secure fund reservation,
 * webhook waiting, and comprehensive error recovery
 */
@Injectable()
export class CardIssuanceService {
  private readonly logger = new Logger(CardIssuanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Issue a retail Maplerad card with advanced features
   */
  async issueRetailCard(
    createCardDto: CreateCardDto,
    user: CurrentUserData
  ): Promise<any> {
    this.logger.log("🚀 ADVANCED MAPLERAD CARD CREATION FLOW - START", {
      customerId: createCardDto.customer_id,
      brand: createCardDto.brand,
      amount: createCardDto.amount,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Auto-fill and validate customer data
      const completeDto = await this.autoFillUserInfo(
        createCardDto.customer_id,
        createCardDto
      );

      // 2. Validate business rules
      await this.validateRetailCardRequest(completeDto, user);

      // 3. Calculate fees with business rules
      const feeCalculation = await this.calculateCardFees(
        createCardDto.customer_id,
        completeDto.amount,
        user.companyId
      );

      // 4. Get customer and company data
      const customer = await this.getCustomerData(createCardDto.customer_id);
      const company = await this.getCompanyData(user.companyId);

      // 5. Secure fund reservation before external API calls
      const originalBalance = await this.reserveFundsSecurely(
        user.companyId,
        feeCalculation.totalAmount,
        `Card issuance reservation for ${customer.first_name} ${customer.last_name}`
      );

      let mapleradCallSucceeded = false;
      let cardResult: any = null;

      try {
        // 6. Ensure Maplerad customer exists
        const mapleradCustomerId = await this.ensureMapleradCustomer(
          customer,
          user.companyId
        );

        // 7. Create card via Maplerad API
        cardResult = await this.createMapleradCard(
          mapleradCustomerId,
          completeDto
        );
        mapleradCallSucceeded = true;

        // 8. Save metadata for webhook tracking
        await this.saveCardCreationMetadata(
          cardResult.reference,
          createCardDto.customer_id,
          feeCalculation,
          completeDto,
          `CARD_${Date.now()}`,
          mapleradCustomerId
        );

        // 9. Wait for webhook confirmation
        const webhookResult = await this.waitForCardCreationWebhook(
          cardResult.reference
        );

        // 9. Process successful creation
        const result = await this.processSuccessfulCardCreation(
          webhookResult,
          customer,
          company,
          completeDto,
          feeCalculation,
          originalBalance
        );

        this.logger.log("🎉 ADVANCED MAPLERAD CARD CREATION FLOW - COMPLETED", {
          cardId: result.card.id,
          customerId: customer.id,
          success: true,
        });

        return result;
      } catch (error: any) {
        // Handle different error scenarios
        await this.handleCardCreationError(
          error,
          mapleradCallSucceeded,
          feeCalculation.totalAmount,
          customer,
          user.companyId
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD CREATION FAILED", {
        customerId: createCardDto.customer_id,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card creation failed: ${error.message}`);
    }
  }

  /**
   * Auto-fill user information from database
   */
  private async autoFillUserInfo(
    customerId: string,
    partialDto: Partial<CreateCardDto>
  ): Promise<CreateCardDto> {
    const customerResult = await CustomerModel.getOne({ id: customerId });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    const customer = customerResult.output;

    // Build complete DTO with auto-filled fields
    const completeDto: CreateCardDto = {
      customer_id: customerId,
      brand: partialDto.brand || "VISA",
      amount: partialDto.amount || 2, // Minimum amount
      name_on_card:
        partialDto.name_on_card ||
        `${customer.first_name} ${customer.last_name}`.toUpperCase(),
    };

    this.logger.debug("Auto-filled card creation data", {
      customerId,
      originalFields: Object.keys(partialDto),
      autoFilledFields: Object.keys(completeDto).filter(
        (key) =>
          !Object.keys(partialDto).includes(key) ||
          partialDto[key as keyof CreateCardDto] === undefined
      ),
    });

    return completeDto;
  }

  /**
   * Validate retail card request
   */
  private async validateRetailCardRequest(
    dto: CreateCardDto,
    user: CurrentUserData
  ): Promise<void> {
    // Validate customer exists and belongs to company
    const customerResult = await CustomerModel.getOne({
      id: dto.customer_id,
    });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    const customer = customerResult.output;

    if (customer.company_id !== user.companyId) {
      throw new BadRequestException("Access denied to customer");
    }

    // Validate customer age (18+)
    const actualDate = new Date(Date.now() + 3600 * 1000);
    const birthdate: any = customer.date_of_birth;
    const differenceEnMilliseconds =
      actualDate.getTime() - new Date(birthdate).getTime();
    const age = Math.floor(
      differenceEnMilliseconds / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (age < 18) {
      throw new BadRequestException("Customer must be at least 18 years old");
    }

    // Check card limit (max 5 cards per customer)
    const cardSizeResult = await CardModel.count({
      customer_id: dto.customer_id,
      status: { not: CardStatus.TERMINATED },
      company_id: user.companyId,
    });
    const cardSize = Number(cardSizeResult.output || 0);

    if (cardSize >= 5) {
      throw new BadRequestException("Maximum 5 cards allowed per customer");
    }

    // Validate amount (minimum 2 USD)
    if (dto.amount < 2) {
      throw new BadRequestException("Minimum card funding amount is 2 USD");
    }

    // Validate brand
    const validBrands = ["VISA", "MASTERCARD"];
    if (!validBrands.includes(dto.brand.toUpperCase())) {
      throw new BadRequestException("Brand must be VISA or MASTERCARD");
    }
  }

  /**
   * Calculate card fees using TransactionFeeModel with business rules
   */
  private async calculateCardFees(
    customerId: string,
    amount: number,
    companyId: string
  ): Promise<{
    issuanceFee: number;
    fundFee: number;
    withdrawFee: number;
    totalAmount: number;
    isFirstCard: boolean;
    paymentSuccessFees?: Map<string, any>;
    paymentFailureFees?: Map<string, any>;
  }> {
    try {
      // Get card purchase fees from TransactionFeeModel
      const feesResult = await TransactionFeeModel.get({
        company_id: companyId,
        transaction_category: TransactionCategory.CARD,
        transaction_type: {
          in: [
            TransactionType.ISSUANCE,
            TransactionType.FUND,
            TransactionType.WITHDRAW,
            TransactionType.PAYMENT_SUCCESS_FEE,
            TransactionType.PAYMENT_FAILURE_FEE,
          ],
        },
        currency: "USD",
      });

      if (feesResult.output) {
        const fees: any[] = feesResult.output;
        const issuanceFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.ISSUANCE
        );
        const fundFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.FUND
        );
        const withdrawFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.WITHDRAW
        );

        const paymentSuccessFee = fees.filter(
          (fee) => fee.transaction_type === TransactionType.PAYMENT_SUCCESS_FEE
        );
        const paymentSuccessFeeMap = new Map<string, any>();
        paymentSuccessFee.forEach((payFee) => {
          const normalizedPayFee = {
            type: payFee.type,
            value: payFee.value,
            range_min: payFee.range_min,
            range_max: payFee.range_max,
            currency: payFee.currency,
          };
          paymentSuccessFeeMap.set(
            `${payFee.range_min}_${payFee.range_max}`,
            normalizedPayFee
          );
        });

        const paymentFailureFee = fees.filter(
          (fee) =>
            fee.transaction_type === TransactionType.PAYMENT_FAILURE_FEE &&
            fee.type === "RANGE"
        );
        const paymentFailureFeeMap = new Map<string, any>();
        paymentFailureFee.forEach((payFee) => {
          const normalizedPayFee = {
            type: payFee.type,
            value: payFee.value,
            range_min: payFee.range_min,
            range_max: payFee.range_max,
            currency: payFee.currency,
          };
          paymentFailureFeeMap.set(
            `${payFee.range_min}_${payFee.range_max}`,
            normalizedPayFee
          );
        });

        // Check if this is the customer's first card
        const existingCardsResult = await CardModel.count({
          customer_id: customerId,
          company_id: companyId,
        });
        const isFirstCard = Number(existingCardsResult.output || 0) === 0;

        const issuanceFee =
          issuanceFeeRecord?.type === "FIXED"
            ? parseFloat(issuanceFeeRecord?.value?.toString())
            : 1;
        const fundFee =
          fundFeeRecord?.type === "FIXED"
            ? parseFloat(fundFeeRecord?.value?.toString())
            : 0.5;
        const withdrawFee =
          withdrawFeeRecord?.type === "FIXED"
            ? parseFloat(withdrawFeeRecord?.value?.toString())
            : 0.5;

        const totalAmount = issuanceFee + amount;

        this.logger.debug("Calculated card fees using TransactionFeeModel", {
          customerId,
          amount,
          issuanceFee,
          fundFee,
          withdrawFee,
          totalAmount,
          isFirstCard,
          paymentSuccessFeesCount: paymentSuccessFeeMap.size,
          paymentFailureFeesCount: paymentFailureFeeMap.size,
        });

        return {
          issuanceFee,
          fundFee,
          withdrawFee,
          totalAmount,
          isFirstCard,
          paymentSuccessFees: paymentSuccessFeeMap,
          paymentFailureFees: paymentFailureFeeMap,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to get card fees from database:`, error);
    }

    // Fallback to default fees if TransactionFeeModel fails
    // Check if this is the customer's first card
    const existingCardsResult = await CardModel.count({
      customer_id: customerId,
      company_id: companyId,
    });
    const isFirstCard = Number(existingCardsResult.output || 0) === 0;

    const issuanceFee = 1; // USD
    const fundFee = 0.5; // USD
    const withdrawFee = 0.5; // USD
    const totalAmount = issuanceFee + amount;

    this.logger.debug("Using fallback card fees", {
      customerId,
      amount,
      issuanceFee,
      fundFee,
      withdrawFee,
      totalAmount,
      isFirstCard,
    });

    return {
      issuanceFee,
      fundFee,
      withdrawFee,
      totalAmount,
      isFirstCard,
    };
  }

  /**
   * Get customer data
   */
  private async getCustomerData(customerId: string): Promise<any> {
    const customerResult = await CustomerModel.getOne({ id: customerId });
    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }
    return customerResult.output;
  }

  /**
   * Get company data
   */
  private async getCompanyData(companyId: string): Promise<any> {
    const companyResult = await CompanyModel.getOne({ id: companyId });
    if (companyResult.error || !companyResult.output) {
      throw new NotFoundException("Company not found");
    }
    return companyResult.output;
  }

  /**
   * Secure fund reservation before external API calls
   */
  private async reserveFundsSecurely(
    companyId: string,
    amount: number,
    description: string
  ): Promise<number> {
    // Get USD wallet
    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      active: true,
    });
    if (usdWalletResult.error || !usdWalletResult.output) {
      throw new BadRequestException("USD wallet not found");
    }
    const usdWallet = usdWalletResult.output;

    const walletBalance = usdWallet.balance.toNumber();

    // Check sufficient balance
    if (walletBalance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Required: $${amount}, Available: $${walletBalance}`
      );
    }

    // Reserve funds by updating wallet balance
    const newBalance = walletBalance - amount;
    await WalletModel.update(usdWallet.id, { balance: newBalance });

    this.logger.debug("Funds reserved securely", {
      companyId,
      amount,
      previousBalance: walletBalance,
      newBalance,
      description,
    });

    return walletBalance; // Return original balance
  }

  /**
   * Ensure Maplerad customer exists
   */
  private async ensureMapleradCustomer(
    customer: Customer,
    companyId: string
  ): Promise<string> {
    const mapleradCustomerResult = await CustomerProviderMappingModel.getOne({
      customer_id: customer.id,
      provider_name: "maplerad",
    });
    let mapleradCustomerId =
      mapleradCustomerResult.output?.provider_customer_id;

    this.logger.debug("Maplerad customer found", {
      mapleradCustomerResult,
      mapleradCustomerId,
    });

    if (!mapleradCustomerId) {
      // Create Maplerad customer
      const customerData = {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        country: customer.country_iso_code,
        identification_number: customer.identification_number,
        dob: getFormattedDate(new Date(customer.date_of_birth)),
        phone: {
          phone_country_code: customer.country_phone_code,
          phone_number: customer.phone_number,
        },
        identity: {
          type: customer.id_document_type,
          image: customer.id_document_front,
          number: customer.identification_number,
          country: customer.country_iso_code,
        },
        address: {
          street: customer.street || "",
          city: customer.city || "",
          state: customer.state || "",
          country: customer.country_iso_code,
          postal_code: customer.postal_code || "00000",
        },
      };

      const enrollmentResult = await MapleradUtils.createCustomer(customerData);

      if (enrollmentResult.error) {
        this.logger.error("Failed to create Maplerad customer", {
          customerId: customer.id,
          error: enrollmentResult.error.message,
        });
        throw new BadRequestException(
          "Failed to enroll customer in Maplerad: " +
            enrollmentResult.error.message
        );
      }

      mapleradCustomerId = enrollmentResult.output.id;

      // Update local customer record
      // await CustomerModel.update(customer.id, {
      //   maplerad_customer_id: mapleradCustomerId,
      // });
      await CustomerProviderMappingModel.create({
        customer_id: customer.id,
        provider_customer_id: mapleradCustomerId,
        provider_name: "maplerad",
      });

      this.logger.debug("Maplerad customer created", {
        customerId: customer.id,
        mapleradCustomerId,
      });
    }

    return mapleradCustomerId;
  }

  /**
   * Create card via Maplerad API
   */
  private async createMapleradCard(
    mapleradCustomerId: string,
    dto: CreateCardDto
  ): Promise<any> {
    const mapleradBrand = dto.brand === "MASTERCARD" ? "mastercard" : "visa";
    const cardData = {
      customer_id: mapleradCustomerId,
      currency: "USD",
      type: "virtual",
      brand: mapleradBrand,
      amount: Math.round(dto.amount * 100), // Convert to cents
    };

    this.logger.debug("Creating Maplerad card", {
      customerId: mapleradCustomerId,
      brand: mapleradBrand,
      amount: cardData.amount,
    });

    const cardResult = await MapleradUtils.createCard(cardData);

    if (cardResult.error) {
      this.logger.error("Maplerad card creation failed", {
        error: cardResult.error.message,
      });
      throw new BadRequestException(
        "Failed to create card: " + cardResult.error.message
      );
    }

    const mapleradCard = cardResult.output;
    this.logger.log("Maplerad card creation initiated", {
      cardId: mapleradCard.id,
      reference: mapleradCard.reference,
    });

    return mapleradCard;
  }

  /**
   * Wait for card creation webhook
   */
  private async waitForCardCreationWebhook(reference: string): Promise<any> {
    // For now, simulate webhook waiting
    // In production, this would wait for actual webhook
    this.logger.log("Waiting for Maplerad webhook", {
      reference,
      timeout: 60000, // 1 minute for demo
    });

    // Simulate webhook delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For demo purposes, return a mock successful webhook result
    // In production, this would be handled by the webhook service
    return {
      success: true,
      data: {
        card: {
          id: reference, // Use reference as temporary ID
          status: "ACTIVE",
          balance: 0, // Will be updated when actual webhook arrives
          maskedPan: "411111******1111",
          last4: "1111",
          expiryMonth: 12,
          expiryYear: 2029,
          brand: "VISA",
        },
      },
    };
  }

  /**
   * Process successful card creation
   */
  private async processSuccessfulCardCreation(
    webhookResult: any,
    customer: any,
    company: any,
    dto: CreateCardDto,
    feeCalculation: any,
    originalBalance: number
  ): Promise<any> {
    const finalCard = webhookResult.data.card;

    // Create local card record
    const cardId = uuidv4();
    const savedCard = await this.createLocalCardRecord(
      cardId,
      customer,
      company,
      dto,
      finalCard
    );

    // Create transactions
    await this.createCardTransactions(
      cardId,
      customer,
      company,
      dto,
      feeCalculation,
      originalBalance
    );

    // Log success
    await this.logCardCreationSuccess(cardId, customer, dto, feeCalculation);

    return {
      status: "success",
      message: feeCalculation.isFirstCard
        ? "First card created successfully!"
        : "Card created successfully!",
      card: {
        id: cardId,
        customer_id: customer.id,
        status: "ACTIVE",
        balance: dto.amount,
        masked_number: savedCard.masked_number,
        last4: savedCard.last4,
        expiry_month: savedCard.expiry_month,
        expiry_year: savedCard.expiry_year,
        brand: dto.brand,
        currency: "USD",
        created_at: new Date(),
      },
      autoFilledFields: [], // Could track which fields were auto-filled
    };
  }

  /**
   * Create local card record
   */
  private async createLocalCardRecord(
    cardId: string,
    customer: any,
    company: any,
    dto: CreateCardDto,
    finalCard: any
  ): Promise<any> {
    // Encrypt sensitive data
    const encryptedCardNumber = signToken(finalCard.cardNumber || "***");
    const encryptedCvv = signToken(finalCard.cvv || "***");

    const newCardResult = await CardModel.create({
      id: cardId,
      status: "ACTIVE",
      customer_id: customer.id,
      company_id: customer.company_id,
      country: customer.country_iso_code,
      brand: dto.brand,
      provider: encodeText("maplerad"),
      currency: "USD",
      name: dto.name_on_card,
      balance: dto.amount,
      reference: finalCard.id,
      provider_card_id: finalCard.id,
      number: `tkMplr_${encryptedCardNumber}`,
      masked_number:
        finalCard.maskedPan || `****-****-****-${finalCard.last4 || "****"}`,
      last4: finalCard.last4,
      cvv: `tkMplr_${encryptedCvv}`,
      expiry_month: finalCard.expiryMonth || 12,
      expiry_year: finalCard.expiryYear || 2029,
      postal_code: customer.postal_code || "00000",
      street: customer.address || "",
      city: customer.city || "",
      state_code: customer.state || "",
      country_iso_code: customer.country_iso_code,
      is_active: true,
      is_virtual: true,
    });

    if (newCardResult.error) {
      this.logger.error("Local card creation error", {
        error: newCardResult.error,
      });
      throw new BadRequestException("Failed to save card locally");
    }

    return newCardResult.output;
  }

  /**
   * Create card transactions with balance transaction records
   */
  private async createCardTransactions(
    cardId: string,
    customer: any,
    company: any,
    dto: CreateCardDto,
    feeCalculation: any,
    originalBalance: number
  ): Promise<void> {
    // Get USD wallet for balance transaction records
    const usdWalletResult = await WalletModel.getOne({
      company_id: company.id,
      currency: "USD",
      active: true,
    });
    if (usdWalletResult.error || !usdWalletResult.output) {
      throw new BadRequestException(
        "USD wallet not found for balance tracking"
      );
    }
    const usdWallet = usdWalletResult.output;

    const transactionId = uuidv4();

    // Card creation fee transaction
    const feeTransactionResult = await TransactionModel.create({
      id: transactionId,
      status: "PENDING",
      category: "CARD",
      type: "PURCHASE",
      amount: feeCalculation.issuanceFee,
      currency: "USD",
      customer_id: customer.id,
      company_id: customer.company_id,
      card_id: cardId,
      card_balance_before: 0,
      card_balance_after: 0,
      wallet_balance_before: originalBalance,
      wallet_balance_after: originalBalance - feeCalculation.issuanceFee,
      provider: encodeText("maplerad"),
      description: "Card creation fee",
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (feeTransactionResult.error) {
      throw new BadRequestException("Failed to create fee transaction");
    }

    // Create balance transaction record for wallet (fee debit)
    await BalanceTransactionRecordModel.create({
      transaction_id: transactionId,
      entity_type: "wallet",
      entity_id: usdWallet.id,
      old_balance: originalBalance,
      new_balance: originalBalance - feeCalculation.issuanceFee,
      amount_changed: -feeCalculation.issuanceFee, // Negative for debit
      currency: "USD",
      change_type: "debit",
      description: "Card creation fee debit from wallet",
    });

    // Card funding transaction
    const fundingTransactionId = uuidv4();
    const fundingTransactionResult = await TransactionModel.create({
      id: fundingTransactionId,
      status: "PENDING",
      category: "CARD",
      type: "FUND",
      amount: dto.amount,
      currency: "USD",
      customer_id: customer.id,
      company_id: customer.company_id,
      card_id: cardId,
      card_balance_before: 0,
      card_balance_after: dto.amount,
      wallet_balance_before: originalBalance - feeCalculation.issuanceFee,
      wallet_balance_after: originalBalance - feeCalculation.totalAmount,
      provider: encodeText("maplerad"),
      description: "Initial card funding",
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (fundingTransactionResult.error) {
      throw new BadRequestException("Failed to create funding transaction");
    }

    // Create balance transaction record for wallet (funding debit)
    await BalanceTransactionRecordModel.create({
      transaction_id: fundingTransactionId,
      entity_type: "wallet",
      entity_id: usdWallet.id,
      old_balance: originalBalance - feeCalculation.issuanceFee,
      new_balance: originalBalance - feeCalculation.totalAmount,
      amount_changed: -dto.amount, // Negative for debit
      currency: "USD",
      change_type: "debit",
      description: "Initial card funding debit from wallet",
    });

    // Create balance transaction record for card (funding credit)
    await BalanceTransactionRecordModel.create({
      transaction_id: fundingTransactionId,
      entity_type: "card",
      entity_id: cardId,
      old_balance: 0, // New card starts with 0 balance
      new_balance: dto.amount,
      amount_changed: dto.amount, // Positive for credit
      currency: "USD",
      change_type: "credit",
      description: "Initial card funding credit to card",
    });

    this.logger.debug("Balance transaction records created", {
      cardId,
      walletId: usdWallet.id,
      feeTransactionId: transactionId,
      fundingTransactionId,
      totalRecords: 3, // 1 wallet debit (fee) + 1 wallet debit (funding) + 1 card credit
    });
  }

  /**
   * Log card creation success
   */
  private async logCardCreationSuccess(
    cardId: string,
    customer: any,
    dto: CreateCardDto,
    feeCalculation: any
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customer.id,
      action: "card-purchase",
      status: "SUCCESS",
      log_json: {
        card_id: cardId,
        amount: dto.amount,
        brand: dto.brand,
        maplerad_customer_id: customer.maplerad_customer_id,
        is_first_card: feeCalculation.isFirstCard,
        total_cost: feeCalculation.totalAmount,
      },
      log_txt: `Maplerad card created successfully: ${cardId}`,
      created_at: new Date(),
    });
  }

  /**
   * Handle card creation errors with different recovery strategies
   */
  private async handleCardCreationError(
    error: any,
    mapleradCallSucceeded: boolean,
    reservedAmount: number,
    customer: any,
    companyId: string
  ): Promise<void> {
    if (!mapleradCallSucceeded) {
      // Refund reserved funds if Maplerad call failed
      await this.refundReservedFunds(companyId, reservedAmount);

      this.logger.warn("Maplerad call failed - funds refunded", {
        customerId: customer.id,
        amount: reservedAmount,
        error: error.message,
      });
    } else {
      // Maplerad succeeded but post-processing failed - keep funds (service delivered)
      this.logger.error(
        "Post-Maplerad error - funds kept (service delivered)",
        {
          customerId: customer.id,
          reservedAmount,
          error: error.message,
        }
      );
    }

    // Log the error
    await CustomerLogsModel.create({
      customer_id: customer.id,
      action: "card-purchase",
      status: "FAILED",
      log_json: {
        error: error.message,
        maplerad_succeeded: mapleradCallSucceeded,
        reserved_amount: reservedAmount,
      },
      log_txt: `Maplerad card creation failed: ${error.message}`,
      created_at: new Date(),
    });
  }

  /**
   * Save card creation metadata for webhook tracking
   */
  private async saveCardCreationMetadata(
    reference: string,
    customerId: string,
    feeCalculation: any,
    validatedDto: CreateCardDto,
    clientReference: string,
    mapleradCustomerId: string
  ): Promise<void> {
    // For now, we'll use CustomerLogsModel to store the metadata
    // In production, you might want to create a dedicated CardCreationTracking table
    await CustomerLogsModel.create({
      customer_id: customerId,
      action: "card_creation_pending",
      status: "PENDING",
      log_json: {
        reference,
        mapleradCustomerId,
        cardBrand: validatedDto.brand,
        initialBalance: validatedDto.amount,
        nameOnCard: validatedDto.name_on_card,
        clientReference,
        isFirstCard: feeCalculation.isFirstCard,
        feeCalculation,
        webhookExpected: true,
        createdAt: new Date(),
      },
      log_txt: `Card creation initiated - waiting for webhook: ${reference}`,
      created_at: new Date(),
    });

    this.logger.debug("Card creation metadata saved for webhook tracking", {
      reference,
      customerId,
      clientReference,
      mapleradCustomerId,
    });
  }

  /**
   * Refund reserved funds
   */
  private async refundReservedFunds(
    companyId: string,
    amount: number
  ): Promise<void> {
    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      active: true,
    });

    if (usdWalletResult.output) {
      const currentBalance = usdWalletResult.output.balance.toNumber();
      const newBalance = currentBalance + amount;

      await WalletModel.update(usdWalletResult.output.id, {
        balance: newBalance,
      });

      this.logger.debug("Funds refunded", {
        companyId,
        amount,
        previousBalance: currentBalance,
        newBalance,
      });
    }
  }
}
