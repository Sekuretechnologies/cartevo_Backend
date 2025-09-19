import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";

// 🎯 MONIX-STYLE: Controllers
import { CardOperationsController } from "./controllers/card.controller";
import { WebhookManagementController } from "./controllers/webhook.controller";
import { SyncOperationsController } from "./controllers/sync.controller";
import { WalletController } from "./controllers/wallet.controller";

// 🎣 MONIX-STYLE: Modular Webhook Services
import { MapleradWebhookService } from "./services/maplerad-webhook.service";
import { WebhookSecurityService } from "./services/webhook-security.service";
import { WebhookEventRouter } from "./services/webhook-event-router.service";
import { WebhookWaitingService } from "./services/webhook-waiting.service";
import { CardEventHandler } from "./services/handlers/card-event.handler";
import { TransactionEventHandler } from "./services/handlers/transaction-event.handler";

// 💳 Card Management Services
import { CardIssuanceService } from "./services/card.issuance.service";
import { CardFundService } from "./services/card.fund.service";
import { CardWithdrawService } from "./services/card.withdraw.service";
import { CardManagementService } from "./services/card.management.service";
import { CardSyncService } from "./services/card.sync.service";
import { CardSyncTransactionService } from "./services/card.sync.transaction.service";
import { CustomerSyncService } from "./services/customer.sync.service";
import { CardRecordService } from "./services/card.record.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    // 🎯 MONIX-STYLE Controllers
    CardOperationsController, // 💳 Card operations
    WebhookManagementController, // 🎣 Webhook management
    SyncOperationsController, // 🔄 Sync operations
    WalletController, // 💰 Wallet operations
  ],
  providers: [
    // 🎣 MONIX-STYLE Webhook Services
    MapleradWebhookService,
    WebhookSecurityService,
    WebhookEventRouter,
    WebhookWaitingService,
    CardEventHandler,
    TransactionEventHandler,

    // 💳 Card Management Services
    CardIssuanceService,
    CardFundService,
    CardWithdrawService,
    CardManagementService,
    CardSyncService,
    CardSyncTransactionService,
    CustomerSyncService,
    CardRecordService,
  ],
  exports: [
    // 🎣 MONIX-STYLE Webhook Services
    MapleradWebhookService,
    WebhookSecurityService,
    WebhookEventRouter,
    WebhookWaitingService,
    CardEventHandler,
    TransactionEventHandler,

    // 💳 Card Management Services
    CardIssuanceService,
    CardFundService,
    CardWithdrawService,
    CardManagementService,
    CardSyncService,
    CardSyncTransactionService,
    CustomerSyncService,
    CardRecordService,
  ],
})
export class MapleradModule {}
