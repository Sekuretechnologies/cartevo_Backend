export type FilterObject = {
  [key: string]: any;
};

export type OrderObject = {
  [key: string]: "asc" | "ASC" | "desc" | "DESC";
};

// export type IncludeObject = { [key: string]: true | string[] };

export type IncludeObject = {
  [key: string]: true | string[] | IncludeObject | { include: IncludeObject };
};

// ===== GLOBAL TRANSACTION ENUMS =====

/**
 * Global Transaction Categories
 * Used across the entire application for consistent categorization
 */
export enum TransactionCategory {
  CARD = "CARD",
  WALLET = "WALLET",
  // TRANSFER = "transfer",
  // PAYMENT = "payment",
  // FEE = "fee",
  // REFUND = "refund",
  // DEPOSIT = "deposit",
  // WITHDRAWAL = "withdrawal",
  // EXCHANGE = "exchange",
  // SUBSCRIPTION = "subscription",
  // DONATION = "donation",
  // PURCHASE = "purchase",
  // BILL_PAYMENT = "bill_payment",
  // AIR_TIME = "air_time",
  // INTERNET = "internet",
  // UTILITY = "utility",
  // LOAN = "loan",
  // INVESTMENT = "investment",
  // INSURANCE = "insurance",
  // TAX = "tax",
  // OTHER = "other",
}

/**
 * Global Transaction Types
 * Used across the entire application for consistent transaction type classification
 */
export enum TransactionType {
  // Card Transactions
  // PURCHASE = "PURCHASE",
  // FUNDING = "FUNDING",
  FUND = "FUND", // Alias for FUNDING
  WITHDRAW = "WITHDRAW",
  REFUND = "REFUND",
  TERMINATION_REFUND = "TERMINATION_REFUND",
  AUTHORIZATION = "AUTHORIZATION",
  FEE = "FEE",
  ISSUANCE = "ISSUANCE",
  // CARD_TOPUP = "CARD_TOPUP", // Maps to FUND
  PAYMENT_SUCCESS_FEE = "PAYMENT_SUCCESS_FEE",
  PAYMENT_FAILURE_FEE = "PAYMENT_FAILURE_FEE",
  // CARD_ISSUANCE_FIRST = "CARD_ISSUANCE_FIRST", // Maps to ISSUANCE
  // CARD_ISSUANCE_ADDITIONAL = "CARD_ISSUANCE_ADDITIONAL", // Maps to ISSUANCE

  // Wallet Transactions
  TRANSFER = "TRANSFER",

  // // Payment Transactions
  // PAYMENT_RECEIVED = "payment_received",
  // PAYMENT_SENT = "payment_sent",
  // PAYMENT_REFUND = "payment_refund",

  // // Fee Transactions
  // FEE_CHARGED = "fee_charged",
  // FEE_REFUNDED = "fee_refunded",

  // // Deposit
  // DEPOSIT = "DEPOSIT",

  // // Transfer Transactions
  // TRANSFER_IN = "transfer_in",
  // TRANSFER_OUT = "transfer_out",
  // TRANSFER_FEE = "transfer_fee",

  // // Bill Payments
  // BILL_PAYMENT = "bill_payment",
  // UTILITY_PAYMENT = "utility_payment",
  // INTERNET_PAYMENT = "internet_payment",
  // AIR_TIME_PURCHASE = "air_time_purchase",

  // // Loan Transactions
  // LOAN_DISBURSEMENT = "loan_disbursement",
  // LOAN_REPAYMENT = "loan_repayment",
  // LOAN_FEE = "loan_fee",

  // // Investment Transactions
  // INVESTMENT_PURCHASE = "investment_purchase",
  // INVESTMENT_REDEMPTION = "investment_redemption",
  // INVESTMENT_DIVIDEND = "investment_dividend",

  // // Subscription Transactions
  // SUBSCRIPTION_PAYMENT = "subscription_payment",
  // SUBSCRIPTION_REFUND = "subscription_refund",

  // // Other Transactions
  // DONATION = "donation",
  // CHARITY = "charity",
  // GIFT = "gift",
  // ADJUSTMENT = "adjustment",
  // CORRECTION = "correction",
  // REVERSAL = "reversal",
  // CHARGEBACK = "chargeback",
  // DISPUTE = "dispute",
  // OTHER = "other",
}

/**
 * Global Transaction Status
 * Used across the entire application for consistent status tracking
 */
export enum TransactionStatus {
  PENDING = "PENDING",
  // PROCESSING = "PROCESSING",
  // COMPLETED = "COMPLETED",
  COMPLETED = "SUCCESS",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REVERSED = "REVERSED",
  REFUNDED = "REFUNDED",
  CHARGED_BACK = "CHARGED_BACK",
  DISPUTED = "DISPUTED",
  EXPIRED = "EXPIRED",
  REJECTED = "REJECTED",
  ON_HOLD = "ON_HOLD",
}

/**
 * Global Transaction Direction
 * Used to indicate the flow of funds
 */
export enum TransactionDirection {
  INCOMING = "INCOMING",
  OUTGOING = "OUTGOING",
  INTERNAL = "INTERNAL",
}

/**
 * Global Currency Codes
 * Standard ISO currency codes used in the application
 */
export enum Currency {
  XAF = "XAF", // Central African Franc
  USD = "USD", // US Dollar
  EUR = "EUR", // Euro
  GBP = "GBP", // British Pound
  NGN = "NGN", // Nigerian Naira
  GHS = "GHS", // Ghanaian Cedi
  KES = "KES", // Kenyan Shilling
  ZAR = "ZAR", // South African Rand
  XOF = "XOF", // West African Franc
  CDF = "CDF", // Congolese Franc
}
