// Core types for card issuance process
export interface CardIssuanceRequest {
  customerId: string;
  cardBrand: string;
  initialBalance: number;
  clientReference?: string;
  name?: string;
  color?: string;
}

export interface CardIssuanceContext {
  customer: any;
  company: any;
  companyWallet: any;
  completeDto: any;
  feeCalculation: FeeCalculation;
  clientReference: string;
}

export interface FeeCalculation {
  issuanceFee: number;
  totalFee: number;
  breakdown: {
    issuanceFee: number;
    initialBalance: number;
  };
}

export interface WalletReservation {
  walletId: string;
  originalBalance: number;
  reservedAmount: number;
  reference: string;
}

export interface CardCreationResult {
  card: any;
  transaction: any;
  balanceRecords: any[];
}

export interface NotificationContext {
  customerId: string;
  companyId: string;
  cardId?: string;
  amount: number;
  currency: string;
  reference: string;
}

export interface EmailContext {
  company: any;
  customer: any;
  card?: any;
  amount: number;
  currency: string;
  reference: string;
}

// Error types
export class CardIssuanceError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "CardIssuanceError";
  }
}

export class InsufficientFundsError extends CardIssuanceError {
  constructor(walletId: string, required: number, available: number) {
    super(`Insufficient funds in wallet ${walletId}`, "INSUFFICIENT_FUNDS", {
      walletId,
      required,
      available,
    });
  }
}

export class WebhookTimeoutError extends CardIssuanceError {
  constructor(reference: string, timeoutMs: number) {
    super(`Webhook timeout for reference ${reference}`, "WEBHOOK_TIMEOUT", {
      reference,
      timeoutMs,
    });
  }
}

// Status types
export type IssuanceStatus =
  | "INITIATED"
  | "FUNDS_RESERVED"
  | "MAPLERAD_REQUESTED"
  | "WEBHOOK_RECEIVED"
  | "CARD_CREATED"
  | "TRANSACTIONS_RECORDED"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED";

// Configuration types
export interface CardIssuanceConfig {
  webhookTimeout: number;
  maxRetries: number;
  feeCalculationEnabled: boolean;
  notificationEnabled: boolean;
  emailEnabled: boolean;
}
