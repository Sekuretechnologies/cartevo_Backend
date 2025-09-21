import { PrismaClient } from '@prisma/client';
import { PendingWithdrawalQueueService } from './pendingWithdrawalQueue.service';
import TransactionFeeModel from '../../models/prisma/transactionFeeModel';

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
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'PENDING_FUNDS' | 'QUEUED';
  new_payout_balance?: number;
}

export class WalletWithdrawalService {
  /**
   * Check Afribapay balance (mock implementation)
   */
  private static async getAfribapayBalance(): Promise<number> {
    // TODO: Replace with actual Afribapay API call
    return 1000000; // Mock balance
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
        'WITHDRAWAL', // Transaction type for withdrawals
        'WALLET',     // Transaction category
        'CM',         // Default country code
        currency
      );

      if (!feeResult.error && feeResult.output) {
        return {
          feeAmount: feeResult.output.feeAmount,
          feePercentage: feeResult.output.feePercentage
        };
      }

      // Fallback: default 2% fee
      return {
        feeAmount: (amount * 2) / 100,
        feePercentage: 2
      };

    } catch (error) {
      console.error('Error calculating withdrawal fees:', error);
      // Fallback: default 2% fee
      return {
        feeAmount: (amount * 2) / 100,
        feePercentage: 2
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
          active: true
        }
      });

      if (!wallet) {
        return { success: false, message: 'Wallet not found' };
      }

      if (!wallet.active) {
        return { success: false, message: 'Wallet is not active' };
      }

      if (request.amount <= 0) {
        return { success: false, message: 'Amount must be greater than 0' };
      }

      // Calculate withdrawal fees using settings page configuration
      const feeCalculation = await this.calculateWithdrawalFees(
        request.amount,
        wallet.company_id,
        wallet.currency
      );

      const feeAmount = feeCalculation.feeAmount;
      const totalAmount = request.amount + feeAmount;

      console.log('=== BACKEND WITHDRAWAL VALIDATION ===');
      console.log('wallet.payout_balance:', wallet.payout_balance);
      console.log('Number(wallet.payout_balance):', Number(wallet.payout_balance));
      console.log('request.amount:', request.amount);
      console.log('feeAmount:', feeAmount);
      console.log('totalAmount:', totalAmount);
      console.log('Validation: Number(wallet.payout_balance) < totalAmount =', Number(wallet.payout_balance) < totalAmount);
      console.log('=====================================');

      if (Number(wallet.payout_balance) < totalAmount) {
        console.log('❌ INSUFFICIENT BALANCE - BLOCKING TRANSACTION');
        return { 
          success: false, 
          message: `Insufficient PayOut balance. Required: ${totalAmount} ${wallet.currency} (including ${feeAmount} ${wallet.currency} fees)` 
        };
      }

      // Check Afribapay balance
      const afribapayBalance = await this.getAfribapayBalance();
      
      if (afribapayBalance < totalAmount) {
        // Add to queue instead of failing
        const queueResult = await PendingWithdrawalQueueService.addToQueue({
          walletId,
          amount: request.amount,
          phone_number: request.phone_number,
          operator: request.operator,
          reason: request.reason,
          company_id: wallet.company_id,
          user_id: request.user_id,
          currency: wallet.currency
        });

        return {
          success: true,
          message: queueResult.message,
          status: 'QUEUED',
          transaction_id: queueResult.queue_id
        };
      }

      // Process withdrawal
      const result = await prisma.$transaction(async (tx) => {
        const updatedWallet = await tx.wallet.update({
          where: { id: walletId },
          data: {
            payout_balance: { decrement: totalAmount }, // Include fees
            balance: { decrement: totalAmount },        // Include fees
            payout_amount: { increment: request.amount } // Only the net amount
          },
          select: { payout_balance: true }
        });

        const transaction = await tx.transaction.create({
          data: {
            category: 'WALLET',
            type: 'EXTERNAL_WITHDRAW',
            amount: request.amount,
            currency: wallet.currency,
            status: 'PENDING',
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
            reference: `WD_${Date.now()}_${walletId}`
          }
        });

        return { transaction, updatedWallet };
      });

      return {
        success: true,
        message: 'Withdrawal initiated successfully',
        transaction_id: result.transaction.id,
        status: 'PENDING',
        new_payout_balance: Number(result.updatedWallet.payout_balance)
      };

    } catch (error) {
      console.error('Withdrawal error:', error);
      return { success: false, message: 'Withdrawal failed due to a system error' };
    }
  }
}