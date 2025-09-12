import env from "@/env";
import CardModel from "@/models/prisma/cardModel";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import ExchangeRateModel from "@/models/prisma/exchangeRateModel";
import CurrencyManager from "@/utils/shared/currencyManager";
import { utcToLocalTime } from "@/utils/date";
import {
  TransactionCategory,
  TransactionType,
  TransactionStatus,
} from "@/types";
import { CardStatus, CardTransactionType } from "@/utils/cards/maplerad/types";
import { TransactionFee } from "@prisma/client";

// Get card fees from TransactionFeeModel
export const getCardFees = async (
  companyId: string,
  countryIsoCode?: string
): Promise<{
  issuanceFee: number;
  fundFee: number;
  withdrawFee: number;
  paymentSuccessFees?: Map<string, any>;
  paymentFailureFees?: Map<string, any>;
}> => {
  try {
    // Get card purchase fees from TransactionFeeModel
    const feesResult = await TransactionFeeModel.get({
      company_id: companyId,
      transaction_category: TransactionCategory.CARD,
      transaction_type: {
        in: [
          TransactionType.ISSUANCE,
          TransactionType.FUND,
          TransactionType.WITHDRAW,
          TransactionType.PAYMENT_SUCCESS_FEE,
          TransactionType.PAYMENT_FAILURE_FEE,
        ],
      },
      country_iso_code: countryIsoCode,
      currency: "USD",
    });

    if (feesResult.output) {
      const fees: TransactionFee[] = feesResult.output;
      const issuanceFee = fees.find(
        (fee) => fee.transaction_type === TransactionType.ISSUANCE
      );
      const fundFee = fees.find(
        (fee) => fee.transaction_type === TransactionType.FUND
      );
      const withdrawFee = fees.find(
        (fee) => fee.transaction_type === TransactionType.WITHDRAW
      );

      const paymentSuccessFee = fees.filter(
        (fee) => fee.transaction_type === TransactionType.PAYMENT_SUCCESS_FEE
      );
      const paymentSuccessFeeMap = new Map<string, any>();
      paymentSuccessFee.forEach((payFee) => {
        const normalizedPayFee = {
          // id: payFee.id,
          type: payFee.type,
          value: payFee.value,
          range_min: payFee.range_min,
          range_max: payFee.range_max,
          currency: payFee.currency,
        };
        paymentSuccessFeeMap.set(
          `${payFee.range_min}_${payFee.range_max}`,
          normalizedPayFee
        );
      });

      const paymentFailureFee = fees.filter(
        (fee) =>
          fee.transaction_type === TransactionType.PAYMENT_FAILURE_FEE &&
          fee.type === "RANGE"
      );
      const paymentFailureFeeMap = new Map<string, any>();
      paymentSuccessFee.forEach((payFee) => {
        const normalizedPayFee = {
          // id: payFee.id,
          type: payFee.type,
          value: payFee.value,
          range_min: payFee.range_min,
          range_max: payFee.range_max,
          currency: payFee.currency,
        };
        paymentFailureFeeMap.set(
          `${payFee.range_min}_${payFee.range_max}`,
          normalizedPayFee
        );
      });

      return {
        issuanceFee:
          issuanceFee?.type === "FIXED"
            ? parseFloat(issuanceFee?.value?.toString())
            : 1,
        fundFee:
          fundFee?.type === "FIXED"
            ? parseFloat(fundFee?.value?.toString())
            : 0.5,
        withdrawFee:
          withdrawFee?.type === "FIXED"
            ? parseFloat(withdrawFee?.value?.toString())
            : 0.5,
        paymentSuccessFees: paymentSuccessFeeMap,
        paymentFailureFees: paymentFailureFeeMap,
      };
    }
  } catch (error) {
    console.warn(`Failed to get card fees from database:`, error);
  }

  // Fallback to default fees
  return {
    issuanceFee: 1, // USD
    fundFee: 0.5, // USD
    withdrawFee: 0.5, // USD
  };
};

// Define missing types
export interface OptimizedCardFeeResult {
  issuanceFeeXaf: number;
  issuanceFeeLocalCurrency: number;
  isFirstCard: boolean;
  topupFeeUsd: number;
  topupFeeXaf: number;
  topupFeeLocalCurrency: number;
  totalFeeXaf: number;
  totalFeeLocalCurrency: number;
  exchangeRateUsed: number;
  breakdown: {
    cardIssuanceFeeXaf: number;
    initialTopupFeeUsd: number;
    initialTopupFeeXaf: number;
  };
}

type CardCurrency = "USD" | "XAF" | "EUR";

export interface CardOperationFeeResult {
  feeUsd: number;
  feeXaf: number;
  feePercentage?: number;
  exchangeRate: number;
  operationType: CardTransactionType;
}

/**
 * Récupère le taux de change actuel
 */
export const getCurrentExchangeRate = async ({
  country_iso_code,
  fromCurrency,
  toCurrency,
  companyId,
}: {
  country_iso_code: string;
  fromCurrency: string;
  toCurrency: string;
  companyId: string;
}): Promise<number> => {
  try {
    // Use ExchangeRateModel for company-specific rates
    if (fromCurrency === "USD" && toCurrency === "XAF") {
      return await CurrencyManager.getDollarRate(companyId, country_iso_code);
    } else if (fromCurrency === "CDF" && toCurrency === "XAF") {
      // Handle CDF to XAF conversion
      const result = await ExchangeRateModel.get({
        from_currency: "CDF",
        to_currency: "XAF",
        company_id: companyId,
        is_active: true,
      });
      if (result.output && result.output.length > 0) {
        return result.output[0].rate;
      }
      // Fallback: 1 CDF = 0.2 XAF (1 XAF = 5 CDF)
      return 0.2;
    }

    // For other currency pairs, try to get from database
    const result = await ExchangeRateModel.get({
      from_currency: fromCurrency,
      to_currency: toCurrency,
      company_id: companyId,
      is_active: true,
    });

    if (result.output && result.output.length > 0) {
      return result.output[0].rate;
    }

    // Fallback to default rates
    return 620.5; // Default XAF rate
  } catch (error) {
    console.warn(
      `Exchange rate not found for ${fromCurrency}->${toCurrency}, using default 620.50`
    );
    return 620.5; // Taux par défaut
  }
};
