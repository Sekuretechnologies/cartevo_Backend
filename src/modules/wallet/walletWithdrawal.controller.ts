import { Request, Response } from 'express';
import { WalletWithdrawalService } from '../../services/wallet/walletWithdrawal.service';

export class WalletWithdrawalController {
  /**
   * Process withdrawal from PayOut balance
   * POST /api/wallets/:id/withdraw
   */
  static async processWithdrawal(req: Request, res: Response) {
    try {
      const { id: walletId } = req.params;
      const { amount, phone_number, operator, reason } = req.body;
      console.log('[WITHDRAW][CONTROLLER] Incoming request', {
        walletId,
        amount,
        phone_number,
        operator,
        hasUser: Boolean((req as any).user?.id),
      });
      const user_id = (req as any).user?.id;

      // Validate required fields
      if (!amount || !phone_number || !operator) {
        console.log('[WITHDRAW][CONTROLLER] Validation failed: missing fields', {
          amountPresent: Boolean(amount),
          phonePresent: Boolean(phone_number),
          operatorPresent: Boolean(operator),
        });
        return res.status(400).json({
          success: false,
          message: 'Amount, phone_number, and operator are required'
        });
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        console.log('[WITHDRAW][CONTROLLER] Validation failed: amount invalid', { amount });
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      if (!user_id) {
        console.log('[WITHDRAW][CONTROLLER] Validation failed: no user');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      console.log('[WITHDRAW][CONTROLLER] Calling service.processWithdrawal', {
        walletId,
        amount,
        phone_number,
        operator,
        reason,
        user_id,
      });
      const result = await WalletWithdrawalService.processWithdrawal(walletId, {
        amount,
        phone_number,
        operator,
        reason,
        user_id
      });

      console.log('[WITHDRAW][CONTROLLER] Service response', result);
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            transaction_id: result.transaction_id,
            status: result.status,
            new_payout_balance: result.new_payout_balance
          }
        });
      } else {
        console.log('[WITHDRAW][CONTROLLER] Service returned failure', {
          message: result.message,
          status: result.status,
        });
        return res.status(400).json({
          success: false,
          message: result.message,
          status: result.status
        });
      }

    } catch (error) {
      console.error('Withdrawal controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

