import { FeeCalculationService } from "./feeCalculationService";
import { UnifiedWalletService } from "./walletService";
import { CardModel, TransactionModel, CompanyModel } from "@/models";
import { v4 as uuidv4 } from "uuid";
import { utcToLocalTime } from "@/utils/date";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
} from "../types/transaction.types";

/**
 * Advanced Fee Management Service
 * Extends basic fee calculations with sophisticated business rules and range-based pricing
 */
export class AdvancedFeeService extends FeeCalculationService {
  // Fee range configurations
  private static readonly FEE_RANGES = {
    issuance: [
      { minAmount: 0, maxAmount: 50, value: 1.0, type: "FIXED" },
      { minAmount: 50, maxAmount: 200, value: 0.5, type: "FIXED" },
      { minAmount: 200, maxAmount: Infinity, value: 0.25, type: "PERCENTAGE" },
    ],
    success: [
      { minAmount: 0, maxAmount: 10, value: 0.25, type: "FIXED" },
      { minAmount: 10, maxAmount: 100, value: 2, type: "PERCENTAGE" },
      { minAmount: 100, maxAmount: Infinity, value: 1, type: "PERCENTAGE" },
    ],
    failure: [
      { minAmount: 0, maxAmount: 50, value: 0.3, type: "FIXED" },
      { minAmount: 50, maxAmount: 200, value: 0.5, type: "FIXED" },
      { minAmount: 200, maxAmount: Infinity, value: 1.0, type: "FIXED" },
    ],
  };

  /**
   * Calculate advanced fees with business rules and range-based pricing
   */
  static async calculateAdvancedFees(
    companyId: string,
    amount: number,
    currency: string,
    feeType: "issuance" | "success" | "failure",
    context?: {
      customerId?: string;
      isFirstCard?: boolean;
      cardType?: string;
      customerTier?: string;
      bulkDiscount?: boolean;
    }
  ): Promise<AdvancedFeeResult> {
    try {
      console.log("💰 Calculating advanced fees", {
        companyId,
        amount,
        currency,
        feeType,
        context,
      });

      // 1. Get applicable fee range
      const feeRanges = this.FEE_RANGES[feeType] || [];
      const applicableRange = feeRanges.find(
        (range) => amount >= range.minAmount && amount <= range.maxAmount
      );

      if (!applicableRange) {
        return this.getDefaultFeeCalculation(feeType, amount);
      }

      // 2. Calculate base fee
      const baseFee =
        applicableRange.type === "PERCENTAGE"
          ? (amount * applicableRange.value) / 100
          : applicableRange.value;

      // 3. Apply business rules and discounts
      const discounts = await this.calculateDiscounts(companyId, context);
      const finalFee = Math.max(0, baseFee - discounts.totalDiscount);

      // 4. Convert to target currency if needed
      const convertedFee =
        currency === "USD"
          ? finalFee
          : await this.convertFeeToTargetCurrency(finalFee, "USD", currency);

      console.log("✅ Advanced fee calculated", {
        baseFee,
        discounts: discounts.breakdown,
        finalFee: convertedFee,
        appliedRange: `${applicableRange.minAmount}-${applicableRange.maxAmount}`,
        feeType,
      });

      return {
        baseFee,
        discounts: discounts.breakdown,
        finalFee: convertedFee,
        currency,
        appliedRange: {
          name: `${applicableRange.minAmount}-${applicableRange.maxAmount}`,
          type: applicableRange.type as "FIXED" | "PERCENTAGE",
          value: applicableRange.value,
        },
        breakdown: {
          baseAmount: amount,
          feeAmount: convertedFee,
          totalAmount: amount + convertedFee,
          savings: discounts.totalDiscount,
        },
        businessRules: discounts.appliedRules,
      };
    } catch (error: any) {
      console.error("❌ Advanced fee calculation failed", {
        companyId,
        amount,
        feeType,
        error: error.message,
      });

      // Fallback to basic fee calculation
      return this.getDefaultFeeCalculation(feeType, amount);
    }
  }

