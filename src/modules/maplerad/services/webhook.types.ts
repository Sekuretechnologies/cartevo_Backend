/**
 * MONIX-Style Webhook Types
 * Centralized type definitions for webhook processing
 */

export interface WebhookEvent {
  type: string;
  createdAt: number;
  data: {
    object: any;
  };
}

// export interface MapleradWebhookPayload {
//   event: string;
//   reference?: string;
//   amount?: number | string;
//   currency?: string;
//   card_id?: string;
//   created_at?: string;
//   updated_at?: string;

//   // Transaction fields
//   approval_code?: string;
//   authorization_amount?: number;
//   authorization_currency?: string;
//   card_acceptor_mcc?: string;
//   card_acceptor_mid?: string;
//   card_acceptor_state?: string;
//   description?: string;
//   fee?: number;
//   merchant?: {
//     city: string;
//     country: string;
//     name: string;
//   };
//   is_termination?: boolean;
//   mode?: "CREDIT" | "DEBIT";
//   settled?: boolean;
//   status?: string;
//   type?: string;

//   // Card creation fields
//   card?: {
//     id: string;
//     name: string;
//     masked_pan: string;
//     type: "VIRTUAL";
//     issuer: "VISA";
//     currency: "USD";
//     status: "ACTIVE" | "DISABLED";
//     balance: number;
//     auto_approve: boolean;
//   };

//   // Termination fields
//   reason?: string;

//   // Charge fields
//   transaction_date?: string;
// }

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  transactionType?: string;
  cardId?: string;
  processed: boolean;
  feesApplied?: boolean;
}

export interface WebhookSecurityConfig {
  signatureVerificationEnabled: boolean;
  allowedOrigins: string[];
  rateLimitEnabled: boolean;
  maxRequestsPerMinute: number;
}

export interface WebhookEventHandler {
  canHandle(eventType: string): boolean;
  process(payload: MapleradWebhookPayload): Promise<WebhookProcessingResult>;
}

//-----------------------------------------------------------
//-----------------------------------------------------------

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
// export type MapleradWebhookPayload =
//   | TransactionWebhookPayload
//   | CardCreatedWebhookPayload
//   | CardCreationFailedWebhookPayload
//   | CardTerminatedWebhookPayload
//   | CardChargeWebhookPayload
//   | FundingWebhookPayload
//   | WithdrawalWebhookPayload;

// Webhook processing results
// export interface WebhookProcessingResult {
//   success: boolean;
//   message: string;
//   processed: boolean;
//   transactionType?: string;
//   cardId?: string;
//   errors?: string[];
//   metadata?: {
//     processingTimeMs: number;
//     correlatedTransaction?: string;
//     balanceUpdated?: boolean;
//     feesApplied?: boolean;
//     notificationSent?: boolean;
//   };
// }

export interface MapleradWebhookPayload {
  event: string; // Type d'événement Maplerad
  reference?: string; // Référence de tracking
  amount?: number | string;
  currency?: string;
  card_id?: string;
  created_at?: string;
  updated_at?: string;

  // Pour issuing.transaction
  approval_code?: string;
  authorization_amount?: number;
  authorization_currency?: string;
  card_acceptor_mcc?: string;
  card_acceptor_mid?: string;
  card_acceptor_state?: string;
  description?: string;
  fee?: number;
  merchant?: {
    city: string;
    country: string;
    name: string;
  };
  is_termination?: boolean;
  mode?: "CREDIT" | "DEBIT";
  settled?: boolean;
  status?: string;
  type?:
    | "AUTHORIZATION"
    | "SETTLEMENT"
    | "FUNDING"
    | "WITHDRAWAL"
    | "TERMINATION"
    | "DECLINE"
    | "REVERSAL"
    | "REFUND"
    | "CROSS-BORDER";

  // Pour issuing.created.successful
  card?: {
    id: string;
    name: string;
    masked_pan: string;
    type: "VIRTUAL";
    issuer: "VISA";
    currency: "USD";
    status: "ACTIVE" | "DISABLED";
    balance: number;
    auto_approve: boolean;
  };

  // Pour issuing.terminated
  reason?: string;

  // Pour issuing.charge
  transaction_date?: string;
}
