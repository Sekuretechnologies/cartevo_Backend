// AlphaSpace Card Withdraw Service
// Handles card withdrawal operations and balance management
// WAVLET adaptation following Maplerad service patterns

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUserData } from "../../common/decorators/current-user.decorator";
import { v4 as uuidv4 } from "uuid";
import alphaSpaceCardUtils from "../../../utils/cards/alphaspace/card";
import { AlphaSpaceAuthService } from "./alphaspace-auth.service";

export interface WithdrawResult {
  success: boolean;
  message: string;
  data?: {
    card_id: string;
    amount: number;
    new_balance: number;
    wallet_id: string;
    transaction_id: string;
    reference: string;
  };
  metadata?: any;
}

export interface BulkWithdrawResult {
  success: boolean;
  message: string;
  data?: {
    withdrawals: Array<{
      card_id: string;
      amount: number;
      status: string;
      transaction_id?: string;
      error?: string;
    }>;
    total_processed: number;
    successful: number;
    failed: number;
    total_amount: number;
    total_wallet_credit: number;
  };
  metadata?: any;
}

/**
 * AlphaSpace Card Withdraw Service
 * Handles secure withdrawal of funds from cards to company wallets
 */
@Injectable()
export class CardWithdrawService {
  private readonly logger = new Logger(CardWithdrawService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alphaSpaceAuthService: AlphaSpaceAuthService
  ) {}

