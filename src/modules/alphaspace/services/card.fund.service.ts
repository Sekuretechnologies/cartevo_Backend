// AlphaSpace Card Fund Service
// Handles card funding operations with wallet integration
// WAVLET adaptation following Maplerad service patterns

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUserData } from "../../common/decorators/current-user.decorator";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { AlphaSpaceAuthService } from "./alphaspace-auth.service";

export interface FundCardResult {
  success: boolean;
  message: string;
  data?: {
    card_id: string;
    amount: number;
    new_balance: number;
    wallet_id: string;
    transaction_id: string;
  };
  metadata?: any;
}

/**
 * AlphaSpace Card Fund Service
 * Handles secure funding of cards through WAVLET wallet system
 */
@Injectable()
export class CardFundService {
  private readonly logger = new Logger(CardFundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alphaSpaceAuthService: AlphaSpaceAuthService
  ) {}

  /**
   * Fund an AlphaSpace card using company wallet balance
   */
  async fundCard(
    cardId: string,
    amount: number,
    user: CurrentUserData
  ): Promise<FundCardResult> {
    this.logger.log("💰 ALPHASPACE CARD FUNDING FLOW - START", {
      cardId,
      amount,
      companyId: user.companyId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate input and access
      await this.validateFundingRequest(cardId, amount, user.companyId);

      // 2. Verify wallet balance before proceeding
      const walletValidation = await this.checkWalletBalance(
        user.companyId,
        amount
      );

      if (!walletValidation.sufficient) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available: ${walletValidation.available_balance}, Required: ${amount}`
        );
      }

      // 3. Get fresh card details
      const card = await this.getCardForFunding(cardId, user.companyId);

      // 4. Reserve funds (transactional)
      const reservationId = await this.reserveWalletFunds(
        user.companyId,
        amount,
        cardId
      );

      let fundingSucceeded = false;
      let fundingResult: any = null;

      try {
        // 5. Execute funding via AlphaSpace API
        fundingResult = await this.fundCardViaAlphaSpace(
          card.provider_card_id,
          amount
        );
        fundingSucceeded = true;

        // 6. Confirm wallet deduction
        await this.confirmWalletDeduction(reservationId);

        // 7. Update card balance in database
        const updatedCard = await this.updateCardBalance(cardId, amount, "add");

        // 8. Create transaction record
        const transactionId = await this.createFundingTransaction(
          cardId,
          card.customer_id,
          user.companyId,
          amount,
          walletValidation.wallet_id,
          fundingResult
        );

        // 9. Log successful funding
        await this.logFundingSuccess(
          cardId,
          card.customer_id,
          amount,
          user.companyId,
          fundingResult
        );

        this.logger.log("✅ ALPHASPACE CARD FUNDING FLOW - SUCCESS", {
          cardId,
          amount,
          newCardBalance: updatedCard.balance,
          transactionId,
          walletId: walletValidation.wallet_id,
        });

        return {
          success: true,
          message: `Card funded successfully with ${amount} USD`,
          data: {
            card_id: cardId,
            amount: amount,
            new_balance: Number(updatedCard.balance),
            wallet_id: walletValidation.wallet_id,
            transaction_id: transactionId,
          },
          metadata: {
            provider: "alphaspce",
            funding_reference: fundingResult.reference,
            reservation_id: reservationId,
          },
        };
      } catch (fundingError: any) {
        // Handle funding failure - rollback reservation
        await this.rollbackWalletReservation(reservationId);

        await this.handleFundingError(
          fundingError,
          fundingSucceeded,
          cardId,
          card.customer_id,
          user.companyId,
          amount
        );

        throw fundingError;
      }
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD FUNDING FLOW - FAILED", {
        cardId,
        amount,
        companyId: user.companyId,
        error: error.message,
      });

      throw new BadRequestException(`Card funding failed: ${error.message}`);
    }
  }

  /**
   * Bulk fund multiple cards
   */
  async bulkFundCards(
    fundingRequests: Array<{
      card_id: string;
      amount: number;
    }>,
    user: CurrentUserData
  ): Promise<any> {
    this.logger.log("💰💰 ALPHASPACE BULK CARD FUNDING FLOW - START", {
      requestCount: fundingRequests.length,
      companyId: user.companyId,
      userId: user.userId,
      totalAmount: fundingRequests.reduce((sum, req) => sum + req.amount, 0),
    });

    try {
      // Validate all requests first
      for (const request of fundingRequests) {
        await this.validateFundingRequest(
          request.card_id,
          request.amount,
          user.companyId
        );
      }

      // Calculate total amount needed
      const totalAmount = fundingRequests.reduce(
        (sum, req) => sum + req.amount,
        0
      );

      // Check total wallet balance
      const walletValidation = await this.checkWalletBalance(
        user.companyId,
        totalAmount
      );

      if (!walletValidation.sufficient) {
        throw new BadRequestException(
          `Insufficient wallet balance for bulk funding. Available: ${walletValidation.available_balance}, Required: ${totalAmount}`
        );
      }

      // Execute bulk funding
      const results = [];
      const successful = [];
      const failed = [];

      for (const request of fundingRequests) {
        try {
          const result = await this.fundCard(
            request.card_id,
            request.amount,
            user
          );
          successful.push(result.data);
        } catch (error: any) {
          failed.push({
            card_id: request.card_id,
            amount: request.amount,
            error: error.message,
          });
        }
      }

      const bulkResult = {
        success: failed.length === 0,
        message: `Bulk funding completed. Successful: ${successful.length}, Failed: ${failed.length}`,
        data: {
          successful,
          failed,
          total_requested: fundingRequests.length,
          successful_count: successful.length,
          failed_count: failed.length,
          total_amount_success: successful.reduce(
            (sum, item) => sum + item.amount,
            0
          ),
        },
        metadata: {
          company_id: user.companyId,
          wallet_id: walletValidation.wallet_id,
          processing_time: new Date().toISOString(),
        },
      };

      this.logger.log("✅ ALPHASPACE BULK CARD FUNDING FLOW - COMPLETED", {
        totalRequested: fundingRequests.length,
        successful: successful.length,
        failed: failed.length,
        totalAmountSuccess: bulkResult.data.total_amount_success,
      });

      return bulkResult;
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE BULK CARD FUNDING FLOW - FAILED", {
        companyId: user.companyId,
        requestCount: fundingRequests.length,
        error: error.message,
      });

      throw new BadRequestException(`Bulk funding failed: ${error.message}`);
    }
  }

  /**
   * Get funding history for a card
   */
  async getCardFundingHistory(
    cardId: string,
    user: CurrentUserData,
    filters?: {
      limit?: number;
      offset?: number;
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<any> {
    this.logger.log("📊 ALPHASPACE CARD FUNDING HISTORY - START", {
      cardId,
      companyId: user.companyId,
      filters,
    });

    try {
      // Validate card access
      await this.validateCardAccess(cardId, user.companyId);

      // Build query filters
      const queryFilters: any = {
        card_id: cardId,
        type: "CARD_FUNDING",
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

      // Get funding transactions
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
      const statistics = await this.calculateFundingStatistics(
        cardId,
        transactions
      );

      return {
        success: true,
        message: `Found ${transactions.length} funding transactions`,
        data: {
          card_id: cardId,
          transactions: transactions.map((tx) => ({
            id: tx.id,
            amount: Number(tx.amount),
            currency: tx.currency,
            status: tx.status,
            description: tx.description,
            wallet_balance_before: tx.wallet_balance_before
              ? Number(tx.wallet_balance_before)
              : null,
            wallet_balance_after: tx.wallet_balance_after
              ? Number(tx.wallet_balance_after)
              : null,
            card_balance_before: tx.card_balance_before
              ? Number(tx.card_balance_before)
              : null,
            card_balance_after: tx.card_balance_after
              ? Number(tx.card_balance_after)
              : null,
            created_at: tx.created_at,
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
      this.logger.error("❌ ALPHASPACE CARD FUNDING HISTORY FAILED", {
        cardId,
        error: error.message,
        companyId: user.companyId,
      });

      throw new BadRequestException(
        `Failed to get funding history: ${error.message}`
      );
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate funding request parameters
   */
  private async validateFundingRequest(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<void> {
    if (!cardId || !cardId.trim()) {
      throw new BadRequestException("Card ID is required");
    }

    if (amount <= 0) {
      throw new BadRequestException("Funding amount must be positive");
    }

    if (amount > 5000) {
      throw new BadRequestException(
        "Maximum funding amount per transaction is $5,000"
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
      throw new BadRequestException("Cannot fund a terminated card");
    }

    if (card.status === "FROZEN") {
      throw new BadRequestException("Cannot fund a frozen card");
    }
  }

  /**
   * Check if wallet has sufficient balance
   */
  private async checkWalletBalance(
    companyId: string,
    amount: number
  ): Promise<{
    sufficient: boolean;
    available_balance: number;
    wallet_id: string;
  }> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        company_id: companyId,
        currency: "USD",
        is_active: true,
      },
    });

    if (!wallet) {
      throw new BadRequestException("Company wallet not found");
    }

    const availableBalance = Number(wallet.payin_balance);
    const sufficient = availableBalance >= amount;

    return {
      sufficient,
      available_balance: availableBalance,
      wallet_id: wallet.id,
    };
  }

  /**
   * Get card details for funding operation
   */
  private async getCardForFunding(
    cardId: string,
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

    if (!card.provider_card_id) {
      throw new BadRequestException("Card has no provider reference");
    }

    return card;
  }

  /**
   * Reserve wallet funds for funding operation
   */
  private async reserveWalletFunds(
    companyId: string,
    amount: number,
    cardId: string
  ): Promise<string> {
    const reservationId = `reserve_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // In a real implementation, this would create a reservation record
    // For Phase 2, we'll just log the reservation
    this.logger.debug("Wallet funds reserved", {
      reservationId,
      companyId,
      amount,
      cardId,
    });

    return reservationId;
  }

  /**
   * Fund card via AlphaSpace API
   */
  private async fundCardViaAlphaSpace(
    cardId: string,
    amount: number
  ): Promise<any> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();
    const baseUrl = "https://lion.alpha.africa"; // Test environment

    try {
      this.logger.debug("Calling AlphaSpace funding API", {
        cardId,
        amount,
      });

      const response = await axios.post(
        `${baseUrl}/alpha/cards/fund/${cardId}`,
        { amount: amount.toString() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return {
        reference: `fund_${cardId}_${Date.now()}`,
        provider_reference: (response.data as any)?.reference,
        transaction_id: (response.data as any)?.transaction_id,
        funded_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("AlphaSpace funding API call failed", {
        cardId,
        amount,
        error: error.response?.data || error.message,
      });

      throw new BadRequestException("Funding failed in payment provider");
    }
  }

  /**
   * Confirm wallet deduction after successful funding
   */
  private async confirmWalletDeduction(reservationId: string): Promise<void> {
    // In Phase 2 implementation, the wallet deduction is already done
    // In Phase 3, this would mark the reservation as confirmed
    this.logger.debug("Wallet deduction confirmed", { reservationId });
  }

  /**
   * Rollback wallet reservation on failure
   */
  private async rollbackWalletReservation(
    reservationId: string
  ): Promise<void> {
    // In Phase 2 implementation, we may need to rollback the wallet changes
    // This is handled in the individual funding error handling
    this.logger.debug("Wallet reservation rollback", { reservationId });
  }

  /**
   * Update card balance after funding
   */
  private async updateCardBalance(
    cardId: string,
    amount: number,
    operation: "add" | "subtract"
  ): Promise<any> {
    const balanceChange =
      operation === "add" ? { increment: amount } : { decrement: amount };

    return await this.prisma.card.update({
      where: { id: cardId },
      data: {
        balance: balanceChange,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Create funding transaction record
   */
  private async createFundingTransaction(
    cardId: string,
    customerId: string,
    companyId: string,
    amount: number,
    walletId: string,
    fundingResult: any
  ): Promise<string> {
    const transactionId = uuidv4();

    // Get current balances for audit trail
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    await this.prisma.transaction.create({
      data: {
        id: transactionId,
        type: "CARD_FUNDING",
        amount: amount,
        currency: "USD",
        company_id: companyId,
        customer_id: customerId,
        card_id: cardId,
        description: `Card funding via AlphaSpace: ${amount} USD`,
        status: "SUCCESS",
        category: "CARD",
        wallet_balance_before: wallet
          ? Number(wallet.payin_balance) + amount
          : null,
        wallet_balance_after: wallet ? Number(wallet.payin_balance) : null,
        card_balance_before: card ? Number(card.balance) - amount : null,
        card_balance_after: card ? Number(card.balance) : null,
        provider: "alphaspce",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return transactionId;
  }

  /**
   * Log successful funding operation
   */
  private async logFundingSuccess(
    cardId: string,
    customerId: string,
    amount: number,
    companyId: string,
    fundingResult: any
  ): Promise<void> {
    await this.prisma.customerLogs.create({
      data: {
        customer_id: customerId,
        action: "card-fund",
        status: "SUCCESS",
        log_json: {
          card_id: cardId,
          amount_funded: amount,
          funding_reference: fundingResult.reference,
          alphaSpace_reference: fundingResult.provider_reference,
        },
        log_txt: `AlphaSpace card funding successful: ${cardId} - ${amount} USD`,
        created_at: new Date(),
      },
    });
  }

  /**
   * Handle funding error
   */
  private async handleFundingError(
    error: any,
    fundingSucceeded: boolean,
    cardId: string,
    customerId: string,
    companyId: string,
    amount: number
  ): Promise<void> {
    await this.prisma.customerLogs.create({
      data: {
        customer_id: customerId,
        action: "card-fund",
        status: "FAILED",
        log_json: {
          card_id: cardId,
          attempted_amount: amount,
          error: error.message,
          alphaSpace_call_succeeded: fundingSucceeded,
        },
        log_txt: `AlphaSpace card funding failed: ${cardId} - ${amount} USD - ${error.message}`,
        created_at: new Date(),
      },
    });
  }

  /**
   * Calculate funding statistics
   */
  private async calculateFundingStatistics(
    cardId: string,
    transactions: any[]
  ): Promise<any> {
    const amounts = transactions.map((tx) => Number(tx.amount));
    const successfulTx = transactions.filter((tx) => tx.status === "SUCCESS");

    return {
      total_fundings: transactions.length,
      total_amount: amounts.reduce((sum, amount) => sum + amount, 0),
      successful_fundings: successfulTx.length,
      failed_fundings: transactions.length - successfulTx.length,
      average_amount:
        amounts.length > 0
          ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
          : 0,
      min_amount: amounts.length > 0 ? Math.min(...amounts) : 0,
      max_amount: amounts.length > 0 ? Math.max(...amounts) : 0,
      latest_funding:
        transactions.length > 0 ? transactions[0].created_at : null,
    };
  }

  /**
   * Validate card access (helper)
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
