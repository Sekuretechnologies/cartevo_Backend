// ===== MAPLERAD TYPES AND INTERFACES =====

// ===== INTERFACES MAPLERAD =====
export interface MapleradEnrollCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  country: string; // Code pays (NG, CM, US, etc.)
  identification_number: string; // BVN pour Nigeria, etc.
  dob: string; // Format: 20-10-1988

  phone: {
    phone_country_code: string; // Ex: +234
    phone_number: string; // Ex: 8123456789
  };

  identity: {
    type: string; // Ex: NIN, CNI, etc.
    image: string; // URL du document uploadé
    number: string; // Numéro du document
    country: string; // Code pays du document
  };

  address: {
    street: string;
    street2?: string; // Optionnel
    city: string;
    state: string;
    country: string; // Code pays
    postal_code: string;
  };

  photo?: string; // URL selfie (optionnel)
}

export interface MapleradCreateCardData {
  customer_id: string; // ID du customer (requis)
  currency: string; // Devise (requis) - USD pour cartes virtuelles
  type: string; // Type de carte (requis) - VIRTUAL
  auto_approve: boolean; // Auto-approve (requis) - doit être true
  brand?: string; // Brand optionnel - VISA ou MASTERCARD (défaut: VISA)
  amount?: number; // Montant de pré-financement en centimes (défaut: 200 = $2.00)
}

export interface MapleradCard {
  cardId: string;
  status: "active" | "inactive" | "blocked" | "terminated" | "suspended";
  balance: number;
  currency: string;
  lastUpdated: string;
  customerId: string;
  brand: string;
  type: string;
  issuerCountry: string;
  // Champs spécifiques Maplerad (selon la doc à venir)
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
}

export interface MapleradTransaction {
  transactionId: string;
  cardId: string;
  amount: number;
  type: "debit" | "credit";
  status: "pending" | "completed" | "failed" | "cancelled";
  description: string;
  merchantName?: string;
  merchantCity?: string;
  merchantCountry?: string;
  merchantCategory?: string;
  location?: string;
  createdAt: string;
  completedAt?: string;
  reference: string;
  mapleradType?: string;
  mode?: "DEBIT" | "CREDIT";
}

// ===== MAPLERAD-SPECIFIC ENUMS =====
// Note: General enums (TransactionStatus, etc.) are now imported from global types

export enum CardStatus {
  ACTIVE = "ACTIVE",
  FROZEN = "FROZEN",
  TERMINATED = "TERMINATED",
}

export enum CardTransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum CardBrand {
  VISA = "VISA",
  MASTERCARD = "MASTERCARD",
}

export enum CardPaymentMethodType {
  // Mobile Money Operators
  ORANGE_MONEY = "orange_money",
  MTN_MOMO = "mtn_momo",
  YUP = "yup",
  EUMM = "eumm",
  WAVE = "wave",

  // Card Operators
  VISA = "visa",
  MASTERCARD = "mastercard",

  // Other payment methods
  BANK_TRANSFER = "bank_transfer",
  CARD_WITHDRAWAL = "card_withdrawal", // ✅ Ajout pour les retraits de carte
  WALLET = "wallet",
  CASH = "cash",
}

export enum CardClass {
  COMMERCIAL_CREDIT = "CommercialCredit",
  COMMERCIAL_DEBIT = "CommercialDebit",
  PERSONAL_CREDIT = "PersonalCredit",
  PERSONAL_DEBIT = "PersonalDebit",
}

export enum CardTransactionType {
  AUTHORIZATION = "AUTHORIZATION",
  SETTLEMENT = "SETTLEMENT",
  FUNDING = "FUNDING",
  WITHDRAWAL = "WITHDRAWAL",
  TERMINATION = "TERMINATION",
  DECLINE = "DECLINE",
  REVERSAL = "REVERSAL",
  REFUND = "REFUND",
  CROSS_BORDER = "CROSS-BORDER",
  // Additional transaction types for card operations
  CARD_ISSUANCE_FIRST = "CARD_ISSUANCE_FIRST",
  CARD_ISSUANCE_ADDITIONAL = "CARD_ISSUANCE_ADDITIONAL",
  TOPUP = "TOPUP",
  WITHDRAW = "WITHDRAW",
  PAYMENT_SUCCESS_FEE = "PAYMENT_SUCCESS_FEE",
  PAYMENT_FAILURE_FEE = "PAYMENT_FAILURE_FEE",
  PAYMENT = "PAYMENT",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  FEE = "FEE",
  OTHER = "OTHER",
}

// ===== UTILITY INTERFACES =====

export interface ICard {
  id: string;
  customer_id: string;
  provider_card_id: string;
  provider: string;
  status: string;
  balance: number;
  balance_usd?: number;
  type?: string;
  user_id?: string; // For backward compatibility
}

export interface CardMetadataUpdate {
  cardId: string;
  previousBalance: number;
  newBalance: number;
  previousStatus: CardStatus;
  newStatus: CardStatus;
  updated: boolean;
  updateSource:
    | "sudo_card_details"
    | "sudo_account_balance"
    | "maplerad_card_details";
}

export interface SyncResult {
  cardId: string;
  providerCardId: string;
  status: string;
  message: string;
  updated: boolean;
  oldData: {
    status: string;
    balance: number;
  };
  newData: {
    status: string;
    balance: number;
  };
}

export interface SynchronizationResults {
  totalCards: number;
  synchronizedCards: number;
  failedCards: number;
  results: Array<SyncResult>;
}

export interface BulkSyncResult {
  totalCards: number;
  updatedCards: number;
  skippedCards: number;
  failedCards: number;
  updates: SyncResult[];
  errors: Array<{ cardId: string; error: string }>;
}

export interface CardCreationMetadata {
  color?: string;
  reference: string;
  userId: string;
  customerId: string;
  cardBrand: string;
  initialBalance: number;
  clientReference: string;
  isFirstCard: boolean;
  feeCalculation: any;
  validatedDto?: any;
  createdAt: Date;
  [key: string]: any; // Index signature for Prisma JSON type
}

// ===== REQUEST/RESPONSE INTERFACES =====

export interface IMapleradConfig {
  method: string;
  url: string;
  data?: any;
}

// ===== FILTER INTERFACES =====

export interface CardTransactionFilters {
  from?: string; // ISO date
  to?: string; // ISO date
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
  mode?: "CREDIT" | "DEBIT";
  limit?: number;
  offset?: number;
}

export interface CardDeclineChargesFilters {
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// ===== RESPONSE INTERFACES =====

export interface CardDeclineChargesResponse {
  status: boolean | string;
  message: string;
  data: any[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
  totalAmount: number;
}
