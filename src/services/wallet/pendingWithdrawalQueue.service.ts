import { PrismaClient } from '@prisma/client';
import { WalletWithdrawalService } from './walletWithdrawal.service';
import TransactionFeeModel from '../../models/prisma/transactionFeeModel';

const prisma = new PrismaClient();

export interface PendingWithdrawalRequest {
  walletId: string;
  amount: number;
  phone_number: string;
  operator: string;
  reason?: string;
  company_id: string;
  user_id: string;
  currency: string;
}

export interface PendingWithdrawalResponse {
  success: boolean;
  message: string;
  queue_id?: string;
  estimated_processing_time?: string;
  fee_amount?: number;
  total_amount?: number;
}

export class PendingWithdrawalQueueService {
  
  /**
   * Add a withdrawal to the queue when Afribapay balance is insufficient
   */
  static async addToQueue(request: PendingWithdrawalRequest): Promise<PendingWithdrawalResponse> {
    try {
      // Calculate withdrawal fees using the settings page configuration
      const feeCalculation = await this.calculateWithdrawalFees(
        request.amount,
        request.company_id,
        request.currency
      );

      const feeAmount = feeCalculation.feeAmount;
      const totalAmount = request.amount + feeAmount;

      // Create pending withdrawal record
      const pendingWithdrawal = await prisma.pendingWithdrawal.create({
        data: {
          wallet_id: request.walletId,
          amount: request.amount,
          fee_amount: feeAmount,
          total_amount: totalAmount,
          phone_number: request.phone_number,
          operator: request.operator,
          reason: request.reason,
          company_id: request.company_id,
          user_id: request.user_id,
          currency: request.currency,
          status: 'PENDING_FUNDS',
          priority: 1 // Default priority
        }
      });

      return {
        success: true,
        message: 'Withdrawal queued successfully. You will be notified when processed.',
        queue_id: pendingWithdrawal.id,
        estimated_processing_time: '1-24 hours',
        fee_amount: feeAmount,
        total_amount: totalAmount
      };

    } catch (error) {
      console.error('Error adding withdrawal to queue:', error);
      return {
        success: false,
        message: 'Failed to queue withdrawal. Please try again.'
      };
    }
  }

  /**
   * Process the withdrawal queue
   */
  static async processQueue(): Promise<void> {
    try {
      console.log('🔄 Processing pending withdrawals queue...');

      // Get pending withdrawals ordered by priority and creation time
      const pendingWithdrawals = await prisma.pendingWithdrawal.findMany({
        where: {
          status: 'PENDING_FUNDS',
          failed_attempts: { lt: 3 } // Don't process if max attempts reached
        },
        orderBy: [
          { priority: 'desc' },
          { created_at: 'asc' }
        ],
        include: { 
          wallet: true,
          company: true
        }
      });

      console.log(`📊 Found ${pendingWithdrawals.length} pending withdrawals to process`);

      for (const withdrawal of pendingWithdrawals) {
        await this.processWithdrawal(withdrawal);
      }

    } catch (error) {
      console.error('Error processing withdrawal queue:', error);
    }
  }

  /**
   * Process a single withdrawal from the queue
   */
  private static async processWithdrawal(withdrawal: any): Promise<void> {
    try {
      console.log(`🔄 Processing withdrawal ${withdrawal.id} for amount ${withdrawal.amount} ${withdrawal.currency}`);

      // Update status to PROCESSING
      await prisma.pendingWithdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'PROCESSING' }
      });

      // Check Afribapay balance
      const afribapayBalance = await this.getAfribapayBalance();
      
      if (afribapayBalance < withdrawal.total_amount) {
        console.log(`⚠️ Insufficient Afribapay balance for withdrawal ${withdrawal.id}. Available: ${afribapayBalance}, Required: ${withdrawal.total_amount}`);
        
        // Reset status to PENDING_FUNDS
        await prisma.pendingWithdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'PENDING_FUNDS' }
        });
        return;
      }

      // Process the withdrawal using the existing service
      const result = await WalletWithdrawalService.processWithdrawal(
        withdrawal.wallet_id,
        {
          amount: Number(withdrawal.amount),
          phone_number: withdrawal.phone_number,
          operator: withdrawal.operator,
          reason: withdrawal.reason,
          user_id: withdrawal.user_id
        }
      );

      if (result.success) {
        // Mark as processed
        await prisma.pendingWithdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: 'PROCESSED',
            processed_at: new Date(),
            transaction_id: result.transaction_id
          }
        });

        console.log(`✅ Withdrawal ${withdrawal.id} processed successfully`);
        
        // TODO: Send success notification to user
        await this.notifyWithdrawalProcessed(withdrawal);

      } else {
        // Mark as failed
        await prisma.pendingWithdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: 'FAILED',
            error_message: result.message,
            failed_attempts: { increment: 1 }
          }
        });

        console.log(`❌ Withdrawal ${withdrawal.id} failed: ${result.message}`);
      }

    } catch (error) {
      console.error(`Error processing withdrawal ${withdrawal.id}:`, error);
      
      // Increment failed attempts
      await prisma.pendingWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'PENDING_FUNDS',
          failed_attempts: { increment: 1 },
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
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
   * Check Afribapay balance (mock implementation)
   */
  private static async getAfribapayBalance(): Promise<number> {
    // TODO: Replace with actual Afribapay API call
    return 1000000; // Mock balance
  }

  /**
   * Notify user when withdrawal is processed
   */
  private static async notifyWithdrawalProcessed(withdrawal: any): Promise<void> {
    try {
      // TODO: Implement email/SMS notification
      console.log(`📧 Notification sent for processed withdrawal ${withdrawal.id}`);
    } catch (error) {
      console.error('Error sending withdrawal notification:', error);
    }
  }

  /**
   * Get queue status for admin dashboard
   */
  static async getQueueStatus(companyId?: string) {
    try {
      const whereClause = companyId ? { company_id: companyId } : {};

      const [pending, processing, processed, failed] = await Promise.all([
        prisma.pendingWithdrawal.count({
          where: { ...whereClause, status: 'PENDING_FUNDS' }
        }),
        prisma.pendingWithdrawal.count({
          where: { ...whereClause, status: 'PROCESSING' }
        }),
        prisma.pendingWithdrawal.count({
          where: { ...whereClause, status: 'PROCESSED' }
        }),
        prisma.pendingWithdrawal.count({
          where: { ...whereClause, status: 'FAILED' }
        })
      ]);

      return {
        pending,
        processing,
        processed,
        failed,
        total: pending + processing + processed + failed
      };

    } catch (error) {
      console.error('Error getting queue status:', error);
      return {
        pending: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        total: 0
      };
    }
  }

  /**
   * Get pending withdrawals for a specific company
   */
  static async getPendingWithdrawals(companyId: string, limit: number = 50) {
    try {
      return await prisma.pendingWithdrawal.findMany({
        where: { 
          company_id: companyId,
          status: { in: ['PENDING_FUNDS', 'PROCESSING'] }
        },
        orderBy: [
          { priority: 'desc' },
          { created_at: 'asc' }
        ],
        include: {
          wallet: {
            select: {
              id: true,
              currency: true,
              country: true
            }
          }
        },
        take: limit
      });

    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      return [];
    }
  }
}





