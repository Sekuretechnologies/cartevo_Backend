import { Request, Response } from 'express';
import { WalletInternalTransferService } from '../../services/wallet/walletInternalTransfer.service';

export class WalletInternalTransferController {
  /**
   * Transfer funds between PayIn and PayOut balances
   * POST /api/wallets/:id/transfer-internal
   */
  static async transferInternal(req: Request, res: Response) {
    try {
      const { id: walletId } = req.params;
      const { amount, direction, reason } = req.body;
      const user_id = (req as any).user?.id; // Assuming user is attached to request by auth middleware

      // Validate required fields
      if (!amount || !direction) {
        return res.status(400).json({
          success: false,
          message: 'Amount and direction are required'
        });
      }

      // Validate direction
      if (!['PAYIN_TO_PAYOUT', 'PAYOUT_TO_PAYIN'].includes(direction)) {
        return res.status(400).json({
          success: false,
          message: 'Direction must be either PAYIN_TO_PAYOUT or PAYOUT_TO_PAYIN'
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

      const result = await WalletInternalTransferService.transferInternal(walletId, {
        amount,
        direction,
        reason,
        user_id
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            transaction_id: result.transaction_id,
            new_payin_balance: result.new_payin_balance,
            new_payout_balance: result.new_payout_balance
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Transfer internal controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get wallet balances
   * GET /api/wallets/:id/balances
   */
  static async getWalletBalances(req: Request, res: Response) {
    try {
      const { id: walletId } = req.params;

      const result = await WalletInternalTransferService.getWalletBalances(walletId);

      if (result.success) {
        return res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Get wallet balances controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

