import { EmailService } from "@/services/email.service";
import { TokenBlacklistService } from "@/services/token-blacklist.service";
import { Module } from "@nestjs/common";
import { WithdrawalProcessorService } from "../../services/scheduler/withdrawalProcessor.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { WithdrawalQueueController } from "./withdrawalQueue.controller";

import { CompaniesAdminModule } from "./companies-admin/companies-admin.module";

@Module({
  controllers: [WithdrawalQueueController, AdminController],
  providers: [
    WithdrawalProcessorService,
    AdminService,
    EmailService,
    TokenBlacklistService,
  ],
  exports: [WithdrawalProcessorService],
  imports: [CompaniesAdminModule],
})
export class AdminModule {}
