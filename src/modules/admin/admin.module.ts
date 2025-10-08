import { EmailService } from "@/services/email.service";
import { TokenBlacklistService } from "@/services/token-blacklist.service";
import { Module } from "@nestjs/common";
import { WalletService } from "../wallet/wallet.service";
import { WithdrawalProcessorService } from "../../services/scheduler/withdrawalProcessor.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { WithdrawalQueueController } from "./withdrawalQueue.controller";

import { CompaniesAdminModule } from "./companies-admin/companies-admin.module";
import { ModeRestrictionsService } from "@/services/mode-restriction.service";

@Module({
  controllers: [WithdrawalQueueController, AdminController],
  providers: [
    WithdrawalProcessorService,
    AdminService,
    WalletService,
    EmailService,
    TokenBlacklistService,
    ModeRestrictionsService,
  ],
  exports: [WithdrawalProcessorService],
  imports: [CompaniesAdminModule],
})
export class AdminModule {}
