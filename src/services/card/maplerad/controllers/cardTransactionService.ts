import { CardModel, TransactionModel, UserModel } from "@/models";
import { v4 as uuidv4 } from "uuid";
import { utcToLocalTime } from "@/utils/date";
import {
  CardStatus,
  CardTransactionStatus,
} from "@/utils/cards/maplerad/types";
import { FeeCalculationService } from "../services/feeCalculationService";
import { UnifiedWalletService } from "../services/walletService";
import { NotificationService } from "../services/notificationService";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
} from "../types/transaction.types";

/**
 * Card Transaction Service
 * Handles card funding and withdrawal operations
 */
export class CardTransactionService {
  /**
   * Fund a card
   */
  static async fundCard(cardId: string, usdAmount: number, user: any) {
    try {
      // Validate user
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!user.active || user.blocked) {
        throw new Error("User is not authorized for this transaction");
      }

      // Get the card
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error || !cardResult.output) {
        throw new Error("Card not found");
      }
      const card = cardResult.output;

      // Check if it's a Maplerad card
      if (card.provider !== "maplerad") {
        throw new Error("This card is not a Maplerad card");
      }

      // Validate card status
      if (
        card.status?.startsWith("DISABLED") ||
        card.status?.startsWith("FREEZE") ||
        card.status?.startsWith("TERMINATED") ||
        card.status === "INACTIVE"
      ) {
        throw new Error("Card is inactive or blocked");
      }

      // Validate amount
      if (!usdAmount || usdAmount < 1) {
        throw new Error("Minimum funding amount is 1 USD");
      }

      // Limit to 50 USD max
      if (usdAmount > 50) {
        throw new Error("Maximum funding amount is 50 USD");
      }

      // Calculate fees
      const feeCalculation =
        await FeeCalculationService.calculateCardIssuanceFees(
          user.company_id || user.id,
          usdAmount
        );

      const totalToDebitUsd = usdAmount + feeCalculation.totalFee;

      // Check user balance
      const userBalance =
        user.country_iso_code === "CD"
          ? user.balance_currency || 0
          : user.balance_xaf || 0;

      if (userBalance < totalToDebitUsd) {
        throw new Error("Insufficient wallet balance");
      }

      const transactionId = uuidv4();

