import { Module } from "@nestjs/common";
import { WithdrawalQueueController } from "./withdrawalQueue.controller";
import { WithdrawalProcessorService } from "../../services/scheduler/withdrawalProcessor.service";

@Module({
  controllers: [WithdrawalQueueController],
  providers: [WithdrawalProcessorService],
  exports: [WithdrawalProcessorService],
})
export class AdminModule {}






