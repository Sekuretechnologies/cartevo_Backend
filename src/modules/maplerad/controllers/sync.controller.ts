import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CardSyncService } from "../services/card.sync.service";
import { CardSyncTransactionService } from "../services/card.sync.transaction.service";

/**
 * 🔄 MONIX-STYLE: Dedicated Sync Operations Controller
 * Handles card synchronization and transaction syncing
 */
@Controller("cards/sync")
@UseGuards(JwtAuthGuard)
export class SyncOperationsController {
  constructor(
    private readonly cardSyncService: CardSyncService,
    private readonly transactionSyncService: CardSyncTransactionService
  ) {}

  /**
   * 🔄 Sync all cards for the company
   */
  @Post("")
  async syncAllCards(@Request() req: any) {
    console.log("🔄 SYNC CONTROLLER - Sync All Cards Request", {
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    const result = await this.cardSyncService.syncCompanyCards(req.user);

    return {
      message: "Card synchronization completed",
      result: result,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * 🔄 Sync specific card
   */
  @Post(":cardId")
  async syncCard(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("🔄 SYNC CONTROLLER - Sync Card Request", {
      cardId,
      userId: req.user.userId,
    });

    const result = await this.cardSyncService.syncCard(cardId, req.user);

    return {
      message: "Card synchronization completed",
      card_id: cardId,
      result: result,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * 📊 Sync transactions for specific card (placeholder)
   */
  @Post(":cardId/transactions")
  async syncCardTransactions(
    @Param("cardId") cardId: string,
    @Request() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string
  ) {
    console.log("📊 SYNC CONTROLLER - Sync Card Transactions Request", {
      cardId,
      userId: req.user.userId,
      fromDate,
      toDate,
    });

    // Placeholder - transaction sync service doesn't have this method yet
    return {
      message: "Transaction synchronization not yet implemented",
      card_id: cardId,
      requested_filters: { fromDate, toDate },
      status: "pending_implementation",
    };
  }

  /**
   * 📈 Get sync status
   */
  @Get("status")
  async getSyncStatus(@Request() req: any) {
    console.log("📈 SYNC CONTROLLER - Get Sync Status Request", {
      userId: req.user.userId,
    });

    const cardSyncStatus = await this.cardSyncService.getCompanySyncStatistics(
      req.user
    );

    return {
      sync_status: {
        cards: cardSyncStatus,
      },
      last_checked: new Date().toISOString(),
    };
  }

  /**
   * 📈 Get sync statistics
   */
  @Get("stats")
  async getSyncStats(@Request() req: any) {
    console.log("📈 SYNC CONTROLLER - Get Sync Stats Request", {
      userId: req.user.userId,
    });

    const cardStats = await this.cardSyncService.getCompanySyncStatistics(
      req.user
    );

    return {
      sync_statistics: {
        cards: cardStats,
      },
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * 🔧 Configure sync settings (placeholder)
   */
  @Put("config")
  async updateSyncConfig(
    @Body()
    config: {
      autoSyncEnabled?: boolean;
      syncIntervalMinutes?: number;
      maxRetries?: number;
    },
    @Request() req: any
  ) {
    console.log("🔧 SYNC CONTROLLER - Update Sync Config Request", {
      userId: req.user.userId,
      config,
    });

    // Placeholder - services don't have this method yet
    return {
      message: "Sync configuration not yet implemented",
      requested_config: config,
      status: "pending_implementation",
    };
  }

  /**
   * 🧹 Cleanup old sync data (placeholder)
   */
  @Post("cleanup")
  async cleanupSyncData(
    @Body()
    cleanupOptions: {
      olderThanDays?: number;
      maxRecords?: number;
    } = {},
    @Request() req: any
  ) {
    console.log("🧹 SYNC CONTROLLER - Cleanup Sync Data Request", {
      userId: req.user.userId,
      cleanupOptions,
    });

    // Placeholder - services don't have this method yet
    return {
      message: "Sync data cleanup not yet implemented",
      cleanup_options: cleanupOptions,
      status: "pending_implementation",
    };
  }

  /**
   * 🔄 Force full resync
   */
  @Post("resync")
  async forceResync(
    @Body()
    resyncOptions: {
      includeCards?: boolean;
      includeTransactions?: boolean;
      fromDate?: string;
    } = { includeCards: true, includeTransactions: true },
    @Request() req: any
  ) {
    console.log("🔄 SYNC CONTROLLER - Force Resync Request", {
      userId: req.user.userId,
      resyncOptions,
    });

    const results: any = {};

    if (resyncOptions.includeCards) {
      results.cards = await this.cardSyncService.syncCompanyCards(req.user, {
        force: true,
      });
    }

    if (resyncOptions.includeTransactions) {
      // Placeholder - transaction sync service doesn't have force resync yet
      results.transactions = {
        message: "Transaction force resync not yet implemented",
        status: "pending_implementation",
      };
    }

    return {
      message: "Force resync completed",
      resync_options: resyncOptions,
      results: results,
      completed_at: new Date().toISOString(),
    };
  }

  /**
   * 📋 Get sync logs (placeholder)
   */
  @Get("logs")
  async getSyncLogs(
    @Request() req: any,
    @Query("limit") limit: number = 50,
    @Query("type") type?: "cards" | "transactions"
  ) {
    console.log("📋 SYNC CONTROLLER - Get Sync Logs Request", {
      userId: req.user.userId,
      limit,
      type,
    });

    // Placeholder - services don't have this method yet
    return {
      message: "Sync logs not yet implemented",
      requested_limit: limit,
      filter_type: type || "all",
      status: "pending_implementation",
      generated_at: new Date().toISOString(),
    };
  }
}
