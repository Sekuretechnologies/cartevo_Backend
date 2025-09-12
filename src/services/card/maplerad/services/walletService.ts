import {
  WalletModel,
  TransactionModel,
  BalanceTransactionRecordModel,
} from "@/models";
import { utcToLocalTime } from "@/utils/date";
import { generateReferenceId } from "@/utils/cards/maplerad/tools";
import { v4 as uuidv4 } from "uuid";
import { InsufficientFundsError } from "../types/cardIssuance.types";

/**
 * Unified Wallet Service
 * Consolidates all wallet-related operations for card issuance
 */
export class UnifiedWalletService {
  /**
   * Reserve funds from company wallet before card issuance
   */
  static async reserveFunds(
    walletId: string,
    amount: number,
    description: string,
    reference: string
  ): Promise<{
    walletId: string;
    originalBalance: number;
    reservedAmount: number;
    reference: string;
  }> {
    try {
      const walletResult = await WalletModel.getOne({ id: walletId });
      if (walletResult.error) {
        throw walletResult.error;
      }
      const wallet = walletResult.output;

      if (wallet.balance < amount) {
        throw new InsufficientFundsError(walletId, amount, wallet.balance);
      }

      // For now, we'll just validate the balance
      // In a production system, you might want to implement actual fund locking
      return {
        walletId,
        originalBalance: Number(wallet.balance),
        reservedAmount: amount,
        reference,
      };
    } catch (error: any) {
      console.error("Error reserving wallet funds:", error);
      throw error;
    }
  }

  /**
   * Refund funds to company wallet after failure
   */
  static async refundFunds(
    walletId: string,
    amount: number,
    reference: string,
    reason: string
  ): Promise<{
    walletId: string;
    refundedAmount: number;
    newBalance: number;
    reference: string;
  }> {
    try {
      const walletResult = await WalletModel.getOne({ id: walletId });
      if (walletResult.error) {
        throw walletResult.error;
      }
      const wallet = walletResult.output;

      const newBalance = Number(wallet.balance) + amount;

      await WalletModel.update(walletId, {
        balance: newBalance,
        updated_at: new Date(),
      });

      console.log("Funds refunded to wallet", {
        walletId,
        refundedAmount: amount,
        newBalance,
        reference,
        reason,
      });

      return {
        walletId,
        refundedAmount: amount,
        newBalance,
        reference,
      };
    } catch (error: any) {
      console.error("Error refunding wallet funds:", error);
      throw error;
    }
  }

  /**
   * Update wallet balance after successful transaction
   */
  static async updateBalance(
    walletId: string,
    newBalance: number
  ): Promise<void> {
    try {
      await WalletModel.update(walletId, {
        balance: newBalance,
        updated_at: new Date(),
      });

      console.log("Wallet balance updated", {
        walletId,
        newBalance,
      });
    } catch (error: any) {
      console.error("Error updating wallet balance:", error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  static async getBalance(walletId: string): Promise<number> {
    try {
      const walletResult = await WalletModel.getOne({ id: walletId });
      if (walletResult.error) {
        throw walletResult.error;
      }
      return Number(walletResult.output.balance);
    } catch (error: any) {
      console.error("Error getting wallet balance:", error);
      throw error;
    }
  }

  /**
   * Create balance transaction record
   */
  static async createBalanceRecord(
    transactionId: string,
    entityType: "wallet" | "card",
    entityId: string,
    oldBalance: number,
    newBalance: number,
    amountChanged: number,
    currency: string,
    changeType: "debit" | "credit",
    description: string
  ): Promise<void> {
    try {
      await BalanceTransactionRecordModel.create({
        transaction_id: transactionId,
        entity_type: entityType,
        entity_id: entityId,
        old_balance: oldBalance,
        new_balance: newBalance,
        amount_changed: amountChanged,
        currency,
        change_type: changeType,
        description,
      });

      console.log("Balance transaction record created", {
        transactionId,
        entityType,
        entityId,
        amountChanged,
        changeType,
      });
    } catch (error: any) {
      console.error("Error creating balance transaction record:", error);
      throw error;
    }
  }

  /**
   * Validate wallet has sufficient funds
   */
  static async validateSufficientFunds(
    walletId: string,
    requiredAmount: number
  ): Promise<boolean> {
    try {
      const balance = await this.getBalance(walletId);
      return balance >= requiredAmount;
    } catch (error: any) {
      console.error("Error validating wallet funds:", error);
      return false;
    }
  }

  /**
   * Get wallet by company and currency
   */
  static async getCompanyWallet(
    companyId: string,
    currency: string = "USD"
  ): Promise<any> {
    try {
      const walletResult = await WalletModel.get({
        company_id: companyId,
        currency,
      });

      if (
        walletResult.error ||
        !walletResult.output ||
        walletResult.output.length === 0
      ) {
        throw new Error(
          `Company ${currency} wallet not found for company ${companyId}`
        );
      }

      return walletResult.output[0];
    } catch (error: any) {
      console.error("Error getting company wallet:", error);
      throw error;
    }
  }
}
