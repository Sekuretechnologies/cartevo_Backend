import { BadRequestException, Injectable } from "@nestjs/common";
import {
  fundWallet,
  getWalletBalance,
  IWalletFunding,
} from "@/services/wallet/walletFunding.service";
import WalletModel from "@/models/prisma/walletModel";
import WalletPhoneOperatorModel from "@/models/prisma/walletPhoneOperatorModel";
import fnOutput from "@/utils/shared/fnOutputHandler";
export interface IWalletCreate {
  currency: string;
  country: string;
  country_iso_code: string;
  country_phone_code?: string;
}

// { currency: string; country_iso_code: string }

export interface IWalletUpdate {
  balance?: number;
  active?: boolean;
  country_phone_code?: string;
}

@Injectable()
export class WalletService {
  async createWallet(companyId: string, data: IWalletCreate) {
    try {
      const walletData = {
        ...data,
        balance: 0,
        active: true,
        company_id: companyId,
      };
      console.log("createWallet ----------------------------------");

      console.log("walletData :: ", walletData);

      console.log("----------------------------------");

      const result = await WalletModel.create(walletData);
      const wallet = result.output;
      return { data: wallet };
    } catch (error: any) {
      throw new BadRequestException(
        "Failed to create wallet: " + error.message
      );
      return fnOutput.error({
        error: { message: "Failed to create wallet: " + error.message },
      });
    }
  }

  async getAllWallets(companyId?: string) {
    try {
      const filters = companyId ? { company_id: companyId } : {};
      const wallets = await WalletModel.get(filters);

      if (wallets.error) {
        return wallets;
      }

      // Add operators to each wallet
      const walletsWithOperators = await Promise.all(
        wallets.output.map(async (wallet: any) => {
          const operators = await this.getWalletOperators(
            wallet.country_iso_code,
            wallet.currency
          );
          return {
            ...wallet,
            operators: operators.output || [],
          };
        })
      );

      return { data: walletsWithOperators };
    } catch (error: any) {
      throw new BadRequestException("Failed to get wallets: " + error.message);
      // return fnOutput.error({
      //   error: { message: "Failed to get wallets: " + error.message },
      // });
    }
  }

  async getWalletById(companyId: string, id: string) {
    try {
      const wallet = await WalletModel.getOne({ id, company_id: companyId });

      if (wallet.error) {
        return wallet;
      }

      // Add operators to the wallet
      const operators = await this.getWalletOperators(
        wallet.output.country_iso_code,
        wallet.output.currency
      );

      const walletWithOperators = {
        ...wallet.output,
        operators: operators.output || [],
      };

      return fnOutput.success({ output: walletWithOperators });
    } catch (error: any) {
      return fnOutput.error({
        error: { message: "Failed to get wallet: " + error.message },
      });
    }
  }

  async updateWallet(companyId: string, id: string, data: IWalletUpdate) {
    try {
      const result = await WalletModel.update(
        {
          id,
          company_id: companyId,
        },
        data
      );
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: { message: "Failed to update wallet: " + error.message },
      });
    }
  }

  async deleteWallet(companyId: string, id: string) {
    try {
      const result = await WalletModel.delete({
        id,
        company_id: companyId,
      });
      return result;
    } catch (error: any) {
      return fnOutput.error({
        error: { message: "Failed to delete wallet: " + error.message },
      });
    }
  }

  private async getWalletOperators(countryIsoCode: string, currency: string) {
    try {
      const operators = await WalletPhoneOperatorModel.get({
        country_iso_code: countryIsoCode,
        currency: currency,
      });
      return operators;
    } catch (error: any) {
      return fnOutput.error({
        error: { message: "Failed to get wallet operators: " + error.message },
      });
    }
  }

  async fundWallet(companyId: string, data: IWalletFunding) {
    return fundWallet(data);
  }

  async getWalletBalance(companyId: string, walletId: string) {
    return getWalletBalance(walletId);
  }
}