      // Create transaction record
      const transactionResult = await TransactionModel.create({
        id: transactionId,
        status: TRANSACTION_STATUS.PENDING,
        amount: usdAmount,
        fee_amount: feeCalculation.totalFee,
        category: TRANSACTION_CATEGORY.CARD,
        type: TRANSACTION_TYPE.TOPUP,
        customer_id: user.id,
        card_id: cardId,
        company_id: user.company_id || user.id,
        provider: "maplerad",
        currency: "USD",
        reference: `FUND_${Date.now()}`,
        description: `Fund card ${card.masked_number || "XXXX"}`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (transactionResult.error) {
        throw new Error("Failed to create transaction");
      }

      // Reserve funds from wallet
      await UnifiedWalletService.reserveFunds(
        user.wallet_id || user.id, // Assuming wallet_id exists
        totalToDebitUsd,
        `Card funding reservation for ${usdAmount} USD`,
        transactionId
      );

      // Update transaction to success (simplified - in real implementation would wait for webhook)
      await TransactionModel.update(transactionId, {
        status: TRANSACTION_STATUS.SUCCESS,
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      // Update card balance
      await CardModel.update(cardId, {
        balance: (card.balance || 0) + usdAmount,
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      // Send notifications
      await NotificationService.sendCardIssuanceSuccessNotification({
        customerId: user.id,
        companyId: user.company_id || user.id,
        amount: usdAmount,
        currency: "USD",
        reference: transactionId,
      });

      return {
        status: "success",
        message: `Card funded with ${usdAmount} USD`,
        data: {
          transactionId,
          amount: usdAmount,
          fee: feeCalculation.totalFee,
          totalCharged: totalToDebitUsd,
        },
      };
    } catch (err: any) {
      console.error("fundCard error:", err);
      throw new Error(err.message || "Failed to fund card");
    }
  }

  /**
   * Withdraw from a card
   */
  static async withdrawCard(cardId: string, usdAmount: number, user: any) {
    try {
      // Validate user
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!user.active || user.blocked) {
        throw new Error("User is not authorized for this transaction");
      }

      // Get the card
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error || !cardResult.output) {
        throw new Error("Card not found");
      }
      const card = cardResult.output;

      // Check if it's a Maplerad card
      if (card.provider !== "maplerad") {
        throw new Error("This card is not a Maplerad card");
      }

      // Validate card status
      if (
        card.status?.startsWith("DISABLED") ||
        card.status?.startsWith("FREEZE") ||
        card.status?.startsWith("TERMINATED") ||
        card.status === "INACTIVE"
      ) {
        throw new Error("Card is inactive or blocked");
      }

      // Validate amount
      if (!usdAmount || usdAmount < 2) {
        throw new Error("Minimum withdrawal amount is 2 USD");
      }

      // Check card balance (keep at least 1 USD)
      if (usdAmount + 1 > (card.balance || 0)) {
        throw new Error("Insufficient card balance");
      }

      const transactionId = uuidv4();

      // Calculate withdrawal amount (with fees)
      const withdrawalFees = 0.1; // 10% fee
      const feeAmountUsd = usdAmount * withdrawalFees;
      const netAmount = usdAmount - feeAmountUsd;

      // Create transaction record
      const transactionResult = await TransactionModel.create({
        id: transactionId,
        status: TRANSACTION_STATUS.PENDING,
        amount: usdAmount,
        fee_amount: feeAmountUsd,
        category: TRANSACTION_CATEGORY.CARD,
        type: TRANSACTION_TYPE.WITHDRAWAL,
        customer_id: user.id,
        card_id: cardId,
        company_id: user.company_id || user.id,
        provider: "maplerad",
        currency: "USD",
        reference: `WITHDRAW_${Date.now()}`,
        description: `Withdraw from card ${card.masked_number || "XXXX"}`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (transactionResult.error) {
        throw new Error("Failed to create transaction");
      }

      // Update transaction to success (simplified)
      await TransactionModel.update(transactionId, {
        status: TRANSACTION_STATUS.SUCCESS,
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      // Update card balance
      await CardModel.update(cardId, {
        balance: (card.balance || 0) - usdAmount,
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      // Update user wallet balance
      const userBalanceField =
        user.country_iso_code === "CD" ? "balance_currency" : "balance_xaf";
      const currentBalance = user[userBalanceField] || 0;
      const withdrawalAmountXaf = netAmount * 650; // Approximate conversion

      await UserModel.update(user.id, {
        [userBalanceField]: currentBalance + withdrawalAmountXaf,
      });

      // Send notifications
      await NotificationService.sendCardIssuanceSuccessNotification({
        customerId: user.id,
        companyId: user.company_id || user.id,
        amount: netAmount,
        currency: "USD",
        reference: transactionId,
      });

      return {
        status: "success",
        message: `Withdrew ${usdAmount} USD from card`,
        data: {
          transactionId,
          amount: usdAmount,
          fee: feeAmountUsd,
          netAmount,
          totalReceived: netAmount,
        },
      };
    } catch (err: any) {
      console.error("withdrawCard error:", err);
      throw new Error(err.message || "Failed to withdraw from card");
    }
  }

  /**
   * Get card transactions
   */
  static async getCardTransactions(cardId: string, userId: string) {
    try {
      // Verify card ownership
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error || !cardResult.output) {
        throw new Error("Card not found");
      }

      const card = cardResult.output;
      if (card.customer_id !== userId) {
        throw new Error("Unauthorized access to card transactions");
      }

      // Get transactions for the card
      const transactionsResult = await TransactionModel.get({
        card_id: cardId,
      });

      if (transactionsResult.error) {
        throw new Error("Failed to retrieve transactions");
      }

      const transactions = transactionsResult.output || [];

      return {
        status: "success",
        message: "Card transactions retrieved",
        data: {
          transactions,
          count: transactions.length,
        },
      };
    } catch (err: any) {
      console.error("getCardTransactions error:", err);
      throw new Error(err.message || "Failed to retrieve card transactions");
    }
  }
}
