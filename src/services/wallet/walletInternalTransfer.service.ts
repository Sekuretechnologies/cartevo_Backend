import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface InternalTransferRequest {
  amount: number;
  direction: 'PAYIN_TO_PAYOUT' | 'PAYOUT_TO_PAYIN';
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
          active: true
        }
      });

      if (!wallet) {
        return {
          success: false,
          message: 'Wallet not found'
        };
      }

      if (!wallet.active) {
        return {
          success: false,
          message: 'Wallet is not active'
        };
      }

      // Validate amount
      if (request.amount <= 0) {
        return {
          success: false,
          message: 'Amount must be greater than 0'
        };
      }

      // Check sufficient balance based on direction
      if (request.direction === 'PAYIN_TO_PAYOUT') {
        if (Number(wallet.payin_balance) < request.amount) {
          return {
            success: false,
            message: 'Insufficient PayIn balance'
          };
        }
      } else if (request.direction === 'PAYOUT_TO_PAYIN') {
        if (Number(wallet.payout_balance) < request.amount) {
          return {
            success: false,
            message: 'Insufficient PayOut balance'
          };
        }
      }

      // Perform the transfer in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update wallet balances (use atomic operators to avoid Decimal arithmetic)
        const updateData = request.direction === 'PAYIN_TO_PAYOUT'
          ? {
              payin_balance: { decrement: request.amount },
              payout_balance: { increment: request.amount },
              // balance remains the same; no update needed
              payout_amount: { increment: request.amount }
            }
          : {
              payin_balance: { increment: request.amount },
              payout_balance: { decrement: request.amount },
              // balance remains the same; no update needed
              payin_amount: { increment: request.amount }
            };

        const updatedWallet = await tx.wallet.update({
          where: { id: walletId },
          data: updateData,
          select: {
            payin_balance: true,
            payout_balance: true
          }
        });

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            category: 'WALLET',
            type: request.direction,
            amount: request.amount,
            currency: wallet.currency,
            status: 'SUCCESS',
            description: `Internal transfer: ${request.direction}`,
            reason: request.reason,
            wallet_id: walletId,
            company_id: wallet.company_id,
            user_id: request.user_id,
            wallet_balance_before: Number(wallet.payin_balance) + Number(wallet.payout_balance),
            wallet_balance_after: Number(updatedWallet.payin_balance) + Number(updatedWallet.payout_balance),
            fee_amount: 0,
            net_amount: request.amount,
            amount_with_fee: request.amount,
            reference: `INT_${Date.now()}_${walletId}`
          }
        });

        // Create balance transaction records
        await tx.balanceTransactionRecord.create({
          data: {
            transaction_id: transaction.id,
            entity_type: 'wallet',
            entity_id: walletId,
            old_balance: request.direction === 'PAYIN_TO_PAYOUT' 
              ? wallet.payin_balance 
              : wallet.payout_balance,
            new_balance: request.direction === 'PAYIN_TO_PAYOUT' 
              ? updatedWallet.payin_balance 
              : updatedWallet.payout_balance,
            amount_changed: -request.amount,
            currency: wallet.currency,
            change_type: 'transfer_out',
            description: `Debit from ${request.direction === 'PAYIN_TO_PAYOUT' ? 'PayIn' : 'PayOut'} balance`
          }
        });

        await tx.balanceTransactionRecord.create({
          data: {
            transaction_id: transaction.id,
            entity_type: 'wallet',
            entity_id: walletId,
            old_balance: request.direction === 'PAYIN_TO_PAYOUT' 
              ? wallet.payout_balance 
              : wallet.payin_balance,
            new_balance: request.direction === 'PAYIN_TO_PAYOUT' 
              ? updatedWallet.payout_balance 
              : updatedWallet.payin_balance,
            amount_changed: request.amount,
            currency: wallet.currency,
            change_type: 'transfer_in',
            description: `Credit to ${request.direction === 'PAYIN_TO_PAYOUT' ? 'PayOut' : 'PayIn'} balance`
          }
        });

        return {
          transaction,
          updatedWallet
        };
      });

      return {
        success: true,
        message: 'Transfer completed successfully',
        transaction_id: result.transaction.id,
        new_payin_balance: Number(result.updatedWallet.payin_balance),
        new_payout_balance: Number(result.updatedWallet.payout_balance)
      };

    } catch (error) {
      console.error('Internal transfer error:', error);
      return {
        success: false,
        message: 'Transfer failed due to a system error'
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
          active: true
        }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
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
          active: wallet.active
        }
      };
    } catch (error) {
      console.error('Get wallet balances error:', error);
      return {
        success: false,
        message: 'Failed to get wallet balances'
      };
    }
  }
}

