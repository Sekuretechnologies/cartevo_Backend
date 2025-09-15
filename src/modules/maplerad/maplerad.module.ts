import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";

// 🎯 MONIX-STYLE: Controllers
import { CardOperationsController } from "./controllers/card.controller";
import { WebhookManagementController } from "./controllers/webhook.controller";
import { SyncOperationsController } from "./controllers/sync.controller";

// 🎣 MONIX-STYLE: Modular Webhook Services
import { MapleradWebhookService } from "./services/maplerad-webhook.service";
import { WebhookSecurityService } from "./services/webhook-security.service";
import { WebhookEventRouter } from "./services/webhook-event-router.service";
import { CardEventHandler } from "./services/handlers/card-event.handler";
import { TransactionEventHandler } from "./services/handlers/transaction-event.handler";

// 💳 Card Management Services
import { CardIssuanceService } from "./services/card.issuance.service";
import { CardFundService } from "./services/card.fund.service";
import { CardWithdrawService } from "./services/card.withdraw.service";
import { CardManagementService } from "./services/card.management.service";
import { CardSyncService } from "./services/card.sync.service";
import { CardSyncTransactionService } from "./services/card.sync.transaction.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    // 🎯 MONIX-STYLE Controllers
    CardOperationsController, // 💳 Card operations
    WebhookManagementController, // 🎣 Webhook management
    SyncOperationsController, // 🔄 Sync operations
  ],
  providers: [
    // 🎣 MONIX-STYLE Webhook Services
    MapleradWebhookService,
    WebhookSecurityService,
    WebhookEventRouter,
    CardEventHandler,
    TransactionEventHandler,

    // 💳 Card Management Services
    CardIssuanceService,
    CardFundService,
    CardWithdrawService,
    CardManagementService,
    CardSyncService,
    CardSyncTransactionService,
  ],
  exports: [
    // 🎣 MONIX-STYLE Webhook Services
    MapleradWebhookService,
    WebhookSecurityService,
    WebhookEventRouter,
    CardEventHandler,
    TransactionEventHandler,

    // 💳 Card Management Services
    CardIssuanceService,
    CardFundService,
    CardWithdrawService,
    CardManagementService,
    CardSyncService,
    CardSyncTransactionService,
  ],
})
export class MapleradModule {}
