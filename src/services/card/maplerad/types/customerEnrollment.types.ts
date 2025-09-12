// Customer enrollment types for Maplerad integration
export interface CustomerEnrollmentRequest {
  customerId: string;
  autoCreateIfMissing?: boolean;
}

export interface MapleradEnrollmentData {
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  identification_number: string;
  dob: string; // Format: DD-MM-YYYY

  phone: {
    phone_country_code: string; // e.g., "+237"
    phone_number: string; // e.g., "691234567"
  };

  identity: {
    type: string; // NIN, PASSPORT, VOTERS_CARD, DRIVERS_LICENCE
    image: string; // URL of document image
    number: string;
    country: string;
  };

  address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };

  photo?: string; // Selfie image URL
}

export interface CustomerEnrollmentResult {
  success: boolean;
  mapleradCustomerId?: string;
  verificationStatus: "pending" | "completed" | "failed";
  errors?: string[];
  existingCustomer?: boolean;
}

export interface DocumentValidationResult {
  valid: boolean;
  documentType: string;
  verifications: {
    imageQuality: boolean;
    readability: boolean;
    authenticity: boolean;
  };
  errors?: string[];
}

export interface AddressValidationResult {
  valid: boolean;
  standardizedAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  warnings?: string[];
  errors?: string[];
}

export interface PhoneValidationResult {
  valid: boolean;
  formattedNumber?: {
    countryCode: string;
    nationalNumber: string;
    internationalFormat: string;
  };
  errors?: string[];
}

export interface KYCValidationContext {
  customerId: string;
  requiredDocuments: string[];
  verificationLevel: "basic" | "enhanced" | "premium";
  countryRequirements?: any;
}

// Error classes for customer enrollment
export class CustomerEnrollmentError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "CustomerEnrollmentError";
  }
}

export class KYCIncompleteError extends CustomerEnrollmentError {
  constructor(missingDocuments: string[], customerId: string) {
    super(`KYC incomplete for customer ${customerId}`, "KYC_INCOMPLETE", {
      missingDocuments,
      customerId,
    });
  }
}

export class DocumentValidationError extends CustomerEnrollmentError {
  constructor(documentType: string, errors: string[]) {
    super(
      `Document validation failed: ${errors.join(", ")}`,
      "DOCUMENT_INVALID",
      { documentType, errors }
    );
  }
}

// Configuration types
export interface EnrollmentConfig {
  autoCreateMissingCustomers: boolean;
  documentVerificationEnabled: boolean;
  addressVerificationEnabled: boolean;
  phoneVerificationEnabled: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}

// Utility types for mapping
export interface CountryMapping {
  [key: string]: {
    mapleradCode: string;
    supportedIdTypes: string[];
    defaultState: string;
    defaultCity: string;
  };
}

export interface IdTypeMapping {
  [key: string]: string; // Local ID type -> Maplerad ID type
}
