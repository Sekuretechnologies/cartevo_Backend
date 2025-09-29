import {
  checkAfribapayBalance,
  initiateAfribapayPayout,
} from "@/utils/wallet/afribapay";
import { PrismaClient } from "@prisma/client";
import TransactionFeeModel from "../../models/prisma/transactionFeeModel";
import { PendingWithdrawalQueueService } from "./pendingWithdrawalQueue.service";

const prisma = new PrismaClient();

export interface WithdrawalRequest {
  amount: number;
  phone_number: string;
  operator: string;
  reason?: string;
  user_id: string;
}

export interface WithdrawalResponse {
  success: boolean;
  message: string;
  transaction_id?: string;
  status?: "PENDING" | "SUCCESS" | "FAILED" | "PENDING_FUNDS" | "QUEUED";
  new_payout_balance?: number;
}

export class WalletWithdrawalService {
  /**
   * Check Afribapay payout balance by country/currency
   */
  private static async getAfribapayBalance(
    countryIsoCode?: string,
    currency?: string
  ): Promise<number> {
    try {
      const response: any = await checkAfribapayBalance();
      const list: any[] = response?.data?.data;
      if (!Array.isArray(list)) return 0;
      const entry = list.find(
        (it) =>
          String(it?.service).toLowerCase() === "payout" &&
          String(it?.country_code).toUpperCase() ===
            String(countryIsoCode || "").toUpperCase() &&
          String(it?.currency).toUpperCase() ===
            String(currency || "").toUpperCase()
      );
      const available = entry?.balance_available ?? entry?.balance;
      const value = Number(available);
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      console.error("Afribapay balance check failed:", error);
      return 0;
    }
  }

  /**
   * Calculate withdrawal fees using the settings page configuration
   */
  private static async calculateWithdrawalFees(
    amount: number,
    companyId: string,
    currency: string
  ): Promise<{ feeAmount: number; feePercentage: number }> {
    try {
      // Get withdrawal fees from the database (settings page)
      const feeResult = await TransactionFeeModel.calculateFee(
        companyId,
        amount,
        "WITHDRAWAL", // Transaction type for withdrawals
        "WALLET", // Transaction category
        "CM", // Default country code
        currency
      );

      if (!feeResult.error && feeResult.output) {
        return {
          feeAmount: feeResult.output.feeAmount,
          feePercentage: feeResult.output.feePercentage,
        };
      }

      // Fallback: default 2% fee
      return {
        feeAmount: (amount * 2) / 100,
        feePercentage: 2,
      };
    } catch (error) {
      console.error("Error calculating withdrawal fees:", error);
      // Fallback: default 2% fee
      return {
        feeAmount: (amount * 2) / 100,
        feePercentage: 2,
      };
    }
  }

