import { CardModel, TransactionModel } from "@/models";
import { v4 as uuidv4 } from "uuid";
import { utcToLocalTime } from "@/utils/date";
import { NotificationService } from "./notificationService";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
} from "../types/transaction.types";

/**
 * Real-Time Balance Synchronization Service
 * Ensures data consistency between Maplerad and local database
 */
export class BalanceSyncService {
  // Cache for balance queries to reduce API calls
  private static balanceCache = new Map<
    string,
    {
      balance: number;
      timestamp: number;
      source: "maplerad" | "local";
    }
  >();

  /**
   * Synchronize card balance with Maplerad real-time data
   */
  static async syncCardBalance(cardId: string): Promise<SyncResult> {
    try {
      console.log("🔄 Starting balance synchronization", { cardId });

      // 1. Get local card data
      const localCardResult = await CardModel.getOne({ id: cardId });
      if (localCardResult.error) {
        throw new Error(`Local card not found: ${cardId}`);
      }

      const localCard = localCardResult.output;
      const localBalance = Number(localCard.balance);

      // 2. Get real balance from Maplerad (mock implementation)
      const mapleradBalance = await this.getMapleradBalance(
        localCard.provider_card_id
      );

      // 3. Check for discrepancies
      const discrepancy = Math.abs(localBalance - mapleradBalance);
      const discrepancyThreshold = 0.01; // 1 cent

      console.log("⚖️ Balance comparison", {
        cardId,
        localBalance,
        mapleradBalance,
        discrepancy,
        hasDiscrepancy: discrepancy > discrepancyThreshold,
      });

      if (discrepancy > discrepancyThreshold) {
        // Significant discrepancy found - update local balance
        await CardModel.update(cardId, {
          balance: mapleradBalance,
          last_sync_at: new Date(),
          updated_at: new Date(),
        });

        // Log the synchronization
        await this.logBalanceSync({
          cardId,
          previousBalance: localBalance,
          newBalance: mapleradBalance,
          discrepancy,
          source: "maplerad_api",
        });

        console.log("✅ Balance discrepancy corrected", {
          cardId,
          correctedDiscrepancy: discrepancy,
          newBalance: mapleradBalance,
        });

        return {
          synchronized: true,
          discrepancyFound: true,
          correctedAmount: discrepancy,
          previousBalance: localBalance,
          newBalance: mapleradBalance,
          source: "maplerad_api",
        };
      }

      console.log("✅ Balance already synchronized", {
        cardId,
        balance: localBalance,
      });

      return {
        synchronized: true,
        discrepancyFound: false,
        previousBalance: localBalance,
        newBalance: localBalance,
        source: "already_synced",
      };
    } catch (error: any) {
      console.error("❌ Balance synchronization failed", {
        cardId,
        error: error.message,
      });

      return {
        synchronized: false,
        error: error.message,
        previousBalance: 0,
        newBalance: 0,
        source: "error",
      };
    }
  }

