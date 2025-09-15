import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  TransactionCategory,
  TransactionType,
  TransactionStatus,
} from "@/types";
import CardModel from "@/models/prisma/cardModel";
import CompanyModel from "@/models/prisma/companyModel";
import CustomerModel from "@/models/prisma/customerModel";
import TransactionModel from "@/models/prisma/transactionModel";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import BalanceTransactionRecordModel from "@/models/prisma/balanceTransactionRecordModel";
import { v4 as uuidv4 } from "uuid";
import { decodeText, encodeText } from "@/utils/shared/encryption";
import { utcToLocalTime } from "@/utils/date";
import { MapleradUtils } from "../utils/maplerad.utils";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";

/**
 * Advanced Card Transaction Synchronization Service for Maplerad
 * Implements comprehensive transaction data synchronization with MONIX-style advanced features
 */
@Injectable()
export class CardSyncTransactionService {
  private readonly logger = new Logger(CardSyncTransactionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sync transactions for a single card with advanced MONIX-style features
   */
  async syncCardTransactions(
    cardId: string,
    user: CurrentUserData,
    options?: {
      force?: boolean;
      startDate?: Date;
      endDate?: Date;
      maxTransactions?: number;
      includeSensitive?: boolean;
    }
  ): Promise<any> {
    this.logger.log("🔄📊 ADVANCED CARD TRANSACTIONS SYNC FLOW - START", {
      cardId,
      userId: user.userId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, user);

      // 2. Fetch transactions from Maplerad
      const mapleradTransactions = await this.fetchCardTransactionsFromMaplerad(
        card.provider_card_id,
        options
      );

      // 3. Get existing local transactions for deduplication
      const existingTransactions = await this.getExistingCardTransactions(
        cardId,
        options?.startDate,
        options?.endDate
      );

      // 4. Process and deduplicate transactions
      const { newTransactions, updatedTransactions, duplicates } =
        await this.processTransactionSync(
          mapleradTransactions,
          existingTransactions,
          card,
          user.companyId
        );

      // 5. Bulk insert new transactions
      const insertedTransactions = await this.bulkInsertTransactions(
        newTransactions,
        card,
        user.companyId
      );

      // 6. Update existing transactions if needed
      const updatedTransactionRecords = await this.bulkUpdateTransactions(
        updatedTransactions
      );

      // 7. Log sync operation
      await this.logTransactionSync(cardId, card.customer_id, {
        fetched: mapleradTransactions.length,
        new: newTransactions.length,
        updated: updatedTransactions.length,
        duplicates: duplicates.length,
        inserted: insertedTransactions.length,
      });

      this.logger.log("✅ ADVANCED CARD TRANSACTIONS SYNC FLOW - COMPLETED", {
        cardId,
        transactionsProcessed: mapleradTransactions.length,
        newTransactions: newTransactions.length,
        updatedTransactions: updatedTransactions.length,
        duplicatesFound: duplicates.length,
        success: true,
      });

      return {
        success: true,
        card_id: cardId,
        summary: {
          total_fetched: mapleradTransactions.length,
          new_transactions: newTransactions.length,
          updated_transactions: updatedTransactions.length,
          duplicates_found: duplicates.length,
          inserted_count: insertedTransactions.length,
          updated_count: updatedTransactionRecords.length,
        },
        synced_at: new Date().toISOString(),
        date_range: {
          start: options?.startDate?.toISOString(),
          end: options?.endDate?.toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD TRANSACTIONS SYNC FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Card transactions sync failed: ${error.message}`
      );
    }
  }

  /**
   * Sync transactions for all customer cards with advanced MONIX-style features
   */
  async syncCustomerCardTransactions(
    customerId: string,
    user: CurrentUserData,
    options?: {
      force?: boolean;
      startDate?: Date;
      endDate?: Date;
      maxConcurrency?: number;
      maxTransactionsPerCard?: number;
    }
  ): Promise<any> {
    this.logger.log(
      "👤🔄📊 ADVANCED CUSTOMER CARD TRANSACTIONS SYNC FLOW - START",
      {
        customerId,
        userId: user.userId,
        options,
        timestamp: new Date().toISOString(),
      }
    );

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
          cards_processed: 0,
          total_transactions_synced: 0,
        };
      }

      // 3. Sync transactions for each card with concurrency control
      const maxConcurrency = options?.maxConcurrency || 2;
      const results = await this.syncCardTransactionsConcurrently(
        cards,
        user,
        options,
        maxConcurrency
      );

      // 4. Calculate comprehensive summary
      const summary = this.calculateTransactionSyncSummary(results);

      this.logger.log(
        "✅ ADVANCED CUSTOMER CARD TRANSACTIONS SYNC FLOW - COMPLETED",
        {
          customerId,
          cardsProcessed: cards.length,
          totalTransactionsSynced: summary.totalTransactions,
          newTransactions: summary.totalNew,
          updatedTransactions: summary.totalUpdated,
          success: true,
        }
      );

      return {
        success: true,
        customer_id: customerId,
        summary,
        card_results: results,
        synced_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CUSTOMER CARD TRANSACTIONS SYNC FAILED", {
        customerId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Customer card transactions sync failed: ${error.message}`
      );
    }
  }

  /**
   * Sync transactions for all company cards with advanced MONIX-style features
   */
  async syncCompanyCardTransactions(
    user: CurrentUserData,
    options?: {
      force?: boolean;
      startDate?: Date;
      endDate?: Date;
      maxConcurrency?: number;
      customerBatchSize?: number;
      maxTransactionsPerCard?: number;
    }
  ): Promise<any> {
    this.logger.log(
      "🏢🔄📊 ADVANCED COMPANY CARD TRANSACTIONS SYNC FLOW - START",
      {
        userId: user.userId,
        companyId: user.companyId,
        options,
        timestamp: new Date().toISOString(),
      }
    );

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
          total_transactions_synced: 0,
        };
      }

      // 2. Process customers in batches
      const batchSize = options?.customerBatchSize || 3;
      const customerBatches = this.chunkArray(customersWithCards, batchSize);

      const allResults = [];
      let totalTransactionsSynced = 0;
      let totalNewTransactions = 0;
      let totalUpdatedTransactions = 0;

      for (const batch of customerBatches) {
        const batchPromises = batch.map(async (customerId: string) => {
          try {
            const result = await this.syncCustomerCardTransactions(
              customerId,
              user,
              {
                force: options?.force,
                startDate: options?.startDate,
                endDate: options?.endDate,
                maxConcurrency: options?.maxConcurrency,
                maxTransactionsPerCard: options?.maxTransactionsPerCard,
              }
            );
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
            totalTransactionsSynced +=
              batchResult.result.summary?.totalTransactions || 0;
            totalNewTransactions += batchResult.result.summary?.totalNew || 0;
            totalUpdatedTransactions +=
              batchResult.result.summary?.totalUpdated || 0;
          }
        }
      }

      // 3. Calculate final summary
      const finalSummary = {
        customers_processed: customersWithCards.length,
        successful_customer_syncs: allResults.filter((r) => r.success).length,
        failed_customer_syncs: allResults.filter((r) => !r.success).length,
        total_transactions_synced: totalTransactionsSynced,
        total_new_transactions: totalNewTransactions,
        total_updated_transactions: totalUpdatedTransactions,
      };

      this.logger.log(
        "✅ ADVANCED COMPANY CARD TRANSACTIONS SYNC FLOW - COMPLETED",
        {
          companyId: user.companyId,
          ...finalSummary,
          success: true,
        }
      );

      return {
        success: true,
        company_id: user.companyId,
        summary: finalSummary,
        customer_results: allResults,
        synced_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED COMPANY CARD TRANSACTIONS SYNC FAILED", {
        companyId: user.companyId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Company card transactions sync failed: ${error.message}`
      );
    }
  }

  /**
   * Get transaction sync statistics for a card
   */
  async getCardTransactionSyncStatus(
    cardId: string,
    user: CurrentUserData,
    options?: {
      daysBack?: number;
    }
  ): Promise<any> {
    this.logger.log("📊 CARD TRANSACTION SYNC STATUS", {
      cardId,
      userId: user.userId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, user);

      // 2. Get local transaction statistics
      const daysBack = options?.daysBack || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const localTransactions = await this.getExistingCardTransactions(
        cardId,
        startDate
      );

      // 3. Get provider transaction count (estimate)
      const providerTransactionCount = await this.getProviderTransactionCount(
        card.provider_card_id,
        startDate
      );

      // 4. Calculate sync status
      const syncStatus = this.calculateTransactionSyncStatus(
        localTransactions.length,
        providerTransactionCount,
        daysBack
      );

      // 5. Generate recommendations
      const recommendations = this.generateTransactionSyncRecommendations(
        syncStatus,
        localTransactions.length,
        providerTransactionCount
      );

      return {
        success: true,
        card_id: cardId,
        sync_status: syncStatus,
        statistics: {
          local_transactions: localTransactions.length,
          provider_transactions: providerTransactionCount,
          days_analyzed: daysBack,
          sync_gap: Math.max(
            0,
            providerTransactionCount - localTransactions.length
          ),
        },
        recommendations,
        last_sync_check: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ CARD TRANSACTION SYNC STATUS FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Transaction sync status failed: ${error.message}`
      );
    }
  }

