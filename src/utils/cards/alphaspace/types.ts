// ===== ALPHASPACE TYPES AND INTERFACES =====

// ===== INTERFACES ALPHASPACE =====

export interface AlphaSpaceCustomer {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  identity?: {
    type: string;
    number: string;
    image?: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code?: string;
  };
  date_of_birth?: string;
}

export interface AlphaSpaceCreateCardData {
  customer_id: string;
  brand: "VISA" | "MASTERCARD";
  type: "VIRTUAL" | "PHYSICAL";
  amount?: number;
  currency?: string;
  name_on_card?: string;
  auto_approve?: boolean;
}

export interface AlphaSpaceFundCardData {
  amount: number;
  currency?: string;
  description?: string;
}

export interface AlphaSpaceWithdrawCardData {
  amount: number;
  currency?: string;
  description?: string;
}

export interface AlphaSpaceCard {
  id: string;
  card_id: string;
  customer_id: string;
  status: "active" | "inactive" | "frozen" | "terminated";
  balance: number;
  currency: string;
  brand: "VISA" | "MASTERCARD";
  type: "VIRTUAL" | "PHYSICAL";
  masked_pan?: string;
  last4?: string;
  expiry_month?: number;
  expiry_year?: number;
  name_on_card?: string;
  created_at: string;
  updated_at: string;
}

export interface AlphaSpaceTransaction {
  id: string;
  card_id: string;
  amount: number;
  currency: string;
  type: "debit" | "credit" | "fee";
  status: "pending" | "completed" | "failed";
  description?: string;
  merchant_name?: string;
  merchant_category?: string;
  created_at: string;
  reference: string;
}

// ===== ALPHASPACE-SPECIFIC ENUMS =====

export enum AlphaSpaceCardStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  FROZEN = "frozen",
  TERMINATED = "terminated",
}

export enum AlphaSpaceCardBrand {
  VISA = "VISA",
  MASTERCARD = "MASTERCARD",
}

export enum AlphaSpaceCardType {
  VIRTUAL = "VIRTUAL",
  PHYSICAL = "PHYSICAL",
}

export enum AlphaSpaceTransactionType {
  DEBIT = "debit",
  CREDIT = "credit",
  FEE = "fee",
}

export enum AlphaSpaceTransactionStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ===== REQUEST/RESPONSE INTERFACES =====

export interface IAlphaSpaceConfig {
  method: string;
  url: string;
  data?: any;
  accessToken?: string;
}

// ===== FILTER INTERFACES =====

export interface AlphaSpaceTransactionFilters {
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  type?: "debit" | "credit" | "fee";
  status?: "pending" | "completed" | "failed";
}

// ===== RESPONSE INTERFACES =====

export interface AlphaSpaceCardTransactionsResponse {
  status: boolean;
  data: AlphaSpaceTransaction[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface AlphaSpaceBalanceResponse {
  card_id: string;
  balance: number;
  currency: string;
  available_balance: number;
  last_updated: string;
}
