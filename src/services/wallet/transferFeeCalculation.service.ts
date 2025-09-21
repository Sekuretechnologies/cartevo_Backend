import { PrismaClient } from '@prisma/client';
import TransactionFeeModel from '../../models/prisma/transactionFeeModel';
import CurrencyManager from '../../utils/shared/currencyManager';

const prisma = new PrismaClient();

export interface TransferFeeCalculationRequest {
  companyId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  countryIsoCode?: string;
}

export interface TransferFeeCalculationResponse {
  success: boolean;
  message?: string;
  data?: {
    feeAmount: number;
    feeType: string;
    feeValue: number;
    feeFixed: number;
    feePercentage: number;
    feeId: string;
    description: string;
    exchangeRate?: number;
    convertedAmount?: number;
    totalAmount: number;
  };
}

export class TransferFeeCalculationService {
  /**
   * Calculate transfer fees between different currencies
   */
  static async calculateTransferFee(
    request: TransferFeeCalculationRequest
  ): Promise<TransferFeeCalculationResponse> {
    try {
      const { companyId, fromCurrency, toCurrency, amount, countryIsoCode } = request;

      // 1. Calculate transfer fees dynamically from database
      let feePercentage = 0;
      
      // Try to get fee from database first (supports all currency pairs)
      const feeResult = await TransactionFeeModel.calculateFee(
        companyId,
        amount,
        'WALLET_TO_WALLET',
        'WALLET',
        countryIsoCode || 'CM',
        fromCurrency
      );
      
      if (!feeResult.error) {
        feePercentage = feeResult.output.feePercentage;
      } else {
        // Fallback: try to get fee based on currency pair
        const pairFeeResult = await this.getCurrencyPairFee(
          companyId,
          fromCurrency,
          toCurrency,
          countryIsoCode || 'CM'
        );
        
        if (pairFeeResult.success) {
          feePercentage = pairFeeResult.data!;
        } else {
          // Default fallback fees for known pairs (backward compatibility)
          if (fromCurrency === 'XAF' && toCurrency === 'XAF') {
            feePercentage = 2.0; // XAF to XAF: 2%
          } else if (fromCurrency === 'XAF' && toCurrency === 'XOF') {
            feePercentage = 8.0; // XAF to XOF: 8%
          } else if (fromCurrency === 'XAF' && toCurrency === 'USD') {
            feePercentage = 0.0; // XAF to USD: 0%
          } else if (fromCurrency === 'XOF' && toCurrency === 'XOF') {
            feePercentage = 2.0; // XOF to XOF: 2%
          } else if (fromCurrency === 'XOF' && toCurrency === 'XAF') {
            feePercentage = 8.0; // XOF to XAF: 8%
          } else if (fromCurrency === 'USD' && toCurrency === 'XAF') {
            feePercentage = 0.0; // USD to XAF: 0%
          } else if (fromCurrency === 'USD' && toCurrency === 'XOF') {
            feePercentage = 0.0; // USD to XOF: 0%
          } else if (fromCurrency === 'USD' && toCurrency === 'USD') {
            feePercentage = 1.0; // USD to USD: 1%
          }
        }
      }

      const feeAmount = (amount * feePercentage) / 100;
      let exchangeRate = 1;
      let convertedAmount = amount;

      // 2. Handle currency conversion if different currencies
      if (fromCurrency !== toCurrency) {
        try {
          // Always try database lookup first for all currency pairs
          const exchangeRateResult = await this.getExchangeRate(
            companyId,
            fromCurrency,
            toCurrency
          );

          if (exchangeRateResult.success && exchangeRateResult.data) {
            exchangeRate = exchangeRateResult.data.rate;
            convertedAmount = amount * exchangeRate;
          } else {
            // Fallback: Use CurrencyManager for USD pairs (backward compatibility)
            if (fromCurrency === 'USD' && (toCurrency === 'XAF' || toCurrency === 'XOF')) {
              exchangeRate = await CurrencyManager.getDollarRate(companyId, countryIsoCode);
              convertedAmount = amount * exchangeRate;
            } else if ((fromCurrency === 'XAF' || fromCurrency === 'XOF') && toCurrency === 'USD') {
              const dollarRate = await CurrencyManager.getDollarRate(companyId, countryIsoCode);
              exchangeRate = 1 / dollarRate; // Inverse rate for XAF/XOF to USD
              convertedAmount = amount * exchangeRate;
            } else if (fromCurrency === 'XAF' && toCurrency === 'XOF') {
              // XAF to XOF is 1:1 (backward compatibility)
              exchangeRate = 1;
              convertedAmount = amount;
            } else if (fromCurrency === 'XOF' && toCurrency === 'XAF') {
              // XOF to XAF is 1:1 (backward compatibility)
              exchangeRate = 1;
              convertedAmount = amount;
            } else {
              return {
                success: false,
                message: `No exchange rate found for ${fromCurrency} to ${toCurrency}`
              };
            }
          }
        } catch (error) {
          console.error('Currency conversion error:', error);
          return {
            success: false,
            message: `Currency conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      const totalAmount = amount + feeAmount;

      return {
        success: true,
        data: {
          feeAmount,
          feeType: 'PERCENTAGE',
          feeValue: feePercentage,
          feeFixed: 0,
          feePercentage,
          feeId: '',
          description: `Transfer fee ${fromCurrency} → ${toCurrency}: ${feePercentage}%`,
          exchangeRate,
          convertedAmount,
          totalAmount
        }
      };

    } catch (error) {
      console.error('Transfer fee calculation error:', error);
      return {
        success: false,
        message: `Transfer fee calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  private static async getExchangeRate(
    companyId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ success: boolean; data?: { rate: number }; message?: string }> {
    try {
      // First try direct conversion
      let exchangeRate = await prisma.exchangeRate.findUnique({
        where: {
          company_id_from_currency_to_currency: {
            company_id: companyId,
            from_currency: fromCurrency,
            to_currency: toCurrency
          }
        },
        select: { rate: true, is_active: true }
      });

      if (exchangeRate && exchangeRate.is_active) {
        return {
          success: true,
          data: { rate: Number(exchangeRate.rate) }
        };
      }

      // If direct conversion not found, try reverse conversion
      const reverseRate = await prisma.exchangeRate.findUnique({
        where: {
          company_id_from_currency_to_currency: {
            company_id: companyId,
            from_currency: toCurrency,
            to_currency: fromCurrency
          }
        },
        select: { rate: true, is_active: true }
      });

      if (reverseRate && reverseRate.is_active) {
        return {
          success: true,
          data: { rate: 1 / Number(reverseRate.rate) }
        };
      }

      return {
        success: false,
        message: `No exchange rate found for ${fromCurrency} to ${toCurrency}`
      };

    } catch (error) {
      console.error('Exchange rate lookup error:', error);
      return {
        success: false,
        message: `Exchange rate lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get fee percentage for a specific currency pair
   */
  static async getCurrencyPairFee(
    companyId: string,
    fromCurrency: string,
    toCurrency: string,
    countryIsoCode: string
  ): Promise<{ success: boolean; data?: number; message?: string }> {
    try {
      // Look for specific currency pair fee in database
      const pairFee = await prisma.transactionFee.findFirst({
        where: {
          company_id: companyId,
          transaction_type: 'WALLET_TO_WALLET',
          transaction_category: 'WALLET',
          country_iso_code: countryIsoCode,
          currency: fromCurrency,
          // Add a field to store target currency if needed
          // For now, we'll use the existing structure
        },
        select: {
          fee_percentage: true,
          fee_fixed: true
        }
      });

      if (pairFee) {
        return {
          success: true,
          data: Number(pairFee.fee_percentage)
        };
      }

      return {
        success: false,
        message: 'No fee found for this currency pair'
      };

    } catch (error) {
      console.error('Get currency pair fee error:', error);
      return {
        success: false,
        message: `Failed to get currency pair fee: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get available currencies for transfer from a source currency
   * USD wallets can only receive transfers, not send them
   */
  static async getAvailableCurrencies(
    companyId: string,
    fromCurrency: string
  ): Promise<{ success: boolean; data?: string[]; message?: string }> {
    try {
      // USD wallets cannot transfer to other wallets (deposit + incoming transfers only)
      if (fromCurrency === 'USD') {
        return {
          success: true,
          data: [] // Empty array = no available wallets for transfer
        };
      }

      // Get all exchange rates for the source currency
      const exchangeRates = await prisma.exchangeRate.findMany({
        where: {
          company_id: companyId,
          from_currency: fromCurrency,
          is_active: true
        },
        select: { to_currency: true }
      });

      // Also check reverse rates
      const reverseRates = await prisma.exchangeRate.findMany({
        where: {
          company_id: companyId,
          to_currency: fromCurrency,
          is_active: true
        },
        select: { from_currency: true }
      });

      const currencies = new Set<string>();
      
      // Add same currency (no conversion needed)
      currencies.add(fromCurrency);
      
      // Add currencies from direct rates
      exchangeRates.forEach(rate => currencies.add(rate.to_currency));
      
      // Add currencies from reverse rates
      reverseRates.forEach(rate => currencies.add(rate.from_currency));

      // Always include USD and XAF/XOF as they're handled by CurrencyManager
      if (fromCurrency === 'XAF' || fromCurrency === 'XOF') {
        currencies.add('USD');
      }
      // Explicitly add XOF for XAF and XAF for XOF (1:1 exchange)
      if (fromCurrency === 'XAF') {
        currencies.add('XOF');
      }
      if (fromCurrency === 'XOF') {
        currencies.add('XAF');
      }

      return {
        success: true,
        data: Array.from(currencies)
      };

    } catch (error) {
      console.error('Get available currencies error:', error);
      return {
        success: false,
        message: `Failed to get available currencies: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
