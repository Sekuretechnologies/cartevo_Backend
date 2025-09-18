import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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
import {
  decodeText,
  encodeText,
  signToken,
  decodeToken,
} from "@/utils/shared/encryption";
import { utcToLocalTime } from "@/utils/date";
import { MapleradUtils } from "../utils/maplerad.utils";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";
import { CardSyncService } from "./card.sync.service";
import { CardIssuanceService } from "./card.issuance.service";

/**
 * Advanced Card Management Service for Maplerad
 * Implements comprehensive card management operations with MONIX-style advanced features
 */
@Injectable()
export class CardManagementService {
  private readonly logger = new Logger(CardManagementService.name);

  constructor(
    private prisma: PrismaService,
    private cardSyncService: CardSyncService
  ) {}

  /**
   * Freeze a Maplerad card with advanced MONIX-style features
   */
  async freezeCard(cardId: string, user: CurrentUserData): Promise<any> {
    this.logger.log("🧊 ADVANCED MAPLERAD CARD FREEZE FLOW - START", {
      cardId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership and status
      const card = await this.validateCardForManagement(cardId, user.companyId);

      // 2. Check if already frozen
      if (card.status === CardStatus.FROZEN) {
        throw new BadRequestException("Card is already frozen");
      }

      // 3. Check if card is terminable (not terminated)
      if (card.status === CardStatus.TERMINATED) {
        throw new BadRequestException("Cannot freeze a terminated card");
      }

      let mapleradCallSucceeded = false;
      let freezeResult: any = null;

      try {
        // 4. Freeze card via Maplerad API
        freezeResult = await this.freezeMapleradCard(card.provider_card_id);
        mapleradCallSucceeded = true;

        // 5. Update local card status
        await this.updateLocalCardStatus(cardId, CardStatus.FROZEN);

        // 6. Log freeze success
        await this.logCardManagementAction(
          cardId,
          card.customer_id,
          "freeze",
          "SUCCESS",
          {
            maplerad_result: freezeResult,
            previous_status: card.status,
            new_status: CardStatus.FROZEN,
          }
        );

        this.logger.log("✅ ADVANCED MAPLERAD CARD FREEZE FLOW - COMPLETED", {
          cardId,
          success: true,
        });

        return {
          success: true,
          message: "Card frozen successfully",
          data: {
            card_id: cardId,
            previous_status: card.status,
            new_status: CardStatus.FROZEN,
            frozen_at: new Date().toISOString(),
            maplerad_reference: freezeResult?.reference,
          },
        };
      } catch (error: any) {
        // Handle freeze errors
        await this.handleCardManagementError(
          error,
          mapleradCallSucceeded,
          cardId,
          card.customer_id,
          "freeze"
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD FREEZE FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card freeze failed: ${error.message}`);
    }
  }

  /**
   * Unfreeze a Maplerad card with advanced MONIX-style features
   */
  async unfreezeCard(cardId: string, user: CurrentUserData): Promise<any> {
    this.logger.log("🔥 ADVANCED MAPLERAD CARD UNFREEZE FLOW - START", {
      cardId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership and status
      const card = await this.validateCardForManagement(cardId, user.companyId);

      // 2. Check if not frozen
      if (card.status !== CardStatus.FROZEN) {
        throw new BadRequestException("Card is not frozen");
      }

      let mapleradCallSucceeded = false;
      let unfreezeResult: any = null;

      try {
        // 3. Unfreeze card via Maplerad API
        unfreezeResult = await this.unfreezeMapleradCard(card.provider_card_id);
        mapleradCallSucceeded = true;

        // 4. Update local card status to ACTIVE
        await this.updateLocalCardStatus(cardId, CardStatus.ACTIVE);

        // 5. Log unfreeze success
        await this.logCardManagementAction(
          cardId,
          card.customer_id,
          "unfreeze",
          "SUCCESS",
          {
            maplerad_result: unfreezeResult,
            previous_status: card.status,
            new_status: CardStatus.ACTIVE,
          }
        );

        this.logger.log("✅ ADVANCED MAPLERAD CARD UNFREEZE FLOW - COMPLETED", {
          cardId,
          success: true,
        });

        return {
          success: true,
          message: "Card unfrozen successfully",
          data: {
            card_id: cardId,
            previous_status: card.status,
            new_status: CardStatus.ACTIVE,
            unfrozen_at: new Date().toISOString(),
            maplerad_reference: unfreezeResult?.reference,
          },
        };
      } catch (error: any) {
        // Handle unfreeze errors
        await this.handleCardManagementError(
          error,
          mapleradCallSucceeded,
          cardId,
          card.customer_id,
          "unfreeze"
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD UNFREEZE FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card unfreeze failed: ${error.message}`);
    }
  }

  /**
   * Terminate a Maplerad card with advanced MONIX-style features
   */
  async terminateCard(cardId: string, user: CurrentUserData): Promise<any> {
    this.logger.log("💀 ADVANCED MAPLERAD CARD TERMINATION FLOW - START", {
      cardId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership and status
      const card = await this.validateCardForManagement(cardId, user.companyId);

      // 2. Check if already terminated
      if (card.status === CardStatus.TERMINATED) {
        throw new BadRequestException("Card is already terminated");
      }

      // 3. Get current card balance for potential refund
      const currentBalance = card.balance.toNumber();

      let mapleradCallSucceeded = false;
      let terminationResult: any = null;
      let refundProcessed = false;
      let refundAmount = 0;

      try {
        // 4. Terminate card via Maplerad API
        terminationResult = await this.terminateMapleradCard(
          card.provider_card_id
        );
        mapleradCallSucceeded = true;

        // 5. Process balance refund if card has remaining balance
        if (currentBalance > 0) {
          refundAmount = currentBalance;
          await this.processTerminationRefund(
            card.customer_id,
            user.companyId,
            refundAmount,
            cardId
          );
          refundProcessed = true;
        }

        // 6. Update local card status
        await this.updateLocalCardStatus(cardId, CardStatus.TERMINATED, {
          terminateDate: new Date(),
          balance: 0, // Zero out balance after refund
        });

        // 7. Log termination success
        await this.logCardManagementAction(
          cardId,
          card.customer_id,
          "terminate",
          "SUCCESS",
          {
            maplerad_result: terminationResult,
            previous_status: card.status,
            new_status: CardStatus.TERMINATED,
            refund_processed: refundProcessed,
            refund_amount: refundAmount,
            final_balance: 0,
          }
        );

        this.logger.log(
          "✅ ADVANCED MAPLERAD CARD TERMINATION FLOW - COMPLETED",
          {
            cardId,
            success: true,
            refundProcessed,
            refundAmount,
          }
        );

        return {
          success: true,
          message: "Card terminated successfully",
          data: {
            card_id: cardId,
            previous_status: card.status,
            new_status: CardStatus.TERMINATED,
            terminated_at: new Date().toISOString(),
            refund_processed: refundProcessed,
            refund_amount: refundAmount,
            final_balance: 0,
            maplerad_reference: terminationResult?.reference,
          },
        };
      } catch (error: any) {
        // Handle termination errors
        await this.handleCardManagementError(
          error,
          mapleradCallSucceeded,
          cardId,
          card.customer_id,
          "terminate"
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ADVANCED CARD TERMINATION FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Card termination failed: ${error.message}`
      );
    }
  }

  /**
   * Get a single card with advanced MONIX-style features
   */
  async getCard(
    cardId: string,
    user: CurrentUserData,
    revealSensitive?: boolean
  ): Promise<any> {
    this.logger.log("🔍 ADVANCED GET CARD FLOW - START", {
      cardId,
      userId: user.userId,
      revealSensitive,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, user.companyId);

      // 2. Get card with sensitive data handling
      let cardData = card;

      if (revealSensitive) {
        // Fetch real card data from Maplerad
        const mapleradCardResult = await MapleradUtils.getCard(
          card.provider_card_id,
          true
        );

        if (mapleradCardResult.error) {
          this.logger.warn(
            "Could not fetch card from Maplerad:",
            mapleradCardResult.error
          );
        } else {
          const mapleradCard = mapleradCardResult.output;

          // Update local encrypted data
          if (mapleradCard?.cardNumber && mapleradCard?.cvv) {
            const encryptedCardNumber = signToken(mapleradCard.cardNumber);
            const encryptedCvv = signToken(mapleradCard.cvv);

            await CardModel.update(card.id, {
              number: `tkMplr_${encryptedCardNumber}`,
              cvv: `tkMplr_${encryptedCvv}`,
            });

            cardData = {
              ...cardData,
              number: mapleradCard.cardNumber,
              cvv: mapleradCard.cvv,
            };
          }
        }
      } else if (card.cvv?.startsWith("tkMplr_")) {
        // Decrypt stored data
        const decryptedCardNumber = decodeToken(
          card.number.replace(/^tkMplr_/, "")
        )?.value;
        const decryptedCvv = decodeToken(
          card.cvv.replace(/^tkMplr_/, "")
        )?.value;

        cardData = {
          ...cardData,
          number: decryptedCardNumber,
          cvv: decryptedCvv,
        };
      }

      // 3. Format response
      const formattedCard = {
        id: cardData.id,
        customer_id: cardData.customer_id,
        status: cardData.status,
        balance: cardData.balance,
        number: cardData.number,
        masked_number: cardData.masked_number,
        last4: cardData.last4,
        cvv: cardData.cvv,
        expiry_month: cardData.expiry_month,
        expiry_year: cardData.expiry_year,
        brand: cardData.brand,
        currency: cardData.currency,
        created_at: cardData.created_at,
        updated_at: cardData.updated_at,
        terminate_date: cardData.terminate_date,
        is_active: cardData.is_active,
        is_virtual: cardData.is_virtual,
        provider: decodeText(cardData.provider),
      };

      this.logger.log("✅ ADVANCED GET CARD FLOW - COMPLETED", {
        cardId,
        success: true,
        revealedSensitive: revealSensitive,
      });

      return {
        success: true,
        card: formattedCard,
        metadata: {
          revealed_sensitive: revealSensitive || false,
          provider: decodeText(card.provider),
          last_sync: card.updated_at,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED GET CARD FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Get card failed: ${error.message}`);
    }
  }

  /**
   * Get all cards for a customer with advanced MONIX-style features
   */
  async getCustomerCards(
    customerId: string,
    user: CurrentUserData,
    syncCards: boolean = false
  ): Promise<any> {
    this.logger.log("👤 ADVANCED GET CUSTOMER CARDS FLOW - START", {
      customerId,
      userId: user.userId,
      syncCards,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Sync customer cards if requested
      if (syncCards) {
        this.logger.log(
          "🔄 SYNC REQUESTED - SYNCING CUSTOMER CARDS BEFORE RETURNING",
          {
            customerId,
            userId: user.userId,
            timestamp: new Date().toISOString(),
          }
        );

        // Use injected CardSyncService

        try {
          const syncResult = await this.cardSyncService.syncCustomerCards(
            customerId,
            user.companyId,
            {
              force: true, // Force sync when explicitly requested
              maxConcurrency: 3,
            }
          );

          this.logger.log("✅ CUSTOMER CARDS SYNC COMPLETED", {
            customerId,
            syncResult: {
              totalCardsSynced: syncResult.summary?.totalCards || 0,
              successfulSyncs: syncResult.summary?.successful || 0,
              failedSyncs: syncResult.summary?.failed || 0,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (syncError: any) {
          this.logger.error(
            "❌ CUSTOMER CARDS SYNC FAILED - CONTINUING WITH LOCAL DATA",
            {
              customerId,
              syncError: syncError.message,
              timestamp: new Date().toISOString(),
            }
          );
          // Continue with local data even if sync fails
        }
      }

      // 2. Validate customer ownership
      const customer = await this.validateCustomerAccess(customerId, user);

      // 3. Get all customer cards
      const cardsResult = await CardModel.get({
        customer_id: customerId,
        company_id: user.companyId,
      });

      if (cardsResult.error) {
        throw new BadRequestException("Failed to retrieve customer cards");
      }

      const cards = cardsResult.output || [];

      // 4. Calculate statistics
      const statistics = this.calculateCardStatistics(cards);

      // 5. Format cards
      const formattedCards = cards.map((card: any) => ({
        id: card.id,
        status: card.status,
        balance: card.balance,
        masked_number: card.masked_number,
        last4: card.last4,
        brand: card.brand,
        currency: card.currency,
        created_at: card.created_at,
        updated_at: card.updated_at,
        is_active: card.is_active,
        is_virtual: card.is_virtual,
        provider: decodeText(card.provider),
      }));

      this.logger.log("✅ ADVANCED GET CUSTOMER CARDS FLOW - COMPLETED", {
        customerId,
        cardsCount: cards.length,
        syncPerformed: syncCards,
        success: true,
      });

      return {
        success: true,
        customer_id: customerId,
        statistics,
        cards: formattedCards,
        metadata: {
          total_cards: cards.length,
          last_sync: new Date().toISOString(),
          sync_performed: syncCards,
          provider: "maplerad",
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED GET CUSTOMER CARDS FAILED", {
        customerId,
        error: error.message,
        userId: user.userId,
        syncRequested: syncCards,
      });
      throw new BadRequestException(
        `Get customer cards failed: ${error.message}`
      );
    }
  }

  /**
   * Get all cards for a company with advanced MONIX-style features
   */
  async getCompanyCards(
    user: CurrentUserData,
    syncCards: boolean = false
  ): Promise<any> {
    this.logger.log("🏢 ADVANCED GET COMPANY CARDS FLOW - START", {
      userId: user.userId,
      companyId: user.companyId,
      syncCards,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Sync cards if requested
      if (syncCards) {
        this.logger.log(
          "🔄 SYNC REQUESTED - SYNCING COMPANY CARDS BEFORE RETURNING",
          {
            companyId: user.companyId,
            userId: user.userId,
            timestamp: new Date().toISOString(),
          }
        );

        try {
          const syncResult = await this.cardSyncService.syncCompanyCards(
            user.companyId,
            {
              force: true, // Force sync when explicitly requested
              maxConcurrency: 3,
            }
          );

          this.logger.log("✅ COMPANY CARDS SYNC COMPLETED", {
            companyId: user.companyId,
            syncResult: {
              totalCardsSynced: syncResult.summary?.total_cards_synced || 0,
              successfulSyncs:
                syncResult.summary?.successful_customer_syncs || 0,
              failedSyncs: syncResult.summary?.failed_customer_syncs || 0,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (syncError: any) {
          this.logger.error(
            "❌ COMPANY CARDS SYNC FAILED - CONTINUING WITH LOCAL DATA",
            {
              companyId: user.companyId,
              syncError: syncError.message,
              timestamp: new Date().toISOString(),
            }
          );
          // Continue with local data even if sync fails
        }
      }

      // 2. Get all company cards
      const cardsResult = await CardModel.get({
        company_id: user.companyId,
        provider: encodeText("maplerad"),
      });

      console.log("✅  Get all company cards :: ", cardsResult);

      if (cardsResult.error) {
        throw new BadRequestException("Failed to retrieve company cards");
      }

      const cards = cardsResult.output || [];

      // // 3. Calculate comprehensive statistics
      // const statistics = this.calculateCompanyCardStatistics(cards);

      // // 4. Group cards by customer
      // const cardsByCustomer = this.groupCardsByCustomer(cards);

      // 5. Format cards
      const formattedCards = cards.map((card: any) => ({
        id: card.id,
        customer_id: card.customer_id,
        status: card.status,
        balance: card.balance,
        masked_number: card.masked_number,
        last4: card.last4,
        brand: card.brand,
        currency: card.currency,
        created_at: card.created_at,
        updated_at: card.updated_at,
        is_active: card.is_active,
        is_virtual: card.is_virtual,
        // provider: decodeText(card.provider),
      }));

      this.logger.log("✅ ADVANCED GET COMPANY CARDS FLOW - COMPLETED", {
        companyId: user.companyId,
        cardsCount: cards.length,
        // customersCount: Object.keys(cardsByCustomer).length,
        syncPerformed: syncCards,
        success: true,
      });

      return {
        success: true,
        // company_id: user.companyId,
        // statistics,
        data: formattedCards,
        // cards_by_customer: cardsByCustomer,
        // metadata: {
        //   total_cards: cards.length,
        //   total_customers: Object.keys(cardsByCustomer).length,
        //   last_sync: new Date().toISOString(),
        //   sync_performed: syncCards,
        //   provider: "maplerad",
        // },
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED GET COMPANY CARDS FAILED", {
        companyId: user.companyId,
        error: error.message,
        userId: user.userId,
        syncRequested: syncCards,
      });
      throw new BadRequestException(
        `Get company cards failed: ${error.message}`
      );
    }
  }

  /**
   * Get transactions for a specific card with advanced MONIX-style features
   */
  async getCardTransactions(
    cardId: string,
    user: CurrentUserData,
    filters?: {
      limit?: number;
      offset?: number;
      type?: TransactionType;
      status?: string;
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<any> {
    this.logger.log("📊 ADVANCED GET CARD TRANSACTIONS FLOW - START", {
      cardId,
      userId: user.userId,
      filters,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, user.companyId);

      // 2. Build query filters
      const queryFilters: any = { card_id: cardId };

      if (filters?.type) queryFilters.type = filters.type;
      if (filters?.status) queryFilters.status = filters.status;
      if (filters?.fromDate)
        queryFilters.created_at = { gte: filters.fromDate };
      if (filters?.toDate)
        queryFilters.created_at = {
          ...queryFilters.created_at,
          lte: filters.toDate,
        };

      // 3. Get transactions with pagination
      const transactionsResult = await TransactionModel.get(queryFilters, {
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
        orderBy: { created_at: "desc" },
      });

      if (transactionsResult.error) {
        throw new BadRequestException("Failed to retrieve card transactions");
      }

      const transactions = transactionsResult.output || [];

      // 4. Calculate transaction statistics
      const statistics = this.calculateTransactionStatistics(transactions);

      // 5. Format transactions
      const formattedTransactions = transactions.map((tx: any) => ({
        id: tx.id,
        category: tx.category,
        type: tx.type,
        amount: tx.amount.toNumber(),
        currency: tx.currency,
        status: tx.status,
        description: tx.description,
        created_at: tx.created_at,
        completed_at: tx.completed_at,
        card_balance_before: tx.card_balance_before?.toNumber(),
        card_balance_after: tx.card_balance_after?.toNumber(),
        wallet_balance_before: tx.wallet_balance_before?.toNumber(),
        wallet_balance_after: tx.wallet_balance_after?.toNumber(),
        provider: decodeText(tx.provider),
        order_id: tx.order_id,
        failure_reason: tx.failure_reason,
      }));

      this.logger.log("✅ ADVANCED GET CARD TRANSACTIONS FLOW - COMPLETED", {
        cardId,
        transactionsCount: transactions.length,
        success: true,
      });

      return {
        success: true,
        card_id: cardId,
        statistics,
        transactions: formattedTransactions,
        pagination: {
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
          total: transactions.length,
        },
        filters: filters || {},
        metadata: {
          last_sync: new Date().toISOString(),
          provider: decodeText(card.provider),
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED GET CARD TRANSACTIONS FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Get card transactions failed: ${error.message}`
      );
    }
  }

  /**
   * Get transactions for all customer cards with advanced MONIX-style features
   */
  async getCustomerCardTransactions(
    customerId: string,
    user: CurrentUserData
  ): Promise<any> {
    this.logger.log(
      "👤📊 ADVANCED GET CUSTOMER CARD TRANSACTIONS FLOW - START",
      {
        customerId,
        userId: user.userId,
        timestamp: new Date().toISOString(),
      }
    );

    try {
      // 1. Validate customer ownership
      const customer = await this.validateCustomerAccess(customerId, user);

      // 2. Get customer cards
      const cardsResult = await CardModel.get({
        customer_id: customerId,
        company_id: user.companyId,
      });

      if (cardsResult.error) {
        throw new BadRequestException("Failed to retrieve customer cards");
      }

      const cards = cardsResult.output || [];
      const cardIds = cards.map((card: any) => card.id);

      // 3. Get all transactions for customer cards
      const transactionsResult = await TransactionModel.get(
        {
          card_id: { in: cardIds },
        },
        {
          orderBy: { created_at: "desc" },
          limit: 100, // Limit for performance
        }
      );

      if (transactionsResult.error) {
        throw new BadRequestException(
          "Failed to retrieve customer card transactions"
        );
      }

      const transactions = transactionsResult.output || [];

      // 4. Group transactions by card
      const transactionsByCard = this.groupTransactionsByCard(transactions);

      // 5. Calculate customer transaction statistics
      const statistics =
        this.calculateCustomerTransactionStatistics(transactions);

      this.logger.log(
        "✅ ADVANCED GET CUSTOMER CARD TRANSACTIONS FLOW - COMPLETED",
        {
          customerId,
          cardsCount: cards.length,
          transactionsCount: transactions.length,
          success: true,
        }
      );

      return {
        success: true,
        customer_id: customerId,
        statistics,
        transactions_by_card: transactionsByCard,
        metadata: {
          total_cards: cards.length,
          total_transactions: transactions.length,
          last_sync: new Date().toISOString(),
          provider: "maplerad",
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED GET CUSTOMER CARD TRANSACTIONS FAILED", {
        customerId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Get customer card transactions failed: ${error.message}`
      );
    }
  }

  /**
   * Get transactions for all company cards with advanced MONIX-style features
   */
  async getCompanyCardTransactions(user: CurrentUserData): Promise<any> {
    this.logger.log(
      "🏢📊 ADVANCED GET COMPANY CARD TRANSACTIONS FLOW - START",
      {
        userId: user.userId,
        companyId: user.companyId,
        timestamp: new Date().toISOString(),
      }
    );

    try {
      // 1. Get all company transactions
      const transactionsResult = await TransactionModel.get(
        {
          company_id: user.companyId,
          provider: encodeText("maplerad"),
        },
        {
          orderBy: { created_at: "desc" },
          limit: 500, // Limit for performance
        }
      );

      if (transactionsResult.error) {
        throw new BadRequestException(
          "Failed to retrieve company card transactions"
        );
      }

      const transactions = transactionsResult.output || [];

      // 2. Group transactions by card and customer
      const transactionsByCard = this.groupTransactionsByCard(transactions);
      const transactionsByCustomer =
        this.groupTransactionsByCustomer(transactions);

      // 3. Calculate comprehensive company statistics
      const statistics =
        this.calculateCompanyTransactionStatistics(transactions);

      this.logger.log(
        "✅ ADVANCED GET COMPANY CARD TRANSACTIONS FLOW - COMPLETED",
        {
          companyId: user.companyId,
          transactionsCount: transactions.length,
          cardsCount: Object.keys(transactionsByCard).length,
          customersCount: Object.keys(transactionsByCustomer).length,
          success: true,
        }
      );

      return {
        success: true,
        company_id: user.companyId,
        statistics,
        transactions_by_card: transactionsByCard,
        transactions_by_customer: transactionsByCustomer,
        metadata: {
          total_transactions: transactions.length,
          total_cards: Object.keys(transactionsByCard).length,
          total_customers: Object.keys(transactionsByCustomer).length,
          last_sync: new Date().toISOString(),
          provider: "maplerad",
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ADVANCED GET COMPANY CARD TRANSACTIONS FAILED", {
        companyId: user.companyId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Get company card transactions failed: ${error.message}`
      );
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate card for management operations
   */
  private async validateCardForManagement(
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
   * Validate card access for read operations
   */
  private async validateCardAccess(
    cardId: string,
    companyId: string
  ): Promise<any> {
    return this.validateCardForManagement(cardId, companyId);
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
   * Freeze card via Maplerad API
   */
  private async freezeMapleradCard(providerCardId: string): Promise<any> {
    const result = await MapleradUtils.freezeCard(providerCardId);

    if (result.error) {
      throw new BadRequestException(
        `Maplerad freeze failed: ${result.error.message}`
      );
    }

    return result.output;
  }

  /**
   * Unfreeze card via Maplerad API
   */
  private async unfreezeMapleradCard(providerCardId: string): Promise<any> {
    const result = await MapleradUtils.unfreezeCard(providerCardId);

    if (result.error) {
      throw new BadRequestException(
        `Maplerad unfreeze failed: ${result.error.message}`
      );
    }

    return result.output;
  }

  /**
   * Terminate card via Maplerad API
   */
  private async terminateMapleradCard(providerCardId: string): Promise<any> {
    const result = await MapleradUtils.terminateCard(providerCardId);

    if (result.error) {
      throw new BadRequestException(
        `Maplerad termination failed: ${result.error.message}`
      );
    }

    return result.output;
  }

  /**
   * Update local card status
   */
  private async updateLocalCardStatus(
    cardId: string,
    status: CardStatus,
    additionalFields?: any
  ): Promise<void> {
    const updateData: any = { status };

    if (additionalFields) {
      Object.assign(updateData, additionalFields);
    }

    await CardModel.update(cardId, updateData);
  }

  /**
   * Process termination refund
   */
  private async processTerminationRefund(
    customerId: string,
    companyId: string,
    amount: number,
    cardId: string
  ): Promise<void> {
    // Get USD wallet
    const usdWalletResult = await WalletModel.getOne({
      company_id: companyId,
      currency: "USD",
      is_active: true,
    });

    if (usdWalletResult.output) {
      const currentBalance = usdWalletResult.output.balance.toNumber();
      const newBalance = currentBalance + amount;

      await WalletModel.update(usdWalletResult.output.id, {
        balance: newBalance,
      });

      // Create refund transaction record
      await TransactionModel.create({
        id: uuidv4(),
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

      this.logger.debug("Termination refund processed", {
        customerId,
        cardId,
        amount,
        previousBalance: currentBalance,
        newBalance,
      });
    }
  }

  /**
   * Log card management actions
   */
  private async logCardManagementAction(
    cardId: string,
    customerId: string,
    action: string,
    status: string,
    details: any
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customerId,
      action: `card-${action}`,
      status,
      log_json: {
        card_id: cardId,
        action,
        ...details,
      },
      log_txt: `Maplerad card ${action} ${status.toLowerCase()}: ${cardId}`,
      created_at: new Date(),
    });
  }

  /**
   * Handle card management errors
   */
  private async handleCardManagementError(
    error: any,
    mapleradCallSucceeded: boolean,
    cardId: string,
    customerId: string,
    action: string
  ): Promise<void> {
    await CustomerLogsModel.create({
      customer_id: customerId,
      action: `card-${action}`,
      status: "FAILED",
      log_json: {
        card_id: cardId,
        action,
        error: error.message,
        maplerad_succeeded: mapleradCallSucceeded,
      },
      log_txt: `Maplerad card ${action} failed: ${error.message}`,
      created_at: new Date(),
    });
  }

  /**
   * Calculate card statistics
   */
  private calculateCardStatistics(cards: any[]): any {
    return {
      total: cards.length,
      active: cards.filter((c) => c.status === CardStatus.ACTIVE).length,
      frozen: cards.filter((c) => c.status === CardStatus.FROZEN).length,
      terminated: cards.filter((c) => c.status === CardStatus.TERMINATED)
        .length,
      inactive: cards.filter((c) => c.status === CardStatus.ACTIVE).length, // Note: No INACTIVE status in enum, using ACTIVE as fallback
      total_balance: cards.reduce(
        (sum, card) => sum + (card.balance?.toNumber() || 0),
        0
      ),
      available_slots: Math.max(
        0,
        5 - cards.filter((c) => c.status !== CardStatus.TERMINATED).length
      ),
    };
  }

  /**
   * Calculate company card statistics
   */
  private calculateCompanyCardStatistics(cards: any[]): any {
    const stats = this.calculateCardStatistics(cards);

    // Add company-specific statistics
    stats.by_customer = cards.reduce((acc, card) => {
      const customerId = card.customer_id;
      if (!acc[customerId]) {
        acc[customerId] = {
          customer_id: customerId,
          cards_count: 0,
          total_balance: 0,
          active_cards: 0,
        };
      }
      acc[customerId].cards_count++;
      acc[customerId].total_balance += card.balance?.toNumber() || 0;
      if (card.status === CardStatus.ACTIVE) {
        acc[customerId].active_cards++;
      }
      return acc;
    }, {});

    return stats;
  }

  /**
   * Group cards by customer
   */
  private groupCardsByCustomer(cards: any[]): any {
    return cards.reduce((acc, card) => {
      const customerId = card.customer_id;
      if (!acc[customerId]) {
        acc[customerId] = [];
      }
      acc[customerId].push({
        id: card.id,
        status: card.status,
        balance: card.balance,
        masked_number: card.masked_number,
        brand: card.brand,
        created_at: card.created_at,
      });
      return acc;
    }, {});
  }

  /**
   * Calculate transaction statistics
   */
  private calculateTransactionStatistics(transactions: any[]): any {
    return {
      total: transactions.length,
      successful: transactions.filter((t) => t.status === "SUCCESS").length,
      pending: transactions.filter((t) => t.status === "PENDING").length,
      failed: transactions.filter((t) => t.status === "FAILED").length,
      total_amount: transactions.reduce(
        (sum, tx) => sum + (tx.amount?.toNumber() || 0),
        0
      ),
      by_type: transactions.reduce((acc, tx) => {
        const type = tx.type;
        if (!acc[type]) acc[type] = 0;
        acc[type]++;
        return acc;
      }, {}),
      by_category: transactions.reduce((acc, tx) => {
        const category = tx.category;
        if (!acc[category]) acc[category] = 0;
        acc[category]++;
        return acc;
      }, {}),
    };
  }

  /**
   * Calculate customer transaction statistics
   */
  private calculateCustomerTransactionStatistics(transactions: any[]): any {
    const stats = this.calculateTransactionStatistics(transactions);

    // Add customer-specific statistics
    stats.recent_activity = transactions
      .filter((t) => t.status === "SUCCESS")
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount?.toNumber(),
        created_at: t.created_at,
      }));

    return stats;
  }

  /**
   * Calculate company transaction statistics
   */
  private calculateCompanyTransactionStatistics(transactions: any[]): any {
    const stats = this.calculateTransactionStatistics(transactions);

    // Add company-specific statistics
    stats.daily_volume = transactions.reduce((acc, tx) => {
      const date = tx.created_at?.toISOString().split("T")[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += tx.amount?.toNumber() || 0;
      return acc;
    }, {});

    return stats;
  }

  /**
   * Group transactions by card
   */
  private groupTransactionsByCard(transactions: any[]): any {
    return transactions.reduce((acc, tx) => {
      const cardId = tx.card_id;
      if (!acc[cardId]) {
        acc[cardId] = [];
      }
      acc[cardId].push({
        id: tx.id,
        type: tx.type,
        amount: tx.amount?.toNumber(),
        status: tx.status,
        created_at: tx.created_at,
        description: tx.description,
      });
      return acc;
    }, {});
  }

  /**
   * Group transactions by customer
   */
  private groupTransactionsByCustomer(transactions: any[]): any {
    return transactions.reduce((acc, tx) => {
      const customerId = tx.customer_id;
      if (!acc[customerId]) {
        acc[customerId] = [];
      }
      acc[customerId].push({
        id: tx.id,
        card_id: tx.card_id,
        type: tx.type,
        amount: tx.amount?.toNumber(),
        status: tx.status,
        created_at: tx.created_at,
        description: tx.description,
      });
      return acc;
    }, {});
  }
}
