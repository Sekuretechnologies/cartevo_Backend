import { EmailService } from "@/services/email.service";
import { TokenBlacklistService } from "@/services/token-blacklist.service";
import { Module } from "@nestjs/common";
import { WithdrawalProcessorService } from "../../services/scheduler/withdrawalProcessor.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { WithdrawalQueueController } from "./withdrawalQueue.controller";

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
