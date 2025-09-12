import { getCardFees } from "./cardFeeService";
import { FeeCalculation } from "../types/cardIssuance.types";

/**
 * Unified Fee Calculation Service
 * Consolidates all fee calculation logic from different parts of the system
 */
export class FeeCalculationService {
  /**
   * Calculate card issuance fees using the optimized service
   */
  static async calculateCardIssuanceFees(
    companyId: string,
    initialBalance: number
  ): Promise<FeeCalculation> {
    try {
      const cardFees = await getCardFees(companyId);

      const issuanceFee = cardFees.issuanceFee;
      const totalFee = issuanceFee + initialBalance;

      return {
        issuanceFee,
        totalFee,
        breakdown: {
          issuanceFee,
          initialBalance,
        },
      };
    } catch (error) {
      console.error("Error calculating card issuance fees:", error);
      // Fallback to default fees
      return {
        issuanceFee: 1, // USD
        totalFee: initialBalance + 1,
        breakdown: {
          issuanceFee: 1,
          initialBalance,
        },
      };
    }
  }

  /**
   * Calculate payment success fees based on transaction amount
   */
  static async calculatePaymentSuccessFees(
    companyId: string,
    transactionAmount: number,
    countryIsoCode: string = "CM"
  ): Promise<{
    feeUsd: number;
    feeXaf: number;
    rangeUsed?: string;
  }> {
    try {
      const cardFees = await getCardFees(companyId, countryIsoCode);

      // Use payment success fees from the database
      if (cardFees.paymentSuccessFees) {
        // Find the appropriate fee range
        const ranges = Array.from(cardFees.paymentSuccessFees.keys());
        const applicableRange = ranges.find((range) => {
          const [min, max] = range.split("_").map(Number);
          return transactionAmount >= min && transactionAmount <= max;
        });

        if (applicableRange) {
          const feeConfig = cardFees.paymentSuccessFees.get(applicableRange);
          if (feeConfig) {
            const feeAmount =
              feeConfig.type === "PERCENTAGE"
                ? (transactionAmount * feeConfig.value) / 100
                : feeConfig.value;

            return {
              feeUsd: feeAmount,
              feeXaf: feeAmount * 650, // Approximate conversion rate
              rangeUsed: applicableRange,
            };
          }
        }
      }

      // Fallback to default calculation
      return {
        feeUsd: Math.max(0.5, transactionAmount * 0.005), // Min 0.5 or 0.5%
        feeXaf: Math.max(325, transactionAmount * 0.005 * 650),
      };
    } catch (error) {
      console.error("Error calculating payment success fees:", error);
      return {
        feeUsd: 0.5,
        feeXaf: 325,
      };
    }
  }

  /**
   * Calculate payment failure fees
   */
  static async calculatePaymentFailureFees(
    companyId: string,
    transactionAmount: number,
    countryIsoCode: string = "CM"
  ): Promise<{
    feeUsd: number;
    feeXaf: number;
  }> {
    try {
      const cardFees = await getCardFees(companyId, countryIsoCode);

      // Use payment failure fees from the database
      if (cardFees.paymentFailureFees) {
        // Find the appropriate fee range
        const ranges = Array.from(cardFees.paymentFailureFees.keys());
        const applicableRange = ranges.find((range) => {
          const [min, max] = range.split("_").map(Number);
          return transactionAmount >= min && transactionAmount <= max;
        });

        if (applicableRange) {
          const feeConfig = cardFees.paymentFailureFees.get(applicableRange);
          if (feeConfig) {
            const feeAmount =
              feeConfig.type === "PERCENTAGE"
                ? (transactionAmount * feeConfig.value) / 100
                : feeConfig.value;

            return {
              feeUsd: feeAmount,
              feeXaf: feeAmount * 650,
            };
          }
        }
      }

      // Fallback to default
      return {
        feeUsd: 0.25,
        feeXaf: 162.5,
      };
    } catch (error) {
      console.error("Error calculating payment failure fees:", error);
      return {
        feeUsd: 0.25,
        feeXaf: 162.5,
      };
    }
  }

  /**
   * Validate fee calculation result
   */
  static validateFeeCalculation(feeCalculation: FeeCalculation): boolean {
    return (
      feeCalculation.issuanceFee >= 0 &&
      feeCalculation.totalFee >= 0 &&
      feeCalculation.totalFee >= feeCalculation.issuanceFee
    );
  }
}
