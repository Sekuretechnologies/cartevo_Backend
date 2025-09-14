import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CardStatus } from "@prisma/client";
import {
  TransactionCategory,
  TransactionType,
  TransactionStatus,
} from "@/types";
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
import { MapleradUtils } from "../utils/maplerad.utils";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";

/**
 * Advanced Card Synchronization Service for Maplerad
 * Implements comprehensive card data synchronization with MONIX-style advanced features
 */
@Injectable()
export class CardSyncService {
  private readonly logger = new Logger(CardSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sync a single card with advanced MONIX-style features
   */
  async syncCard(
    cardId: string,
    user: CurrentUserData,
    options?: {
      force?: boolean;
      includeSensitive?: boolean;
    }
  ): Promise<any> {
    this.logger.log("🔄 ADVANCED CARD SYNC FLOW - START", {
      cardId,
      userId: user.userId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, user);

      // 2. Check if sync is needed (unless forced)
      if (!options?.force && !this.isSyncNeeded(card)) {
        return {
          success: true,
          message: "Card is already up to date",
          card_id: cardId,
          skipped: true,
          last_sync: card.updated_at,
        };
      }

      // 3. Fetch latest data from Maplerad
      const mapleradData = await this.fetchCardFromMaplerad(
        card.provider_card_id,
        options?.includeSensitive
      );

      // 4. Detect changes and calculate differences
      const changes = this.detectCardChanges(card, mapleradData);

      // 5. Handle termination refund if card was newly terminated
      const terminationResult = await this.handleTerminationRefundIfNeeded(
        card,
        mapleradData,
        user.companyId
      );

      // 6. Apply changes to local database
      const updateResult = await this.applyCardChanges(cardId, changes);

      // 7. Log sync operation
      await this.logCardSync(
        cardId,
        card.customer_id,
        changes,
        terminationResult
      );

      this.logger.log("✅ ADVANCED CARD SYNC FLOW - COMPLETED", {
        cardId,
        changesApplied: Object.keys(changes).length,
        terminationProcessed: terminationResult.processed,
        success: true,
      });

      return {
        success: true,
        card_id: cardId,
        changes_applied: changes,
        termination_handled: terminationResult,
        synced_at: new Date().toISOString(),
        provider_data: options?.includeSensitive ? mapleradData : undefined,
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD SYNC FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card sync failed: ${error.message}`);
    }
  }

  /**
   * Sync all customer cards with advanced MONIX-style features
   */
  async syncCustomerCards(
    customerId: string,
    user: CurrentUserData,
    options?: {
      force?: boolean;
      maxConcurrency?: number;
    }
  ): Promise<any> {
    this.logger.log("👤🔄 ADVANCED CUSTOMER CARDS SYNC FLOW - START", {
      customerId,
      userId: user.userId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate customer ownership
      const customer = await this.validateCustomerAccess(customerId, user);

      // 2. Get all customer cards
      const cardsResult = await CardModel.get({
        customer_id: customerId,
        company_id: user.companyId,
      });

      if (cardsResult.error) {
        throw new BadRequestException("Failed to retrieve customer cards");
      }

      const cards = cardsResult.output || [];

      if (cards.length === 0) {
        return {
          success: true,
          message: "No cards found for customer",
          customer_id: customerId,
          cards_synced: 0,
        };
      }

      // 3. Sync cards with concurrency control
      const maxConcurrency = options?.maxConcurrency || 3;
      const results = await this.syncCardsConcurrently(
        cards,
        user,
        options?.force,
        maxConcurrency
      );

      // 4. Calculate summary statistics
      const summary = this.calculateSyncSummary(results);

      this.logger.log("✅ ADVANCED CUSTOMER CARDS SYNC FLOW - COMPLETED", {
        customerId,
        cardsProcessed: cards.length,
        successfulSyncs: summary.successful,
        changesApplied: summary.totalChanges,
        terminationsProcessed: summary.terminations,
        success: true,
      });

      return {
        success: true,
        customer_id: customerId,
        summary,
        results,
        synced_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CUSTOMER CARDS SYNC FAILED", {
        customerId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Customer cards sync failed: ${error.message}`
      );
    }
  }

  /**
   * Sync all company cards with advanced MONIX-style features
   */
  async syncCompanyCards(
    user: CurrentUserData,
    options?: {
      force?: boolean;
      maxConcurrency?: number;
      customerBatchSize?: number;
    }
  ): Promise<any> {
    this.logger.log("🏢🔄 ADVANCED COMPANY CARDS SYNC FLOW - START", {
      userId: user.userId,
      companyId: user.companyId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Get all customers with cards for this company
      const customersWithCards = await this.getCustomersWithCards(
        user.companyId
      );

      if (customersWithCards.length === 0) {
        return {
          success: true,
          message: "No customers with cards found",
          company_id: user.companyId,
          customers_processed: 0,
          total_cards_synced: 0,
        };
      }

      // 2. Process customers in batches
      const batchSize = options?.customerBatchSize || 5;
      const customerBatches = this.chunkArray(customersWithCards, batchSize);

      const allResults = [];
      let totalCardsSynced = 0;
      let totalChanges = 0;
      let totalTerminations = 0;

      for (const batch of customerBatches) {
        const batchPromises = batch.map(async (customerId: string) => {
          try {
            const result = await this.syncCustomerCards(customerId, user, {
              force: options?.force,
              maxConcurrency: options?.maxConcurrency,
            });
            return { customerId, result, success: true };
          } catch (error: any) {
            return {
              customerId,
              error: error.message,
              success: false,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);

        // Update totals
        for (const batchResult of batchResults) {
          if (batchResult.success && batchResult.result) {
            totalCardsSynced += batchResult.result.summary?.totalCards || 0;
            totalChanges += batchResult.result.summary?.totalChanges || 0;
            totalTerminations += batchResult.result.summary?.terminations || 0;
          }
        }
      }

      // 3. Calculate final summary
      const finalSummary = {
        customers_processed: customersWithCards.length,
        successful_customer_syncs: allResults.filter((r) => r.success).length,
        failed_customer_syncs: allResults.filter((r) => !r.success).length,
        total_cards_synced: totalCardsSynced,
        total_changes_applied: totalChanges,
        total_terminations_processed: totalTerminations,
      };

      this.logger.log("✅ ADVANCED COMPANY CARDS SYNC FLOW - COMPLETED", {
        companyId: user.companyId,
        ...finalSummary,
        success: true,
      });

      return {
        success: true,
        company_id: user.companyId,
        summary: finalSummary,
        customer_results: allResults,
        synced_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED COMPANY CARDS SYNC FAILED", {
        companyId: user.companyId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Company cards sync failed: ${error.message}`
      );
    }
  }

  /**
   * Check sync status for a card
   */
  async checkCardSyncStatus(
    cardId: string,
    user: CurrentUserData
  ): Promise<any> {
    this.logger.log("🔍 CARD SYNC STATUS CHECK", {
      cardId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, user);

      // 2. Fetch current data from Maplerad
      const mapleradData = await this.fetchCardFromMaplerad(
        card.provider_card_id,
        false
      );

      // 3. Compare with local data
      const changes = this.detectCardChanges(card, mapleradData);
      const needsSync = Object.keys(changes).length > 0;

      // 4. Calculate sync priority
      const priority = this.calculateSyncPriority(card, changes);

      return {
        success: true,
        card_id: cardId,
        needs_sync: needsSync,
        changes_detected: changes,
        sync_priority: priority,
        last_local_update: card.updated_at,
        provider_data_fetched: true,
        recommendations: this.generateSyncRecommendations(
          needsSync,
          priority,
          changes
        ),
      };
    } catch (error: any) {
      this.logger.error("❌ CARD SYNC STATUS CHECK FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Sync status check failed: ${error.message}`
      );
    }
  }

  /**
   * Get sync statistics for company
   */
  async getCompanySyncStatistics(user: CurrentUserData): Promise<any> {
    this.logger.log("📊 COMPANY SYNC STATISTICS", {
      userId: user.userId,
      companyId: user.companyId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Get all company cards
      const cardsResult = await CardModel.get({
        company_id: user.companyId,
        provider: encodeText("maplerad"),
      });

      if (cardsResult.error) {
        throw new BadRequestException("Failed to retrieve company cards");
      }

      const cards = cardsResult.output || [];

      // 2. Calculate sync statistics
      const statistics = {
        total_cards: cards.length,
        sync_status: {
          up_to_date: 0,
          needs_sync: 0,
          sync_recommended: 0,
          sync_urgent: 0,
        },
        last_sync_times: {
          last_hour: 0,
          last_day: 0,
          last_week: 0,
          older: 0,
        },
        card_status_breakdown: {
          active: 0,
          frozen: 0,
          terminated: 0,
        },
      };

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const card of cards) {
        // Status breakdown
        statistics.card_status_breakdown[card.status.toLowerCase()]++;

        // Sync timing analysis
        const lastUpdate = new Date(card.updated_at);
        if (lastUpdate > oneHourAgo) {
          statistics.last_sync_times.last_hour++;
        } else if (lastUpdate > oneDayAgo) {
          statistics.last_sync_times.last_day++;
        } else if (lastUpdate > oneWeekAgo) {
          statistics.last_sync_times.last_week++;
        } else {
          statistics.last_sync_times.older++;
        }

        // Sync status (simplified - in real implementation would check against provider)
        const hoursSinceUpdate =
          (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate < 1) {
          statistics.sync_status.up_to_date++;
        } else if (hoursSinceUpdate < 24) {
          statistics.sync_status.needs_sync++;
        } else if (hoursSinceUpdate < 168) {
          // 7 days
          statistics.sync_status.sync_recommended++;
        } else {
          statistics.sync_status.sync_urgent++;
        }
      }

      return {
        success: true,
        company_id: user.companyId,
        statistics,
        recommendations: this.generateCompanySyncRecommendations(statistics),
        generated_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ COMPANY SYNC STATISTICS FAILED", {
        companyId: user.companyId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Sync statistics failed: ${error.message}`);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate card access
   */
  private async validateCardAccess(
    cardId: string,
    user: CurrentUserData
  ): Promise<any> {
    const cardResult = await CardModel.getOne({
      id: cardId,
      company_id: user.companyId,
    });

    if (cardResult.error || !cardResult.output) {
      throw new NotFoundException("Card not found");
    }

    const card = cardResult.output;

    // Check if it's a Maplerad card
    if (decodeText(card.provider) !== "maplerad") {
      throw new BadRequestException("Card is not a Maplerad card");
    }

    return card;
  }

  /**
   * Validate customer access
   */
  private async validateCustomerAccess(
    customerId: string,
    user: CurrentUserData
  ): Promise<any> {
    const customerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: user.companyId,
    });

    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }

    return customerResult.output;
  }

  /**
   * Check if sync is needed for a card
   */
  private isSyncNeeded(card: any): boolean {
    const now = new Date();
    const lastUpdate = new Date(card.updated_at);
    const hoursSinceUpdate =
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // Sync needed if updated more than 1 hour ago
    return hoursSinceUpdate > 1;
  }

  /**
   * Fetch card data from Maplerad
   */
  private async fetchCardFromMaplerad(
    providerCardId: string,
    includeSensitive: boolean = false
  ): Promise<any> {
    const result = await MapleradUtils.getCard(
      providerCardId,
      includeSensitive
    );

    if (result.error) {
      throw new BadRequestException(
        `Maplerad fetch failed: ${result.error.message}`
      );
    }

    return result.output;
  }

  /**
   * Detect changes between local and provider data
   */
  private detectCardChanges(localCard: any, providerData: any): any {
    const changes: any = {};

    // Status comparison
    const localStatus = localCard.status;
    const providerStatus = this.mapProviderStatusToLocal(providerData?.status);

    if (localStatus !== providerStatus) {
      changes.status = {
        from: localStatus,
        to: providerStatus,
        changed: true,
      };
    }

    // Balance comparison
    const localBalance = localCard.balance?.toNumber() || 0;
    const providerBalance = providerData?.balance || 0;

    if (Math.abs(localBalance - providerBalance) > 0.01) {
      changes.balance = {
        from: localBalance,
        to: providerBalance,
        difference: providerBalance - localBalance,
        changed: true,
      };
    }

    // Termination date comparison
    const localTerminateDate = localCard.terminate_date;
    const providerTerminateDate = providerData?.terminateDate
      ? new Date(providerData.terminateDate)
      : null;

    if (this.datesDiffer(localTerminateDate, providerTerminateDate)) {
      changes.terminate_date = {
        from: localTerminateDate,
        to: providerTerminateDate,
        changed: true,
      };
    }

    return changes;
  }

  /**
   * Handle termination refund if card was newly terminated
   */
  private async handleTerminationRefundIfNeeded(
    card: any,
    providerData: any,
    companyId: string
  ): Promise<any> {
    const result = {
      processed: false,
      refundAmount: 0,
      transactionId: null,
    };

    // Check if card was newly terminated
    const isNewlyTerminated = this.isCardNewlyTerminated(card, providerData);

    if (isNewlyTerminated) {
      const refundAmount =
        providerData?.balanceAsAtTermination ||
        providerData?.balance ||
        card.balance?.toNumber() ||
        0;

      if (refundAmount > 0) {
        try {
          result.transactionId = await this.processTerminationRefund(
            card.customer_id,
            companyId,
            refundAmount,
            card.id
          );
          result.processed = true;
          result.refundAmount = refundAmount;
        } catch (error) {
          this.logger.error("Termination refund processing failed", {
            cardId: card.id,
            refundAmount,
            error: error.message,
          });
        }
      }
    }

    return result;
  }

  /**
   * Check if card was newly terminated
   */
  private isCardNewlyTerminated(card: any, providerData: any): boolean {
    // Local card is not terminated but provider shows terminated
    const localNotTerminated = card.status !== CardStatus.TERMINATED;
    const providerTerminated = this.isProviderStatusTerminated(
      providerData?.status
    );

    return localNotTerminated && providerTerminated;
  }

  /**
   * Check if provider status indicates termination
   */
  private isProviderStatusTerminated(providerStatus: string): boolean {
    if (!providerStatus) return false;

    const status = providerStatus.toLowerCase();
    return (
      status.includes("terminated") ||
      status.includes("deactivated") ||
      status === "card - terminated" ||
      status === "card - deactivated"
    );
  }

  /**
   * Map provider status to local status
   */
  private mapProviderStatusToLocal(providerStatus: string): CardStatus {
    if (!providerStatus) return CardStatus.ACTIVE;

    const status = providerStatus.toLowerCase();

    if (status.includes("terminated") || status.includes("deactivated")) {
      return CardStatus.TERMINATED;
    } else if (status.includes("frozen") || status.includes("blocked")) {
      return CardStatus.FROZEN;
    } else if (status.includes("active")) {
      return CardStatus.ACTIVE;
    }

    return CardStatus.ACTIVE; // Default
  }

  /**
   * Apply changes to local card
   */
  private async applyCardChanges(cardId: string, changes: any): Promise<void> {
    if (Object.keys(changes).length === 0) {
      return; // No changes to apply
    }

    const updateData: any = {};

    if (changes.status?.changed) {
      updateData.status = changes.status.to;
    }

    if (changes.balance?.changed) {
      updateData.balance = changes.balance.to;
    }

    if (changes.terminate_date?.changed) {
      updateData.terminate_date = changes.terminate_date.to;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date();
      await CardModel.update(cardId, updateData);
    }
  }

  /**
   * Process termination refund
   */
  private async processTerminationRefund(
    customerId: string,
    companyId: string,
    amount: number,
    cardId: string
  ): Promise<string> {
    // Get USD wallet
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

      // Create refund transaction record
      const transactionId = uuidv4();
      await TransactionModel.create({
        id: transactionId,
        status: TransactionStatus.SUCCESS,
        category: TransactionCategory.CARD,
        type: TransactionType.TERMINATION_REFUND,
        amount: amount,
        currency: "USD",
        customer_id: customerId,
        company_id: companyId,
        card_id: cardId,
        description: `Card termination refund: ${cardId}`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
      });

      return transactionId;
    }

    throw new BadRequestException(
      "USD wallet not found for termination refund"
    );
  }

  /**
   * Log card sync operation
   */
  private async logCardSync(
    cardId: string,
    customerId: string,
    changes: any,
    terminationResult: any
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customerId,
      action: "card-sync",
      status: "SUCCESS",
      log_json: {
        card_id: cardId,
        changes_applied: changes,
        termination_processed: terminationResult,
        sync_timestamp: new Date().toISOString(),
      },
      log_txt: `Maplerad card sync completed: ${cardId} - ${
        Object.keys(changes).length
      } changes`,
      created_at: new Date(),
    });
  }

  /**
   * Sync cards concurrently with controlled concurrency
   */
  private async syncCardsConcurrently(
    cards: any[],
    user: CurrentUserData,
    force: boolean = false,
    maxConcurrency: number = 3
  ): Promise<any[]> {
    const results = [];

    // Process cards in batches to control concurrency
    for (let i = 0; i < cards.length; i += maxConcurrency) {
      const batch = cards.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (card: any) => {
        try {
          const result = await this.syncCard(card.id, user, { force });
          return { cardId: card.id, result, success: true };
        } catch (error: any) {
          return { cardId: card.id, error: error.message, success: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Calculate sync summary from results
   */
  private calculateSyncSummary(results: any[]): any {
    const summary = {
      totalCards: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalChanges: 0,
      terminations: 0,
      skipped: 0,
    };

    for (const result of results) {
      if (result.success && result.result) {
        if (result.result.skipped) {
          summary.skipped++;
        } else {
          summary.totalChanges += Object.keys(
            result.result.changes_applied || {}
          ).length;
          if (result.result.termination_handled?.processed) {
            summary.terminations++;
          }
        }
      }
    }

    return summary;
  }

  /**
   * Get customers with cards
   */
  private async getCustomersWithCards(companyId: string): Promise<string[]> {
    const cardsResult = await CardModel.get({
      company_id: companyId,
      provider: encodeText("maplerad"),
    });

    if (cardsResult.error) {
      return [];
    }

    const cards = cardsResult.output || [];
    const customerIds = [
      ...new Set(cards.map((card: any) => card.customer_id as string)),
    ];

    return customerIds as unknown[] as string[];
  }

  /**
   * Chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Check if dates differ
   */
  private datesDiffer(date1: Date | null, date2: Date | null): boolean {
    if (!date1 && !date2) return false;
    if (!date1 || !date2) return true;

    return date1.getTime() !== date2.getTime();
  }

  /**
   * Calculate sync priority
   */
  private calculateSyncPriority(card: any, changes: any): string {
    const changeCount = Object.keys(changes).length;

    if (changeCount === 0) return "none";

    // High priority for status changes or terminations
    if (changes.status?.changed || changes.terminate_date?.changed) {
      return "high";
    }

    // Medium priority for balance changes
    if (changes.balance?.changed) {
      const balanceDiff = Math.abs(changes.balance.difference);
      if (balanceDiff > 10) return "high";
      if (balanceDiff > 1) return "medium";
    }

    return "low";
  }

  /**
   * Generate sync recommendations
   */
  private generateSyncRecommendations(
    needsSync: boolean,
    priority: string,
    changes: any
  ): string[] {
    const recommendations = [];

    if (!needsSync) {
      recommendations.push("✅ Card is up to date - no sync needed");
      return recommendations;
    }

    if (priority === "high") {
      recommendations.push("🚨 HIGH PRIORITY: Immediate sync recommended");
    } else if (priority === "medium") {
      recommendations.push(
        "⚠️ MEDIUM PRIORITY: Sync recommended within 24 hours"
      );
    } else {
      recommendations.push("ℹ️ LOW PRIORITY: Sync at your convenience");
    }

    if (changes.status?.changed) {
      recommendations.push(
        `📊 Status change detected: ${changes.status.from} → ${changes.status.to}`
      );
    }

    if (changes.balance?.changed) {
      const diff = changes.balance.difference;
      const direction = diff > 0 ? "increase" : "decrease";
      recommendations.push(`💰 Balance ${direction}: ${Math.abs(diff)} USD`);
    }

    if (changes.terminate_date?.changed) {
      recommendations.push("🏁 Termination status change detected");
    }

    return recommendations;
  }

  /**
   * Generate company sync recommendations
   */
  private generateCompanySyncRecommendations(statistics: any): string[] {
    const recommendations = [];

    if (statistics.sync_status.sync_urgent > 0) {
      recommendations.push(
        `🚨 URGENT: ${statistics.sync_status.sync_urgent} cards need immediate sync`
      );
    }

    if (statistics.sync_status.sync_recommended > 0) {
      recommendations.push(
        `⚠️ RECOMMENDED: ${statistics.sync_status.sync_recommended} cards should be synced soon`
      );
    }

    if (statistics.last_sync_times.older > 5) {
      recommendations.push(
        `⏰ STALE: ${statistics.last_sync_times.older} cards haven't been synced in over a week`
      );
    }

    if (statistics.sync_status.up_to_date === statistics.total_cards) {
      recommendations.push("✅ All cards are up to date");
    }

    return recommendations;
  }
}
