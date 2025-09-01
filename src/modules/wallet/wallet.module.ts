import { Module } from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";
import { WalletPhoneNumberController } from "./walletPhoneNumber.controller";
import { WalletPhoneOperatorController } from "./walletPhoneOperator.controller";

@Module({
  providers: [WalletService],
  controllers: [
    WalletController,
    WalletPhoneNumberController,
    WalletPhoneOperatorController,
  ],
  exports: [WalletService],
})
export class WalletModule {}
