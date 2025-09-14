import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CardStatus } from "@prisma/client";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import BalanceTransactionRecordModel from "@/models/prisma/balanceTransactionRecordModel";
import { v4 as uuidv4 } from "uuid";
import { decodeText, encodeText } from "@/utils/shared/encryption";
import { utcToLocalTime } from "@/utils/date";
import { FundCardDto } from "../dto/fund-card.dto";
import { MapleradUtils } from "../utils/maplerad.utils";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import { TransactionCategory, TransactionType } from "@/types";

/**
 * Advanced Card Funding Service for Maplerad
 * Implements sophisticated card funding with fee calculation, secure fund reservation,
 * and comprehensive error recovery
 */
@Injectable()
export class CardFundService {
  private readonly logger = new Logger(CardFundService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Fund a Maplerad card with advanced features
   */
  async fundCard(
    fundCardDto: FundCardDto,
    user: CurrentUserData
  ): Promise<any> {
    this.logger.log("💰 ADVANCED MAPLERAD CARD FUNDING FLOW - START", {
      cardId: fundCardDto.card_id,
      customerId: fundCardDto.customer_id,
      amount: fundCardDto.amount,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card and customer
      const card = await this.validateCardAndCustomer(fundCardDto, user);

      // 2. Calculate funding fees
      const feeCalculation = await this.calculateFundingFees(
        fundCardDto.amount,
        user.companyId
      );

      // 3. Get customer and company data
      const customer = await this.getCustomerData(fundCardDto.customer_id);
      const company = await this.getCompanyData(user.companyId);

      // 4. Secure fund reservation before external API calls
      const originalBalance = await this.reserveFundsSecurely(
        user.companyId,
        fundCardDto.amount,
        `Card funding reservation for card ${fundCardDto.card_id}`
      );

      let mapleradCallSucceeded = false;
      let fundingResult: any = null;

      try {
        // 5. Fund card via Maplerad API
        fundingResult = await this.fundMapleradCard(
          card.provider_card_id,
          fundCardDto.amount
        );
        mapleradCallSucceeded = true;

        // 6. Update local balances
        const updatedBalances = await this.updateLocalBalances(
          card.id,
          user.companyId,
          fundCardDto.amount,
          originalBalance
        );

        // 7. Create transactions with balance records
        await this.createFundingTransactions(
          card,
          customer,
          company,
          fundCardDto,
          feeCalculation,
          updatedBalances,
          fundingResult
        );

        // 8. Log success
        await this.logFundingSuccess(
          card.id,
          customer,
          fundCardDto,
          fundingResult
        );

        this.logger.log("✅ ADVANCED MAPLERAD CARD FUNDING FLOW - COMPLETED", {
          cardId: card.id,
          amount: fundCardDto.amount,
          success: true,
        });

        return {
          status: "success",
          message: `Card funded successfully with $${fundCardDto.amount}`,
          data: {
            card_id: card.id,
            funded_amount: fundCardDto.amount,
            card_balance: updatedBalances.cardBalance,
            wallet_balance: updatedBalances.walletBalance,
            transaction_id: fundingResult?.transactionId,
          },
        };
      } catch (error: any) {
        // Handle different error scenarios
        await this.handleFundingError(
          error,
          mapleradCallSucceeded,
          fundCardDto.amount,
          customer,
          user.companyId
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD FUNDING FAILED", {
        cardId: fundCardDto.card_id,
        customerId: fundCardDto.customer_id,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card funding failed: ${error.message}`);
    }
  }

  /**
   * Validate card and customer ownership
   */
  private async validateCardAndCustomer(
    dto: FundCardDto,
    user: CurrentUserData
  ): Promise<any> {
    // Validate card exists and belongs to company
    const cardResult = await CardModel.getOne({
      id: dto.card_id,
      company_id: user.companyId,
      status: { not: CardStatus.TERMINATED },
    });
    if (cardResult.error || !cardResult.output) {
      throw new NotFoundException("Card not found");
    }
    const card = cardResult.output;

    // Verify customer ownership
    if (card.customer_id !== dto.customer_id) {
      throw new BadRequestException("Card does not belong to customer");
    }

    // Check if it's a Maplerad card
    if (decodeText(card.provider) !== "maplerad") {
      throw new BadRequestException("Card is not a Maplerad card");
    }

    // Check card status
    if (card.status === CardStatus.FROZEN) {
      throw new BadRequestException("Cannot fund frozen card");
    }

    // Validate amount
    if (dto.amount < 1) {
      throw new BadRequestException("Minimum funding amount is 1 USD");
    }

    return card;
  }

  /**
   * Calculate funding fees using TransactionFeeModel
   */
  private async calculateFundingFees(
    amount: number,
    companyId: string
  ): Promise<{
    fundingFee: number;
    totalAmount: number;
  }> {
    try {
      // Get funding fees from TransactionFeeModel
      const feesResult = await TransactionFeeModel.get({
        company_id: companyId,
        transaction_category: TransactionCategory.CARD,
        transaction_type: TransactionType.FUND,
        currency: "USD",
      });

      if (feesResult.output) {
        const fees: any[] = feesResult.output;
        const fundingFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.FUND
        );

        const fundingFee =
          fundingFeeRecord?.type === "FIXED"
            ? parseFloat(fundingFeeRecord?.value?.toString())
            : 0.5; // Default funding fee

        const totalAmount = amount; // Funding amount (fees might be separate)

        this.logger.debug("Calculated funding fees using TransactionFeeModel", {
          amount,
          fundingFee,
          totalAmount,
        });

        return {
          fundingFee,
          totalAmount,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to get funding fees from database:`, error);
    }

    // Fallback to default fees
    const fundingFee = 0.5; // USD
    const totalAmount = amount;

    this.logger.debug("Using fallback funding fees", {
      amount,
      fundingFee,
      totalAmount,
    });

    return {
      fundingFee,
      totalAmount,
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

    this.logger.debug("Funds reserved securely for funding", {
      companyId,
      amount,
      previousBalance: walletBalance,
      newBalance,
      description,
    });

    return walletBalance; // Return original balance
  }

  /**
   * Fund card via Maplerad API
   */
  private async fundMapleradCard(
    providerCardId: string,
    amount: number
  ): Promise<any> {
    this.logger.debug("Funding Maplerad card", {
      providerCardId,
      amount,
    });

    const fundingResult = await MapleradUtils.fundCard(providerCardId, amount);

    if (fundingResult.error) {
      this.logger.error("Maplerad funding failed", {
        error: fundingResult.error.message,
      });
      throw new BadRequestException(
        "Failed to fund card: " + fundingResult.error.message
      );
    }

    const mapleradResponse = fundingResult.output;
    this.logger.log("Maplerad card funding initiated", {
      cardId: providerCardId,
      reference: mapleradResponse?.reference,
      amount,
    });

    return {
      ...mapleradResponse,
      transactionId: uuidv4(), // Generate local transaction ID
    };
  }

  /**
   * Update local card and wallet balances
   */
  private async updateLocalBalances(
    cardId: string,
    companyId: string,
    amount: number,
    originalWalletBalance: number
  ): Promise<{
    cardBalance: number;
    walletBalance: number;
    cardBalanceBefore: number;
  }> {
    // Get current card balance
    const cardResult = await CardModel.getOne({ id: cardId });
    if (cardResult.error || !cardResult.output) {
      throw new NotFoundException("Card not found for balance update");
    }
    const card = cardResult.output;
    const cardBalanceBefore = card.balance.toNumber();

    // Calculate new balances
    const cardBalanceAfter = cardBalanceBefore + amount;
    const walletBalanceAfter = originalWalletBalance - amount;

    // Update card balance
    const cardUpdateResult = await CardModel.update(cardId, {
      balance: cardBalanceAfter,
    });
    if (cardUpdateResult.error) {
      throw new BadRequestException("Failed to update card balance");
    }

    // Update wallet balance
    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      active: true,
    });
    if (usdWalletResult.output) {
      await WalletModel.update(usdWalletResult.output.id, {
        balance: walletBalanceAfter,
      });
    }

    this.logger.debug("Local balances updated", {
      cardId,
      cardBalanceBefore,
      cardBalanceAfter,
      walletBalanceBefore: originalWalletBalance,
      walletBalanceAfter,
    });

    return {
      cardBalance: cardBalanceAfter,
      walletBalance: walletBalanceAfter,
      cardBalanceBefore,
    };
  }

  /**
   * Create funding transactions with balance records
   */
  private async createFundingTransactions(
    card: any,
    customer: any,
    company: any,
    dto: FundCardDto,
    feeCalculation: any,
    balances: any,
    fundingResult: any
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

    // Create main funding transaction
    const transactionResult = await TransactionModel.create({
      id: transactionId,
      status: "SUCCESS",
      category: "CARD",
      type: "FUND",
      amount: dto.amount,
      currency: "USD",
      customer_id: customer.id,
      company_id: customer.company_id,
      card_id: card.id,
      card_balance_before: balances.cardBalanceBefore,
      card_balance_after: balances.cardBalance,
      wallet_balance_before: balances.walletBalance + dto.amount, // Original balance
      wallet_balance_after: balances.walletBalance,
      provider: encodeText("maplerad"),
      order_id: fundingResult?.id || transactionId,
      description: `Card funding: ${card.masked_number}`,
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (transactionResult.error) {
      throw new BadRequestException("Failed to create funding transaction");
    }

    // Create balance transaction record for wallet (debit)
    await BalanceTransactionRecordModel.create({
      transaction_id: transactionId,
      entity_type: "wallet",
      entity_id: usdWallet.id,
      old_balance: balances.walletBalance + dto.amount, // Original balance
      new_balance: balances.walletBalance,
      amount_changed: -dto.amount, // Negative for debit
      currency: "USD",
      change_type: "debit",
      description: "Card funding debit from wallet",
    });

    // Create balance transaction record for card (credit)
    await BalanceTransactionRecordModel.create({
      transaction_id: transactionId,
      entity_type: "card",
      entity_id: card.id,
      old_balance: balances.cardBalanceBefore,
      new_balance: balances.cardBalance,
      amount_changed: dto.amount, // Positive for credit
      currency: "USD",
      change_type: "credit",
      description: "Card funding credit to card",
    });

    this.logger.debug("Funding transactions and balance records created", {
      cardId: card.id,
      walletId: usdWallet.id,
      transactionId,
      totalRecords: 2, // 1 wallet debit + 1 card credit
    });
  }

  /**
   * Log funding success
   */
  private async logFundingSuccess(
    cardId: string,
    customer: any,
    dto: FundCardDto,
    fundingResult: any
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customer.id,
      action: "fund-card",
      status: "SUCCESS",
      log_json: {
        card_id: cardId,
        amount: dto.amount,
        maplerad_transaction_id: fundingResult?.id,
      },
      log_txt: `Maplerad card funding successful: ${cardId} - $${dto.amount}`,
      created_at: new Date(),
    });
  }

  /**
   * Handle funding errors with different recovery strategies
   */
  private async handleFundingError(
    error: any,
    mapleradCallSucceeded: boolean,
    reservedAmount: number,
    customer: any,
    companyId: string
  ): Promise<void> {
    if (!mapleradCallSucceeded) {
      // Refund reserved funds if Maplerad call failed
      await this.refundReservedFunds(companyId, reservedAmount);

      this.logger.warn("Maplerad funding failed - funds refunded", {
        customerId: customer.id,
        amount: reservedAmount,
        error: error.message,
      });
    } else {
      // Maplerad succeeded but post-processing failed - keep funds (service delivered)
      this.logger.error(
        "Post-Maplerad funding error - funds kept (service delivered)",
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
      action: "fund-card",
      status: "FAILED",
      log_json: {
        error: error.message,
        maplerad_succeeded: mapleradCallSucceeded,
        reserved_amount: reservedAmount,
      },
      log_txt: `Maplerad card funding failed: ${error.message}`,
      created_at: new Date(),
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

      this.logger.debug("Funds refunded after funding failure", {
        companyId,
        amount,
        previousBalance: currentBalance,
        newBalance,
      });
    }
  }
}