  /**
   * Withdraw funds from an AlphaSpace card to company wallet
   */
  async withdrawFromCard(
    cardId: string,
    amount: number,
    user: CurrentUserData
  ): Promise<WithdrawResult> {
    this.logger.log("💸 ALPHASPACE CARD WITHDRAW FLOW - START", {
      cardId,
      amount,
      companyId: user.companyId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate request and access
      await this.validateWithdrawalRequest(cardId, amount, user.companyId);

      // 2. Get card with balance verification
      const card = await this.getCardForWithdrawal(
        cardId,
        amount,
        user.companyId
      );

      // 3. Reserve funds from AlphaSpace (optional - pre-check balance)
      await this.verifyAlphaSpaceBalance(card.provider_card_id, amount);

      // 4. Initialize withdrawal transaction
      const transactionId = await this.initializeWithdrawalTransaction(
        cardId,
        card.customer_id,
        user.companyId,
        amount
      );

      let withdrawalSucceeded = false;
      let alphaSpaceResult: any = null;

      try {
        // 5. Execute withdrawal via AlphaSpace API
        alphaSpaceResult = await this.withdrawViaAlphaSpace(
          card.provider_card_id,
          amount
        );
        withdrawalSucceeded = true;

        // 6. Update card balance in database
        const updatedCard = await this.updateCardBalance(
          cardId,
          -amount,
          "withdraw"
        );

        // 7. Credit funds to company wallet
        const walletCredit = await this.creditWallet(
          user.companyId,
          amount,
          cardId
        );

        // 8. Complete withdrawal transaction
        await this.completeWithdrawalTransaction(
          transactionId,
          walletCredit.transactionId,
          alphaSpaceResult
        );

        // 9. Log successful withdrawal
        await this.logWithdrawalSuccess(
          cardId,
          card.customer_id,
          amount,
          user.companyId,
          alphaSpaceResult
        );

        this.logger.log("✅ ALPHASPACE CARD WITHDRAW FLOW - SUCCESS", {
          cardId,
          amount,
          newCardBalance: Number(updatedCard.balance),
          walletId: walletCredit.walletId,
          transactionId,
        });

        return {
          success: true,
          message: `Successfully withdrew ${amount} USD from card`,
          data: {
            card_id: cardId,
            amount: amount,
            new_balance: Number(updatedCard.balance),
            wallet_id: walletCredit.walletId,
            transaction_id: transactionId,
            reference: alphaSpaceResult.reference,
          },
          metadata: {
            provider: "alphaspce",
            alphaSpace_reference: alphaSpaceResult.reference,
            wallet_deposit_amount: amount,
          },
        };
      } catch (withdrawalError: any) {
        // Handle withdrawal failure
        await this.handleWithdrawalFailure(
          withdrawalError,
          withdrawalSucceeded,
          cardId,
          card.customer_id,
          user.companyId,
          amount,
          transactionId
        );

        throw withdrawalError;
      }
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD WITHDRAW FLOW - FAILED", {
        cardId,
        amount,
        companyId: user.companyId,
        error: error.message,
      });

      throw new BadRequestException(`Card withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Bulk withdraw from multiple cards
   */
  async bulkWithdraw(
    withdrawals: Array<{
      card_id: string;
      amount: number;
    }>,
    user: CurrentUserData
  ): Promise<BulkWithdrawResult> {
    this.logger.log("💸💰 ALPHASPACE BULK WITHDRAW FLOW - START", {
      withdrawalCount: withdrawals.length,
      companyId: user.companyId,
      userId: user.userId,
      totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
    });

    try {
      // Pre-validate all withdrawals
      for (const withdrawal of withdrawals) {
        await this.validateWithdrawalRequest(
          withdrawal.card_id,
          withdrawal.amount,
          user.companyId
        );
      }

      const results = {
        successful: [] as any[],
        failed: [] as any[],
      };

      let totalAmount = 0;
      let successfulCount = 0;

      // Process each withdrawal
      for (const withdrawal of withdrawals) {
        try {
          const result = await this.withdrawFromCard(
            withdrawal.card_id,
            withdrawal.amount,
            user
          );

          results.successful.push({
            card_id: withdrawal.card_id,
            amount: withdrawal.amount,
            status: "SUCCESS",
            transaction_id: result.data?.transaction_id,
          });

          totalAmount += withdrawal.amount;
          successfulCount++;
        } catch (error: any) {
          results.failed.push({
            card_id: withdrawal.card_id,
            amount: withdrawal.amount,
            status: "FAILED",
            error: error.message,
          });
        }
      }

      const bulkResult = {
        success: results.failed.length === 0,
        message: `Bulk withdrawal completed. ${successfulCount}/${withdrawals.length} successful, ${results.failed.length} failed.`,
        data: {
          withdrawals: [...results.successful, ...results.failed],
          total_processed: withdrawals.length,
          successful: successfulCount,
          failed: results.failed.length,
          total_amount: totalAmount,
          total_wallet_credit: totalAmount,
        },
        metadata: {
          company_id: user.companyId,
          batch_reference: `bulk_withdraw_${Date.now()}`,
          processing_time: new Date().toISOString(),
        },
      };

      this.logger.log("✅ ALPHASPACE BULK WITHDRAW FLOW - COMPLETED", {
        totalProcessed: withdrawals.length,
        successful: successfulCount,
        failed: results.failed.length,
        totalAmount,
      });

      return bulkResult;
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE BULK WITHDRAW FLOW - FAILED", {
        companyId: user.companyId,
        withdrawalCount: withdrawals.length,
        error: error.message,
      });

      throw new BadRequestException(`Bulk withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Get withdrawal history for a card
   */
  async getCardWithdrawalHistory(
    cardId: string,
    user: CurrentUserData,
    filters?: {
      limit?: number;
      offset?: number;
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<any> {
    this.logger.log("📊 ALPHASPACE CARD WITHDRAWAL HISTORY - START", {
      cardId,
      companyId: user.companyId,
      filters,
    });

    try {
      // Validate access
      await this.validateCardAccess(cardId, user.companyId);

      // Build query for withdrawal transactions
      const queryFilters: any = {
        card_id: cardId,
        type: "CARD_WITHDRAWAL",
        company_id: user.companyId,
      };

      if (filters?.fromDate) {
        queryFilters.created_at = { gte: filters.fromDate };
      }
      if (filters?.toDate) {
        queryFilters.created_at = {
          ...queryFilters.created_at,
          lte: filters.toDate,
        };
      }

      // Get transactions
      const transactions = await this.prisma.transaction.findMany({
        where: queryFilters,
        orderBy: { created_at: "desc" },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      });

      const totalCount = await this.prisma.transaction.count({
        where: queryFilters,
      });

      // Calculate statistics
      const statistics = await this.calculateWithdrawalStatistics(
        cardId,
        transactions
      );

      return {
        success: true,
        message: `Found ${transactions.length} withdrawal transactions`,
        data: {
          card_id: cardId,
          transactions: transactions.map((tx) => ({
            id: tx.id,
            amount: Math.abs(Number(tx.amount)), // Withdrawals are stored as negative
            currency: tx.currency,
            status: tx.status,
            description: tx.description,
            card_balance_before: tx.card_balance_before
              ? Number(tx.card_balance_before)
              : null,
            card_balance_after: tx.card_balance_after
              ? Number(tx.card_balance_after)
              : null,
            wallet_balance_before: tx.wallet_balance_before
              ? Number(tx.wallet_balance_before)
              : null,
            wallet_balance_after: tx.wallet_balance_after
              ? Number(tx.wallet_balance_after)
              : null,
            created_at: tx.created_at,
            completed_at: tx.completed_at,
          })),
          statistics,
          pagination: {
            total: totalCount,
            limit: filters?.limit || 50,
            offset: filters?.offset || 0,
            has_more:
              totalCount > (filters?.offset || 0) + (filters?.limit || 50),
          },
        },
        metadata: {
          provider: "alphaspace",
          query_filters: filters,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD WITHDRAWAL HISTORY FAILED", {
        cardId,
        error: error.message,
        companyId: user.companyId,
      });

      throw new BadRequestException(
        `Failed to get withdrawal history: ${error.message}`
      );
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate withdrawal request
   */
  private async validateWithdrawalRequest(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<void> {
    if (!cardId || cardId.trim() === "") {
      throw new BadRequestException("Card ID is required");
    }

    if (amount <= 0) {
      throw new BadRequestException("Withdrawal amount must be positive");
    }

    if (amount > 5000) {
      throw new BadRequestException(
        "Maximum withdrawal amount per transaction is $5,000"
      );
    }

    // Validate card ownership
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new BadRequestException("Card not found");
    }

    if (card.company_id !== companyId) {
      throw new BadRequestException("Card does not belong to this company");
    }

    if (card.provider !== "alphaspce") {
      throw new BadRequestException("Card is not an AlphaSpace card");
    }

    if (card.status === "TERMINATED") {
      throw new BadRequestException("Cannot withdraw from a terminated card");
    }

    if (card.status === "FROZEN") {
      throw new BadRequestException("Cannot withdraw from a frozen card");
    }
  }

  /**
   * Get card for withdrawal with balance verification
   */
  private async getCardForWithdrawal(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<any> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new BadRequestException("Card not found");
    }

    if (card.company_id !== companyId) {
      throw new BadRequestException("Card access denied");
    }

    // Check card balance
    const cardBalance = Number(card.balance);
    if (cardBalance < amount) {
      throw new BadRequestException(
        `Insufficient card balance. Available: ${cardBalance}, Required: ${amount}`
      );
    }

    if (!card.provider_card_id) {
      throw new BadRequestException("Card has no provider reference");
    }

    return card;
  }

  /**
   * Verify AlphaSpace card balance before withdrawal
   */
  private async verifyAlphaSpaceBalance(
    cardId: string,
    amount: number
  ): Promise<void> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();

    try {
      // Get card details including balance from AlphaSpace
      const cardDetailsResult =
        await alphaSpaceCardUtils.getCardDetailsFromAlphaSpace(cardId, token);

      if (cardDetailsResult.error) {
        throw new Error(cardDetailsResult.error.message);
      }

      const cardData =
        cardDetailsResult.output?.data || cardDetailsResult.output;
      const alphaSpaceBalance = parseFloat(cardData?.balance || "0");

      if (alphaSpaceBalance < amount) {
        throw new BadRequestException(
          `AlphaSpace card balance insufficient. Available: ${alphaSpaceBalance}, Required: ${amount}`
        );
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error("Failed to verify AlphaSpace balance", {
        cardId,
        amount,
        error: error.message,
      });
      throw new BadRequestException(
        "Unable to verify card balance with payment provider"
      );
    }
  }

  /**
   * Initialize withdrawal transaction
   */
  private async initializeWithdrawalTransaction(
    cardId: string,
    customerId: string,
    companyId: string,
    amount: number
  ): Promise<string> {
    const transactionId = uuidv4();

    // Create pending transaction record
    await this.prisma.transaction.create({
      data: {
        id: transactionId,
        type: "CARD_WITHDRAWAL",
        amount: -amount, // Negative for withdrawal
        currency: "USD",
        company_id: companyId,
        customer_id: customerId,
        card_id: cardId,
        description: `Card withdrawal via AlphaSpace: ${amount} USD`,
        status: "PENDING",
        category: "CARD",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return transactionId;
  }

  /**
   * Execute withdrawal via AlphaSpace utils
   */
  private async withdrawViaAlphaSpace(
    cardId: string,
    amount: number
  ): Promise<any> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();

    try {
      this.logger.debug("Executing AlphaSpace withdrawal using utils", {
        cardId,
        amount,
      });

      // Prepare withdrawal data in AlphaSpace format
      const withdrawData = {
        amount: amount,
        currency: "USD",
        description: `Card withdrawal: ${amount} USD`,
      };

      // Use AlphaSpace utils to perform withdrawal
      const result = await alphaSpaceCardUtils.withdrawFromCard(
        cardId,
        withdrawData,
        token
      );

      if (result.error) {
        throw new Error(result.error.message || "AlphaSpace withdrawal failed");
      }

      // Extract result data
      const responseData = result.output?.data || result.output;
      const transactionId =
        responseData?.transaction_id || responseData?.id || `txn_${Date.now()}`;

      return {
        reference: `withdraw_${cardId}_${Date.now()}`,
        alphaSpace_reference: responseData?.reference || transactionId,
        transaction_id: transactionId,
        withdrawn_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("AlphaSpace withdrawal via utils failed", {
        cardId,
        amount,
        error: error.message,
      });

      throw new BadRequestException("Withdrawal failed in payment provider");
    }
  }

  /**
   * Update card balance after withdrawal
   */
  private async updateCardBalance(
    cardId: string,
    amount: number, // Negative for withdrawals
    operation: "withdraw"
  ): Promise<any> {
    return await this.prisma.card.update({
      where: { id: cardId },
      data: {
        balance: { decrement: Math.abs(amount) }, // Decrement by absolute value
        updated_at: new Date(),
      },
    });
  }

  /**
   * Credit funds to company wallet
   */
  private async creditWallet(
    companyId: string,
    amount: number,
    cardId: string
  ): Promise<{ walletId: string; transactionId: string }> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        company_id: companyId,
        currency: "USD",
      },
    });

    if (!wallet) {
      throw new BadRequestException("Company wallet not found");
    }

    // Credit funds to wallet
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        payin_balance: { increment: amount },
        balance: { increment: amount },
      },
    });

    // Create wallet transaction (if your system tracks this)
    this.logger.debug("Wallet credited successfully", {
      walletId: wallet.id,
      amount,
      cardId,
    });

    return {
      walletId: wallet.id,
      transactionId: `wallet_${Date.now()}`,
    };
  }

  /**
   * Complete withdrawal transaction
   */
  private async completeWithdrawalTransaction(
    cardTransactionId: string,
    walletTransactionId: string,
    alphaSpaceResult: any
  ): Promise<void> {
    await this.prisma.transaction.update({
      where: { id: cardTransactionId },
      data: {
        status: "SUCCESS",
        completed_at: new Date(),
        updated_at: new Date(),
        provider: "alphaspce",
      },
    });
  }

  /**
   * Log successful withdrawal
   */
  private async logWithdrawalSuccess(
    cardId: string,
    customerId: string,
    amount: number,
    companyId: string,
    withdrawalResult: any
  ): Promise<void> {
    await this.prisma.customerLogs.create({
      data: {
        customer_id: customerId,
        action: "card-withdraw",
        status: "SUCCESS",
        log_json: {
          card_id: cardId,
          amount_withdrawn: amount,
          withdrawal_reference: withdrawalResult.reference,
          alphaSpace_reference: withdrawalResult.alphaSpace_reference,
        },
        log_txt: `AlphaSpace card withdrawal successful: ${cardId} - ${amount} USD`,
        created_at: new Date(),
      },
    });
  }

  /**
   * Handle withdrawal failure
   */
  private async handleWithdrawalFailure(
    error: any,
    withdrawalSucceeded: boolean,
    cardId: string,
    customerId: string,
    companyId: string,
    amount: number,
    transactionId: string
  ): Promise<void> {
    // Update transaction status to failed
    if (transactionId) {
      await this.prisma.transaction
        .update({
          where: { id: transactionId },
          data: {
            status: "FAILED",
            reason: error.message,
            updated_at: new Date(),
          },
        })
        .catch((updateError) => {
          this.logger.error("Failed to update failed transaction status", {
            transactionId,
            error: updateError.message,
          });
        });
    }

    // Log the failure
    await this.prisma.customerLogs.create({
      data: {
        customer_id: customerId,
        action: "card-withdraw",
        status: "FAILED",
        log_json: {
          card_id: cardId,
          attempted_amount: amount,
          error: error.message,
          alphaSpace_call_succeeded: withdrawalSucceeded,
        },
        log_txt: `AlphaSpace card withdrawal failed: ${cardId} - ${amount} USD - ${error.message}`,
        created_at: new Date(),
      },
    });

    // TODO: Implement rollback logic if needed
  }

  /**
   * Calculate withdrawal statistics
   */
  private async calculateWithdrawalStatistics(
    cardId: string,
    transactions: any[]
  ): Promise<any> {
    const amounts = transactions.map((tx) => Math.abs(Number(tx.amount))); // Absolute values for statistics
    const successfulTx = transactions.filter((tx) => tx.status === "SUCCESS");

    return {
      total_withdrawals: transactions.length,
      total_amount: amounts.reduce((sum, amount) => sum + amount, 0),
      successful_withdrawals: successfulTx.length,
      failed_withdrawals: transactions.length - successfulTx.length,
      average_amount:
        amounts.length > 0
          ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
          : 0,
      min_amount: amounts.length > 0 ? Math.min(...amounts) : 0,
      max_amount: amounts.length > 0 ? Math.max(...amounts) : 0,
      latest_withdrawal:
        transactions.length > 0 ? transactions[0].created_at : null,
    };
  }

  /**
   * Validate card access
   */
  private async validateCardAccess(
    cardId: string,
    companyId: string
  ): Promise<void> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new BadRequestException("Card not found");
    }

    if (card.company_id !== companyId) {
      throw new BadRequestException("Card access denied");
    }
  }
}
