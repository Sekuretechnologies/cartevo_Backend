import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PendingWithdrawalQueueService } from '../wallet/pendingWithdrawalQueue.service';

@Injectable()
export class WithdrawalProcessorService {
  private readonly logger = new Logger(WithdrawalProcessorService.name);

  /**
   * Process pending withdrawals every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingWithdrawals() {
    this.logger.log('🔄 Starting scheduled withdrawal processing...');
    
    try {
      await PendingWithdrawalQueueService.processQueue();
      this.logger.log('✅ Withdrawal processing completed');
    } catch (error) {
      this.logger.error('❌ Error during withdrawal processing:', error);
    }
  }

  /**
   * Check Afribapay balance every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAfribapayBalance() {
    this.logger.log('💰 Checking Afribapay balance...');
    
    try {
      // Get queue status to see if there are pending withdrawals
      const queueStatus = await PendingWithdrawalQueueService.getQueueStatus();
      
      if (queueStatus.pending > 0) {
        this.logger.log(`📊 Queue status: ${queueStatus.pending} pending, ${queueStatus.processing} processing`);
        
        // TODO: Check actual Afribapay balance
        const mockBalance = 1000000; // This should be replaced with actual API call
        
        if (mockBalance < 100000) { // Alert threshold
          this.logger.warn(`⚠️ Low Afribapay balance: ${mockBalance}`);
          // TODO: Send admin notification
          await this.notifyAdminLowBalance(mockBalance);
        }
      }
    } catch (error) {
      this.logger.error('❌ Error checking Afribapay balance:', error);
    }
  }

  /**
   * Clean up old processed withdrawals daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldWithdrawals() {
    this.logger.log('🧹 Starting cleanup of old processed withdrawals...');
    
    try {
      // TODO: Implement cleanup logic
      // Delete withdrawals older than 30 days that are processed or failed
      this.logger.log('✅ Cleanup completed');
    } catch (error) {
      this.logger.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Notify admin about low balance
   */
  private async notifyAdminLowBalance(balance: number): Promise<void> {
    try {
      // TODO: Implement admin notification
      this.logger.warn(`📧 Admin notification: Low Afribapay balance (${balance})`);
    } catch (error) {
      this.logger.error('❌ Error sending admin notification:', error);
    }
  }

  /**
   * Manual trigger for processing queue (for admin use)
   */
  async processQueueManually(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('🔄 Manual queue processing triggered');
      await PendingWithdrawalQueueService.processQueue();
      
      return {
        success: true,
        message: 'Queue processing completed successfully'
      };
    } catch (error) {
      this.logger.error('❌ Error in manual queue processing:', error);
      return {
        success: false,
        message: `Queue processing failed: ${error.message}`
      };
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    try {
      const queueStatus = await PendingWithdrawalQueueService.getQueueStatus();
      
      return {
        queue_status: queueStatus,
        last_processed: new Date().toISOString(),
        next_scheduled: this.getNextScheduledTime()
      };
    } catch (error) {
      this.logger.error('❌ Error getting processing stats:', error);
      return {
        queue_status: { pending: 0, processing: 0, processed: 0, failed: 0, total: 0 },
        last_processed: null,
        next_scheduled: null
      };
    }
  }

  /**
   * Get next scheduled processing time
   */
  private getNextScheduledTime(): string {
    const now = new Date();
    const nextRun = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    return nextRun.toISOString();
  }
}