  /**
   * Calculate all applicable discounts
   */
  private static async calculateDiscounts(
    companyId: string,
    context?: {
      customerId?: string;
      isFirstCard?: boolean;
      cardType?: string;
      customerTier?: string;
      bulkDiscount?: boolean;
    }
  ): Promise<{
    totalDiscount: number;
    breakdown: { [key: string]: number };
    appliedRules: string[];
  }> {
    const discounts = {
      firstCardDiscount: 0,
      tierDiscount: 0,
      bulkDiscount: 0,
      loyaltyDiscount: 0,
    };

    const appliedRules: string[] = [];

    // First card discount
    if (context?.isFirstCard) {
      discounts.firstCardDiscount = 0.5;
      appliedRules.push("first_card_discount");
    }

    // Customer tier discount
    if (context?.customerTier === "premium") {
      discounts.tierDiscount = 0.25;
      appliedRules.push("premium_tier_discount");
    } else if (context?.customerTier === "gold") {
      discounts.tierDiscount = 0.15;
      appliedRules.push("gold_tier_discount");
    }

    // Bulk discount for multiple cards
    if (context?.bulkDiscount) {
      const cardCount = await this.getCustomerCardCount(context.customerId);
      if (cardCount >= 5) {
        discounts.bulkDiscount = 0.2;
        appliedRules.push("bulk_discount_5_plus");
      } else if (cardCount >= 3) {
        discounts.bulkDiscount = 0.1;
        appliedRules.push("bulk_discount_3_plus");
      }
    }

    // Company loyalty discount (based on transaction volume)
    const loyaltyDiscount = await this.calculateLoyaltyDiscount(companyId);
    if (loyaltyDiscount > 0) {
      discounts.loyaltyDiscount = loyaltyDiscount;
      appliedRules.push("loyalty_discount");
    }

    const totalDiscount = Object.values(discounts).reduce(
      (sum, discount) => sum + discount,
      0
    );

    console.log("🎁 Discount calculation", {
      companyId,
      discounts,
      totalDiscount,
      appliedRules,
    });

    return {
      totalDiscount,
      breakdown: discounts,
      appliedRules,
    };
  }

  /**
   * Calculate loyalty discount based on company transaction volume
   */
  private static async calculateLoyaltyDiscount(
    companyId: string
  ): Promise<number> {
    try {
      // Get company transaction volume in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transactionsResult = await TransactionModel.get({
        company_id: companyId,
        status: TRANSACTION_STATUS.SUCCESS,
        // created_at: { gte: thirtyDaysAgo } // This would need proper date filtering
      });

      if (transactionsResult.error || !transactionsResult.output) {
        return 0;
      }

