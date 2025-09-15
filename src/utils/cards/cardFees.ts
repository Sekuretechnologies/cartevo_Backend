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

interface CardFee {
  issuanceFee: number;
  fundFee: number;
  withdrawFee: number;
  paymentSuccessFees?: Map<string, any>;
  paymentFailureFees?: Map<string, any>;
}

interface CardFeesResult {
  success: boolean;
  data?: CardFee;
  error?: string;
}

// Extracted from cardFeeService.ts - Get card fees from TransactionFeeModel
const getCardFees = async (
  companyId: string,
  countryIsoCode?: string
): Promise<CardFeesResult> => {
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
        success: true,
        data: {
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
        },
      };
    }
  } catch (error) {
    console.warn(`Failed to get card fees from database:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get card fees",
    };
  }

  // Fallback to default fees
  return {
    success: true,
    data: {
      issuanceFee: 1, // USD
      fundFee: 0.5, // USD
      withdrawFee: 0.5, // USD
    },
  };
};

export default getCardFees;
