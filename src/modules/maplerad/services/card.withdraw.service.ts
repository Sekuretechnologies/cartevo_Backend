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
import { WithdrawCardDto } from "../dto/withdraw-card.dto";
import { MapleradUtils } from "../utils/maplerad.utils";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import { TransactionCategory, TransactionType } from "@/types";

/**
 * Advanced Card Withdrawal Service for Maplerad
 * Implements sophisticated card withdrawal with fee calculation, secure fund reservation,
 * and comprehensive error recovery
 */
@Injectable()
export class CardWithdrawService {
  private readonly logger = new Logger(CardWithdrawService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Withdraw from a Maplerad card with MONIX-style advanced features
   */
  async withdrawFromCard(
    withdrawCardDto: WithdrawCardDto,
    user: CurrentUserData
  ): Promise<any> {
    this.logger.log(
      "💸 MONIX-STYLE ADVANCED MAPLERAD CARD WITHDRAWAL FLOW - START",
      {
        cardId: withdrawCardDto.card_id,
        customerId: withdrawCardDto.customer_id,
        amount: withdrawCardDto.amount,
        userId: user.userId,
        timestamp: new Date().toISOString(),
      }
    );

    // Variables for tracking state (MONIX pattern)
    let walletCredited = false;
    let walletTransactionId: string | null = null;
    let cardTransaction: any = null;
    let totalAmountToCredit = 0;

    try {
      // 1. Validate card and customer
      const card = await this.validateCardAndCustomer(withdrawCardDto, user);

      // 2. Calculate withdrawal fees (MONIX-style)
      const feeCalculation = await this.calculateWithdrawalFees(
        withdrawCardDto.amount,
        user.companyId
      );

      // 3. Get customer and company data
      const customer = await this.getCustomerData(withdrawCardDto.customer_id);
      const company = await this.getCompanyData(user.companyId);

      // 4. Check card balance sufficiency
      await this.validateCardBalance(card.id, withdrawCardDto.amount);

      // 5. Calculate net amount to credit to wallet (MONIX pattern)
      totalAmountToCredit = withdrawCardDto.amount; // Full amount credited to wallet

      // 6. Create transaction record first (MONIX pattern)
      cardTransaction = await this.createWithdrawalTransactionRecord(
        card,
        customer,
        withdrawCardDto,
        feeCalculation
      );

      let mapleradCallSucceeded = false;
      let withdrawalResult: any = null;

      try {
        // 7. Withdraw from card via Maplerad API
        withdrawalResult = await this.withdrawFromMapleradCard(
          card.provider_card_id,
          withdrawCardDto.amount
        );
        mapleradCallSucceeded = true;

        // 8. Update local balances (MONIX pattern)
        const updatedBalances = await this.updateLocalBalances(
          card.id,
          user.companyId,
          withdrawCardDto.amount
        );

        // 9. Credit wallet immediately (MONIX pattern)
        await this.creditWalletForWithdrawal(
          user.companyId,
          totalAmountToCredit,
          `Card withdrawal: ${card.masked_number}`
        );
        walletCredited = true;

        // 10. Update transaction with success details
        await this.updateTransactionWithSuccess(
          cardTransaction.id,
          withdrawalResult,
          updatedBalances
        );

        // 11. Log success with MONIX-style details
        await this.logWithdrawalSuccess(
          card.id,
          customer,
          withdrawCardDto,
          withdrawalResult
        );

        this.logger.log(
          "✅ MONIX-STYLE ADVANCED MAPLERAD CARD WITHDRAWAL FLOW - COMPLETED",
          {
            cardId: card.id,
            amount: withdrawCardDto.amount,
            success: true,
            processingMode: "direct_success",
          }
        );

        return {
          status: "success",
          message: `Successfully withdrew $${withdrawCardDto.amount} from card`,
          data: {
            card_id: card.id,
            withdrawn_amount: withdrawCardDto.amount,
            card_balance: updatedBalances.cardBalance,
            wallet_balance: updatedBalances.walletBalance,
            transaction_id: cardTransaction.id,
            maplerad_transaction_id: withdrawalResult?.id,
            processing_mode: "direct_success",
          },
        };
      } catch (error: any) {
        // Handle different error scenarios with MONIX-style recovery
        await this.handleWithdrawalError(
          error,
          mapleradCallSucceeded,
          withdrawCardDto.amount,
          customer,
          user.companyId,
          cardTransaction,
          walletCredited,
          totalAmountToCredit
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ MONIX-STYLE ADVANCED CARD WITHDRAWAL FAILED", {
        cardId: withdrawCardDto.card_id,
        customerId: withdrawCardDto.customer_id,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Validate card and customer ownership
   */
  private async validateCardAndCustomer(
    dto: WithdrawCardDto,
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
      throw new BadRequestException("Cannot withdraw from frozen card");
    }

    // Validate amount
    if (dto.amount < 1) {
      throw new BadRequestException("Minimum withdrawal amount is 1 USD");
    }

    return card;
  }

  /**
   * Calculate withdrawal fees using TransactionFeeModel
   */
  private async calculateWithdrawalFees(
    amount: number,
    companyId: string
  ): Promise<{
    withdrawalFee: number;
    totalAmount: number;
  }> {
    try {
      // Get withdrawal fees from TransactionFeeModel
      const feesResult = await TransactionFeeModel.get({
        company_id: companyId,
        transaction_category: TransactionCategory.CARD,
        transaction_type: TransactionType.WITHDRAW,
        currency: "USD",
      });

      if (feesResult.output) {
        const fees: any[] = feesResult.output;
        const withdrawalFeeRecord = fees.find(
          (fee) => fee.transaction_type === TransactionType.WITHDRAW
        );

        const withdrawalFee =
          withdrawalFeeRecord?.type === "FIXED"
            ? parseFloat(withdrawalFeeRecord?.value?.toString())
            : 0.5; // Default withdrawal fee

        const totalAmount = amount; // Withdrawal amount (fees might be separate)

        this.logger.debug(
          "Calculated withdrawal fees using TransactionFeeModel",
          {
            amount,
            withdrawalFee,
            totalAmount,
          }
        );

        return {
          withdrawalFee,
          totalAmount,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to get withdrawal fees from database:`, error);
    }

    // Fallback to default fees
    const withdrawalFee = 0.5; // USD
    const totalAmount = amount;

    this.logger.debug("Using fallback withdrawal fees", {
      amount,
      withdrawalFee,
      totalAmount,
    });

    return {
      withdrawalFee,
      totalAmount,
    };
  }

  /**
   * Validate card balance sufficiency
   */
  private async validateCardBalance(
    cardId: string,
    amount: number
  ): Promise<void> {
    const cardResult = await CardModel.getOne({ id: cardId });
    if (cardResult.error || !cardResult.output) {
      throw new NotFoundException("Card not found for balance validation");
    }

    const cardBalance = cardResult.output.balance.toNumber();

    if (cardBalance < amount) {
      throw new BadRequestException(
        `Insufficient card balance. Required: $${amount}, Available: $${cardBalance}`
      );
    }

    this.logger.debug("Card balance validated", {
      cardId,
      requiredAmount: amount,
      availableBalance: cardBalance,
    });
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
   * Withdraw from card via Maplerad API
   */
  private async withdrawFromMapleradCard(
    providerCardId: string,
    amount: number
  ): Promise<any> {
    this.logger.debug("Withdrawing from Maplerad card", {
      providerCardId,
      amount,
    });

    const withdrawalResult = await MapleradUtils.withdrawFromCard(
      providerCardId,
      amount
    );

    if (withdrawalResult.error) {
      this.logger.error("Maplerad withdrawal failed", {
        error: withdrawalResult.error.message,
      });
      throw new BadRequestException(
        "Failed to withdraw from card: " + withdrawalResult.error.message
      );
    }

    const mapleradResponse = withdrawalResult.output;
    this.logger.log("Maplerad card withdrawal initiated", {
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
    amount: number
  ): Promise<{
    cardBalance: number;
    walletBalance: number;
    cardBalanceBefore: number;
    walletBalanceBefore: number;
  }> {
    // Get current balances
    const cardResult = await CardModel.getOne({ id: cardId });
    if (cardResult.error || !cardResult.output) {
      throw new NotFoundException("Card not found for balance update");
    }
    const card = cardResult.output;
    const cardBalanceBefore = card.balance.toNumber();

    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      is_active: true,
    });
    if (usdWalletResult.error || !usdWalletResult.output) {
      throw new BadRequestException("USD wallet not found");
    }
    const usdWallet = usdWalletResult.output;
    const walletBalanceBefore = usdWallet.balance.toNumber();

    // Calculate new balances
    const cardBalanceAfter = cardBalanceBefore - amount;
    const walletBalanceAfter = walletBalanceBefore + amount;

    // Update card balance
    const cardUpdateResult = await CardModel.update(cardId, {
      balance: cardBalanceAfter,
    });
    if (cardUpdateResult.error) {
      throw new BadRequestException("Failed to update card balance");
    }

    // Update wallet balance
    await WalletModel.update(usdWallet.id, {
      balance: walletBalanceAfter,
    });

    this.logger.debug("Local balances updated for withdrawal", {
      cardId,
      cardBalanceBefore,
      cardBalanceAfter,
      walletBalanceBefore,
      walletBalanceAfter,
    });

    return {
      cardBalance: cardBalanceAfter,
      walletBalance: walletBalanceAfter,
      cardBalanceBefore,
      walletBalanceBefore,
    };
  }

  /**
   * Create withdrawal transactions with balance records
   */
  private async createWithdrawalTransactions(
    card: any,
    customer: any,
    company: any,
    dto: WithdrawCardDto,
    feeCalculation: any,
    balances: any,
    withdrawalResult: any
  ): Promise<void> {
    // Get USD wallet for balance transaction records
    const usdWalletResult = await WalletModel.getOne({
      company_id: company.id,
      currency: "USD",
      is_active: true,
    });
    if (usdWalletResult.error || !usdWalletResult.output) {
      throw new BadRequestException(
        "USD wallet not found for balance tracking"
      );
    }
    const usdWallet = usdWalletResult.output;

    const transactionId = uuidv4();

    // Create main withdrawal transaction
    const transactionResult = await TransactionModel.create({
      id: transactionId,
      status: "SUCCESS",
      category: "CARD",
      type: "WITHDRAW",
      amount: dto.amount,
      currency: "USD",
      customer_id: customer.id,
      company_id: customer.company_id,
      card_id: card.id,
      card_balance_before: balances.cardBalanceBefore,
      card_balance_after: balances.cardBalance,
      wallet_balance_before: balances.walletBalanceBefore,
      wallet_balance_after: balances.walletBalance,
      provider: encodeText("maplerad"),
      order_id: withdrawalResult?.id || transactionId,
      description: `Card withdrawal: ${card.masked_number}`,
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (transactionResult.error) {
      throw new BadRequestException("Failed to create withdrawal transaction");
    }

    // Create balance transaction record for card (debit)
    await BalanceTransactionRecordModel.create({
      transaction_id: transactionId,
      entity_type: "card",
      entity_id: card.id,
      old_balance: balances.cardBalanceBefore,
      new_balance: balances.cardBalance,
      amount_changed: -dto.amount, // Negative for debit
      currency: "USD",
      change_type: "debit",
      description: "Card withdrawal debit from card",
    });

    // Create balance transaction record for wallet (credit)
    await BalanceTransactionRecordModel.create({
      transaction_id: transactionId,
      entity_type: "wallet",
      entity_id: usdWallet.id,
      old_balance: balances.walletBalanceBefore,
      new_balance: balances.walletBalance,
      amount_changed: dto.amount, // Positive for credit
      currency: "USD",
      change_type: "credit",
      description: "Card withdrawal credit to wallet",
    });

    this.logger.debug("Withdrawal transactions and balance records created", {
      cardId: card.id,
      walletId: usdWallet.id,
      transactionId,
      totalRecords: 2, // 1 card debit + 1 wallet credit
    });
  }

  /**
   * Log withdrawal success
   */
  private async logWithdrawalSuccess(
    cardId: string,
    customer: any,
    dto: WithdrawCardDto,
    withdrawalResult: any
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customer.id,
      action: "withdraw-card",
      status: "SUCCESS",
      log_json: {
        card_id: cardId,
        amount: dto.amount,
        maplerad_transaction_id: withdrawalResult?.id,
      },
      log_txt: `Maplerad card withdrawal successful: ${cardId} - $${dto.amount}`,
      created_at: new Date(),
    });
  }

  /**
   * Create withdrawal transaction record (MONIX pattern)
   */
  private async createWithdrawalTransactionRecord(
    card: any,
    customer: any,
    dto: WithdrawCardDto,
    feeCalculation: any
  ): Promise<any> {
    const transactionId = uuidv4();

    const transactionResult = await TransactionModel.create({
      id: transactionId,
      status: "PENDING",
      category: "CARD",
      type: "WITHDRAW",
      amount: dto.amount,
      currency: "USD",
      customer_id: customer.id,
      company_id: customer.company_id,
      card_id: card.id,
      card_balance_before: card.balance.toNumber(),
      card_balance_after: card.balance.toNumber() - dto.amount,
      wallet_balance_before: 0, // Will be updated after wallet lookup
      wallet_balance_after: dto.amount, // Will be updated after wallet lookup
      provider: encodeText("maplerad"),
      description: `Card withdrawal: ${card.masked_number}`,
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (transactionResult.error) {
      throw new BadRequestException(
        "Failed to create withdrawal transaction record"
      );
    }

    return transactionResult.output;
  }

  /**
   * Credit wallet for withdrawal (MONIX pattern)
   */
  private async creditWalletForWithdrawal(
    companyId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      is_active: true,
    });

    if (usdWalletResult.error || !usdWalletResult.output) {
      throw new BadRequestException(
        "USD wallet not found for withdrawal credit"
      );
    }

    const usdWallet = usdWalletResult.output;
    const currentBalance = usdWallet.balance.toNumber();
    const newBalance = currentBalance + amount;

    await WalletModel.update(usdWallet.id, {
      balance: newBalance,
    });

    this.logger.debug("Wallet credited for withdrawal", {
      companyId,
      amount,
      previousBalance: currentBalance,
      newBalance,
      description,
    });
  }

  /**
   * Update transaction with success details (MONIX pattern)
   */
  private async updateTransactionWithSuccess(
    transactionId: string,
    withdrawalResult: any,
    balances: any
  ): Promise<void> {
    await TransactionModel.update(transactionId, {
      status: "SUCCESS",
      order_id: withdrawalResult?.id || transactionId,
      wallet_balance_before: balances.walletBalanceBefore,
      wallet_balance_after: balances.walletBalance,
      completed_at: utcToLocalTime(new Date())?.toISOString(),
    });

    this.logger.debug("Transaction updated with success details", {
      transactionId,
      mapleradTransactionId: withdrawalResult?.id,
      finalWalletBalance: balances.walletBalance,
    });
  }

  /**
   * Handle withdrawal errors with MONIX-style recovery
   */
  private async handleWithdrawalError(
    error: any,
    mapleradCallSucceeded: boolean,
    withdrawnAmount: number,
    customer: any,
    companyId: string,
    cardTransaction: any,
    walletCredited: boolean,
    totalAmountToCredit: number
  ): Promise<void> {
    if (!mapleradCallSucceeded) {
      // Reverse wallet credit if Maplerad call failed
      if (walletCredited) {
        await this.reverseWalletCredit(companyId, totalAmountToCredit);
      }

      this.logger.warn("Maplerad withdrawal failed - wallet credit reversed", {
        customerId: customer.id,
        amount: withdrawnAmount,
        error: error.message,
      });
    } else {
      // Maplerad succeeded but post-processing failed - withdrawal was successful
      this.logger.error(
        "Post-Maplerad withdrawal error - withdrawal completed successfully",
        {
          customerId: customer.id,
          withdrawnAmount,
          error: error.message,
        }
      );
    }

    // Update transaction status to failed
    if (cardTransaction) {
      await TransactionModel.update(cardTransaction.id, {
        status: "FAILED",
        failure_reason: error.message,
        completed_at: utcToLocalTime(new Date())?.toISOString(),
      });
    }

    // Log the error
    await CustomerLogsModel.create({
      customer_id: customer.id,
      action: "withdraw-card",
      status: "FAILED",
      log_json: {
        error: error.message,
        maplerad_succeeded: mapleradCallSucceeded,
        wallet_credited: walletCredited,
        withdrawn_amount: withdrawnAmount,
      },
      log_txt: `Maplerad card withdrawal failed: ${error.message}`,
      created_at: new Date(),
    });
  }

  /**
   * Reverse wallet credit in case of failure
   */
  private async reverseWalletCredit(
    companyId: string,
    amount: number
  ): Promise<void> {
    try {
      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        is_active: true,
      });

      if (usdWalletResult.output) {
        const currentBalance = usdWalletResult.output.balance.toNumber();
        const correctedBalance = currentBalance - amount; // Reverse the credit

        await WalletModel.update(usdWalletResult.output.id, {
          balance: correctedBalance,
        });

        this.logger.debug("Wallet credit reversed after withdrawal failure", {
          companyId,
          amount,
          previousBalance: currentBalance,
          correctedBalance,
        });
      }
    } catch (reverseError) {
      this.logger.error("Failed to reverse wallet credit", {
        companyId,
        amount,
        error: reverseError.message,
      });
    }
  }

  /**
   * Reverse local balance changes in case of failure
   */
  private async reverseLocalBalanceChanges(
    companyId: string,
    amount: number
  ): Promise<void> {
    try {
      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        is_active: true,
      });

      if (usdWalletResult.output) {
        const currentBalance = usdWalletResult.output.balance.toNumber();
        const correctedBalance = currentBalance - amount; // Reverse the credit

        await WalletModel.update(usdWalletResult.output.id, {
          balance: correctedBalance,
        });

        this.logger.debug(
          "Local balance changes reversed after withdrawal failure",
          {
            companyId,
            amount,
            previousBalance: currentBalance,
            correctedBalance,
          }
        );
      }
    } catch (reverseError) {
      this.logger.error("Failed to reverse local balance changes", {
        companyId,
        amount,
        error: reverseError.message,
      });
    }
  }
}