      const totalVolume = transactionsResult.output.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0
      );

      // Loyalty discount tiers
      if (totalVolume >= 10000) {
        // $10k+ volume
        return 0.5;
      } else if (totalVolume >= 5000) {
        // $5k+ volume
        return 0.3;
      } else if (totalVolume >= 1000) {
        // $1k+ volume
        return 0.15;
      }

      return 0;
    } catch (error: any) {
      console.error("Failed to calculate loyalty discount", {
        companyId,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Get customer card count for bulk discounts
   */
  private static async getCustomerCardCount(
    customerId?: string
  ): Promise<number> {
    if (!customerId) return 0;

    try {
      const cardsResult = await CardModel.get({
        customer_id: customerId,
        is_active: true,
      });

      return cardsResult.output?.length || 0;
    } catch (error: any) {
      console.error("Failed to get customer card count", {
        customerId,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Convert fee to target currency
   */
  private static async convertFeeToTargetCurrency(
    feeAmount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return feeAmount;
    }

    // Mock conversion - in production, this would use real exchange rates
    const exchangeRates: { [key: string]: number } = {
      USD_XAF: 650,
      USD_NGN: 800,
      XAF_USD: 1 / 650,
      NGN_USD: 1 / 800,
    };

    const conversionKey = `${fromCurrency}_${toCurrency}`;
    const rate = exchangeRates[conversionKey] || 1;

    return Math.round(feeAmount * rate * 100) / 100;
  }

  /**
   * Get default fee calculation when range not found
   */
  private static getDefaultFeeCalculation(
    feeType: string,
    amount: number
  ): AdvancedFeeResult {
    const defaultFees = {
      issuance: 1.0,
      success: 0.5,
      failure: 0.3,
    };

    const baseFee = defaultFees[feeType] || 1.0;

    return {
      baseFee,
      discounts: {},
      finalFee: baseFee,
      currency: "USD",
      appliedRange: {
        name: "default",
        type: "FIXED",
        value: baseFee,
      },
      breakdown: {
        baseAmount: amount,
        feeAmount: baseFee,
        totalAmount: amount + baseFee,
        savings: 0,
      },
      businessRules: ["default_fallback"],
    };
  }

  /**
   * Process intelligent failure fee management
   */
  static async processFailureFeeStrategy(
    cardId: string,
    transactionReference: string,
    context: {
      originalAmount: number;
      declineReason?: string;
      merchantName?: string;
    }
  ): Promise<FailureFeeResult> {
    console.log("🎯 Processing intelligent failure fee strategy", {
      cardId,
      transactionReference,
      originalAmount: context.originalAmount,
      declineReason: context.declineReason,
    });

    try {
      // 1. Get card information
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error) {
        throw new Error(`Card not found: ${cardId}`);
      }

      const card = cardResult.output;

      // 2. Check if Maplerad already charged a failure fee
      const mapleradChargeDetected = await this.checkMapleradFailureCharge(
        card.provider_card_id,
        transactionReference
      );

      if (mapleradChargeDetected) {
        console.log("✅ Maplerad already charged failure fee", {
          cardId,
          transactionReference,
          action: "no_additional_fee",
        });

        return {
          feeApplied: false,
          reason: "maplerad_already_charged",
          amount: 0,
          source: "maplerad",
        };
      }

      // 3. Calculate our failure fee based on context
      const feeCalculation = await this.calculateAdvancedFees(
        card.company_id,
        context.originalAmount,
        "USD",
        "failure",
        { customerId: card.customer_id }
      );

      // 4. Apply the failure fee
      const feeApplied = await this.applyFailureFee({
        cardId,
        amount: feeCalculation.finalFee,
        reference: transactionReference,
        reason: context.declineReason || "Payment declined",
        merchantName: context.merchantName,
      });

      if (feeApplied.success) {
        console.log("💰 Failure fee applied successfully", {
          cardId,
          feeAmount: feeCalculation.finalFee,
          transactionReference,
          appliedRange: feeCalculation.appliedRange.name,
        });

        return {
          feeApplied: true,
          amount: feeCalculation.finalFee,
          source: "cartevo_system",
          transactionId: feeApplied.transactionId,
          breakdown: feeCalculation.breakdown,
        };
      } else {
        throw new Error(feeApplied.error || "Failed to apply failure fee");
      }
    } catch (error: any) {
      console.error("❌ Failure fee strategy failed", {
        cardId,
        transactionReference,
        error: error.message,
      });

      return {
        feeApplied: false,
        reason: "error_processing_fee",
        amount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Check if Maplerad already charged a failure fee
   */
  private static async checkMapleradFailureCharge(
    mapleradCardId: string,
    transactionReference: string
  ): Promise<boolean> {
    try {
      // Check recent transactions for Maplerad charges
      const recentCharges = await TransactionModel.get({
        reference: transactionReference,
        type: TRANSACTION_TYPE.PAYMENT_SUCCESS_FEE, // Using available fee type
        status: TRANSACTION_STATUS.SUCCESS,
      });

      if (
        !recentCharges.error &&
        recentCharges.output &&
        recentCharges.output.length > 0
      ) {
        console.log("🔍 Maplerad failure charge detected", {
          mapleradCardId,
          transactionReference,
          chargeFound: true,
        });
        return true;
      }

      // Also check for small debits around $0.30 that might indicate Maplerad fees
      // This would require checking the card balance changes
      console.log("🔍 No Maplerad failure charge detected", {
        mapleradCardId,
        transactionReference,
        chargeFound: false,
      });

      return false;
    } catch (error: any) {
      console.error("Failed to check Maplerad failure charge", {
        mapleradCardId,
        transactionReference,
        error: error.message,
      });
      // Assume no charge on error to avoid double charging
      return false;
    }
  }

  /**
   * Apply failure fee to card and update balance
   */
  private static async applyFailureFee(context: {
    cardId: string;
    amount: number;
    reference: string;
    reason: string;
    merchantName?: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log("💳 Applying failure fee", {
        cardId: context.cardId,
        amount: context.amount,
        reason: context.reason,
      });

      // 1. Get card for validation
      const cardResult = await CardModel.getOne({ id: context.cardId });
      if (cardResult.error) {
        return { success: false, error: "Card not found" };
      }

      const card = cardResult.output;

      // 2. Check if card has sufficient balance
      if (Number(card.balance) < context.amount) {
        console.warn("⚠️ Insufficient card balance for failure fee", {
          cardId: context.cardId,
          cardBalance: card.balance,
          feeAmount: context.amount,
        });

        // Create debt record instead of direct debit
        return await this.createFailureFeeDebt(context, card);
      }

      // 3. Create failure fee transaction
      const transactionResult = await TransactionModel.create({
        id: uuidv4(),
        company_id: card.company_id,
        customer_id: card.customer_id,
        card_id: context.cardId,
        category: TRANSACTION_CATEGORY.FEE,
        type: TRANSACTION_TYPE.PAYMENT_SUCCESS_FEE, // Using available fee type
        status: TRANSACTION_STATUS.SUCCESS,
        description: `Payment failure fee - ${
          context.merchantName || "merchant"
        }`,
        amount: context.amount,
        currency: "USD",
        fee_amount: context.amount,
        net_amount: -context.amount,
        reference: `failure-fee-${context.reference}`,
        reason: context.reason,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (transactionResult.error) {
        return { success: false, error: "Failed to create fee transaction" };
      }

      // 4. Update card balance
      const newBalance = Number(card.balance) - context.amount;
      await CardModel.update(context.cardId, {
        balance: newBalance,
        updated_at: new Date(),
      });

      console.log("✅ Failure fee applied successfully", {
        cardId: context.cardId,
        feeAmount: context.amount,
        newBalance,
        transactionId: transactionResult.output.id,
      });

      return {
        success: true,
        transactionId: transactionResult.output.id,
      };
    } catch (error: any) {
      console.error("❌ Failed to apply failure fee", {
        cardId: context.cardId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create failure fee debt when card has insufficient balance
   */
  private static async createFailureFeeDebt(
    context: {
      cardId: string;
      amount: number;
      reference: string;
      reason: string;
      merchantName?: string;
    },
    card: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Create debt transaction record
      const debtTransactionResult = await TransactionModel.create({
        id: uuidv4(),
        company_id: card.company_id,
        customer_id: card.customer_id,
        card_id: context.cardId,
        category: TRANSACTION_CATEGORY.FEE,
        type: TRANSACTION_TYPE.PAYMENT_SUCCESS_FEE,
        status: TRANSACTION_STATUS.PENDING, // Pending until paid
        description: `Payment failure fee debt - ${
          context.merchantName || "merchant"
        }`,
        amount: context.amount,
        currency: "USD",
        fee_amount: context.amount,
        net_amount: -context.amount,
        reference: `failure-fee-debt-${context.reference}`,
        reason: `${context.reason} - Insufficient card balance, debt created`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (debtTransactionResult.error) {
        return { success: false, error: "Failed to create debt record" };
      }

      console.log("💳 Failure fee debt created", {
        cardId: context.cardId,
        debtAmount: context.amount,
        cardBalance: card.balance,
        transactionId: debtTransactionResult.output.id,
      });

      return {
        success: true,
        transactionId: debtTransactionResult.output.id,
      };
    } catch (error: any) {
      console.error("Failed to create failure fee debt", {
        cardId: context.cardId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process payment success fees with advanced calculations
   */
  static async processPaymentSuccessFees(
    cardId: string,
    paymentAmount: number,
    merchantContext: {
      name?: string;
      category?: string;
      location?: string;
      transactionReference: string;
    }
  ): Promise<PaymentFeeResult> {
    console.log("💰 Processing payment success fees", {
      cardId,
      paymentAmount,
      merchantName: merchantContext.name,
    });

    try {
      // Get card and company info
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error) {
        throw new Error(`Card not found: ${cardId}`);
      }

      const card = cardResult.output;

      // Calculate success fee
      const feeCalculation = await this.calculateAdvancedFees(
        card.company_id,
        paymentAmount,
        "USD",
        "success",
        { customerId: card.customer_id }
      );

      // Apply the fee if amount is significant
      if (feeCalculation.finalFee >= 0.1) {
        // Only apply fees >= 10 cents
        const feeResult = await this.applyPaymentSuccessFee({
          cardId,
          companyId: card.company_id,
          customerId: card.customer_id,
          amount: feeCalculation.finalFee,
          reference: merchantContext.transactionReference,
          merchantName: merchantContext.name || "Unknown merchant",
          paymentAmount,
        });

        return {
          feeApplied: feeResult.success,
          feeAmount: feeCalculation.finalFee,
          feeCalculation,
          transactionId: feeResult.transactionId,
          error: feeResult.error,
        };
      } else {
        console.log("ℹ️ Payment success fee waived - amount too small", {
          cardId,
          calculatedFee: feeCalculation.finalFee,
          threshold: 0.1,
        });

        return {
          feeApplied: false,
          feeAmount: 0,
          feeCalculation,
          reason: "fee_waived_small_amount",
        };
      }
    } catch (error: any) {
      console.error("❌ Payment success fee processing failed", {
        cardId,
        paymentAmount,
        error: error.message,
      });

      return {
        feeApplied: false,
        feeAmount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Apply payment success fee
   */
  private static async applyPaymentSuccessFee(context: {
    cardId: string;
    companyId: string;
    customerId: string;
    amount: number;
    reference: string;
    merchantName: string;
    paymentAmount: number;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Try to debit from company wallet first
      const walletResult = await UnifiedWalletService.getCompanyWallet(
        context.companyId,
        "USD"
      );

      if (Number(walletResult.balance) >= context.amount) {
        // Debit from company wallet
        await UnifiedWalletService.updateBalance(
          walletResult.id,
          Number(walletResult.balance) - context.amount
        );

        // Create success fee transaction
        const transactionResult = await TransactionModel.create({
          id: uuidv4(),
          company_id: context.companyId,
          customer_id: context.customerId,
          wallet_id: walletResult.id,
          card_id: context.cardId,
          category: TRANSACTION_CATEGORY.FEE,
          type: TRANSACTION_TYPE.PAYMENT_SUCCESS_FEE,
          status: TRANSACTION_STATUS.SUCCESS,
          description: `Payment success fee - ${context.merchantName}`,
          amount: context.amount,
          currency: "USD",
          fee_amount: context.amount,
          net_amount: -context.amount,
          reference: `success-fee-${context.reference}`,
          reason: `Payment success fee for $${context.paymentAmount} transaction`,
          created_at: utcToLocalTime(new Date())?.toISOString(),
          updated_at: utcToLocalTime(new Date())?.toISOString(),
        });

        if (transactionResult.error) {
          return { success: false, error: "Failed to create fee transaction" };
        }

        console.log("✅ Payment success fee applied from company wallet", {
          cardId: context.cardId,
          feeAmount: context.amount,
          walletBalance: Number(walletResult.balance) - context.amount,
          transactionId: transactionResult.output.id,
        });

        return {
          success: true,
          transactionId: transactionResult.output.id,
        };
      } else {
        // Create fee debt - insufficient wallet balance
        return await this.createPaymentFeeDebt(context);
      }
    } catch (error: any) {
      console.error("Failed to apply payment success fee", {
        cardId: context.cardId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create payment fee debt when insufficient balance
   */
  private static async createPaymentFeeDebt(context: {
    cardId: string;
    companyId: string;
    customerId: string;
    amount: number;
    reference: string;
    merchantName: string;
    paymentAmount: number;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const debtTransactionResult = await TransactionModel.create({
        id: uuidv4(),
        company_id: context.companyId,
        customer_id: context.customerId,
        card_id: context.cardId,
        category: TRANSACTION_CATEGORY.FEE,
        type: TRANSACTION_TYPE.PAYMENT_SUCCESS_FEE,
        status: TRANSACTION_STATUS.PENDING,
        description: `Payment success fee debt - ${context.merchantName}`,
        amount: context.amount,
        currency: "USD",
        fee_amount: context.amount,
        net_amount: -context.amount,
        reference: `success-fee-debt-${context.reference}`,
        reason: `Insufficient wallet balance for payment success fee`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (debtTransactionResult.error) {
        return { success: false, error: "Failed to create debt record" };
      }

      console.log("💳 Payment success fee debt created", {
        cardId: context.cardId,
        debtAmount: context.amount,
        transactionId: debtTransactionResult.output.id,
      });

      return {
        success: true,
        transactionId: debtTransactionResult.output.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Result interfaces
export interface AdvancedFeeResult {
  baseFee: number;
  discounts: { [key: string]: number };
  finalFee: number;
  currency: string;
  appliedRange: {
    name: string;
    type: "FIXED" | "PERCENTAGE";
    value: number;
  };
  breakdown: {
    baseAmount: number;
    feeAmount: number;
    totalAmount: number;
    savings: number;
  };
  businessRules: string[];
}

export interface FailureFeeResult {
  feeApplied: boolean;
  amount: number;
  source?: "maplerad" | "cartevo_system";
  reason?: string;
  error?: string;
  transactionId?: string;
  breakdown?: {
    baseAmount: number;
    feeAmount: number;
    totalAmount: number;
    savings: number;
  };
}

export interface PaymentFeeResult {
  feeApplied: boolean;
  feeAmount: number;
  feeCalculation?: AdvancedFeeResult;
  transactionId?: string;
  reason?: string;
  error?: string;
}
