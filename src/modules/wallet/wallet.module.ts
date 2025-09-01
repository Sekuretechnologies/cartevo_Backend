import { Module } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";
import { WalletPhoneNumberController } from "./walletPhoneNumber.controller";
import { WalletPhoneOperatorController } from "./walletPhoneOperator.controller";
import { WalletTransactionsController } from "./walletTransactions.controller";
import { WalletTransactionsService } from "./walletTransactions.service";

@Module({
  providers: [WalletService, WalletTransactionsService],
  controllers: [
    WalletController,
    WalletPhoneNumberController,
    WalletPhoneOperatorController,
    WalletTransactionsController,
  ],
  exports: [WalletService, WalletTransactionsService],
})
export class WalletModule {}
