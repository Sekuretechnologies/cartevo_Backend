// AlphaSpace Module
// WAVLET adaptation of MONIX AlphaSpace integration - PHASE 2

import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AlphaSpaceService } from "./services/alphaspace.service";
import { AlphaSpaceAuthService } from "./services/alphaspace-auth.service";
import { CardManagementService } from "./services/card.management.service";
import { CardIssuanceService } from "./services/card.issuance.service";
import { CardFundService } from "./services/card.fund.service";
import { CardWithdrawService } from "./services/card.withdraw.service";
import { FeeManagementService } from "./services/fee-management.service";
import { WebhookSecurityService } from "./services/webhook-security.service";
import { AlphaSpaceCardController } from "./controllers/card.controller";
import { AlphaSpaceWebhookController } from "./controllers/webhook.controller";
import { AlphaSpaceHealthController } from "./controllers/health.controller";
import { AlphaSpaceConfigProvider } from "./alphaspace.providers";
import { AlphaSpaceMaintenanceGuard } from "./guards/alphaspace-maintenance.guard";

@Module({
  imports: [PrismaModule], // Database access
  controllers: [
    AlphaSpaceCardController, // Phase 4: Card operations API
    AlphaSpaceWebhookController, // Phase 4: Webhook handling
    AlphaSpaceHealthController, // Phase 4: Health monitoring
  ],
  providers: [
    // Configuration
    AlphaSpaceConfigProvider,

    // Core services
    AlphaSpaceAuthService,
    AlphaSpaceService,

    // Specialized card services (Phase 2)
    CardManagementService,
    CardIssuanceService,
    CardFundService,
    CardWithdrawService,

    // Advanced features (Phase 3)
    FeeManagementService,
    WebhookSecurityService,

    // Guards (Phase 5: WAVLET Advantage)
    AlphaSpaceMaintenanceGuard,
  ],
  exports: [
    // Core functionality
    AlphaSpaceService,
    AlphaSpaceAuthService,

    // Card operations
    CardManagementService,
    CardIssuanceService,
    CardFundService,
    CardWithdrawService,

    // Advanced features
    FeeManagementService,
    WebhookSecurityService,

    // Controller for testing
    AlphaSpaceCardController,
  ],
})
export class AlphaSpaceModule {}
