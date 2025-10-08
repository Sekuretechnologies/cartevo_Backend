// AlphaSpace Fee Management Service
// Advanced fee cascade system adapted from MONIX PaymentDebtManager
// WAVLET adaptation for sophisticated fee collection and debt management

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { v4 as uuidv4 } from "uuid";

export interface FeeContext {
  cardId: string;
  customerId: string;
  companyId: string;
  amount: number;
  currency: string;
  reason: string;
  transactionId?: string;
}

export interface FeeResult {
  success: boolean;
  amount?: number;
  source?: "card_balance" | "wallet_balance" | "debt";
  debtCreated?: boolean;
  debtId?: string;
  transactionId?: string;
  error?: string;
}

export interface DebtRecord {
  id: string;
  customerId: string;
  cardId: string;
  amount: number;
  currency: string;
  reason: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "OVERDUE";
  createdAt: Date;
  dueDate?: Date;
  paidAt?: Date;
}

/**
 * Advanced Fee Management Service for AlphaSpace
 * Implements sophisticated fee collection cascade adapted from MONIX
 *
 * Fee Collection Order:
 * 1. Card Balance (preferred - instant deduction)
 * 2. Company Wallet Balance (fallback - wallet deduction)
 * 3. Debt Creation (last resort - manual collection)
 */
@Injectable()
export class FeeManagementService {
  private readonly logger = new Logger(FeeManagementService.name);

  // Configuration constants (would be made configurable in production)
  private readonly MAX_DEBT_AGE_DAYS = 30;
  private readonly INTEREST_RATE_DAILY = 0.0001; // 0.01% daily for overdue debts
  private readonly MAX_AUTO_COLLECTION_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute fee collection with cascade fallback
   * This is the main entry point for all fee operations
   */
  async collectPaymentFee(feeContext: FeeContext): Promise<FeeResult> {
    this.logger.log("💰 FEE COLLECTION CASCADE - Starting", {
      cardId: feeContext.cardId,
      customerId: feeContext.customerId,
      amount: feeContext.amount,
      reason: feeContext.reason,
    });

    try {
      // Step 1: Validate fee context
      await this.validateFeeContext(feeContext);

      // Step 2: Attempt card balance deduction (preferred method)
      const cardResult = await this.attemptCardFeeDeduction(feeContext);
      if (cardResult.success) {
        this.logger.log("✅ FEE COLLECTED - Card balance deduction", {
          amount: cardResult.amount,
          cardId: feeContext.cardId,
          transactionId: cardResult.transactionId,
        });
        return cardResult;
      }

      // Step 3: Attempt wallet balance deduction (fallback method)
      const walletResult = await this.attemptWalletFeeDeduction(feeContext);
      if (walletResult.success) {
        this.logger.log("✅ FEE COLLECTED - Wallet balance deduction", {
          amount: walletResult.amount,
          walletUsed: true,
          transactionId: walletResult.transactionId,
        });
        return walletResult;
      }

      // Step 4: Create payment debt (last resort method)
      const debtResult = await this.createPaymentDebt(feeContext);
      this.logger.log("⚠️ FEE DEBT CREATED - Manual collection required", {
        debtId: debtResult.debtId,
        amount: feeContext.amount,
        customerId: feeContext.customerId,
      });
      return debtResult;
    } catch (error: any) {
      this.logger.error("❌ FEE COLLECTION FAILED - Critical error", {
        error: error.message,
        feeContext,
        stack: error.stack,
      });

      // Log critical fee collection failure
      await this.logFeeCollectionFailure(feeContext, error);

      return {
        success: false,
        error: `Fee collection failed: ${error.message}`,
      };
    }
  }

  /**
   * Bulk fee collection for multiple cards/transactions
   */
  async collectBulkFees(feeContexts: FeeContext[]): Promise<any> {
    this.logger.log("💰💰 BULK FEE COLLECTION - Starting", {
      batchSize: feeContexts.length,
      totalAmount: feeContexts.reduce((sum, ctx) => sum + ctx.amount, 0),
    });

    const results = {
      processed: [] as any[],
      successful: [] as any[],
      debtCreated: [] as any[],
      failed: [] as any[],
    };

    let totalCollected = 0;
    let totalDebtsCreated = 0;

    for (const feeContext of feeContexts) {
      try {
        const result = await this.collectPaymentFee(feeContext);

        if (result.success) {
          results.successful.push({
            cardId: feeContext.cardId,
            amount: result.amount,
            source: result.source,
            transactionId: result.transactionId,
          });

          if (result.source !== "debt") {
            totalCollected += result.amount || 0;
          } else {
            totalDebtsCreated += result.amount || 0;
          }
        } else {
          results.failed.push({
            cardId: feeContext.cardId,
            amount: feeContext.amount,
            error: result.error,
          });
        }

        results.processed.push({
          cardId: feeContext.cardId,
          result: result.success ? "success" : "failed",
        });

        if (result.debtCreated) {
          results.debtCreated.push({
            cardId: feeContext.cardId,
            amount: feeContext.amount,
            debtId: result.transactionId,
          });
        }
      } catch (error: any) {
        results.failed.push({
          cardId: feeContext.cardId,
          amount: feeContext.amount,
          error: error.message,
        });
      }
    }

    const summary = {
      batchSize: feeContexts.length,
      successful: results.successful.length,
      failed: results.failed.length,
      collectedAmount: totalCollected,
      debtAmount: totalDebtsCreated,
      debtCount: results.debtCreated.length,
      successRate: (results.successful.length / feeContexts.length) * 100,
    };

    this.logger.log("✅ BULK FEE COLLECTION - Completed", summary);

    return {
      summary,
      details: results,
    };
  }

