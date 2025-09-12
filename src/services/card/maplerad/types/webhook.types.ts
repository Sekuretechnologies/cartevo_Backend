// Comprehensive webhook types for Maplerad integration

export interface BaseWebhookPayload {
  event: string;
  reference: string;
  created_at: string;
  updated_at?: string;
}

export interface TransactionWebhookPayload extends BaseWebhookPayload {
  event: "issuing.transaction";
  card_id: string;
  amount: number;
  currency: string;
  type:
    | "AUTHORIZATION"
    | "SETTLEMENT"
    | "DECLINE"
    | "REVERSAL"
    | "REFUND"
    | "CROSS-BORDER"
    | "FUNDING"
    | "WITHDRAWAL";
  mode: "DEBIT" | "CREDIT";
  status: "SUCCESS" | "FAILED" | "PENDING";
  description?: string;
  fee?: number;

  // Merchant information
  merchant?: {
    name: string;
    city: string;
    country: string;
  };

  // Additional transaction metadata
  approval_code?: string;
  authorization_amount?: number;
  authorization_currency?: string;
  card_acceptor_mcc?: string;
  card_acceptor_mid?: string;
  settled?: boolean;
}

export interface CardCreatedWebhookPayload extends BaseWebhookPayload {
  event: "issuing.created.successful";
  card: {
    id: string;
    name: string;
    masked_pan: string;
    type: "VIRTUAL" | "PHYSICAL";
    issuer: "VISA" | "MASTERCARD";
    currency: "USD";
    status: "ACTIVE" | "DISABLED";
    balance: number;
    auto_approve: boolean;
  };
}

export interface CardCreationFailedWebhookPayload extends BaseWebhookPayload {
  event: "issuing.created.failed";
  reason: string;
  amount?: number;
  currency?: string;
}

export interface CardTerminatedWebhookPayload extends BaseWebhookPayload {
  event: "issuing.terminated";
  card_id: string;
  amount?: number;
  currency?: string;
  reason?: string;
}

export interface CardChargeWebhookPayload extends BaseWebhookPayload {
  event: "issuing.charge";
  card_id: string;
  amount: number;
  currency: string;
  transaction_date: string;
  reason?: string;
}

export interface FundingWebhookPayload extends BaseWebhookPayload {
  event: "issuing.transaction";
  type: "FUNDING";
  card_id: string;
  amount: number;
  currency: string;
  status: "SUCCESS" | "FAILED";
  mode: "CREDIT";
}

export interface WithdrawalWebhookPayload extends BaseWebhookPayload {
  event: "issuing.transaction";
  type: "WITHDRAWAL";
  card_id: string;
  amount: number;
  currency: string;
  status: "SUCCESS" | "FAILED";
  mode: "DEBIT";
  is_termination?: boolean;
}

// Union type for all webhook payloads
export type MapleradWebhookPayload =
  | TransactionWebhookPayload
  | CardCreatedWebhookPayload
  | CardCreationFailedWebhookPayload
  | CardTerminatedWebhookPayload
  | CardChargeWebhookPayload
  | FundingWebhookPayload
  | WithdrawalWebhookPayload;

// Webhook processing results
export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  processed: boolean;
  transactionType?: string;
  cardId?: string;
  errors?: string[];
  metadata?: {
    processingTimeMs: number;
    correlatedTransaction?: string;
    balanceUpdated?: boolean;
    feesApplied?: boolean;
    notificationSent?: boolean;
  };
}

export interface TransactionCorrelationData {
  localTransactionId?: string;
  cardId: string;
  amount: number;
  currency: string;
  merchantName?: string;
  status: string;
  correlatedAt: Date;
}

export interface FailureFeeContext {
  cardId: string;
  originalTransactionAmount: number;
  declineReference: string;
  balanceBeforeDecline: number;
  balanceAfterDecline: number;
  mapleradChargeDetected: boolean;
  feeApplied: boolean;
  feeAmount?: number;
}

// Webhook signature verification types
export interface WebhookSignatureContext {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  webhookSecret: string;
}

export interface SignatureVerificationResult {
  valid: boolean;
  algorithm: string;
  errors?: string[];
}

// Transaction mapping types
export interface TransactionMapping {
  mapleradType: string;
  localType: string;
  mapleradStatus: string;
  localStatus: string;
  requiresFeeProcessing: boolean;
  requiresNotification: boolean;
}

// Webhook event configuration
export interface WebhookEventConfig {
  eventType: string;
  critical: boolean;
  requiresImmediateProcessing: boolean;
  allowAsyncProcessing: boolean;
  timeoutMs: number;
  retryAttempts: number;
}

export const WEBHOOK_EVENT_CONFIGS: { [key: string]: WebhookEventConfig } = {
  "issuing.transaction": {
    eventType: "transaction",
    critical: true,
    requiresImmediateProcessing: true,
    allowAsyncProcessing: true,
    timeoutMs: 5000,
    retryAttempts: 3,
  },
  "issuing.created.successful": {
    eventType: "card_creation",
    critical: true,
    requiresImmediateProcessing: true,
    allowAsyncProcessing: false,
    timeoutMs: 10000,
    retryAttempts: 2,
  },
  "issuing.created.failed": {
    eventType: "card_creation_failure",
    critical: true,
    requiresImmediateProcessing: true,
    allowAsyncProcessing: false,
    timeoutMs: 10000,
    retryAttempts: 2,
  },
  "issuing.terminated": {
    eventType: "card_termination",
    critical: true,
    requiresImmediateProcessing: true,
    allowAsyncProcessing: true,
    timeoutMs: 15000,
    retryAttempts: 2,
  },
  "issuing.charge": {
    eventType: "failure_fee",
    critical: false,
    requiresImmediateProcessing: false,
    allowAsyncProcessing: true,
    timeoutMs: 5000,
    retryAttempts: 1,
  },
};

// Error types for webhook processing
export class WebhookProcessingError extends Error {
  constructor(
    message: string,
    public eventType: string,
    public cardId?: string,
    public reference?: string
  ) {
    super(message);
    this.name = "WebhookProcessingError";
  }
}

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export class TransactionCorrelationError extends Error {
  constructor(
    message: string,
    public reference: string,
    public cardId: string
  ) {
    super(message);
    this.name = "TransactionCorrelationError";
  }
}
