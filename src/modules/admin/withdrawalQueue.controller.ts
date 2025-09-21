import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { PendingWithdrawalQueueService } from '../../services/wallet/pendingWithdrawalQueue.service';
import { WithdrawalProcessorService } from '../../services/scheduler/withdrawalProcessor.service';

@ApiTags('Admin - Withdrawal Queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/withdrawal-queue')
export class WithdrawalQueueController {
  constructor(
    private readonly withdrawalProcessorService: WithdrawalProcessorService
  ) {}

  /**
   * Get withdrawal queue status
   */
  @Get('status')
  @ApiOperation({ summary: 'Get withdrawal queue status' })
  @ApiResponse({ status: 200, description: 'Queue status retrieved successfully' })
  async getQueueStatus(@CurrentUser() user: CurrentUserData) {
    try {
      const status = await PendingWithdrawalQueueService.getQueueStatus(user.companyId);
      return {
        success: true,
        data: status
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get queue status'
      };
    }
  }

  /**
   * Get pending withdrawals for the company
   */
  @Get('pending')
  @ApiOperation({ summary: 'Get pending withdrawals' })
  @ApiResponse({ status: 200, description: 'Pending withdrawals retrieved successfully' })
  async getPendingWithdrawals(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const pendingWithdrawals = await PendingWithdrawalQueueService.getPendingWithdrawals(
        user.companyId,
        limitNum
      );

      return {
        success: true,
        data: pendingWithdrawals
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get pending withdrawals'
      };
    }
  }

  /**
   * Manually trigger queue processing
   */
  @Post('process')
  @ApiOperation({ summary: 'Manually process withdrawal queue' })
  @ApiResponse({ status: 200, description: 'Queue processing initiated' })
  async processQueueManually(@CurrentUser() user: CurrentUserData) {
    try {
      const result = await this.withdrawalProcessorService.processQueueManually();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to process queue manually'
      };
    }
  }

  /**
   * Get processing statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get processing statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getProcessingStats(@CurrentUser() user: CurrentUserData) {
    try {
      const stats = await this.withdrawalProcessorService.getProcessingStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get processing statistics'
      };
    }
  }
}





