// AlphaSpace Configuration Interface
// Based on MONIX AlphaSpace integration configuration

export interface AlphaSpaceConfig {
  // OAuth2 Authentication
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;

  // Environment Settings
  environment: "test" | "live";
  liveUrl: string;
  testUrl: string;

  // Timing and Retries
  timeout: number;
  maxRetries: number;

  // Webhook Security (optional)
  webhookSecret?: string;
}

// AlphaSpace API Response Types (adapted from MONIX)

export interface AlphaSpaceOAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AlphaSpaceCreateCardholderData {
  name: string;
  first_name: string;
  last_name: string;
  gender: number; // 0 = male, 1 = female
  date_of_birth: string; // YYYY-MM-DD
  email_address: string;
  purpose: string; // "visacard-1" or "mastercard-1"
}

export interface AlphaSpaceCreateCardholderResponse {
  data: {
    id: string;
    name: string;
    status: "submitted" | "approved" | "rejected";
    email_address: string;
    purpose: string;
    created_at: string;
  };
}

export interface AlphaSpaceCreateCardData {
  cardholder_id: string;
  purpose: string;
}

export interface AlphaSpaceCreateCardResponse {
  code: number;
  message: string;
  data: {
    fees: number;
    fees_meta: {
      total: string;
      fees: {
        issuance: string;
        flat: string;
      };
    };
    card: {
      id: string;
      card_token: string;
      card_number: string;
      balance: string;
      brand: string;
      state: string;
      purpose: string;
    };
  };
}

export interface AlphaSpaceFundCardData {
  amount: number;
}

export interface AlphaSpaceFundCardResponse {
  code: number;
  message: string;
  data: {
    transaction_id: string;
    amount: string;
    balance: string;
    currency: string;
  };
}

export interface AlphaSpaceWithdrawCardData {
  amount: number;
}

export interface AlphaSpaceWithdrawCardResponse {
  code: number;
  message: string;
  data: {
    transaction_id: string;
    amount: string;
    balance: string;
    currency: string;
  };
}

export interface AlphaSpaceCardDetails {
  id: string;
  balance: string;
  state: string;
  masked_number: string;
  card_exp_month: string;
  card_exp_year: string;
  card_cvv: string;
}

export interface AlphaSpaceGetCardDetailsResponse {
  code: number;
  data: {
    card: AlphaSpaceCardDetails;
    details: {
      card_exp_month: string;
      card_exp_year: string;
      card_cvv: string;
    };
  };
}

// WAVLET-specific types for AlphaSpace adaptation
export interface WAVLETCreateCardData {
  customer_id: string;
  company_id: string; // WAVLET addition for multi-tenant support
  brand?: "VISA" | "MASTERCARD";
  name_on_card?: string;
  amount?: number;
}

export interface WAVLETCardResult {
  success: boolean;
  card?: {
    id: string;
    status: string;
    masked_pan?: string;
    balance: number;
    brand?: string;
    currency: string;
    provider: string;
  };
  metadata?: {
    provider: string;
    cardholder_id?: string;
    fees?: any;
  };
  error?: string;
}

// Error handling types
export class AlphaSpaceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = "AlphaSpaceError";
  }
}
