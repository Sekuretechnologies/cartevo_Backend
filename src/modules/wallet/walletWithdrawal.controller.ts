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
      const user_id = (req as any).user?.id;

      // Validate required fields
      if (!amount || !phone_number || !operator) {
        return res.status(400).json({
          success: false,
          message: 'Amount, phone_number, and operator are required'
        });
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await WalletWithdrawalService.processWithdrawal(walletId, {
        amount,
        phone_number,
        operator,
        reason,
        user_id
      });

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