  /**
   * Process withdrawal from PayOut balance
   */
  static async processWithdrawal(
    walletId: string,
    request: WithdrawalRequest
  ): Promise<WithdrawalResponse> {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        select: {
          id: true,
          payout_balance: true,
          currency: true,
          company_id: true,
          is_active: true,
          country_iso_code: true,
        },
      });

      if (!wallet) {
        return { success: false, message: "Wallet not found" };
      }

      if (!wallet.is_active) {
        return { success: false, message: "Wallet is not active" };
      }

      if (request.amount <= 0) {
        return { success: false, message: "Amount must be greater than 0" };
      }

      // Calculate withdrawal fees using settings page configuration
      const feeCalculation = await this.calculateWithdrawalFees(
        request.amount,
        wallet.company_id,
        wallet.currency
      );

      const feeAmount = feeCalculation.feeAmount;
      const totalAmount = request.amount + feeAmount;

      console.log("=== BACKEND WITHDRAWAL VALIDATION ===");
      console.log("wallet.payout_balance:", wallet.payout_balance);
      console.log(
        "Number(wallet.payout_balance):",
        Number(wallet.payout_balance)
      );
      console.log("request.amount:", request.amount);
      console.log("feeAmount:", feeAmount);
      console.log("totalAmount:", totalAmount);
      console.log(
        "Validation: Number(wallet.payout_balance) < totalAmount =",
        Number(wallet.payout_balance) < totalAmount
      );
      console.log("=====================================");

      if (Number(wallet.payout_balance) < totalAmount) {
        console.log("❌ INSUFFICIENT BALANCE - BLOCKING TRANSACTION");
        return {
          success: false,
          message: `Insufficient PayOut balance. Required: ${totalAmount} ${wallet.currency} (including ${feeAmount} ${wallet.currency} fees)`,
        };
      }

      // Check Afribapay payout balance (by country/currency)
      const afribapayBalance = await this.getAfribapayBalance(
        wallet.country_iso_code,
        wallet.currency
      );

      if (afribapayBalance < totalAmount) {
        // Return error instead of queuing
        console.log("❌ INSUFFICIENT AFRIBAPAY BALANCE - BLOCKING TRANSACTION");
        return {
          success: false,
          message: `Insufficient Afribapay balance. Required: ${totalAmount} ${wallet.currency}, Available: ${afribapayBalance} ${wallet.currency}. Please try again later.`,
        };
      }

      // Process withdrawal
      const result = await prisma.$transaction(async (tx) => {
        const updatedWallet = await tx.wallet.update({
          where: { id: walletId },
          data: {
            payout_balance: { decrement: totalAmount }, // Include fees
            payout_amount: { increment: request.amount }, // Only the net amount
          },
          select: { payout_balance: true },
        });

        const transaction = await tx.transaction.create({
          data: {
            category: "WALLET",
            type: "EXTERNAL_WITHDRAW",
            amount: request.amount,
            currency: wallet.currency,
            status: "PENDING",
            description: `Withdrawal to ${request.operator} - ${request.phone_number} (Fee: ${feeAmount} ${wallet.currency})`,
            reason: request.reason,
            wallet_id: walletId,
            company_id: wallet.company_id,
            user_id: request.user_id,
            phone_number: request.phone_number,
            operator: request.operator,
            wallet_balance_before: Number(wallet.payout_balance),
            wallet_balance_after: Number(updatedWallet.payout_balance),
            fee_amount: feeAmount,
            net_amount: request.amount,
            amount_with_fee: totalAmount,
            reference: `WD_${Date.now()}_${walletId}`,
          },
        });

        return { transaction, updatedWallet };
      });

      // Initiate Afribapay payout (keep local transaction PENDING until webhook updates)
      try {
        const countryPhoneCode =
          wallet.country_iso_code === "CM" ? "237" : "237";
        const normalizedOperator = String(request.operator)
          .toLowerCase()
          .includes("mtn")
          ? "mtn"
          : String(request.operator).toLowerCase().includes("orange")
          ? "orange"
          : request.operator;
        await initiateAfribapayPayout({
          amount: request.amount,
          country: wallet.country_iso_code,
          currency: wallet.currency,
          phone: request.phone_number,
          orderId: result.transaction.id,
          operator: normalizedOperator,
          countryPhoneCode,
        });
      } catch (payoutError) {
        console.error("Afribapay payout initiation failed:", payoutError);
        // On failure, revert wallet deduction and mark transaction as FAILED
        try {
          await prisma.$transaction(async (tx) => {
            await tx.wallet.update({
              where: { id: walletId },
              data: {
                payout_balance: { increment: totalAmount },
                payout_amount: { decrement: request.amount },
              },
            });
            await tx.transaction.update({
              where: { id: result.transaction.id },
              data: { status: "FAILED" },
            });
          });
        } catch (revertError) {
          console.error(
            "Failed to revert wallet/transaction after payout error:",
            revertError
          );
        }
      }

      return {
        success: true,
        message: "Withdrawal initiated successfully",
        transaction_id: result.transaction.id,
        status: "PENDING",
        new_payout_balance: Number(result.updatedWallet.payout_balance),
      };
    } catch (error) {
      console.error("Withdrawal error:", error);
      return {
        success: false,
        message: "Withdrawal failed due to a system error",
      };
    }
  }
}
