import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import {
  fundWallet,
  getWalletBalance,
  IWalletFunding,
} from "@/services/wallet/walletFunding.service";
import WalletModel from "@/models/prisma/walletModel";
import WalletPhoneOperatorModel from "@/models/prisma/walletPhoneOperatorModel";
import TransactionModel from "@/models/prisma/transactionModel";
import fnOutput, { OutputProps } from "@/utils/shared/fnOutputHandler";

export interface DepositToWalletSubmitProps {
  sourceWallet: {
    id: string;
    currency: string;
    amount: number;
    feeAmount: number;
    totalAmount: number;
  };
  destinationWallet: {
    id: string;
    currency: string;
    amount: number;
  };
  exchangeRate: {
    rate: number;
    fromCurrency: string;
    toCurrency: string;
  };
}

export interface IWalletCreate {
  currency: string;
  country: string;
  country_iso_code: string;
  country_phone_code: string;
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
      console.log("walletResult :: ", result);
      return { data: wallet };
    } catch (error: any) {
      throw new BadRequestException(
        "Failed to create wallet: " + error.message
      );
      // return fnOutput.error({
      //   error: { message: "Failed to create wallet: " + error.message },
      // });
    }
  }

  async getAllWallets(companyId?: string) {
    try {
      console.log("getAllWallets() :: ", companyId);

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

  async fundWallet(data: IWalletFunding) {
    const dataResult: OutputProps = await fundWallet(data);
    if (dataResult?.error) {
      throw new HttpException(
        dataResult?.error?.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return { data: dataResult.output };
  }

  async getWalletBalance(companyId: string, walletId: string) {
    return getWalletBalance(walletId);
  }

  async depositToWallet(companyId: string, data: DepositToWalletSubmitProps) {
    try {
      // Get source wallet
      const sourceWallet = await WalletModel.getOne({
        id: data.sourceWallet.id,
        company_id: companyId,
      });
      if (sourceWallet.error || !sourceWallet.output) {
        throw new BadRequestException("Source wallet not found");
      }

      // Get destination wallet
      const destinationWallet = await WalletModel.getOne({
        id: data.destinationWallet.id,
        company_id: companyId,
      });
      if (destinationWallet.error || !destinationWallet.output) {
        throw new BadRequestException("Destination wallet not found");
      }

      // Check if source has enough balance
      if (sourceWallet.output.balance < data.sourceWallet.totalAmount) {
        throw new BadRequestException("Insufficient balance in source wallet");
      }

      // Calculate converted amount
      const convertedAmount = data.destinationWallet.amount; // Assuming amount is already converted

      // Generate reference
      const reference = `DEPOSIT_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Use transaction to ensure atomicity
      // await TransactionModel.operation(async (prisma) => {
      // Update source wallet balance
      await WalletModel.update(
        { id: data.sourceWallet.id },
        {
          balance: sourceWallet.output.balance - data.sourceWallet.totalAmount,
        }
      );

      // Update destination wallet balance
      await WalletModel.update(
        { id: data.destinationWallet.id },
        { balance: destinationWallet.output.balance + convertedAmount }
      );

      // Create debit transaction for source wallet
      await TransactionModel.create({
        category: "WALLET_TRANSFER",
        type: "DEBIT",
        wallet_id: data.sourceWallet.id,
        company_id: companyId,
        status: "SUCCESS",
        description: `Transfer to wallet ${data.destinationWallet.id}`,
        reason: "Wallet to wallet transfer",
        wallet_balance_before: sourceWallet.output.balance,
        wallet_balance_after:
          sourceWallet.output.balance - data.sourceWallet.totalAmount,
        amount: data.sourceWallet.amount,
        currency: data.sourceWallet.currency,
        fee_amount: data.sourceWallet.feeAmount,
        net_amount: data.sourceWallet.amount,
        amount_with_fee: data.sourceWallet.totalAmount,
        reference: reference,
      });

      // Create credit transaction for destination wallet
      await TransactionModel.create({
        category: "WALLET_TRANSFER",
        type: "CREDIT",
        wallet_id: data.destinationWallet.id,
        company_id: companyId,
        status: "SUCCESS",
        description: `Transfer from wallet ${data.sourceWallet.id}`,
        reason: "Wallet to wallet transfer",
        wallet_balance_before: destinationWallet.output.balance,
        wallet_balance_after:
          destinationWallet.output.balance + convertedAmount,
        amount: convertedAmount,
        currency: data.destinationWallet.currency,
        fee_amount: 0,
        net_amount: convertedAmount,
        amount_with_fee: convertedAmount,
        reference: reference,
      });
      // });

      return { data: { message: "Deposit successful", reference: reference } };
    } catch (error: any) {
      throw new BadRequestException("Failed to deposit: " + error.message);
    }
  }
}