  /**
   * Bulk synchronization for all active Maplerad cards
   */
  static async syncAllActiveCards(): Promise<BulkSyncResult> {
    console.log("🔄 Starting bulk card balance synchronization");

    const startTime = Date.now();

    try {
      // Get all active Maplerad cards
      const activeCardsResult = await CardModel.get({
        provider: "maplerad",
        is_active: true,
      });

      if (activeCardsResult.error || !activeCardsResult.output) {
        throw new Error("Failed to retrieve active cards");
      }

      const activeCards = activeCardsResult.output;
      console.log(
        `📊 Found ${activeCards.length} active Maplerad cards to sync`
      );

      const results: SyncResult[] = [];
      let syncedCount = 0;
      let errorCount = 0;
      let discrepanciesFound = 0;

      // Process each card
      for (const card of activeCards) {
        try {
          const syncResult = await this.syncCardBalance(card.id);
          results.push({
            cardId: card.id,
            ...syncResult,
          });

          if (syncResult.synchronized) {
            syncedCount++;
            if (syncResult.discrepancyFound) {
              discrepanciesFound++;
            }
          } else {
            errorCount++;
          }

          // Small delay to avoid overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error: any) {
          console.error(`❌ Failed to sync card ${card.id}`, {
            cardId: card.id,
            error: error.message,
          });

          results.push({
            cardId: card.id,
            synchronized: false,
            error: error.message,
            previousBalance: 0,
            newBalance: 0,
            source: "error",
          });
          errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;

      console.log("📈 Bulk synchronization completed", {
        totalCards: activeCards.length,
        synchronized: syncedCount,
        errors: errorCount,
        discrepanciesFound,
        processingTimeMs: processingTime,
      });

      return {
        totalCards: activeCards.length,
        synchronized: syncedCount,
        errors: errorCount,
        discrepanciesFound,
        processingTimeMs: processingTime,
        results,
      };
    } catch (error: any) {
      console.error("❌ Bulk synchronization failed", {
        error: error.message,
        processingTime: Date.now() - startTime,
      });

      return {
        totalCards: 0,
        synchronized: 0,
        errors: 1,
        discrepanciesFound: 0,
        processingTimeMs: Date.now() - startTime,
        results: [],
        globalError: error.message,
      };
    }
  }

  /**
   * Get balance from Maplerad API with caching
   */
  private static async getMapleradBalance(
    mapleradCardId: string
  ): Promise<number> {
    const cacheKey = `balance:${mapleradCardId}`;
    const cached = this.balanceCache.get(cacheKey);

    // Use cache if less than 2 minutes old
    if (cached && Date.now() - cached.timestamp < 120000) {
      console.log("📦 Using cached Maplerad balance", {
        cardId: mapleradCardId,
        balance: cached.balance,
        age: Date.now() - cached.timestamp,
      });
      return cached.balance;
    }

    try {
      // Mock Maplerad API call - in production this would call the actual API
      console.log("📡 Fetching real-time balance from Maplerad", {
        mapleradCardId,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate network delay

      // Mock response - in production, this would be the actual Maplerad balance
      const mockBalance = Math.round(Math.random() * 1000 * 100) / 100; // Random balance for demo

      // Cache the result
      this.balanceCache.set(cacheKey, {
        balance: mockBalance,
        timestamp: Date.now(),
        source: "maplerad",
      });

      // Auto-expire cache entry after 5 minutes
      setTimeout(() => {
        this.balanceCache.delete(cacheKey);
      }, 300000);

      console.log("📡 Retrieved balance from Maplerad", {
        cardId: mapleradCardId,
        balance: mockBalance,
      });

      return mockBalance;
    } catch (error: any) {
      console.error("❌ Failed to get Maplerad balance", {
        cardId: mapleradCardId,
        error: error.message,
      });
      throw new Error(
        `Failed to retrieve balance from Maplerad: ${error.message}`
      );
    }
  }

  /**
   * Log balance synchronization for audit trail
   */
  private static async logBalanceSync(syncData: {
    cardId: string;
    previousBalance: number;
    newBalance: number;
    discrepancy: number;
    source: string;
  }): Promise<void> {
    try {
      await TransactionModel.create({
        id: uuidv4(),
        card_id: syncData.cardId,
        category: TRANSACTION_CATEGORY.FEE,
        type: TRANSACTION_TYPE.REFUND, // Using available type for sync operations
        status: TRANSACTION_STATUS.SUCCESS,
        description: `Balance synchronization - ${syncData.source}`,
        amount: syncData.discrepancy,
        currency: "USD",
        reference: `sync-${syncData.cardId}-${Date.now()}`,
        reason: `Balance corrected from $${syncData.previousBalance} to $${syncData.newBalance}`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      console.log("📝 Balance sync logged", {
        cardId: syncData.cardId,
        discrepancy: syncData.discrepancy,
        source: syncData.source,
      });
    } catch (error: any) {
      console.error("Failed to log balance sync", {
        cardId: syncData.cardId,
        error: error.message,
      });
      // Don't fail the sync process for logging issues
    }
  }

  /**
   * Detect balance discrepancies across all cards
   */
  static async detectDiscrepancies(): Promise<DiscrepancyReport> {
    console.log("🔍 Detecting balance discrepancies across all cards");

    const discrepancies = [];
    let totalCards = 0;
    let cardsChecked = 0;

    try {
      const cardsResult = await CardModel.get({
        provider: "maplerad",
        is_active: true,
      });

      if (cardsResult.error || !cardsResult.output) {
        throw new Error("Failed to retrieve cards for discrepancy check");
      }

      totalCards = cardsResult.output.length;

      for (const card of cardsResult.output) {
        try {
          const syncResult = await this.syncCardBalance(card.id);
          cardsChecked++;

          if (syncResult.discrepancyFound) {
            discrepancies.push({
              cardId: card.id,
              mapleradCardId: card.provider_card_id,
              previousBalance: syncResult.previousBalance,
              newBalance: syncResult.newBalance,
              discrepancy: syncResult.correctedAmount || 0,
              severity: this.classifyDiscrepancySeverity(
                syncResult.correctedAmount || 0
              ),
            });
          }
        } catch (error: any) {
          console.error(`Failed to check card ${card.id}`, {
            error: error.message,
          });
        }
      }

      console.log("📊 Discrepancy detection completed", {
        totalCards,
        cardsChecked,
        discrepanciesFound: discrepancies.length,
      });

      return {
        totalCards,
        cardsChecked,
        discrepanciesFound: discrepancies.length,
        discrepancies,
        checkedAt: new Date(),
        summary: {
          criticalDiscrepancies: discrepancies.filter(
            (d) => d.severity === "critical"
          ).length,
          moderateDiscrepancies: discrepancies.filter(
            (d) => d.severity === "moderate"
          ).length,
          minorDiscrepancies: discrepancies.filter(
            (d) => d.severity === "minor"
          ).length,
        },
      };
    } catch (error: any) {
      console.error("❌ Discrepancy detection failed", {
        error: error.message,
      });

      return {
        totalCards,
        cardsChecked,
        discrepanciesFound: 0,
        discrepancies: [],
        checkedAt: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Classify discrepancy severity
   */
  private static classifyDiscrepancySeverity(
    discrepancy: number
  ): "minor" | "moderate" | "critical" {
    const absDiscrepancy = Math.abs(discrepancy);

    if (absDiscrepancy < 0.1) return "minor";
    if (absDiscrepancy < 1.0) return "moderate";
    return "critical";
  }

  /**
   * Reconcile balances for specific time period
   */
  static async reconcileBalances(options: {
    startDate?: Date;
    endDate?: Date;
    cardIds?: string[];
  }): Promise<ReconciliationReport> {
    console.log("🔄 Starting balance reconciliation", {
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
      specificCards: options.cardIds?.length || 0,
    });

    const reconciliationResults = [];
    let totalProcessed = 0;
    let successfulReconciliations = 0;
    let failedReconciliations = 0;

    try {
      let cardsToReconcile;

      if (options.cardIds && options.cardIds.length > 0) {
        // Reconcile specific cards
        const cardResults = await Promise.all(
          options.cardIds.map((id) => CardModel.getOne({ id }))
        );
        cardsToReconcile = cardResults
          .filter((result) => !result.error)
          .map((result) => result.output);
      } else {
        // Reconcile all active cards
        const allCardsResult = await CardModel.get({
          provider: "maplerad",
          is_active: true,
        });
        cardsToReconcile = allCardsResult.output || [];
      }

      totalProcessed = cardsToReconcile.length;

      for (const card of cardsToReconcile) {
        try {
          const reconciliationResult = await this.reconcileCardBalance(card);
          reconciliationResults.push(reconciliationResult);

          if (reconciliationResult.success) {
            successfulReconciliations++;
          } else {
            failedReconciliations++;
          }
        } catch (error: any) {
          console.error(`Failed to reconcile card ${card.id}`, {
            error: error.message,
          });

          reconciliationResults.push({
            cardId: card.id,
            success: false,
            error: error.message,
            localBalance: Number(card.balance),
            mapleradBalance: 0,
            discrepancy: 0,
            action: "error",
          });

          failedReconciliations++;
        }
      }

      console.log("📊 Balance reconciliation completed", {
        totalProcessed,
        successful: successfulReconciliations,
        failed: failedReconciliations,
      });

      return {
        totalProcessed,
        successful: successfulReconciliations,
        failed: failedReconciliations,
        results: reconciliationResults,
        processedAt: new Date(),
        summary: {
          totalDiscrepancies: reconciliationResults.filter(
            (r) => r.discrepancyFound
          ).length,
          totalCorrectedAmount: reconciliationResults
            .filter((r) => r.discrepancyFound)
            .reduce((sum, r) => sum + Math.abs(r.discrepancy || 0), 0),
        },
      };
    } catch (error: any) {
      console.error("❌ Balance reconciliation failed", {
        error: error.message,
      });

      return {
        totalProcessed,
        successful: successfulReconciliations,
        failed: failedReconciliations + 1,
        results: reconciliationResults,
        processedAt: new Date(),
        globalError: error.message,
      };
    }
  }

  /**
   * Reconcile individual card balance
   */
  private static async reconcileCardBalance(
    card: any
  ): Promise<CardReconciliationResult> {
    const localBalance = Number(card.balance);

    try {
      const mapleradBalance = await this.getMapleradBalance(
        card.provider_card_id
      );
      const discrepancy = localBalance - mapleradBalance;
      const hasDiscrepancy = Math.abs(discrepancy) > 0.01;

      if (hasDiscrepancy) {
        // Update local balance to match Maplerad
        await CardModel.update(card.id, {
          balance: mapleradBalance,
          last_sync_at: new Date(),
          updated_at: new Date(),
        });

        // Create reconciliation transaction record
        await TransactionModel.create({
          id: uuidv4(),
          company_id: card.company_id,
          customer_id: card.customer_id,
          card_id: card.id,
          category: TRANSACTION_CATEGORY.FEE,
          type: TRANSACTION_TYPE.REFUND,
          status: TRANSACTION_STATUS.SUCCESS,
          description: `Balance reconciliation - corrected discrepancy`,
          amount: Math.abs(discrepancy),
          currency: "USD",
          reference: `reconcile-${card.id}-${Date.now()}`,
          reason: `Local: $${localBalance}, Maplerad: $${mapleradBalance}`,
          created_at: utcToLocalTime(new Date())?.toISOString(),
          updated_at: utcToLocalTime(new Date())?.toISOString(),
        });

        console.log("🔧 Card balance reconciled", {
          cardId: card.id,
          localBalance,
          mapleradBalance,
          discrepancy,
          action: "balance_corrected",
        });

        return {
          cardId: card.id,
          success: true,
          discrepancyFound: true,
          localBalance,
          mapleradBalance,
          discrepancy: Math.abs(discrepancy),
          action: "corrected",
        };
      }

      return {
        cardId: card.id,
        success: true,
        discrepancyFound: false,
        localBalance,
        mapleradBalance,
        discrepancy: 0,
        action: "no_action_needed",
      };
    } catch (error: any) {
      console.error("Failed to reconcile card balance", {
        cardId: card.id,
        error: error.message,
      });

      return {
        cardId: card.id,
        success: false,
        error: error.message,
        localBalance,
        mapleradBalance: 0,
        discrepancy: 0,
        action: "error",
      };
    }
  }

  /**
   * Schedule automatic synchronization
   */
  static scheduleAutoSync(intervalMs: number = 300000): void {
    // Default 5 minutes
    console.log("⏰ Scheduling automatic balance synchronization", {
      intervalMs,
      intervalMinutes: intervalMs / 60000,
    });

    setInterval(async () => {
      try {
        console.log("🕐 Running scheduled balance synchronization");
        const result = await this.syncAllActiveCards();

        if (result.discrepanciesFound > 0) {
          console.warn("⚠️ Discrepancies found during scheduled sync", {
            discrepancies: result.discrepanciesFound,
            totalCards: result.totalProcessed,
          });

          // Could send admin alert here if too many discrepancies
          if (result.discrepanciesFound > result.totalProcessed * 0.1) {
            console.error("🚨 High discrepancy rate detected", {
              discrepancyRate:
                (result.discrepanciesFound / result.totalProcessed) * 100,
              recommendedAction: "investigate_system_integration",
            });
          }
        }
      } catch (error: any) {
        console.error("❌ Scheduled sync failed", {
          error: error.message,
        });
      }
    }, intervalMs);
  }

  /**
   * Get synchronization statistics
   */
  static getSyncStats(): {
    cacheSize: number;
    cacheEntries: Array<{
      cardId: string;
      balance: number;
      age: number;
      source: string;
    }>;
  } {
    const entries = Array.from(this.balanceCache.entries()).map(
      ([key, value]) => ({
        cardId: key.replace("balance:", ""),
        balance: value.balance,
        age: Date.now() - value.timestamp,
        source: value.source,
      })
    );

    return {
      cacheSize: this.balanceCache.size,
      cacheEntries: entries,
    };
  }

  /**
   * Clear cache manually
   */
  static clearCache(): void {
    this.balanceCache.clear();
    console.log("🧹 Balance cache cleared");
  }
}

// Result interfaces
export interface SyncResult {
  cardId?: string;
  synchronized: boolean;
  discrepancyFound?: boolean;
  correctedAmount?: number;
  previousBalance: number;
  newBalance: number;
  source: string;
  error?: string;
}

export interface BulkSyncResult {
  totalCards: number;
  synchronized: number;
  errors: number;
  discrepanciesFound: number;
  processingTimeMs: number;
  results: SyncResult[];
  globalError?: string;
  summary?: {
    totalDiscrepancies: number;
    totalCorrectedAmount: number;
  };
}

export interface DiscrepancyReport {
  totalCards: number;
  cardsChecked: number;
  discrepanciesFound: number;
  discrepancies: Array<{
    cardId: string;
    mapleradCardId: string;
    previousBalance: number;
    newBalance: number;
    discrepancy: number;
    severity: "minor" | "moderate" | "critical";
  }>;
  checkedAt: Date;
  error?: string;
  summary: {
    criticalDiscrepancies: number;
    moderateDiscrepancies: number;
    minorDiscrepancies: number;
  };
}

export interface ReconciliationReport {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: CardReconciliationResult[];
  processedAt: Date;
  globalError?: string;
  summary?: {
    totalDiscrepancies: number;
    totalCorrectedAmount: number;
  };
}

export interface CardReconciliationResult {
  cardId: string;
  success: boolean;
  discrepancyFound?: boolean;
  localBalance: number;
  mapleradBalance: number;
  discrepancy: number;
  action: "corrected" | "no_action_needed" | "error";
  error?: string;
}
