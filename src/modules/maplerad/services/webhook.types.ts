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

export interface MapleradWebhookPayload {
  event: string;
  reference?: string;
  amount?: number | string;
  currency?: string;
  card_id?: string;
  created_at?: string;
  updated_at?: string;

  // Transaction fields
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
  type?: string;

  // Card creation fields
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

  // Termination fields
  reason?: string;

  // Charge fields
  transaction_date?: string;
}

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
