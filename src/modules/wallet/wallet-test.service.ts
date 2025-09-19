import { Injectable, Logger } from "@nestjs/common";
import { MapleradUtils } from "../maplerad/utils/maplerad.utils";
import WalletModel from "@/models/prisma/walletModel";

export interface CreditTestWalletsRequest {
  amount: number;
  currency?: string;
  sandbox: boolean;
}

export interface CreditTestWalletsResponse {
  success: boolean;
  message: string;
  wallet: {
    walletId: string;
    previousBalance: number;
    newBalance: number;
    creditedAmount: number;
  };
  timestamp: string;
}

@Injectable()
export class WalletTestService {
  private readonly logger = new Logger(WalletTestService.name);

  /**
   * Credit test wallets (Company USD wallet + Maplerad test wallet)
   * Only works in sandbox mode for security
   */
  async creditTestWallet(
    companyId: string,
    userId: string,
    body: CreditTestWalletsRequest
  ): Promise<CreditTestWalletsResponse> {
    this.logger.log("💰 CREDIT TEST WALLETS SERVICE - REQUEST", {
      companyId,
      userId,
      amount: body.amount,
      currency: body.currency || "USD",
      sandbox: body.sandbox,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate sandbox mode
      if (!body.sandbox) {
        this.logger.error("🚫 SANDBOX MODE REQUIRED", {
          companyId,
          userId,
          sandbox: body.sandbox,
          timestamp: new Date().toISOString(),
        });
        throw new Error(
          "This endpoint only works in sandbox mode for security reasons"
        );
      }

      // Validate input
      if (!body.amount || body.amount <= 0) {
        throw new Error("Amount must be a positive number");
      }

      const currency = body.currency || "USD";
      const validCurrencies = ["USD"];

      if (!validCurrencies.includes(currency.toUpperCase())) {
        throw new Error(
          `Invalid currency. Supported currencies: ${validCurrencies.join(
            ", "
          )}`
        );
      }

      this.logger.log("✅ INPUT VALIDATION PASSED", {
        companyId,
        userId,
        amount: body.amount,
        currency: currency.toUpperCase(),
        timestamp: new Date().toISOString(),
      });

      // 1. Credit company USD wallet
      this.logger.log("🏦 CREDITING COMPANY USD WALLET", {
        companyId,
        userId,
        amount: body.amount,
        timestamp: new Date().toISOString(),
      });

      const usdWalletResult = await WalletModel.getOne({
        company_id: companyId,
        currency: "USD",
        is_active: true,
      });

      if (usdWalletResult.error || !usdWalletResult.output) {
        throw new Error("USD wallet not found for company");
      }

      const usdWallet = usdWalletResult.output;
      const previousBalance = usdWallet.balance.toNumber();
      const newBalance = previousBalance + body.amount;

      await WalletModel.update(usdWallet.id, { balance: newBalance });

      this.logger.log("✅ COMPANY USD WALLET CREDITED", {
        companyId,
        userId,
        walletId: usdWallet.id,
        previousBalance,
        newBalance,
        creditedAmount: body.amount,
        timestamp: new Date().toISOString(),
      });

      // 2. Credit Maplerad test wallet
      this.logger.log("🌐 CREDITING MAPLERAD TEST WALLET", {
        companyId,
        userId,
        amount: body.amount,
        currency: currency.toUpperCase(),
        timestamp: new Date().toISOString(),
      });

      const mapleradResult = await MapleradUtils.creditTestWallet(
        body.amount,
        currency.toUpperCase()
      );

      if (mapleradResult.error) {
        this.logger.error("❌ MAPLERAD TEST WALLET CREDIT FAILED", {
          companyId,
          userId,
          amount: body.amount,
          currency: currency.toUpperCase(),
          error: mapleradResult.error.message,
          timestamp: new Date().toISOString(),
        });

        // Rollback company wallet credit
        this.logger.log("🔄 ROLLING BACK COMPANY WALLET CREDIT", {
          companyId,
          userId,
          walletId: usdWallet.id,
          rollingBackTo: previousBalance,
          timestamp: new Date().toISOString(),
        });

        await WalletModel.update(usdWallet.id, { balance: previousBalance });

        throw new Error(
          `Failed to credit Maplerad test wallet: ${mapleradResult.error.message}`
        );
      }

      this.logger.log("✅ MAPLERAD TEST WALLET CREDITED", {
        companyId,
        userId,
        amount: body.amount,
        currency: currency.toUpperCase(),
        mapleradResponse: mapleradResult.output,
        timestamp: new Date().toISOString(),
      });

      const response: CreditTestWalletsResponse = {
        success: true,
        message: "Test wallets credited successfully",
        wallet: {
          walletId: usdWallet.id,
          previousBalance,
          newBalance,
          creditedAmount: body.amount,
        },
        // mapleradWallet: {
        //   success: true,
        //   data: mapleradResult.output,
        // },
        timestamp: new Date().toISOString(),
      };

      this.logger.log("🎉 CREDIT TEST WALLETS SERVICE - COMPLETED", {
        companyId,
        userId,
        response,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error: any) {
      this.logger.error("❌ CREDIT TEST WALLETS SERVICE - FAILED", {
        companyId,
        userId,
        amount: body.amount,
        currency: body.currency || "USD",
        sandbox: body.sandbox,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }
}
