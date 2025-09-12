import ExchangeRateModel from "@/models/prisma/exchangeRateModel";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";

/**
 * Currency Manager - Handles currency conversions and exchange rates per company
 */
class CurrencyManager {
  /**
   * Get the current dollar exchange rate for a company
   */
  static async getDollarRate(
    companyId?: string,
    countryIsoCode?: string
  ): Promise<number> {
    try {
      // Try to get company-specific exchange rate first
      const result = await ExchangeRateModel.get({
        company_id: companyId,
        from_currency: "USD",
        to_currency: "XAF",
        is_active: true,
      });

      if (result.output && result.output.length > 0) {
        return result.output[0].rate;
      }

      // Fallback to country-specific rate
      if (countryIsoCode) {
        const countryResult = await ExchangeRateModel.get({
          country_iso_code: countryIsoCode,
          from_currency: "USD",
          to_currency: "XAF",
          is_active: true,
        });

        if (countryResult.output && countryResult.output.length > 0) {
          return countryResult.output[0].rate;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get exchange rate from database for company ${companyId}:`,
        error
      );
    }

    // Fallback to default rates
    return this.getDefaultDollarRate(countryIsoCode || "CM");
  }

  /**
   * Get default exchange rates when database is not available
   */
  private static getDefaultDollarRate(countryIsoCode: string): number {
    const defaultRates: { [key: string]: number } = {
      CM: 620.5, // Cameroon
      GA: 620.5, // Gabon
      BJ: 620.5, // Benin
      CD: 2800, // Congo (higher rate)
      NG: 1500, // Nigeria
      GH: 1600, // Ghana
      KE: 1700, // Kenya
      ZA: 1800, // South Africa
      SN: 620.5, // Senegal
      CI: 620.5, // Ivory Coast
    };

    return defaultRates[countryIsoCode] || 620.5; // Default to Cameroon rate
  }

  /**
   * Convert USD amount to local currency for a company
   */
  static async getLocalAmount(
    usdAmount: number,
    companyId?: string,
    countryIsoCode?: string
  ): Promise<number> {
    const rate = await this.getDollarRate(companyId, countryIsoCode);
    return Math.round(usdAmount * rate * 100) / 100;
  }

  /**
   * Convert local currency amount to USD for a company
   */
  static async getUSDAmount(
    localAmount: number,
    companyId: string,
    countryIsoCode?: string
  ): Promise<number> {
    const rate = await this.getDollarRate(companyId, countryIsoCode);
    return Math.round((localAmount / rate) * 100) / 100;
  }

  /**
   * Get transaction fee for a specific operation and company
   */
  static async getTransactionFee(
    companyId: string,
    transactionType: string,
    transactionCategory: string,
    amount?: number
  ): Promise<{
    feeAmount: number;
    feeType: string;
    feeValue: number;
    feeFixed: number;
    feePercentage: number;
    exchangeRate: number;
  }> {
    try {
      // Use the TransactionFeeModel's calculateFee method
      const feeResult = await TransactionFeeModel.calculateFee(
        companyId,
        amount || 0,
        transactionType,
        transactionCategory,
        "", // countryIsoCode - not used in current implementation
        "XAF" // currency - default to XAF
      );

      if (feeResult.error) {
        throw new Error(feeResult.error.message);
      }

      const fee = feeResult.output;
      const exchangeRate = await this.getDollarRate(companyId);

      return {
        feeAmount: fee.feeAmount,
        feeType: fee.feeType,
        feeValue: fee.feeValue,
        feeFixed: fee.feeFixed,
        feePercentage: fee.feePercentage,
        exchangeRate,
      };
    } catch (error: any) {
      console.warn(
        `Failed to get transaction fee for company ${companyId}:`,
        error
      );

      // Fallback to default fees
      return this.getDefaultTransactionFee(
        transactionType,
        transactionCategory,
        amount || 0
      );
    }
  }

  /**
   * Get default transaction fees when database is not available
   */
  private static getDefaultTransactionFee(
    transactionType: string,
    transactionCategory: string,
    amount: number
  ): {
    feeAmount: number;
    feeType: string;
    feeValue: number;
    feeFixed: number;
    feePercentage: number;
    exchangeRate: number;
  } {
    let feeAmount = 0.5; // Default fee
    let feeType = "FIXED";
    let feeValue = 0.5;
    let feeFixed = 0;
    let feePercentage = 0;

    // Different fees based on transaction type
    switch (transactionType.toLowerCase()) {
      case "card_issuance_first":
        feeAmount = 0; // First card is free
        feeValue = 0;
        break;
      case "card_issuance_additional":
        feeAmount = 5; // Additional cards cost
        feeValue = 5;
        break;
      case "topup":
      case "funding":
        // Tiered fees for topups
        feeType = "TIERED";
        if (amount >= 500) feeAmount = 10;
        else if (amount >= 300) feeAmount = 5;
        else if (amount >= 100) feeAmount = 3;
        else if (amount >= 50) feeAmount = 2;
        else if (amount >= 5) feeAmount = 1;
        else feeAmount = 0.5;
        feeValue = feeAmount;
        break;
      case "withdrawal":
        feeType = "PERCENTAGE";
        feePercentage = 2; // 2% for withdrawals
        feeAmount = (amount * feePercentage) / 100;
        feeValue = feePercentage;
        break;
      default:
        feeAmount = 0.5;
        feeValue = 0.5;
    }

    return {
      feeAmount: Math.round(feeAmount * 100) / 100,
      feeType,
      feeValue,
      feeFixed,
      feePercentage,
      exchangeRate: 620.5, // Default exchange rate
    };
  }

  /**
   * Convert between any two currencies for a company
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    companyId: string,
    countryIsoCode?: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // For now, assume USD as base currency
    if (fromCurrency === "USD") {
      return await this.getLocalAmount(amount, companyId, countryIsoCode);
    } else if (toCurrency === "USD") {
      return await this.getUSDAmount(amount, companyId, countryIsoCode);
    } else {
      // Convert to USD first, then to target currency
      const usdAmount = await this.getUSDAmount(
        amount,
        companyId,
        countryIsoCode
      );
      return await this.getLocalAmount(usdAmount, companyId, countryIsoCode);
    }
  }

  /**
   * Get exchange rate between two currencies for a company
   */
  static async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    companyId: string,
    countryIsoCode?: string
  ): Promise<number> {
    try {
      const result = await ExchangeRateModel.get({
        company_id: companyId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        is_active: true,
      });

      if (result.output && result.output.length > 0) {
        return result.output[0].rate;
      }

      // Fallback to country-specific
      if (countryIsoCode) {
        const countryResult = await ExchangeRateModel.get({
          country_iso_code: countryIsoCode,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          is_active: true,
        });

        if (countryResult.output && countryResult.output.length > 0) {
          return countryResult.output[0].rate;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get exchange rate ${fromCurrency} to ${toCurrency} for company ${companyId}:`,
        error
      );
    }

    // Fallback
    if (fromCurrency === "USD" && toCurrency === "XAF") {
      return this.getDefaultDollarRate(countryIsoCode || "CM");
    }

    return 1; // Default 1:1 rate
  }

  /**
   * Format currency amount with proper symbol
   */
  static formatCurrency(amount: number, currency: string): string {
    const symbols: { [key: string]: string } = {
      USD: "$",
      XAF: "FCFA",
      EUR: "€",
      GBP: "£",
      NGN: "₦",
      GHS: "₵",
      KES: "KSh",
      ZAR: "R",
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  }

  /**
   * Get supported currencies for a company
   */
  static async getSupportedCurrencies(companyId: string): Promise<string[]> {
    try {
      const result = await ExchangeRateModel.get({
        company_id: companyId,
        is_active: true,
      });

      if (result.output && result.output.length > 0) {
        const currencies = new Set<string>();
        result.output.forEach((rate) => {
          currencies.add(rate.from_currency);
          currencies.add(rate.to_currency);
        });
        return Array.from(currencies);
      }
    } catch (error) {
      console.warn(
        `Failed to get supported currencies for company ${companyId}:`,
        error
      );
    }

    // Default currencies
    return ["XAF", "USD", "EUR"];
  }

  /**
   * Validate currency code
   */
  static isValidCurrency(currency: string): boolean {
    const validCurrencies = [
      "XAF",
      "USD",
      "EUR",
      "GBP",
      "NGN",
      "GHS",
      "KES",
      "ZAR",
      "CDF",
    ];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Get currency decimal places
   */
  static getDecimalPlaces(currency: string): number {
    const decimalPlaces: { [key: string]: number } = {
      XAF: 0, // No decimals for Central African Franc
      USD: 2,
      EUR: 2,
      GBP: 2,
      NGN: 2,
      GHS: 2,
      KES: 2,
      ZAR: 2,
      CDF: 2,
    };

    return decimalPlaces[currency.toUpperCase()] || 2;
  }
}

export default CurrencyManager;
