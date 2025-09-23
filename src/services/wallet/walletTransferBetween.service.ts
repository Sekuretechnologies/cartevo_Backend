import { PrismaClient } from "@prisma/client";
import { TransferFeeCalculationService } from "./transferFeeCalculation.service";

const prisma = new PrismaClient();

export interface TransferBetweenRequest {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  reason?: string;
  user_id: string;
}

export interface TransferBetweenResponse {
  success: boolean;
  message: string;
  transaction_id?: string;
  from_wallet_balance?: number;
  to_wallet_balance?: number;
  fee_amount?: number;
  exchange_rate?: number;
  converted_amount?: number;
}

export class WalletTransferBetweenService {
  /**
   * Transfer funds between wallets (supports different currencies with fees)
   */
  static async transferBetween(
    request: TransferBetweenRequest
  ): Promise<TransferBetweenResponse> {
    try {
      // Get both wallets
      const [fromWallet, toWallet] = await Promise.all([
        prisma.wallet.findUnique({
          where: { id: request.from_wallet_id },
          select: {
            id: true,
            balance: true,
            currency: true,
            company_id: true,
            is_active: true,
            country_iso_code: true,
          },
        }),
        prisma.wallet.findUnique({
          where: { id: request.to_wallet_id },
          select: {
            id: true,
            balance: true,
            currency: true,
            company_id: true,
            is_active: true,
            country_iso_code: true,
          },
        }),
      ]);

      if (!fromWallet) {
        return {
          success: false,
          message: "Source wallet not found",
        };
      }

      if (!toWallet) {
        return {
          success: false,
          message: "Destination wallet not found",
        };
      }

      if (!fromWallet.is_active) {
        return {
          success: false,
          message: "Source wallet is not active",
        };
      }

      if (!toWallet.is_active) {
        return {
          success: false,
          message: "Destination wallet is not active",
        };
      }

      // Validate amount
      if (request.amount <= 0) {
        return {
          success: false,
          message: "Amount must be greater than 0",
        };
      }

      // Calculate transfer fees and currency conversion
      const feeCalculation =
        await TransferFeeCalculationService.calculateTransferFee({
          companyId: fromWallet.company_id,
          fromCurrency: fromWallet.currency,
          toCurrency: toWallet.currency,
          amount: request.amount,
          countryIsoCode: fromWallet.country_iso_code,
        });

      if (!feeCalculation.success) {
        return {
          success: false,
          message:
            feeCalculation.message || "Failed to calculate transfer fees",
        };
      }

      const feeInfo = feeCalculation.data!;
      const totalAmount = feeInfo.totalAmount;
      const convertedAmount = feeInfo.convertedAmount || request.amount;

      // Check sufficient balance (amount + fees)
      if (Number(fromWallet.balance) < totalAmount) {
        return {
          success: false,
          message: `Insufficient balance. Required: ${totalAmount} ${fromWallet.currency} (including ${feeInfo.feeAmount} ${fromWallet.currency} fees)`,
        };
      }

      // Process transfer in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update both wallets
        const [updatedFromWallet, updatedToWallet] = await Promise.all([
          tx.wallet.update({
            where: { id: request.from_wallet_id },
            data: {
              balance: { decrement: totalAmount }, // Deduct amount + fees
            },
            select: { balance: true },
          }),
          tx.wallet.update({
            where: { id: request.to_wallet_id },
            data: {
              balance: { increment: convertedAmount }, // Add converted amount
            },
            select: { balance: true },
          }),
        ]);

        // Create debit transaction
        const debitTransaction = await tx.transaction.create({
          data: {
            category: "WALLET",
            type: "WALLET_TO_WALLET",
            amount: request.amount,
            currency: fromWallet.currency,
            status: "SUCCESS",
            description: `Transfer to wallet ${toWallet.id}${
              fromWallet.currency !== toWallet.currency
                ? ` (${fromWallet.currency} → ${toWallet.currency})`
                : ""
            }`,
            reason: request.reason,
            wallet_id: request.from_wallet_id,
            company_id: fromWallet.company_id,
            user_id: request.user_id,
            wallet_balance_before: Number(fromWallet.balance),
            wallet_balance_after: Number(updatedFromWallet.balance),
            fee_amount: feeInfo.feeAmount,
            net_amount: request.amount,
            amount_with_fee: totalAmount,
            fee_id: feeInfo.feeId,
            reference: `TRANSFER_OUT_${Date.now()}_${request.from_wallet_id}`,
          },
        });

        // Create credit transaction
        const creditTransaction = await tx.transaction.create({
          data: {
            category: "WALLET",
            type: "WALLET_TO_WALLET",
            amount: convertedAmount,
            currency: toWallet.currency,
            status: "SUCCESS",
            description: `Transfer from wallet ${fromWallet.id}${
              fromWallet.currency !== toWallet.currency
                ? ` (${fromWallet.currency} → ${toWallet.currency})`
                : ""
            }`,
            reason: request.reason,
            wallet_id: request.to_wallet_id,
            company_id: toWallet.company_id,
            user_id: request.user_id,
            wallet_balance_before: Number(toWallet.balance),
            wallet_balance_after: Number(updatedToWallet.balance),
            fee_amount: 0, // No fees on receiving side
            net_amount: convertedAmount,
            amount_with_fee: convertedAmount,
            reference: `TRANSFER_IN_${Date.now()}_${request.to_wallet_id}`,
          },
        });

        // Create balance transaction records
        await Promise.all([
          tx.balanceTransactionRecord.create({
            data: {
              transaction_id: debitTransaction.id,
              entity_type: "wallet",
              entity_id: request.from_wallet_id,
              old_balance: Number(fromWallet.balance),
              new_balance: Number(updatedFromWallet.balance),
              amount_changed: -totalAmount, // Include fees in the change
              currency: fromWallet.currency,
              change_type: "transfer_out",
              description: `Transfer to wallet ${toWallet.id}${
                fromWallet.currency !== toWallet.currency
                  ? ` (${fromWallet.currency} → ${toWallet.currency})`
                  : ""
              }`,
            },
          }),
          tx.balanceTransactionRecord.create({
            data: {
              transaction_id: creditTransaction.id,
              entity_type: "wallet",
              entity_id: request.to_wallet_id,
              old_balance: Number(toWallet.balance),
              new_balance: Number(updatedToWallet.balance),
              amount_changed: convertedAmount, // Use converted amount
              currency: toWallet.currency,
              change_type: "transfer_in",
              description: `Transfer from wallet ${fromWallet.id}${
                fromWallet.currency !== toWallet.currency
                  ? ` (${fromWallet.currency} → ${toWallet.currency})`
                  : ""
              }`,
            },
          }),
        ]);

        return {
          debitTransaction,
          updatedFromWallet,
          updatedToWallet,
          feeInfo,
        };
      });

