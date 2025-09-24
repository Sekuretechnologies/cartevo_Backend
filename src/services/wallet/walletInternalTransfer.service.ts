import { PrismaClient } from "@prisma/client";
import {
  WalletWithdrawalService,
  WithdrawalRequest,
} from "./walletWithdrawal.service";

const prisma = new PrismaClient();

export interface InternalTransferRequest {
  amount: number;
  direction: "PAYIN_TO_PAYOUT" | "PAYOUT_TO_PAYIN";
  reason?: string;
  user_id: string;
}

export interface InternalTransferResponse {
  success: boolean;
  message: string;
  transaction_id?: string;
  new_payin_balance?: number;
  new_payout_balance?: number;
}

export class WalletInternalTransferService {
  /**
   * Transfer funds between PayIn and PayOut balances within the same wallet
   */
  static async transferInternal(
    walletId: string,
    request: InternalTransferRequest
  ): Promise<InternalTransferResponse> {
    try {
      // Get wallet with current balances
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        select: {
          id: true,
          payin_balance: true,
          payout_balance: true,
          currency: true,
          company_id: true,
          is_active: true,
        },
      });

      if (!wallet) {
        return {
          success: false,
          message: "Wallet not found",
        };
      }

      if (!wallet.is_active) {
        return {
          success: false,
          message: "Wallet is not active",
        };
      }

      // Validate amount
      if (request.amount <= 0) {
        return {
          success: false,
          message: "Amount must be greater than 0",
        };
      }

      // Check sufficient balance based on direction
      if (request.direction === "PAYIN_TO_PAYOUT") {
        if (Number(wallet.payin_balance) < request.amount) {
          return {
            success: false,
            message: "Insufficient PayIn balance",
          };
        }
      } else if (request.direction === "PAYOUT_TO_PAYIN") {
        if (Number(wallet.payout_balance) < request.amount) {
          return {
            success: false,
            message: "Insufficient PayOut balance",
          };
        }
      }

      // Perform the transfer in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update wallet balances (use atomic operators to avoid Decimal arithmetic)
        const updateData =
          request.direction === "PAYIN_TO_PAYOUT"
            ? {
                payin_balance: { decrement: request.amount },
                payout_balance: { increment: request.amount },
                // balance remains the same; no update needed
                payout_amount: { increment: request.amount },
              }
            : {
                payin_balance: { increment: request.amount },
                payout_balance: { decrement: request.amount },
                // balance remains the same; no update needed
                payin_amount: { increment: request.amount },
              };

