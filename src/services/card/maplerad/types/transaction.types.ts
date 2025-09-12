import {
  CardTransactionStatus,
  CardTransactionType,
} from "@/utils/cards/maplerad/types";

/**
 * Normalized Transaction Status Values
 * These should be used consistently across all Maplerad services
 */
export const TRANSACTION_STATUS = {
  PENDING: CardTransactionStatus.PENDING,
  SUCCESS: CardTransactionStatus.SUCCESS,
  FAILED: CardTransactionStatus.FAILED,
  CANCELLED: CardTransactionStatus.CANCELLED,
} as const;

/**
 * Normalized Transaction Type Values
 * These should be used consistently across all Maplerad services
 */
export const TRANSACTION_TYPE = {
  // Card Operations
  CARD_ISSUANCE_FIRST: CardTransactionType.CARD_ISSUANCE_FIRST,
  CARD_ISSUANCE_ADDITIONAL: CardTransactionType.CARD_ISSUANCE_ADDITIONAL,
  FUNDING: CardTransactionType.FUNDING,
  WITHDRAWAL: CardTransactionType.WITHDRAWAL,
  TOPUP: CardTransactionType.TOPUP,
  TERMINATION: CardTransactionType.TERMINATION,

  // Payment Operations
  AUTHORIZATION: CardTransactionType.AUTHORIZATION,
  SETTLEMENT: CardTransactionType.SETTLEMENT,
  DECLINE: CardTransactionType.DECLINE,
  REVERSAL: CardTransactionType.REVERSAL,
  REFUND: CardTransactionType.REFUND,
  CROSS_BORDER: CardTransactionType.CROSS_BORDER,
  PAYMENT_SUCCESS_FEE: CardTransactionType.PAYMENT_SUCCESS_FEE,
  PAYMENT_FAILURE_FEE: CardTransactionType.PAYMENT_FAILURE_FEE,

  // Legacy mappings for backward compatibility
  PURCHASE: CardTransactionType.CARD_ISSUANCE_FIRST, // Map old "purchase" to card issuance
  WITHDRAW: CardTransactionType.WITHDRAWAL, // Map old "withdraw" to withdrawal
} as const;

/**
 * Normalized Transaction Category Values
 * These should be used consistently across all Maplerad services
 */
export const TRANSACTION_CATEGORY = {
  CARD: "card",
  WALLET: "wallet",
  PAYMENT: "payment",
  TRANSFER: "transfer",
  FEE: "fee",
  REFUND: "refund",
} as const;

/**
 * Transaction Status Type
 */
export type TransactionStatus =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

/**
 * Transaction Type Type
 */
export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

/**
 * Transaction Category Type
 */
export type TransactionCategory =
  (typeof TRANSACTION_CATEGORY)[keyof typeof TRANSACTION_CATEGORY];

/**
 * Helper function to get normalized transaction status
 */
export function getNormalizedTransactionStatus(
  status: string
): TransactionStatus {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return TRANSACTION_STATUS.PENDING;
    case "SUCCESS":
    case "COMPLETED":
    case "APPROVED":
      return TRANSACTION_STATUS.SUCCESS;
    case "FAILED":
    case "ERROR":
    case "REJECTED":
      return TRANSACTION_STATUS.FAILED;
    case "CANCELLED":
    case "CANCELED":
      return TRANSACTION_STATUS.CANCELLED;
    default:
      console.warn(
        `Unknown transaction status: ${status}, defaulting to PENDING`
      );
      return TRANSACTION_STATUS.PENDING;
  }
}

/**
 * Helper function to get normalized transaction type
 */
export function getNormalizedTransactionType(type: string): TransactionType {
  switch (type?.toUpperCase()) {
    case "CARD_ISSUANCE_FIRST":
    case "CARD_ISSUANCE":
    case "CARD_CREATION":
    case "PURCHASE": // Legacy mapping
      return TRANSACTION_TYPE.CARD_ISSUANCE_FIRST;
    case "CARD_ISSUANCE_ADDITIONAL":
      return TRANSACTION_TYPE.CARD_ISSUANCE_ADDITIONAL;
    case "FUNDING":
    case "TOPUP":
    case "DEPOSIT":
      return TRANSACTION_TYPE.TOPUP;
    case "WITHDRAWAL":
    case "WITHDRAW":
    case "CASH_OUT":
      return TRANSACTION_TYPE.WITHDRAWAL;
    case "TERMINATION":
    case "CANCEL":
      return TRANSACTION_TYPE.TERMINATION;
    case "AUTHORIZATION":
      return TRANSACTION_TYPE.AUTHORIZATION;
    case "SETTLEMENT":
      return TRANSACTION_TYPE.SETTLEMENT;
    case "DECLINE":
      return TRANSACTION_TYPE.DECLINE;
    case "REVERSAL":
      return TRANSACTION_TYPE.REVERSAL;
    case "REFUND":
      return TRANSACTION_TYPE.REFUND;
    case "CROSS_BORDER":
      return TRANSACTION_TYPE.CROSS_BORDER;
    case "PAYMENT_SUCCESS_FEE":
      return TRANSACTION_TYPE.PAYMENT_SUCCESS_FEE;
    default:
      console.warn(`Unknown transaction type: ${type}, defaulting to FUNDING`);
      return TRANSACTION_TYPE.FUNDING;
  }
}

/**
 * Helper function to get normalized transaction category
 */
export function getNormalizedTransactionCategory(
  category: string
): TransactionCategory {
  switch (category?.toLowerCase()) {
    case "card":
      return TRANSACTION_CATEGORY.CARD;
    case "wallet":
      return TRANSACTION_CATEGORY.WALLET;
    case "payment":
      return TRANSACTION_CATEGORY.PAYMENT;
    case "transfer":
      return TRANSACTION_CATEGORY.TRANSFER;
    case "fee":
      return TRANSACTION_CATEGORY.FEE;
    case "refund":
      return TRANSACTION_CATEGORY.REFUND;
    default:
      console.warn(
        `Unknown transaction category: ${category}, defaulting to CARD`
      );
      return TRANSACTION_CATEGORY.CARD;
  }
}

/**
 * Transaction creation helper with normalized values
 */
export interface NormalizedTransactionData {
  id: string;
  status: TransactionStatus;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  fee_amount?: number;
  net_amount?: number;
  currency: string;
  reference: string;
  description?: string;
  customer_id?: string;
  company_id?: string;
  card_id?: string;
  wallet_id?: string;
  provider?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create normalized transaction data
 */
export function createNormalizedTransaction(data: {
  id: string;
  status?: string;
  type?: string;
  category?: string;
  amount: number;
  fee_amount?: number;
  net_amount?: number;
  currency: string;
  reference: string;
  description?: string;
  customer_id?: string;
  company_id?: string;
  card_id?: string;
  wallet_id?: string;
  provider?: string;
}): NormalizedTransactionData {
  return {
    id: data.id,
    status: data.status
      ? getNormalizedTransactionStatus(data.status)
      : TRANSACTION_STATUS.PENDING,
    type: data.type
      ? getNormalizedTransactionType(data.type)
      : TRANSACTION_TYPE.FUNDING,
    category: data.category
      ? getNormalizedTransactionCategory(data.category)
      : TRANSACTION_CATEGORY.CARD,
    amount: data.amount,
    fee_amount: data.fee_amount,
    net_amount: data.net_amount,
    currency: data.currency,
    reference: data.reference,
    description: data.description,
    customer_id: data.customer_id,
    company_id: data.company_id,
    card_id: data.card_id,
    wallet_id: data.wallet_id,
    provider: data.provider,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