      return {
        success: true,
        message: "Transfer completed successfully",
        transaction_id: result.debitTransaction.id,
        from_wallet_balance: Number(result.updatedFromWallet.balance),
        to_wallet_balance: Number(result.updatedToWallet.balance),
        fee_amount: result.feeInfo.feeAmount,
        exchange_rate: result.feeInfo.exchangeRate,
        converted_amount: result.feeInfo.convertedAmount,
      };
    } catch (error) {
      console.error("Transfer between wallets error:", error);
      return {
        success: false,
        message: "Transfer failed due to a system error",
      };
    }
  }

  /**
   * Get available wallets for transfer (supports different currencies)
   */
  static async getAvailableWallets(sourceWalletId: string, companyId: string) {
    try {
      // Get source wallet details
      const sourceWallet = await prisma.wallet.findUnique({
        where: { id: sourceWalletId },
        select: {
          currency: true,
          country_iso_code: true,
        },
      });

      if (!sourceWallet) {
        return {
          success: false,
          message: "Source wallet not found",
        };
      }

      // Get available currencies for transfer
      const availableCurrencies =
        await TransferFeeCalculationService.getAvailableCurrencies(
          companyId,
          sourceWallet.currency
        );

      if (!availableCurrencies.success) {
        return {
          success: false,
          message:
            availableCurrencies.message || "Failed to get available currencies",
        };
      }

      // Get other active wallets in the same company (exclude source wallet)
      const availableWallets = await prisma.wallet.findMany({
        where: {
          id: { not: sourceWalletId },
          company_id: companyId,
          is_active: true,
          currency: { in: availableCurrencies.data! },
        },
        select: {
          id: true,
          balance: true,
          currency: true,
          country: true,
          country_iso_code: true,
        },
      });

      return {
        success: true,
        data: availableWallets,
      };
    } catch (error) {
      console.error("Get available wallets error:", error);
      return {
        success: false,
        message: "Failed to get available wallets",
      };
    }
  }

  /**
   * Calculate transfer fees without executing the transfer
   */
  static async calculateTransferFees(
    companyId: string,
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    countryIsoCode?: string
  ) {
    try {
      const feeCalculation =
        await TransferFeeCalculationService.calculateTransferFee({
          companyId,
          fromCurrency,
          toCurrency,
          amount,
          countryIsoCode,
        });

      return feeCalculation;
    } catch (error) {
      console.error("Calculate transfer fees error:", error);
      return {
        success: false,
        message: "Failed to calculate transfer fees",
      };
    }
  }
}