  /**
   * Get fee collection statistics for company
   */
  async getCompanyFeeStatistics(
    companyId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    try {
      const dateFilter = dateRange
        ? { gte: dateRange.start, lte: dateRange.end }
        : {};

      // Get fee transactions
      const feeTransactions = await this.prisma.transaction.findMany({
        where: {
          company_id: companyId,
          type: "FEE_COLLECTION",
          created_at: dateFilter,
        },
        include: {
          customer: true,
          card: true,
        },
        orderBy: { created_at: "desc" },
      });

      // Get outstanding debts
      const outstandingDebts = await this.getOutstandingDebts(
        companyId,
        dateRange
      );

      const statistics = {
        totalFeesCollected: feeTransactions.reduce(
          (sum, tx) => sum + Number(tx.amount),
          0
        ),
        totalTransactions: feeTransactions.length,
        cardDeductions: feeTransactions.filter((tx) =>
          tx.description?.includes("card_balance")
        ).length,
        walletDeductions: feeTransactions.filter((tx) =>
          tx.description?.includes("wallet_balance")
        ).length,
        outstandingDebts: outstandingDebts.length,
        totalDebtAmount: outstandingDebts.reduce(
          (sum, debt) => sum + debt.amount,
          0
        ),
        averageFeePerTransaction:
          feeTransactions.length > 0
            ? feeTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0) /
              feeTransactions.length
            : 0,
      };

      return {
        statistics,
        recentFees: feeTransactions.slice(0, 10),
        outstandingDebts,
      };
    } catch (error: any) {
      this.logger.error("Failed to get company fee statistics", {
        companyId,
        error: error.message,
      });

      throw new BadRequestException(
        `Failed to get fee statistics: ${error.message}`
      );
    }
  }

  /**
   * Process debt collection (manual or automated)
   */
  async processDebtCollection(
    debtId: string,
    paymentAmount: number,
    paymentMethod: string
  ): Promise<any> {
    try {
      // Get debt record
      const debt = await this.prisma.customerLogs.findUnique({
        where: { id: debtId },
      });

      const debtJson = debt?.log_json as any;

      if (!debtJson?.debtRecord) {
        throw new BadRequestException("Debt record not found");
      }

      const debtData = debtJson.debtRecord;

      // Validate payment amount
      if (paymentAmount > debtData.amount) {
        throw new BadRequestException("Payment amount exceeds debt amount");
      }

      // Record debt payment
      await this.prisma.customerLogs.create({
        data: {
          customer_id: debtData.customerId,
          action: "debt_payment",
          status: "SUCCESS",
          log_json: {
            debtId: debtId,
            paymentAmount: paymentAmount,
            paymentMethod: paymentMethod,
            remainingAmount: debtData.amount - paymentAmount,
            originalDebt: debtData,
          },
          log_txt: `Debt payment received: ${paymentAmount} USD via ${paymentMethod}`,
        },
      });

      // Update debt status
      const newStatus =
        paymentAmount >= debtData.amount ? "PAID" : "PARTIALLY_PAID";

      const debtLogJson = debt.log_json as any;

      await this.prisma.customerLogs.update({
        where: { id: debtId },
        data: {
          log_json: {
            ...debtLogJson,
            status: newStatus,
            paymentsReceived:
              (debtLogJson.paymentsReceived || 0) + paymentAmount,
            paidAt: newStatus === "PAID" ? new Date() : undefined,
          },
        },
      });

      // Create financial transaction
      await this.prisma.transaction.create({
        data: {
          id: uuidv4(),
          type: "DEBT_PAYMENT",
          amount: paymentAmount,
          currency: debtData.currency,
          company_id: debtData.companyId,
          customer_id: debtData.customerId,
          description: `Debt payment received: ${paymentAmount} USD`,
          status: "SUCCESS",
          category: "PAYMENT",
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        debtId: debtId,
        paymentAmount: paymentAmount,
        remainingAmount: debtData.amount - paymentAmount,
        fullyPaid: paymentAmount >= debtData.amount,
        status: newStatus,
      };
    } catch (error: any) {
      this.logger.error("Debt collection processing failed", {
        debtId,
        paymentAmount,
        error: error.message,
      });

      throw new BadRequestException(`Debt collection failed: ${error.message}`);
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Attempt to deduct fee from card balance (preferred method)
   */
  private async attemptCardFeeDeduction(
    feeContext: FeeContext
  ): Promise<FeeResult> {
    try {
      const card = await this.prisma.card.findUnique({
        where: { id: feeContext.cardId },
      });

      if (!card) {
        return { success: false, error: "Card not found" };
      }

      const currentBalance = Number(card.balance);

      // Check if card has sufficient balance
      if (currentBalance >= feeContext.amount) {
        // Deduct from card balance
        await this.prisma.card.update({
          where: { id: feeContext.cardId },
          data: {
            balance: { decrement: feeContext.amount },
            updated_at: new Date(),
          },
        });

        // Record fee transaction
        const transactionId = await this.recordFeeTransaction(
          feeContext,
          "card_balance"
        );

        // Log successful deduction
        await this.logFeeDeduction(
          feeContext,
          "card_balance",
          feeContext.amount
        );

        return {
          success: true,
          amount: feeContext.amount,
          source: "card_balance",
          transactionId,
        };
      }

      return {
        success: false,
        error: `Insufficient card balance: ${currentBalance} < ${feeContext.amount}`,
      };
    } catch (error: any) {
      this.logger.error("Card fee deduction failed", {
        feeContext,
        error: error.message,
      });

      return {
        success: false,
        error: `Card deduction failed: ${error.message}`,
      };
    }
  }

  /**
   * Attempt to deduct fee from company wallet (fallback method)
   */
  private async attemptWalletFeeDeduction(
    feeContext: FeeContext
  ): Promise<FeeResult> {
    try {
      // Get company's primary wallet
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          company_id: feeContext.companyId,
          currency: feeContext.currency,
          is_active: true,
        },
        orderBy: { created_at: "desc" }, // Use most recent wallet
      });

      if (!wallet) {
        return { success: false, error: "Company wallet not found" };
      }

      const availableBalance = Number(wallet.payin_balance);

      if (availableBalance >= feeContext.amount) {
        // Deduct from wallet balance
        await this.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            payin_balance: { decrement: feeContext.amount },
            balance: { decrement: feeContext.amount }, // Also decrement overall balance
          },
        });

        // Record fee transaction
        const transactionId = await this.recordFeeTransaction(
          feeContext,
          "wallet_balance"
        );

        // Log successful deduction
        await this.logFeeDeduction(
          feeContext,
          "wallet_balance",
          feeContext.amount
        );

        return {
          success: true,
          amount: feeContext.amount,
          source: "wallet_balance",
          transactionId,
        };
      }

      return {
        success: false,
        error: `Insufficient wallet balance: ${availableBalance} < ${feeContext.amount}`,
      };
    } catch (error: any) {
      this.logger.error("Wallet fee deduction failed", {
        feeContext,
        error: error.message,
      });

      return {
        success: false,
        error: `Wallet deduction failed: ${error.message}`,
      };
    }
  }

  /**
   * Create payment debt for manual collection (last resort)
   */
  private async createPaymentDebt(feeContext: FeeContext): Promise<FeeResult> {
    try {
      const debtId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + this.MAX_DEBT_AGE_DAYS);

      const debtRecord: DebtRecord = {
        id: debtId,
        customerId: feeContext.customerId,
        cardId: feeContext.cardId,
        amount: feeContext.amount,
        currency: feeContext.currency,
        reason: `Payment fee: ${feeContext.reason}`,
        status: "PENDING",
        createdAt: new Date(),
        dueDate: dueDate,
      };

      // Create comprehensive debt record
      await this.prisma.customerLogs.create({
        data: {
          id: debtId,
          customer_id: feeContext.customerId,
          action: "payment_debt_created",
          status: "PENDING",
          log_json: {
            debtRecord: debtRecord,
            context: feeContext,
          } as any,
          log_txt: `Payment debt created: ${feeContext.amount} ${feeContext.currency} for ${feeContext.reason}`,
        },
      });

      // Record initial debt transaction
      const transactionId = await this.recordFeeTransaction(
        feeContext,
        "debt",
        debtId
      );

      // Log debt creation
      this.logger.warn("💰 PAYMENT DEBT CREATED", {
        debtId,
        customerId: feeContext.customerId,
        cardId: feeContext.cardId,
        amount: feeContext.amount,
        dueDate: dueDate.toISOString(),
      });

      return {
        success: true,
        amount: feeContext.amount,
        source: "debt",
        debtCreated: true,
        transactionId,
      };
    } catch (error: any) {
      this.logger.error("Debt creation failed", {
        feeContext,
        error: error.message,
      });

      return {
        success: false,
        error: `Debt creation failed: ${error.message}`,
      };
    }
  }

  /**
   * Get outstanding debts for a company
   */
  private async getOutstandingDebts(
    companyId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any[]> {
    const dateFilter = dateRange
      ? { gte: dateRange.start, lte: dateRange.end }
      : {};

    // Get debt IDs for customers in this company
    const customerIds = await this.prisma.customer.findMany({
      where: { company_id: companyId },
      select: { id: true },
    });

    const customerIdList = customerIds.map((c) => c.id);

    const debts = await this.prisma.customerLogs.findMany({
      where: {
        action: "payment_debt_created",
        status: "PENDING",
        customer_id: { in: customerIdList },
        created_at: dateFilter,
      },
    });

    return debts.map((debt) => {
      const debtJson = debt.log_json as any;
      return {
        id: debt.id,
        customerId: debt.customer_id,
        customerName: "Customer", // Would need separate query for name
        amount: debtJson?.debtRecord?.amount || 0,
        currency: debtJson?.debtRecord?.currency || "USD",
        reason: debtJson?.debtRecord?.reason || "Unknown",
        createdAt: debt.created_at,
        dueDate: debtJson?.debtRecord?.dueDate,
        daysOverdue: this.calculateDaysOverdue(debtJson?.debtRecord?.dueDate),
      };
    });
  }

  // ==================== UTILITY METHODS ====================

  private async validateFeeContext(feeContext: FeeContext): Promise<void> {
    if (!feeContext.cardId || !feeContext.customerId || !feeContext.companyId) {
      throw new BadRequestException(
        "Invalid fee context: missing required fields"
      );
    }

    if (feeContext.amount <= 0) {
      throw new BadRequestException("Fee amount must be positive");
    }

    if (!feeContext.reason?.trim()) {
      throw new BadRequestException("Fee reason is required");
    }
  }

  private async recordFeeTransaction(
    feeContext: FeeContext,
    collectionMethod: string,
    debtId?: string
  ): Promise<string> {
    const transactionId = uuidv4();

    await this.prisma.transaction.create({
      data: {
        id: transactionId,
        type: "FEE_COLLECTION",
        amount: feeContext.amount,
        currency: feeContext.currency,
        company_id: feeContext.companyId,
        customer_id: feeContext.customerId,
        card_id: feeContext.cardId,
        description: `Fee collected via ${collectionMethod}: ${
          feeContext.reason
        }${debtId ? ` (Debt: ${debtId})` : ""}`,
        status: "SUCCESS",
        category: "FEE",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return transactionId;
  }

  private async logFeeDeduction(
    feeContext: FeeContext,
    source: string,
    amount: number
  ): Promise<void> {
    await this.prisma.customerLogs.create({
      data: {
        customer_id: feeContext.customerId,
        action: "fee_deducted",
        status: "SUCCESS",
        log_json: {
          feeContext,
          collectionSource: source,
          amountDeducted: amount,
        } as any,
        log_txt: `Fee deducted from ${source}: ${amount} ${feeContext.currency} for ${feeContext.reason}`,
      },
    });
  }

  private async logFeeCollectionFailure(
    feeContext: FeeContext,
    error: any
  ): Promise<void> {
    await this.prisma.customerLogs.create({
      data: {
        customer_id: feeContext.customerId,
        action: "fee_collection_failed",
        status: "FAILED",
        log_json: {
          feeContext,
          error: error.message,
          severity: "CRITICAL", // Fee collection failures are critical
        } as any,
        log_txt: `CRITICAL: Fee collection failure: ${error.message} (${feeContext.amount} ${feeContext.currency})`,
      },
    });
  }

  private calculateDaysOverdue(dueDate?: string | Date): number {
    if (!dueDate) return 0;

    const due = new Date(dueDate);
    const now = new Date();

    if (now <= due) return 0;

    const diffTime = now.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate debt aging and interest (for future enhancement)
   */
  private calculateDebtAgingAndInterest(debt: DebtRecord): {
    totalAmount: number;
    interest: number;
  } {
    const daysOverdue = this.calculateDaysOverdue(debt.dueDate);

    if (daysOverdue <= 0) {
      return { totalAmount: debt.amount, interest: 0 };
    }

    const interest = debt.amount * daysOverdue * this.INTEREST_RATE_DAILY;
    const totalAmount = debt.amount + interest;

    return { totalAmount, interest };
  }
}
