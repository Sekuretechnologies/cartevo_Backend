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
import ProviderSyncMetadataModel from "@/models/prisma/providerSyncMetadataModel";
import CustomerProviderMappingModel from "@/models/prisma/customerProviderMappingModel";
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
    companyId: string,
    options?: {
      force?: boolean;
      includeSensitive?: boolean;
    }
  ): Promise<any> {
    this.logger.log("🔄 ADVANCED CARD SYNC FLOW - START", {
      cardId,
      companyId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, companyId);

      // 2. Check if sync is needed (unless forced)
      if (!options?.force && !(await this.isSyncNeeded(card, companyId))) {
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
        companyId
      );

      // 6. Apply changes to local database
      const updateResult = await this.applyCardChanges(cardId, changes);

      // 7. Update sync metadata
      await this.updateSyncMetadata(companyId, "maplerad", "cards");

      // 8. Log sync operation
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
        companyId,
      });
      throw new BadRequestException(`Card sync failed: ${error.message}`);
    }
  }

  /**
   * Sync all customer cards with advanced MONIX-style features
   */
  async syncCustomerCards(
    customerId: string,
    companyId: string,
    options?: {
      force?: boolean;
      maxConcurrency?: number;
    }
  ): Promise<any> {
    this.logger.log("👤🔄 ADVANCED CUSTOMER CARDS SYNC FLOW - START", {
      customerId,
      companyId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate customer ownership
      const customer = await this.validateCustomerAccess(customerId, companyId);

      // 2. Get all customer cards
      const cardsResult = await CardModel.get({
        customer_id: customerId,
        company_id: companyId,
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
        companyId,
        options?.force,
        maxConcurrency
      );

      // 4. Update sync metadata
      await this.updateSyncMetadata(companyId, "maplerad", "cards");

      // 5. Calculate summary statistics
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
        companyId,
      });
      throw new BadRequestException(
        `Customer cards sync failed: ${error.message}`
      );
    }
  }

  /**
   * Sync customers with provider (lightweight sync for provider_customer_id mapping)
   */
  async syncCustomers(
    companyId: string,
    options?: {
      force?: boolean;
      startDate?: Date;
      maxConcurrency?: number;
    }
  ): Promise<any> {
    this.logger.log("👥🔄 CUSTOMER SYNC FLOW - START", {
      companyId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Check if sync is needed
      const lastSyncDate = await ProviderSyncMetadataModel.getLastSyncDate(
        companyId,
        "maplerad",
        "customers"
      );

      if (!options?.force && lastSyncDate) {
        const hoursSinceLastSync =
          (new Date().getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastSync < 1) {
          return {
            success: true,
            message: "Customer sync not needed - recently synced",
            last_sync: lastSyncDate,
            skipped: true,
          };
        }
      }

      // 2. Fetch customers from Maplerad
      const mapleradCustomersResult = await MapleradUtils.getCustomers();

      if (mapleradCustomersResult.error) {
        throw new BadRequestException(
          `Failed to fetch customers from Maplerad: ${mapleradCustomersResult.error.message}`
        );
      }

      const mapleradCustomers = mapleradCustomersResult.output?.data || [];

      if (mapleradCustomers.length === 0) {
        return {
          success: true,
          message: "No customers found in Maplerad",
          customers_processed: 0,
        };
      }

      // 3. Get local customers for this company
      const localCustomersResult = await CustomerModel.get({
        company_id: companyId,
      });

      if (localCustomersResult.error) {
        throw new BadRequestException("Failed to retrieve company customers");
      }

      const localCustomers = localCustomersResult.output || [];

      // 4. Match and sync customer mappings
      const maxConcurrency = options?.maxConcurrency || 5;
      const results = await this.syncCustomerMappingsWithMaplerad(
        localCustomers,
        mapleradCustomers,
        companyId,
        maxConcurrency
      );

      // 5. Update sync metadata
      await this.updateSyncMetadata(companyId, "maplerad", "customers");

      // 6. Calculate summary
      const summary = this.calculateCustomerSyncSummary(results);

      this.logger.log("✅ CUSTOMER SYNC FLOW - COMPLETED", {
        companyId,
        mapleradCustomers: mapleradCustomers.length,
        localCustomers: localCustomers.length,
        mappingsUpdated: summary.updated,
        mappingsCreated: summary.created,
        success: true,
      });

      return {
        success: true,
        company_id: companyId,
        summary,
        results,
        synced_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ CUSTOMER SYNC FAILED", {
        companyId: companyId,
        error: error.message,
      });
      throw new BadRequestException(`Customer sync failed: ${error.message}`);
    }
  }

  /**
   * Sync all company cards with advanced MONIX-style features
   */
  async syncCompanyCards(
    companyId: string,
    options?: {
      force?: boolean;
      maxConcurrency?: number;
      customerBatchSize?: number;
    }
  ): Promise<any> {
    this.logger.log("🏢🔄 ADVANCED COMPANY CARDS SYNC FLOW - START", {
      companyId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Get all customers with cards for this company
      const customersWithCards = await this.getCustomersWithCards(companyId);

      if (customersWithCards.length === 0) {
        return {
          success: true,
          message: "No customers with cards found",
          company_id: companyId,
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
            const result = await this.syncCustomerCards(customerId, companyId, {
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

      // 3. Update sync metadata
      await this.updateSyncMetadata(companyId, "maplerad", "cards");

      // 4. Calculate final summary
      const finalSummary = {
        customers_processed: customersWithCards.length,
        successful_customer_syncs: allResults.filter((r) => r.success).length,
        failed_customer_syncs: allResults.filter((r) => !r.success).length,
        total_cards_synced: totalCardsSynced,
        total_changes_applied: totalChanges,
        total_terminations_processed: totalTerminations,
      };

      this.logger.log("✅ ADVANCED COMPANY CARDS SYNC FLOW - COMPLETED", {
        companyId: companyId,
        ...finalSummary,
        success: true,
      });

      return {
        success: true,
        company_id: companyId,
        summary: finalSummary,
        customer_results: allResults,
        synced_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED COMPANY CARDS SYNC FAILED", {
        companyId: companyId,
        error: error.message,
      });
      throw new BadRequestException(
        `Company cards sync failed: ${error.message}`
      );
    }
  }

  /**
   * Check sync status for a card
   */
  async checkCardSyncStatus(cardId: string, companyId: string): Promise<any> {
    this.logger.log("🔍 CARD SYNC STATUS CHECK", {
      cardId,
      companyId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, companyId);

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
        companyId,
      });
      throw new BadRequestException(
        `Sync status check failed: ${error.message}`
      );
    }
  }

  /**
   * Get sync statistics for company
   */
  async getCompanySyncStatistics(companyId: string): Promise<any> {
    this.logger.log("📊 COMPANY SYNC STATISTICS", {
      companyId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Get all company cards
      const cardsResult = await CardModel.get({
        company_id: companyId,
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
        company_id: companyId,
        statistics,
        recommendations: this.generateCompanySyncRecommendations(statistics),
        generated_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ COMPANY SYNC STATISTICS FAILED", {
        companyId: companyId,
        error: error.message,
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
    companyId: string
  ): Promise<any> {
    const cardResult = await CardModel.getOne({
      id: cardId,
      company_id: companyId,
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
    companyId: string
  ): Promise<any> {
    const customerResult = await CustomerModel.getOne({
      id: customerId,
      company_id: companyId,
    });

    if (customerResult.error || !customerResult.output) {
      throw new NotFoundException("Customer not found");
    }

    return customerResult.output;
  }

  /**
   * Check if sync is needed for a card using sync metadata
   */
  private async isSyncNeeded(card: any, companyId: string): Promise<boolean> {
    try {
      // Check sync metadata for cards sync type
      const lastSyncDate = await ProviderSyncMetadataModel.getLastSyncDate(
        companyId,
        "maplerad",
        "cards"
      );

      if (!lastSyncDate) {
        // No sync metadata found, sync is needed
        return true;
      }

      const now = new Date();
      const hoursSinceLastSync =
        (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

      // Sync needed if last sync was more than 1 hour ago
      return hoursSinceLastSync > 1;
    } catch (error) {
      this.logger.warn(
        "Failed to check sync metadata, falling back to card update time",
        {
          cardId: card.id,
          error: error.message,
        }
      );

      // Fallback to card update time if sync metadata check fails
      const now = new Date();
      const lastUpdate = new Date(card.updated_at);
      const hoursSinceUpdate =
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      return hoursSinceUpdate > 1;
    }
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
    companyId: string,
    force: boolean = false,
    maxConcurrency: number = 3
  ): Promise<any[]> {
    const results = [];

    // Process cards in batches to control concurrency
    for (let i = 0; i < cards.length; i += maxConcurrency) {
      const batch = cards.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (card: any) => {
        try {
          const result = await this.syncCard(card.id, companyId, { force });
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
   * Update sync metadata after successful sync
   */
  private async updateSyncMetadata(
    companyId: string,
    providerName: string,
    syncType: string
  ): Promise<void> {
    try {
      await ProviderSyncMetadataModel.upsert(
        companyId,
        providerName,
        syncType,
        new Date()
      );

      this.logger.log("📝 Sync metadata updated", {
        companyId,
        providerName,
        syncType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to update sync metadata", {
        companyId,
        providerName,
        syncType,
        error: error.message,
      });
      // Don't throw error here - sync metadata update failure shouldn't break the sync process
    }
  }

  /**
   * Sync customer mappings with Maplerad (matches by email and updates provider_customer_id)
   */
  private async syncCustomerMappingsWithMaplerad(
    localCustomers: any[],
    mapleradCustomers: any[],
    companyId: string,
    maxConcurrency: number = 5
  ): Promise<any[]> {
    const results = [];

    // Create email lookup map for Maplerad customers
    const mapleradEmailMap = new Map();
    for (const mapleradCustomer of mapleradCustomers) {
      if (mapleradCustomer.email) {
        mapleradEmailMap.set(
          mapleradCustomer.email.toLowerCase(),
          mapleradCustomer
        );
      }
    }

    // Process local customers in batches to control concurrency
    for (let i = 0; i < localCustomers.length; i += maxConcurrency) {
      const batch = localCustomers.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (localCustomer: any) => {
        try {
          const result = await this.syncCustomerMappingWithMaplerad(
            localCustomer,
            mapleradEmailMap,
            companyId
          );
          return { customerId: localCustomer.id, result, success: true };
        } catch (error: any) {
          return {
            customerId: localCustomer.id,
            error: error.message,
            success: false,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Sync single customer mapping with Maplerad (matches by email)
   */
  private async syncCustomerMappingWithMaplerad(
    localCustomer: any,
    mapleradEmailMap: Map<string, any>,
    companyId: string
  ): Promise<any> {
    try {
      // Find matching Maplerad customer by email
      const mapleradCustomer = mapleradEmailMap.get(
        localCustomer.email?.toLowerCase()
      );

      if (!mapleradCustomer) {
        return {
          action: "skipped",
          message: "No matching Maplerad customer found by email",
          local_email: localCustomer.email,
        };
      }

      // Check if we already have a mapping for this customer and provider
      const existingMappingResult =
        await CustomerProviderMappingModel.getByCustomerAndProvider(
          localCustomer.id,
          "maplerad"
        );

      const existingMapping = existingMappingResult.output;

      if (
        existingMapping &&
        existingMapping.provider_customer_id === mapleradCustomer.id
      ) {
        return {
          action: "skipped",
          message: "Customer mapping already exists and is up to date",
          provider_customer_id: existingMapping.provider_customer_id,
          local_email: localCustomer.email,
          maplerad_email: mapleradCustomer.email,
        };
      }

      // Upsert the customer provider mapping using the model
      const mappingResult = await CustomerProviderMappingModel.upsert(
        localCustomer.id,
        "maplerad",
        mapleradCustomer.id
      );

      if (mappingResult.error) {
        throw new Error(
          `Failed to upsert customer mapping: ${mappingResult.error.message}`
        );
      }

      return {
        action: existingMapping ? "updated" : "created",
        provider_customer_id: mapleradCustomer.id,
        mapping_id: mappingResult.output?.id,
        local_email: localCustomer.email,
        maplerad_email: mapleradCustomer.email,
      };
    } catch (error: any) {
      this.logger.error("Failed to sync customer mapping with Maplerad", {
        customerId: localCustomer.id,
        customerEmail: localCustomer.email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Sync customer mappings concurrently (only updates provider_customer_id)
   */
  private async syncCustomerMappingsConcurrently(
    customers: any[],
    companyId: string,
    startDate: Date | null,
    maxConcurrency: number = 5
  ): Promise<any[]> {
    const results = [];

    // Process customers in batches to control concurrency
    for (let i = 0; i < customers.length; i += maxConcurrency) {
      const batch = customers.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (customer: any) => {
        try {
          const result = await this.syncCustomerMapping(
            customer,
            companyId,
            startDate
          );
          return { customerId: customer.id, result, success: true };
        } catch (error: any) {
          return {
            customerId: customer.id,
            error: error.message,
            success: false,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Sync single customer mapping (only updates provider_customer_id)
   */
  private async syncCustomerMapping(
    customer: any,
    companyId: string,
    startDate: Date | null
  ): Promise<any> {
    try {
      // Check if we already have a mapping for this customer and provider
      const existingMappingResult =
        await CustomerProviderMappingModel.getByCustomerAndProvider(
          customer.id,
          "maplerad"
        );

      const existingMapping = existingMappingResult.output;

      if (existingMapping) {
        // Mapping already exists, check if we need to update it
        if (existingMapping.provider_customer_id) {
          return {
            action: "skipped",
            message: "Customer mapping already exists",
            provider_customer_id: existingMapping.provider_customer_id,
          };
        }
      }

      // Fetch customer data from Maplerad to get provider_customer_id
      const mapleradCustomerData = await this.fetchCustomerFromMaplerad(
        customer.id,
        startDate
      );

      if (!mapleradCustomerData?.id) {
        return {
          action: "skipped",
          message: "No provider customer ID found",
        };
      }

      // Upsert the customer provider mapping using the model
      const mappingResult = await CustomerProviderMappingModel.upsert(
        customer.id,
        "maplerad",
        mapleradCustomerData.id
      );

      if (mappingResult.error) {
        throw new Error(
          `Failed to upsert customer mapping: ${mappingResult.error.message}`
        );
      }

      return {
        action: existingMapping ? "updated" : "created",
        provider_customer_id: mapleradCustomerData.id,
        mapping_id: mappingResult.output?.id,
      };
    } catch (error: any) {
      this.logger.error("Failed to sync customer mapping", {
        customerId: customer.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Fetch customer data from Maplerad
   */
  private async fetchCustomerFromMaplerad(
    customerId: string,
    startDate: Date | null
  ): Promise<any> {
    try {
      // This would typically call Maplerad API to get customer data
      // For now, we'll simulate this with a placeholder
      // In real implementation, this would call MapleradUtils.getCustomer()

      // Placeholder implementation - replace with actual Maplerad API call
      const result = {
        id: `maplerad_customer_${customerId}`,
        // ... other customer data from Maplerad
      };

      return result;
    } catch (error: any) {
      this.logger.error("Failed to fetch customer from Maplerad", {
        customerId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate customer sync summary
   */
  private calculateCustomerSyncSummary(results: any[]): any {
    const summary = {
      totalCustomers: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const result of results) {
      if (result.success && result.result) {
        const action = result.result.action;
        if (action === "created") summary.created++;
        else if (action === "updated") summary.updated++;
        else if (action === "skipped") summary.skipped++;
      }
    }

    return summary;
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
