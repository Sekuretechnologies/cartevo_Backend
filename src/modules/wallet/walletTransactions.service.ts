import { Injectable } from "@nestjs/common";
import TransactionModel from "@/models/prisma/transactionModel";
import { checkAndUpdatePendingWalletTransactionStatus } from "@/services/wallet/transactionStatus";

@Injectable()
export class WalletTransactionsService {
  async getWalletTransactions(
    walletId?: string,
    customerId?: string,
    status?: string,
    limit?: string,
    offset?: string
  ) {
    const transactions = await TransactionModel.get({
      wallet_id: walletId,
      customer_id: customerId,
      status: status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    if (transactions.output && Array.isArray(transactions.output)) {
      // Check and update PENDING transactions
      const updatedTransactions = await Promise.all(
        transactions.output.map(async (transaction: any) => {
          if (transaction.status === "PENDING") {
            try {
              const updateResult =
                await checkAndUpdatePendingWalletTransactionStatus(
                  transaction,
                  false, // withoutNotifications
                  false // testMode
                );
              if (updateResult.output) {
                return updateResult.output;
              }
            } catch (error) {
              console.log(
                `Failed to update transaction ${transaction.id}:`,
                error
              );
            }
          }
          return transaction;
        })
      );

      return {
        ...transactions,
        output: updatedTransactions,
      };
    }

    return transactions;
  }

  async getWalletTransactionById(id: string) {
    const transaction = await TransactionModel.getOne({ id });

    if (transaction.output && transaction.output.status === "PENDING") {
      try {
        const updateResult = await checkAndUpdatePendingWalletTransactionStatus(
          transaction.output,
          false, // withoutNotifications
          false // testMode
        );
        if (updateResult.output) {
          return updateResult;
        }
      } catch (error) {
        console.log(`Failed to update transaction ${id}:`, error);
      }
    }

    return transaction;
  }

  async getWalletTransactionsByWallet(walletId: string) {
    return this.getWalletTransactions(walletId);
  }

  async getWalletTransactionsByCustomer(customerId: string) {
    return this.getWalletTransactions(undefined, customerId);
  }

  async getWalletTransactionsByStatus(status: string) {
    return this.getWalletTransactions(undefined, undefined, status);
  }
}
