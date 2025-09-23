import { Module } from "@nestjs/common";
import { WithdrawalQueueController } from "./withdrawalQueue.controller";
import { WithdrawalProcessorService } from "../../services/scheduler/withdrawalProcessor.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { EmailService } from "@/services/email.service";
import { TokenBlacklistService } from "@/services/token-blacklist.service";

@Module({
  controllers: [WithdrawalQueueController, AdminController],
  providers: [
    WithdrawalProcessorService,
    AdminService,
    EmailService,
    TokenBlacklistService,
  ],
  exports: [WithdrawalProcessorService],
})
export class AdminModule {}