  /**
   * Get transaction sync statistics for company
   */
  async getCompanyTransactionSyncStatistics(
    user: CurrentUserData,
    options?: {
      daysBack?: number;
    }
  ): Promise<any> {
    this.logger.log("📊🏢 COMPANY TRANSACTION SYNC STATISTICS", {
      userId: user.userId,
      companyId: user.companyId,
      options,
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

      // 2. Calculate transaction sync statistics for all cards
      const daysBack = options?.daysBack || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const cardStats = [];
      let totalLocalTransactions = 0;
      let totalProviderTransactions = 0;
      let totalSyncGap = 0;

      for (const card of cards) {
        try {
          const localTransactions = await this.getExistingCardTransactions(
            card.id,
            startDate
          );

          const providerTransactionCount =
            await this.getProviderTransactionCount(
              card.provider_card_id,
              startDate
            );

          const syncGap = Math.max(
            0,
            providerTransactionCount - localTransactions.length
          );

          cardStats.push({
            card_id: card.id,
            masked_number: card.masked_number,
            local_transactions: localTransactions.length,
            provider_transactions: providerTransactionCount,
            sync_gap: syncGap,
            sync_percentage:
              providerTransactionCount > 0
                ? Math.round(
                    (localTransactions.length / providerTransactionCount) * 100
                  )
                : 100,
          });

          totalLocalTransactions += localTransactions.length;
          totalProviderTransactions += providerTransactionCount;
          totalSyncGap += syncGap;
        } catch (error) {
          this.logger.warn(
            `Failed to get stats for card ${card.id}:`,
            error.message
          );
          cardStats.push({
            card_id: card.id,
            masked_number: card.masked_number,
            error: error.message,
          });
        }
      }

      // 3. Calculate overall statistics
      const overallStats = {
        total_cards: cards.length,
        total_local_transactions: totalLocalTransactions,
        total_provider_transactions: totalProviderTransactions,
        total_sync_gap: totalSyncGap,
        overall_sync_percentage:
          totalProviderTransactions > 0
            ? Math.round(
                (totalLocalTransactions / totalProviderTransactions) * 100
              )
            : 100,
        cards_needing_sync: cardStats.filter((c) => (c as any).sync_gap > 0)
          .length,
        days_analyzed: daysBack,
      };

      // 4. Generate company recommendations
      const recommendations =
        this.generateCompanyTransactionSyncRecommendations(
          overallStats,
          cardStats
        );

      return {
        success: true,
        company_id: user.companyId,
        overall_statistics: overallStats,
        card_statistics: cardStats,
        recommendations,
        generated_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ COMPANY TRANSACTION SYNC STATISTICS FAILED", {
        companyId: user.companyId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Company transaction sync statistics failed: ${error.message}`
      );
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
   * Fetch card transactions from Maplerad
   */
  private async fetchCardTransactionsFromMaplerad(
    providerCardId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      maxTransactions?: number;
      includeSensitive?: boolean;
    }
  ): Promise<any[]> {
    const result = await MapleradUtils.getCardTransactions(providerCardId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.maxTransactions || 100,
      includeSensitive: options?.includeSensitive,
    });

    if (result.error) {
      throw new BadRequestException(
        `Maplerad transactions fetch failed: ${result.error.message}`
      );
    }

    return result.output || [];
  }

  /**
   * Get existing card transactions for deduplication
   */
  private async getExistingCardTransactions(
    cardId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const filters: any = { card_id: cardId };

    if (startDate) {
      filters.created_at = { gte: startDate };
    }

    if (endDate) {
      filters.created_at = {
        ...filters.created_at,
        lte: endDate,
      };
    }

    const transactionsResult = await TransactionModel.get(filters, {
      orderBy: { created_at: "desc" },
      limit: 1000, // Reasonable limit for deduplication
    });

    if (transactionsResult.error) {
      this.logger.warn(
        "Failed to get existing transactions for deduplication:",
        transactionsResult.error
      );
      return [];
    }

    return transactionsResult.output || [];
  }

  /**
   * Process transaction sync with deduplication
   */
  private async processTransactionSync(
    mapleradTransactions: any[],
    existingTransactions: any[],
    card: any,
    companyId: string
  ): Promise<{
    newTransactions: any[];
    updatedTransactions: any[];
    duplicates: any[];
  }> {
    const newTransactions: any[] = [];
    const updatedTransactions: any[] = [];
    const duplicates: any[] = [];

    // Create lookup map for existing transactions by provider reference
    const existingByReference = new Map();
    const existingByAmountAndDate = new Map();

    for (const existingTx of existingTransactions) {
      // By provider reference (most reliable)
      if (existingTx.reference) {
        existingByReference.set(existingTx.reference, existingTx);
      }

      // By amount and date (fallback deduplication)
      const key = `${existingTx.amount?.toString()}_${
        existingTx.created_at?.toISOString().split("T")[0]
      }`;
      if (!existingByAmountAndDate.has(key)) {
        existingByAmountAndDate.set(key, []);
      }
      existingByAmountAndDate.get(key).push(existingTx);
    }

    for (const mapleradTx of mapleradTransactions) {
      let existingTx = null;
      let matchType = "none";

      // 1. Try to match by provider reference
      if (mapleradTx.reference) {
        existingTx = existingByReference.get(mapleradTx.reference);
        if (existingTx) matchType = "reference";
      }

      // 2. Try to match by amount and date (if no reference match)
      if (!existingTx && mapleradTx.amount && mapleradTx.createdAt) {
        const dateKey = new Date(mapleradTx.createdAt)
          .toISOString()
          .split("T")[0];
        const amountKey = mapleradTx.amount.toString();
        const key = `${amountKey}_${dateKey}`;

        const candidates = existingByAmountAndDate.get(key) || [];
        for (const candidate of candidates) {
          // Additional checks for better matching
          if (this.transactionsMatch(mapleradTx, candidate)) {
            existingTx = candidate;
            matchType = "amount_date";
            break;
          }
        }
      }

      if (existingTx) {
        // Check if update is needed
        const needsUpdate = this.transactionNeedsUpdate(existingTx, mapleradTx);

        if (needsUpdate) {
          const updatedTx = this.prepareTransactionUpdate(
            existingTx,
            mapleradTx
          );
          updatedTransactions.push(updatedTx);
        } else {
          duplicates.push({
            maplerad_transaction: mapleradTx,
            existing_transaction: existingTx,
            match_type: matchType,
          });
        }
      } else {
        // New transaction
        const newTx = this.prepareNewTransaction(mapleradTx, card, companyId);
        newTransactions.push(newTx);
      }
    }

    return { newTransactions, updatedTransactions, duplicates };
  }

  /**
   * Check if two transactions match for deduplication
   */
  private transactionsMatch(mapleradTx: any, existingTx: any): boolean {
    // Amount match (within small tolerance for floating point)
    const amountMatch =
      Math.abs(
        (mapleradTx.amount || 0) - (existingTx.amount?.toNumber() || 0)
      ) < 0.01;

    // Date match (same day)
    const mapleradDate = new Date(mapleradTx.createdAt || mapleradTx.date);
    const existingDate = new Date(existingTx.created_at);
    const dateMatch =
      mapleradDate.toDateString() === existingDate.toDateString();

    // Type/category match
    const typeMatch =
      this.normalizeTransactionType(mapleradTx.type) ===
      this.normalizeTransactionType(existingTx.type);

    return amountMatch && dateMatch && typeMatch;
  }

  /**
   * Check if transaction needs update
   */
  private transactionNeedsUpdate(existingTx: any, mapleradTx: any): boolean {
    // Check status changes
    const statusChanged =
      existingTx.status !==
      this.mapProviderTransactionStatus(mapleradTx.status);

    // Check amount changes (shouldn't happen but safety check)
    const amountChanged =
      Math.abs(
        (existingTx.amount?.toNumber() || 0) - (mapleradTx.amount || 0)
      ) > 0.01;

    // Check description changes
    const descriptionChanged =
      existingTx.description !== mapleradTx.description;

    return statusChanged || amountChanged || descriptionChanged;
  }

  /**
   * Prepare new transaction for insertion
   */
  private prepareNewTransaction(
    mapleradTx: any,
    card: any,
    companyId: string
  ): any {
    return {
      id: uuidv4(),
      card_id: card.id,
      customer_id: card.customer_id,
      company_id: companyId,
      category: this.mapTransactionCategory(mapleradTx.type),
      type: this.normalizeTransactionType(mapleradTx.type),
      amount: mapleradTx.amount || 0,
      currency: mapleradTx.currency || card.currency || "USD",
      status: this.mapProviderTransactionStatus(mapleradTx.status) || "SUCCESS",
      description:
        mapleradTx.description || mapleradTx.narration || "Card transaction",
      reference: mapleradTx.reference,
      provider: encodeText("maplerad"),
      created_at:
        mapleradTx.createdAt || mapleradTx.date || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Additional fields
      mcc: mapleradTx.mcc,
      order_id: mapleradTx.orderId,
      failure_reason: mapleradTx.failureReason,
    };
  }

  /**
   * Prepare transaction update
   */
  private prepareTransactionUpdate(existingTx: any, mapleradTx: any): any {
    const updates: any = {
      id: existingTx.id,
      updated_at: new Date().toISOString(),
    };

    // Update status if changed
    const newStatus = this.mapProviderTransactionStatus(mapleradTx.status);
    if (newStatus && newStatus !== existingTx.status) {
      updates.status = newStatus;
    }

    // Update description if changed
    if (
      mapleradTx.description &&
      mapleradTx.description !== existingTx.description
    ) {
      updates.description = mapleradTx.description;
    }

    // Update amount if changed (safety check)
    const newAmount = mapleradTx.amount;
    if (
      newAmount &&
      Math.abs(newAmount - (existingTx.amount?.toNumber() || 0)) > 0.01
    ) {
      updates.amount = newAmount;
    }

    return updates;
  }

  /**
   * Bulk insert new transactions
   */
  private async bulkInsertTransactions(
    transactions: any[],
    card: any,
    companyId: string
  ): Promise<any[]> {
    if (transactions.length === 0) return [];

    const insertedTransactions = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);

      for (const transaction of batch) {
        try {
          const result = await TransactionModel.create(transaction);
          if (!result.error) {
            insertedTransactions.push(result.output);

            // Create balance transaction record if needed
            await this.createBalanceTransactionRecord(transaction, card);
          }
        } catch (error) {
          this.logger.error("Failed to insert transaction:", {
            transactionId: transaction.id,
            error: error.message,
          });
        }
      }
    }

    return insertedTransactions;
  }

  /**
   * Bulk update existing transactions
   */
  private async bulkUpdateTransactions(updates: any[]): Promise<any[]> {
    if (updates.length === 0) return [];

    const updatedTransactions = [];

    for (const update of updates) {
      try {
        const result = await TransactionModel.update(update.id, update);
        if (!result.error) {
          updatedTransactions.push(result.output);
        }
      } catch (error) {
        this.logger.error("Failed to update transaction:", {
          transactionId: update.id,
          error: error.message,
        });
      }
    }

    return updatedTransactions;
  }

  /**
   * Create balance transaction record
   */
  private async createBalanceTransactionRecord(
    transaction: any,
    card: any
  ): Promise<void> {
    try {
      await BalanceTransactionRecordModel.create({
        transaction_id: transaction.id,
        entity_type: "card",
        entity_id: card.id,
        old_balance: card.balance?.toNumber() || 0,
        new_balance: this.calculateNewBalance(
          card.balance?.toNumber() || 0,
          transaction
        ),
        amount_changed: transaction.amount,
        currency: transaction.currency,
        change_type: this.determineChangeType(transaction),
        description: transaction.description,
      });
    } catch (error) {
      this.logger.warn(
        "Failed to create balance transaction record:",
        error.message
      );
    }
  }

  /**
   * Calculate new balance after transaction
   */
  private calculateNewBalance(
    currentBalance: number,
    transaction: any
  ): number {
    const amount = transaction.amount || 0;

    // For debit transactions (withdrawals, purchases)
    if (this.isDebitTransaction(transaction)) {
      return currentBalance - amount;
    }

    // For credit transactions (funds, refunds)
    return currentBalance + amount;
  }

  /**
   * Determine if transaction is a debit
   */
  private isDebitTransaction(transaction: any): boolean {
    const debitTypes = ["WITHDRAW", "PURCHASE", "PAYMENT", "TRANSFER_OUT"];
    const type = transaction.type?.toUpperCase();

    return (
      debitTypes.includes(type) ||
      transaction.category?.toUpperCase() === "DEBIT" ||
      (transaction.amount || 0) < 0
    );
  }

  /**
   * Determine change type
   */
  private determineChangeType(transaction: any): string {
    if (this.isDebitTransaction(transaction)) {
      return "debit";
    }
    return "credit";
  }

  /**
   * Map transaction category
   */
  private mapTransactionCategory(type: string): string {
    if (!type) return "CARD";

    const typeUpper = type.toUpperCase();

    if (typeUpper.includes("FUND") || typeUpper.includes("DEPOSIT")) {
      return "FUNDING";
    } else if (typeUpper.includes("WITHDRAW")) {
      return "WITHDRAWAL";
    } else if (
      typeUpper.includes("PURCHASE") ||
      typeUpper.includes("PAYMENT")
    ) {
      return "PURCHASE";
    }

    return "CARD";
  }

  /**
   * Normalize transaction type
   */
  private normalizeTransactionType(type: string): string {
    if (!type) return "CARD_TRANSACTION";

    const typeUpper = type.toUpperCase();

    if (typeUpper.includes("FUND")) return "FUND";
    if (typeUpper.includes("WITHDRAW")) return "WITHDRAW";
    if (typeUpper.includes("PURCHASE")) return "PURCHASE";
    if (typeUpper.includes("PAYMENT")) return "PAYMENT";

    return typeUpper;
  }

  /**
   * Map provider transaction status
   */
  private mapProviderTransactionStatus(status: string): string {
    if (!status) return "SUCCESS";

    const statusUpper = status.toUpperCase();

    if (statusUpper.includes("SUCCESS") || statusUpper.includes("COMPLETED")) {
      return "SUCCESS";
    } else if (statusUpper.includes("PENDING")) {
      return "PENDING";
    } else if (
      statusUpper.includes("FAILED") ||
      statusUpper.includes("DECLINED")
    ) {
      return "FAILED";
    }

    return "SUCCESS"; // Default
  }

  /**
   * Sync card transactions concurrently
   */
  private async syncCardTransactionsConcurrently(
    cards: any[],
    user: CurrentUserData,
    options: any,
    maxConcurrency: number
  ): Promise<any[]> {
    const results = [];

    // Process cards in batches to control concurrency
    for (let i = 0; i < cards.length; i += maxConcurrency) {
      const batch = cards.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (card: any) => {
        try {
          const result = await this.syncCardTransactions(card.id, user, {
            force: options?.force,
            startDate: options?.startDate,
            endDate: options?.endDate,
            maxTransactions: options?.maxTransactionsPerCard,
          });
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
   * Calculate transaction sync summary
   */
  private calculateTransactionSyncSummary(results: any[]): any {
    const summary = {
      totalCards: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalTransactions: 0,
      totalNew: 0,
      totalUpdated: 0,
      totalDuplicates: 0,
    };

    for (const result of results) {
      if (result.success && result.result) {
        summary.totalTransactions += result.result.summary?.total_fetched || 0;
        summary.totalNew += result.result.summary?.new_transactions || 0;
        summary.totalUpdated +=
          result.result.summary?.updated_transactions || 0;
        summary.totalDuplicates += result.result.summary?.duplicates_found || 0;
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
   * Get provider transaction count (estimate)
   */
  private async getProviderTransactionCount(
    providerCardId: string,
    startDate?: Date
  ): Promise<number> {
    try {
      // This is a simplified estimate - in real implementation,
      // you might have a more efficient way to get count from provider
      const result = await MapleradUtils.getCardTransactions(providerCardId, {
        startDate,
        limit: 1, // Just get one to check if there are any
      });

      if (result.error) {
        return 0;
      }

      // If we have transactions, assume there might be more
      // In a real implementation, you'd want the provider to return a total count
      return (result.output || []).length > 0 ? 50 : 0; // Rough estimate
    } catch (error) {
      this.logger.warn(
        "Failed to get provider transaction count:",
        error.message
      );
      return 0;
    }
  }

  /**
   * Calculate transaction sync status
   */
  private calculateTransactionSyncStatus(
    localCount: number,
    providerCount: number,
    daysBack: number
  ): string {
    if (providerCount === 0) return "up_to_date";

    const syncRatio = localCount / providerCount;

    if (syncRatio >= 0.95) return "up_to_date";
    if (syncRatio >= 0.8) return "needs_sync";
    if (syncRatio >= 0.5) return "sync_recommended";

    return "sync_urgent";
  }

  /**
   * Log transaction sync operation
   */
  private async logTransactionSync(
    cardId: string,
    customerId: string,
    summary: any
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customerId,
      action: "card-transaction-sync",
      status: "SUCCESS",
      log_json: {
        card_id: cardId,
        summary,
        sync_timestamp: new Date().toISOString(),
      },
      log_txt: `Maplerad card transaction sync completed: ${cardId} - ${summary.new} new, ${summary.updated} updated`,
      created_at: new Date(),
    });
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
   * Generate transaction sync recommendations
   */
  private generateTransactionSyncRecommendations(
    syncStatus: string,
    localCount: number,
    providerCount: number
  ): string[] {
    const recommendations = [];
    const gap = providerCount - localCount;

    if (syncStatus === "up_to_date") {
      recommendations.push("✅ Transaction sync is up to date");
    } else if (syncStatus === "needs_sync") {
      recommendations.push(`⚠️ ${gap} transactions need to be synced`);
    } else if (syncStatus === "sync_recommended") {
      recommendations.push(`🚨 ${gap} transactions missing - sync recommended`);
    } else if (syncStatus === "sync_urgent") {
      recommendations.push(
        `🚨 URGENT: ${gap} transactions missing - immediate sync required`
      );
    }

    if (gap > 0) {
      recommendations.push(
        `💡 Run transaction sync to import missing transactions`
      );
    }

    return recommendations;
  }

  /**
   * Generate company transaction sync recommendations
   */
  private generateCompanyTransactionSyncRecommendations(
    overallStats: any,
    cardStats: any[]
  ): string[] {
    const recommendations = [];

    if (overallStats.total_sync_gap > 0) {
      recommendations.push(
        `📊 ${overallStats.total_sync_gap} total transactions missing across ${overallStats.cards_needing_sync} cards`
      );
    }

    if (overallStats.overall_sync_percentage < 80) {
      recommendations.push(
        `🚨 CRITICAL: Only ${overallStats.overall_sync_percentage}% of transactions synced`
      );
    } else if (overallStats.overall_sync_percentage < 95) {
      recommendations.push(
        `⚠️ WARNING: ${overallStats.overall_sync_percentage}% of transactions synced`
      );
    } else {
      recommendations.push(
        `✅ GOOD: ${overallStats.overall_sync_percentage}% of transactions synced`
      );
    }

    const cardsWithErrors = cardStats.filter((c) => (c as any).error).length;
    if (cardsWithErrors > 0) {
      recommendations.push(
        `❌ ${cardsWithErrors} cards had sync errors - check logs`
      );
    }

    if (overallStats.cards_needing_sync > 0) {
      recommendations.push(
        `🔄 ${overallStats.cards_needing_sync} cards need transaction sync`
      );
    }

    return recommendations;
  }
}