        const updatedWallet = await tx.wallet.update({
          where: { id: walletId },
          data: updateData,
          select: {
            payin_balance: true,
            payout_balance: true,
          },
        });

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            category: "WALLET",
            type: request.direction,
            amount: request.amount,
            currency: wallet.currency,
            status: "SUCCESS",
            description: `Internal transfer: ${request.direction}`,
            reason: request.reason,
            wallet_id: walletId,
            company_id: wallet.company_id,
            user_id: request.user_id,
            wallet_balance_before:
              Number(wallet.payin_balance) + Number(wallet.payout_balance),
            wallet_balance_after:
              Number(updatedWallet.payin_balance) +
              Number(updatedWallet.payout_balance),
            fee_amount: 0,
            net_amount: request.amount,
            amount_with_fee: request.amount,
            reference: `INT_${Date.now()}_${walletId}`,
          },
        });

        // Create balance transaction records
        await tx.balanceTransactionRecord.create({
          data: {
            transaction_id: transaction.id,
            entity_type: "wallet",
            entity_id: walletId,
            old_balance:
              request.direction === "PAYIN_TO_PAYOUT"
                ? wallet.payin_balance
                : wallet.payout_balance,
            new_balance:
              request.direction === "PAYIN_TO_PAYOUT"
                ? updatedWallet.payin_balance
                : updatedWallet.payout_balance,
            amount_changed: -request.amount,
            currency: wallet.currency,
            change_type: "transfer_out",
            description: `Debit from ${
              request.direction === "PAYIN_TO_PAYOUT" ? "PayIn" : "PayOut"
            } balance`,
          },
        });

        await tx.balanceTransactionRecord.create({
          data: {
            transaction_id: transaction.id,
            entity_type: "wallet",
            entity_id: walletId,
            old_balance:
              request.direction === "PAYIN_TO_PAYOUT"
                ? wallet.payout_balance
                : wallet.payin_balance,
            new_balance:
              request.direction === "PAYIN_TO_PAYOUT"
                ? updatedWallet.payout_balance
                : updatedWallet.payin_balance,
            amount_changed: request.amount,
            currency: wallet.currency,
            change_type: "transfer_in",
            description: `Credit to ${
              request.direction === "PAYIN_TO_PAYOUT" ? "PayOut" : "PayIn"
            } balance`,
          },
        });

        return {
          transaction,
          updatedWallet,
        };
      });

      return {
        success: true,
        message: "Transfer completed successfully",
        transaction_id: result.transaction.id,
        new_payin_balance: Number(result.updatedWallet.payin_balance),
        new_payout_balance: Number(result.updatedWallet.payout_balance),
      };
    } catch (error) {
      console.error("Internal transfer error:", error);
      return {
        success: false,
        message: "Transfer failed due to a system error",
      };
    }
  }

  /**
   * Get wallet balances for a specific wallet
   */
  static async getWalletBalances(walletId: string) {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        select: {
          id: true,
          balance: true,
          payin_balance: true,
          payout_balance: true,
          payin_amount: true,
          payout_amount: true,
          currency: true,
          is_active: true,
        },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      return {
        success: true,
        data: {
          id: wallet.id,
          total_balance: Number(wallet.balance),
          payin_balance: Number(wallet.payin_balance),
          payout_balance: Number(wallet.payout_balance),
          payin_amount: Number(wallet.payin_amount),
          payout_amount: Number(wallet.payout_amount),
          currency: wallet.currency,
          is_active: wallet.is_active,
        },
      };
    } catch (error) {
      console.error("Get wallet balances error:", error);
      return {
        success: false,
        message: "Failed to get wallet balances",
      };
    }
  }

  /**
   * Advanced internal transfer between MAIN/PAYIN/PAYOUT and WITHDRAW routing
   */
  static async transferInternalAdvanced(
    walletId: string,
    request: {
      amount: number;
      from_type: "MAIN" | "PAYIN" | "PAYOUT";
      to_type: "MAIN" | "PAYIN" | "PAYOUT" | "WITHDRAW";
      reason?: string;
      user_id: string;
      // Optional for withdraw flow
      phone_number?: string;
      operator?: string;
    }
  ): Promise<InternalTransferResponse> {
    try {
      // Load wallet
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
        select: {
          id: true,
          balance: true,
          payin_balance: true,
          payout_balance: true,
          payin_amount: true,
          payout_amount: true,
          currency: true,
          company_id: true,
          is_active: true,
        },
      });

      if (!wallet) {
        return { success: false, message: "Wallet not found" };
      }
      if (!wallet.is_active) {
        return { success: false, message: "Wallet is not active" };
      }

      const { amount, from_type, to_type } = request;
      if (!amount || amount <= 0) {
        return { success: false, message: "Amount must be greater than 0" };
      }
      if (from_type === to_type) {
        return {
          success: false,
          message: "Source and destination must differ",
        };
      }

      // Validate allowed routes
      const allowed: Record<string, Set<string>> = {
        MAIN: new Set(["PAYIN", "PAYOUT"]),
        PAYIN: new Set(["MAIN", "PAYOUT"]),
        PAYOUT: new Set(["PAYIN", "MAIN", "WITHDRAW"]),
      };
      if (!allowed[from_type] || !allowed[from_type].has(to_type)) {
        return { success: false, message: "Transfer route not allowed" };
      }

      // Check sufficient balance from source pocket
      const sourceEnough = () => {
        if (from_type === "MAIN") return Number(wallet.balance) >= amount;
        if (from_type === "PAYIN")
          return Number(wallet.payin_balance) >= amount;
        return Number(wallet.payout_balance) >= amount; // PAYOUT
      };
      if (!sourceEnough()) {
        return {
          success: false,
          message: "Insufficient balance on source pocket",
        };
      }

      // Route to withdraw service if needed
      if (to_type === "WITHDRAW") {
        // Ensure operator/phone present
        if (!request.phone_number || !request.operator) {
          return {
            success: false,
            message: "phone_number and operator are required for withdraw",
          };
        }
        // Decrement payout balance first atomically and create internal transaction records
        const result = await prisma.$transaction(async (tx) => {
          const updated = await tx.wallet.update({
            where: { id: walletId },
            data: { payout_balance: { decrement: amount } },
            select: { payout_balance: true },
          });

          // Log internal movement (PAYOUT -> WITHDRAW)
          const transaction = await tx.transaction.create({
            data: {
              category: "WALLET",
              type: "PAYOUT_TO_WITHDRAW",
              amount: amount,
              currency: wallet.currency,
              status: "SUCCESS",
              description: "Internal move to withdraw pipeline",
              reason: request.reason,
              wallet_id: walletId,
              company_id: wallet.company_id,
              user_id: request.user_id,
              wallet_balance_before:
                Number(wallet.balance) +
                Number(wallet.payin_balance) +
                Number(wallet.payout_balance),
              wallet_balance_after:
                Number(wallet.balance) +
                Number(wallet.payin_balance) +
                Number(updated.payout_balance),
              fee_amount: 0,
              net_amount: amount,
              amount_with_fee: amount,
              reference: `INT_ADV_${Date.now()}_${walletId}`,
            },
          });

          await tx.balanceTransactionRecord.create({
            data: {
              transaction_id: transaction.id,
              entity_type: "wallet",
              entity_id: walletId,
              old_balance: wallet.payout_balance,
              new_balance: updated.payout_balance,
              amount_changed: -amount,
              currency: wallet.currency,
              change_type: "transfer_out",
              description: "Debit from PayOut balance to withdraw",
            },
          });

          return { updated, transaction };
        });

        // Enqueue/process withdrawal with existing service
        const withdrawReq: WithdrawalRequest = {
          amount,
          phone_number: request.phone_number,
          operator: request.operator,
          reason: request.reason,
          user_id: request.user_id,
        };
        await WalletWithdrawalService.processWithdrawal(walletId, withdrawReq);

        return {
          success: true,
          message: "Withdraw initiated successfully",
          transaction_id: result.transaction.id,
          new_payin_balance: Number(wallet.payin_balance),
          new_payout_balance: Number(result.updated.payout_balance),
        };
      }

      // Otherwise perform internal pocket-to-pocket movement
      const result = await prisma.$transaction(async (tx) => {
        // Compute update data
        const data: any = {};
        const inc = (
          key: "balance" | "payin_balance" | "payout_balance",
          v: number
        ) => {
          data[key] = {
            ...(data[key] || {}),
            [v > 0 ? "increment" : "decrement"]: Math.abs(v),
          };
        };

        if (from_type === "MAIN" && to_type === "PAYIN") {
          inc("balance", -amount);
          inc("payin_balance", amount);
        } else if (from_type === "MAIN" && to_type === "PAYOUT") {
          inc("balance", -amount);
          inc("payout_balance", amount);
        } else if (from_type === "PAYIN" && to_type === "MAIN") {
          inc("payin_balance", -amount);
          inc("balance", amount);
          data.payin_amount = { increment: amount };
        } else if (from_type === "PAYIN" && to_type === "PAYOUT") {
          inc("payin_balance", -amount);
          inc("payout_balance", amount);
          data.payout_amount = { increment: amount };
        } else if (from_type === "PAYOUT" && to_type === "PAYIN") {
          inc("payout_balance", -amount);
          inc("payin_balance", amount);
          data.payin_amount = { increment: amount };
        } else if (from_type === "PAYOUT" && to_type === "MAIN") {
          inc("payout_balance", -amount);
          inc("balance", amount);
        }

        const updated = await tx.wallet.update({
          where: { id: walletId },
          data,
          select: { balance: true, payin_balance: true, payout_balance: true },
        });

        const type = `${from_type}_TO_${to_type}`;
        const transaction = await tx.transaction.create({
          data: {
            category: "WALLET",
            type,
            amount,
            currency: wallet.currency,
            status: "SUCCESS",
            description: `Internal transfer: ${from_type} → ${to_type}`,
            reason: request.reason,
            wallet_id: walletId,
            company_id: wallet.company_id,
            user_id: request.user_id,
            wallet_balance_before:
              Number(wallet.balance) +
              Number(wallet.payin_balance) +
              Number(wallet.payout_balance),
            wallet_balance_after:
              Number(updated.balance) +
              Number(updated.payin_balance) +
              Number(updated.payout_balance),
            fee_amount: 0,
            net_amount: amount,
            amount_with_fee: amount,
            reference: `INT_ADV_${Date.now()}_${walletId}`,
          },
        });

        // Balance records
        const oldSource =
          from_type === "MAIN"
            ? wallet.balance
            : from_type === "PAYIN"
            ? wallet.payin_balance
            : wallet.payout_balance;
        const newSource =
          from_type === "MAIN"
            ? updated.balance
            : from_type === "PAYIN"
            ? updated.payin_balance
            : updated.payout_balance;
        const oldDest =
          to_type === "MAIN"
            ? wallet.balance
            : to_type === "PAYIN"
            ? wallet.payin_balance
            : wallet.payout_balance;
        const newDest =
          to_type === "MAIN"
            ? updated.balance
            : to_type === "PAYIN"
            ? updated.payin_balance
            : updated.payout_balance;

        await tx.balanceTransactionRecord.create({
          data: {
            transaction_id: transaction.id,
            entity_type: "wallet",
            entity_id: walletId,
            old_balance: oldSource,
            new_balance: newSource,
            amount_changed: -amount,
            currency: wallet.currency,
            change_type: "transfer_out",
            description: `Debit from ${from_type} balance`,
          },
        });

        await tx.balanceTransactionRecord.create({
          data: {
            transaction_id: transaction.id,
            entity_type: "wallet",
            entity_id: walletId,
            old_balance: oldDest,
            new_balance: newDest,
            amount_changed: amount,
            currency: wallet.currency,
            change_type: "transfer_in",
            description: `Credit to ${to_type} balance`,
          },
        });

        return { transaction, updated };
      });

      return {
        success: true,
        message: "Transfer completed successfully",
        transaction_id: result.transaction.id,
        new_payin_balance: Number(result.updated.payin_balance),
        new_payout_balance: Number(result.updated.payout_balance),
      };
    } catch (error) {
      console.error("Advanced internal transfer error:", error);
      return {
        success: false,
        message: "Transfer failed due to a system error",
      };
    }
  }

  /**
   * Advanced internal transfer between MAIN/PAYIN/PAYOUT and WITHDRAW routing
   */
  // static async transferInternalAdvanced(
  //   walletId: string,
  //   request: {
  //     amount: number;
  //     from_type: "MAIN" | "PAYIN" | "PAYOUT";
  //     to_type: "MAIN" | "PAYIN" | "PAYOUT" | "WITHDRAW";
  //     reason?: string;
  //     user_id: string;
  //     // Optional for withdraw flow
  //     phone_number?: string;
  //     operator?: string;
  //   }
  // ): Promise<InternalTransferResponse> {
  //   try {
  //     // Load wallet
  //     const wallet = await prisma.wallet.findUnique({
  //       where: { id: walletId },
  //       select: {
  //         id: true,
  //         balance: true,
  //         payin_balance: true,
  //         payout_balance: true,
  //         payin_amount: true,
  //         payout_amount: true,
  //         currency: true,
  //         company_id: true,
  //         active: true,
  //       },
  //     });

  //     if (!wallet) {
  //       return { success: false, message: "Wallet not found" };
  //     }
  //     if (!wallet.active) {
  //       return { success: false, message: "Wallet is not active" };
  //     }

  //     const { amount, from_type, to_type } = request;
  //     if (!amount || amount <= 0) {
  //       return { success: false, message: "Amount must be greater than 0" };
  //     }
  //     if (from_type === to_type) {
  //       return {
  //         success: false,
  //         message: "Source and destination must differ",
  //       };
  //     }

  //     // Validate allowed routes
  //     const allowed: Record<string, Set<string>> = {
  //       MAIN: new Set(["PAYIN", "PAYOUT"]),
  //       PAYIN: new Set(["MAIN", "PAYOUT"]),
  //       PAYOUT: new Set(["PAYIN", "MAIN", "WITHDRAW"]),
  //     };
  //     if (!allowed[from_type] || !allowed[from_type].has(to_type)) {
  //       return { success: false, message: "Transfer route not allowed" };
  //     }

  //     // Check sufficient balance from source pocket
  //     const sourceEnough = () => {
  //       if (from_type === "MAIN") return Number(wallet.balance) >= amount;
  //       if (from_type === "PAYIN")
  //         return Number(wallet.payin_balance) >= amount;
  //       return Number(wallet.payout_balance) >= amount; // PAYOUT
  //     };
  //     if (!sourceEnough()) {
  //       return {
  //         success: false,
  //         message: "Insufficient balance on source pocket",
  //       };
  //     }

  //     // Route to withdraw service if needed
  //     if (to_type === "WITHDRAW") {
  //       // Ensure operator/phone present
  //       if (!request.phone_number || !request.operator) {
  //         return {
  //           success: false,
  //           message: "phone_number and operator are required for withdraw",
  //         };
  //       }
  //       // Decrement payout balance first atomically and create internal transaction records
  //       const result = await prisma.$transaction(async (tx) => {
  //         const updated = await tx.wallet.update({
  //           where: { id: walletId },
  //           data: { payout_balance: { decrement: amount } },
  //           select: { payout_balance: true },
  //         });

  //         // Log internal movement (PAYOUT -> WITHDRAW)
  //         const transaction = await tx.transaction.create({
  //           data: {
  //             category: "WALLET",
  //             type: "PAYOUT_TO_WITHDRAW",
  //             amount: amount,
  //             currency: wallet.currency,
  //             status: "SUCCESS",
  //             description: "Internal move to withdraw pipeline",
  //             reason: request.reason,
  //             wallet_id: walletId,
  //             company_id: wallet.company_id,
  //             user_id: request.user_id,
  //             wallet_balance_before:
  //               Number(wallet.balance) +
  //               Number(wallet.payin_balance) +
  //               Number(wallet.payout_balance),
  //             wallet_balance_after:
  //               Number(wallet.balance) +
  //               Number(wallet.payin_balance) +
  //               Number(updated.payout_balance),
  //             fee_amount: 0,
  //             net_amount: amount,
  //             amount_with_fee: amount,
  //             reference: `INT_ADV_${Date.now()}_${walletId}`,
  //           },
  //         });

  //         await tx.balanceTransactionRecord.create({
  //           data: {
  //             transaction_id: transaction.id,
  //             entity_type: "wallet",
  //             entity_id: walletId,
  //             old_balance: wallet.payout_balance,
  //             new_balance: updated.payout_balance,
  //             amount_changed: -amount,
  //             currency: wallet.currency,
  //             change_type: "transfer_out",
  //             description: "Debit from PayOut balance to withdraw",
  //           },
  //         });

  //         return { updated, transaction };
  //       });

  //       // Enqueue/process withdrawal with existing service
  //       const withdrawReq: WithdrawalRequest = {
  //         amount,
  //         phone_number: request.phone_number,
  //         operator: request.operator,
  //         reason: request.reason,
  //         user_id: request.user_id,
  //       };
  //       await WalletWithdrawalService.processWithdrawal(walletId, withdrawReq);

  //       return {
  //         success: true,
  //         message: "Withdraw initiated successfully",
  //         transaction_id: result.transaction.id,
  //         new_payin_balance: Number(wallet.payin_balance),
  //         new_payout_balance: Number(result.updated.payout_balance),
  //       };
  //     }

  //     // Otherwise perform internal pocket-to-pocket movement
  //     const result = await prisma.$transaction(async (tx) => {
  //       // Compute update data
  //       const data: any = {};
  //       const inc = (
  //         key: "balance" | "payin_balance" | "payout_balance",
  //         v: number
  //       ) => {
  //         data[key] = {
  //           ...(data[key] || {}),
  //           [v > 0 ? "increment" : "decrement"]: Math.abs(v),
  //         };
  //       };

  //       if (from_type === "MAIN" && to_type === "PAYIN") {
  //         inc("balance", -amount);
  //         inc("payin_balance", amount);
  //       } else if (from_type === "MAIN" && to_type === "PAYOUT") {
  //         inc("balance", -amount);
  //         inc("payout_balance", amount);
  //       } else if (from_type === "PAYIN" && to_type === "MAIN") {
  //         inc("payin_balance", -amount);
  //         inc("balance", amount);
  //         data.payin_amount = { increment: amount };
  //       } else if (from_type === "PAYIN" && to_type === "PAYOUT") {
  //         inc("payin_balance", -amount);
  //         inc("payout_balance", amount);
  //         data.payout_amount = { increment: amount };
  //       } else if (from_type === "PAYOUT" && to_type === "PAYIN") {
  //         inc("payout_balance", -amount);
  //         inc("payin_balance", amount);
  //         data.payin_amount = { increment: amount };
  //       } else if (from_type === "PAYOUT" && to_type === "MAIN") {
  //         inc("payout_balance", -amount);
  //         inc("balance", amount);
  //       }

  //       const updated = await tx.wallet.update({
  //         where: { id: walletId },
  //         data,
  //         select: { balance: true, payin_balance: true, payout_balance: true },
  //       });

  //       const type = `${from_type}_TO_${to_type}`;
  //       const transaction = await tx.transaction.create({
  //         data: {
  //           category: "WALLET",
  //           type,
  //           amount,
  //           currency: wallet.currency,
  //           status: "SUCCESS",
  //           description: `Internal transfer: ${from_type} → ${to_type}`,
  //           reason: request.reason,
  //           wallet_id: walletId,
  //           company_id: wallet.company_id,
  //           user_id: request.user_id,
  //           wallet_balance_before:
  //             Number(wallet.balance) +
  //             Number(wallet.payin_balance) +
  //             Number(wallet.payout_balance),
  //           wallet_balance_after:
  //             Number(updated.balance) +
  //             Number(updated.payin_balance) +
  //             Number(updated.payout_balance),
  //           fee_amount: 0,
  //           net_amount: amount,
  //           amount_with_fee: amount,
  //           reference: `INT_ADV_${Date.now()}_${walletId}`,
  //         },
  //       });

  //       // Balance records
  //       const oldSource =
  //         from_type === "MAIN"
  //           ? wallet.balance
  //           : from_type === "PAYIN"
  //           ? wallet.payin_balance
  //           : wallet.payout_balance;
  //       const newSource =
  //         from_type === "MAIN"
  //           ? updated.balance
  //           : from_type === "PAYIN"
  //           ? updated.payin_balance
  //           : updated.payout_balance;
  //       const oldDest =
  //         to_type === "MAIN"
  //           ? wallet.balance
  //           : to_type === "PAYIN"
  //           ? wallet.payin_balance
  //           : wallet.payout_balance;
  //       const newDest =
  //         to_type === "MAIN"
  //           ? updated.balance
  //           : to_type === "PAYIN"
  //           ? updated.payin_balance
  //           : updated.payout_balance;

  //       await tx.balanceTransactionRecord.create({
  //         data: {
  //           transaction_id: transaction.id,
  //           entity_type: "wallet",
  //           entity_id: walletId,
  //           old_balance: oldSource,
  //           new_balance: newSource,
  //           amount_changed: -amount,
  //           currency: wallet.currency,
  //           change_type: "transfer_out",
  //           description: `Debit from ${from_type} balance`,
  //         },
  //       });

  //       await tx.balanceTransactionRecord.create({
  //         data: {
  //           transaction_id: transaction.id,
  //           entity_type: "wallet",
  //           entity_id: walletId,
  //           old_balance: oldDest,
  //           new_balance: newDest,
  //           amount_changed: amount,
  //           currency: wallet.currency,
  //           change_type: "transfer_in",
  //           description: `Credit to ${to_type} balance`,
  //         },
  //       });

  //       return { transaction, updated };
  //     });

  //     return {
  //       success: true,
  //       message: "Transfer completed successfully",
  //       transaction_id: result.transaction.id,
  //       new_payin_balance: Number(result.updated.payin_balance),
  //       new_payout_balance: Number(result.updated.payout_balance),
  //     };
  //   } catch (error) {
  //     console.error("Advanced internal transfer error:", error);
  //     return {
  //       success: false,
  //       message: "Transfer failed due to a system error",
  //     };
  //   }
  // }
}
