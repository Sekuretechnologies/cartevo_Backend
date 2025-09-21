import { Request, Response } from 'express';
import { WalletTransferBetweenService } from '../../services/wallet/walletTransferBetween.service';

export class WalletTransferBetweenController {
  /**
   * Transfer funds between wallets (supports different currencies with fees)
   * POST /api/wallets/transfer-between
   */
  static async transferBetween(req: Request, res: Response) {
    try {
      const { from_wallet_id, to_wallet_id, amount, reason } = req.body;
      const user_id = (req as any).user?.id;

      // Validate required fields
      if (!from_wallet_id || !to_wallet_id || !amount) {
        return res.status(400).json({
          success: false,
          message: 'from_wallet_id, to_wallet_id, and amount are required'
        });
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      // Validate different wallets
      if (from_wallet_id === to_wallet_id) {
        return res.status(400).json({
          success: false,
          message: 'Source and destination wallets must be different'
        });
      }

      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await WalletTransferBetweenService.transferBetween({
        from_wallet_id,
        to_wallet_id,
        amount,
        reason,
        user_id
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            transaction_id: result.transaction_id,
            from_wallet_balance: result.from_wallet_balance,
            to_wallet_balance: result.to_wallet_balance,
            fee_amount: result.fee_amount,
            exchange_rate: result.exchange_rate,
            converted_amount: result.converted_amount
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Transfer between controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get available wallets for transfer
   * GET /api/wallets/:id/available-for-transfer
   */
  static async getAvailableWallets(req: Request, res: Response) {
    try {
      const { id: sourceWalletId } = req.params;
      const company_id = (req as any).user?.company_id;

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'Company not found'
        });
      }

      const result = await WalletTransferBetweenService.getAvailableWallets(
        sourceWalletId,
        company_id
      );

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
      console.error('Get available wallets controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Calculate transfer fees without executing the transfer
   * POST /api/wallets/calculate-transfer-fees
   */
  static async calculateTransferFees(req: Request, res: Response) {
    try {
      const { from_currency, to_currency, amount, country_iso_code } = req.body;
      const company_id = (req as any).user?.company_id;

      // Validate required fields
      if (!from_currency || !to_currency || !amount) {
        return res.status(400).json({
          success: false,
          message: 'from_currency, to_currency, and amount are required'
        });
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      if (!company_id) {
        return res.status(401).json({
          success: false,
          message: 'Company not found'
        });
      }

      const result = await WalletTransferBetweenService.calculateTransferFees(
        company_id,
        from_currency,
        to_currency,
        amount,
        country_iso_code
      );

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
      console.error('Calculate transfer fees controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

