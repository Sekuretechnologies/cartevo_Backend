import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsNumber,
  IsEnum,
} from "class-validator";

// Register company and user
export class CompanyUserDto {
  @ApiProperty({
    description: "Business name",
    example: "Acme Corporation",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  business_name: string;

  @ApiProperty({
    description: "User first name",
    example: "John",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  first_name: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  last_name: string;

  @ApiProperty({
    description: "Email address",
    example: "john.doe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  business_email: string;

  @ApiProperty({
    description: "Phone number",
    example: "123456789",
    minLength: 7,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @Matches(/^[\d+\-\s]+$/, { message: "Invalid phone number format" })
  phone_number: string;

  @ApiProperty({
    description: "Business type",
    example: "Fintech",
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  business_type: string;

  @ApiProperty({
    description: "Business country",
    example: "Cameroon",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  business_country: string;

  @ApiProperty({
    description: "Business country phone code",
    example: "237",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  business_country_phone_code: string;

  @ApiProperty({
    description: "Business Country ISO 2 code",
    example: "CM",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  business_country_iso_code: string;

  @ApiProperty({
    description: "country currency",
    example: "XAF",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  business_country_currency: string;

  @ApiProperty({
    description: "Password - Must contain at least 8 characters",
    example: "SecurePass123!",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: "Confirm password",
    example: "SecurePass123!",
  })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}

// Step 1: Personal Information DTO
export class PersonalInfoDto {
  @ApiProperty({
    description: "Company name",
    example: "Acme Corporation",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  company_name: string;

  @ApiProperty({
    description: "User first name",
    example: "John",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  first_name: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  last_name: string;

  @ApiProperty({
    description: "User role in company",
    example: "CEO",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  role: string;

  @ApiProperty({
    description: "Phone number",
    example: "+237123456789",
    minLength: 7,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @Matches(/^[\d+\-\s]+$/, { message: "Invalid phone number format" })
  phone_number: string;

  @ApiProperty({
    description: "Gender",
    example: "Male",
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  gender: string;

  @ApiProperty({
    description: "Nationality",
    example: "Cameroonian",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nationality: string;

  @ApiProperty({
    description: "ID document type",
    example: "NIN",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  id_document_type: string;

  @ApiProperty({
    description: "ID number",
    example: "123456789",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  id_number: string;

  @ApiProperty({
    description: "ID document front image file",
    type: "string",
    format: "binary",
  })
  id_document_front: any;

  @ApiProperty({
    description: "ID document back image file",
    type: "string",
    format: "binary",
  })
  id_document_back: any;

  @ApiProperty({
    description: "Country of residence",
    example: "Cameroon",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  country_of_residence: string;

  @ApiProperty({
    description: "State/Region",
    example: "Centre",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  state: string;

  @ApiProperty({
    description: "City",
    example: "Yaoundé",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  city: string;

  @ApiProperty({
    description: "Street address",
    example: "123 Main Street",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  street: string;

  @ApiProperty({
    description: "Postal code",
    example: "12345",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  postal_code: string;

  @ApiProperty({
    description: "Proof of address document file",
    type: "string",
    format: "binary",
  })
  proof_of_address: any;

  @ApiProperty({
    description: "Email address",
    example: "john.doe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Password - Must contain at least 8 characters",
    example: "SecurePass123!",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: "Confirm password",
    example: "SecurePass123!",
  })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;
}

// Step 2: Business Information DTO
export class BusinessInfoDto {
  @ApiProperty({
    description: "Company ID from step 1",
    example: "company-uuid",
  })
  @IsString()
  @IsNotEmpty()
  company_id: string;

  @ApiProperty({
    description: "Business name",
    example: "Acme Corporation Ltd",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  business_name: string;

  @ApiProperty({
    description: "Business phone number",
    example: "+237123456789",
    minLength: 7,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @Matches(/^[\d+\-\s]+$/, { message: "Invalid phone number format" })
  business_phone_number: string;

  @ApiProperty({
    description: "Business address",
    example: "123 Business Street, Yaoundé",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  business_address: string;

  @ApiProperty({
    description: "Business type",
    example: "Technology",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  business_type: string;

  @ApiProperty({
    description: "Country of operation",
    example: "Cameroon",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  country_of_operation: string;

  @ApiProperty({
    description: "Tax ID number",
    example: "TAX123456789",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  tax_id_number: string;

  @ApiProperty({
    description: "Business website URL",
    example: "https://acme.com",
    required: false,
  })
  @IsOptional()
  // @IsUrl({}, { message: "Enter a valid URL for the website" })
  business_website?: string;

  @ApiProperty({
    description: "Business description",
    example: "Technology company providing software solutions",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  business_description: string;

  @ApiProperty({
    description: "Source of funds",
    example: "Investment",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  source_of_funds: string;

  @ApiProperty({
    description: "Share holding document file",
    type: "string",
    format: "binary",
  })
  share_holding_document: any;

  @ApiProperty({
    description: "Incorporation certificate file",
    type: "string",
    format: "binary",
  })
  incorporation_certificate: any;

  @ApiProperty({
    description: "Business proof of address file",
    type: "string",
    format: "binary",
  })
  proof_of_address: any;

  // @ApiProperty({
  //   description: "MEMART document file",
  //   type: "string",
  //   format: "binary",
  // })
  // memart: any;
}

// Legacy DTO for backward compatibility
export class CreateCompanyUserDto {
  // User fields
  @ApiProperty({
    description: "User full name",
    example: "John Doe",
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  full_name_user: string;

  @ApiProperty({
    description: "User email address",
    example: "john.doe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email_user: string;

  @ApiProperty({
    description:
      "User password - Must contain at least 8 characters, one uppercase, one lowercase, one digit, and one special character",
    example: "SecurePass123!",
    minLength: 8,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
    }
  )
  password_user: string;

  // Company fields
  @ApiProperty({
    description: "Company name",
    example: "Acme Corporation",
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name_company: string;

  @ApiProperty({
    description: "Company country",
    example: "Cameroon",
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  country_company: string;

  @ApiProperty({
    description: "Company email address",
    example: "company@acme.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email_company: string;
}

export class CompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  client_id: string;

  @ApiProperty()
  client_key: string;

  // @ApiProperty()
  // card_price: number;

  // @ApiProperty()
  // card_fund_rate: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  step: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class WalletResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  country_iso_code: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CreateCompanyUserResponseDto {
  @ApiProperty()
  status: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: CompanyResponseDto })
  company: CompanyResponseDto;

  @ApiProperty({ type: [WalletResponseDto] })
  wallets?: WalletResponseDto[];
}

export class ErrorResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  error?: string;
}

// Step 1 Response DTO
export class PersonalInfoResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  company_name: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  user_name: string;

  @ApiProperty()
  user_email: string;

  @ApiProperty()
  next_step: number;
}

// Step 2 Response DTO
export class BusinessInfoResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  company_name: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  user_name: string;

  @ApiProperty()
  user_email: string;

  @ApiProperty()
  next_step: string;
}

// Check existing user response DTO
export class CheckExistingUserResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  user_exists: boolean;

  @ApiProperty()
  company_id?: string;

  @ApiProperty()
  company_name?: string;

  @ApiProperty()
  company_step?: number;

  @ApiProperty()
  action_required?: string;
}

// KYB Status Update DTO
export class UpdateKybStatusDto {
  @ApiProperty({
    description: "KYB status",
    example: "APPROVED",
    enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(NONE|PENDING|APPROVED|REJECTED)$/, {
    message: "KYB status must be one of: NONE, PENDING, APPROVED, REJECTED",
  })
  kyb_status: string;
}

// KYC Status Update DTO
export class UpdateKycStatusDto {
  @ApiProperty({
    description: "KYC status",
    example: "APPROVED",
    enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(NONE|PENDING|APPROVED|REJECTED)$/, {
    message: "KYC status must be one of: NONE, PENDING, APPROVED, REJECTED",
  })
  kyc_status: string;
}

// KYB Status Update Response DTO
export class UpdateKybStatusResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  kyb_status: string;

  @ApiProperty()
  updated_at: Date;
}

// KYC Status Update Response DTO
export class UpdateKycStatusResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  kyc_status: string;

  @ApiProperty()
  updated_at: Date;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  card_id: string;

  @ApiProperty()
  card_balance_before: number;

  @ApiProperty()
  card_balance_after: number;

  @ApiProperty()
  wallet_balance_before: number;

  @ApiProperty()
  wallet_balance_after: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency?: string;

  @ApiProperty()
  status?: string;

  @ApiProperty()
  created_at: Date;

  mcc?: string | null;
  mid?: string | null;
  merchant?: any;
  wallet_id?: string | null;
  customer_id: string;
  company_id: string;
  order_id?: string | null;
  provider?: string | null;

  description?: string | null;
  reason?: string | null;

  reference?: string | null;

  updated_at?: Date | string;
}

// ==================== ADDITIONAL ONBOARDING DTOs ====================

// KYC Completion DTO
export class CompleteKycDto {
  @ApiProperty({
    description: "ID document type",
    example: "PASSPORT",
    enum: ["NIN", "PASSPORT", "VOTERS_CARD", "DRIVERS_LICENSE"],
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(NIN|PASSPORT|VOTERS_CARD|DRIVERS_LICENSE)$/, {
    message:
      "ID document type must be one of: NIN, PASSPORT, VOTERS_CARD, DRIVERS_LICENSE",
  })
  id_document_type: string;

  @ApiProperty({
    description: "ID number",
    example: "123456789",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  id_number: string;

  @ApiProperty({
    description: "ID document front image file",
    type: "string",
    format: "binary",
  })
  id_document_front: any;

  @ApiProperty({
    description: "ID document back image file (optional)",
    type: "string",
    format: "binary",
    required: false,
  })
  id_document_back?: any;

  @ApiProperty({
    description: "Proof of address document file",
    type: "string",
    format: "binary",
  })
  proof_of_address: any;

  @ApiProperty({
    description: "Country of residence",
    example: "Cameroon",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  country_of_residence: string;

  @ApiProperty({
    description: "State/Region",
    example: "Centre",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  state: string;

  @ApiProperty({
    description: "City",
    example: "Yaoundé",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  city: string;

  @ApiProperty({
    description: "Street address",
    example: "123 Main Street",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  street: string;

  @ApiProperty({
    description: "Postal code",
    example: "12345",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  postal_code: string;

  @ApiProperty({
    description: "User role in company",
    example: "CEO",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  role_in_company: string;

  @ApiProperty({
    description: "User phone number",
    example: "+237123456789",
    minLength: 7,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @Matches(/^[\d+\-\s]+$/, { message: "Invalid phone number format" })
  phone_number: string;

  @ApiProperty({
    description: "User gender",
    example: "Male",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  gender: string;

  @ApiProperty({
    description: "User nationality",
    example: "Cameroonian",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nationality: string;

  // @ApiProperty({
  //   description: "User address",
  //   example: "123 Main Street, Yaoundé",
  //   minLength: 5,
  // })
  // @IsString()
  // @IsNotEmpty()
  // @MinLength(5)
  // address: string;
}

// KYC Completion Response DTO
export class CompleteKycResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  kyc_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";

  @ApiProperty()
  next_step: string;

  @ApiProperty()
  completed_at: Date;
}

// KYB Completion DTO
export class CompleteKybDto {
  @ApiProperty({
    description: "Business phone number",
    example: "+237123456789",
    minLength: 7,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @Matches(/^[\d+\-\s]+$/, { message: "Invalid phone number format" })
  business_phone_number: string;

  @ApiProperty({
    description: "Business address",
    example: "123 Business Street, Yaoundé",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  business_address: string;

  @ApiProperty({
    description: "Tax ID number",
    example: "TAX123456789",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  tax_id_number: string;

  @ApiProperty({
    description: "Business website URL",
    example: "https://acme.com",
    required: false,
  })
  @IsOptional()
  business_website?: string;

  @ApiProperty({
    description: "Business description",
    example: "Technology company providing software solutions",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  business_description: string;

  @ApiProperty({
    description: "Source of funds",
    example: "Investment",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  source_of_funds: string;

  @ApiProperty({
    description: "Share holding document file",
    type: "string",
    format: "binary",
  })
  share_holding_document: any;

  @ApiProperty({
    description: "Incorporation certificate file",
    type: "string",
    format: "binary",
  })
  incorporation_certificate: any;

  @ApiProperty({
    description: "Business proof of address file",
    type: "string",
    format: "binary",
  })
  business_proof_of_address: any;
}

// KYB Completion Response DTO
export class CompleteKybResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  kyb_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";

  @ApiProperty()
  next_step: string;

  @ApiProperty()
  completed_at: Date;
}

// Banking Information DTO
export class BankingInfoDto {
  @ApiProperty({
    description: "Bank account holder name",
    example: "Acme Corporation",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  account_holder_name: string;

  @ApiProperty({
    description: "Bank account number",
    example: "1234567890",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  account_number: string;

  @ApiProperty({
    description: "Bank routing number",
    example: "021000021",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  routing_number: string;

  @ApiProperty({
    description: "Bank name",
    example: "Bank of Africa",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  bank_name: string;

  @ApiProperty({
    description: "Bank SWIFT code",
    example: "BOACMCMXXX",
    minLength: 8,
    maxLength: 11,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(11)
  swift_code: string;

  @ApiProperty({
    description: "Bank address",
    example: "123 Bank Street, Yaoundé",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  bank_address: string;

  @ApiProperty({
    description: "Country of bank",
    example: "Cameroon",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  bank_country: string;

  @ApiProperty({
    description: "Currency of bank account",
    example: "XAF",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  bank_currency: string;
}

// Banking Information Response DTO
export class BankingInfoResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  bank_account_id: string;

  @ApiProperty()
  next_step: string;

  @ApiProperty()
  completed_at: Date;
}

// Profile Completion DTO
export class CompleteProfileDto {
  @ApiProperty({
    description: "User role in company",
    example: "CEO",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  role_in_company: string;

  @ApiProperty({
    description: "User phone number",
    example: "+237123456789",
    minLength: 7,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @Matches(/^[\d+\-\s]+$/, { message: "Invalid phone number format" })
  phone_number: string;

  @ApiProperty({
    description: "User gender",
    example: "Male",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  gender: string;

  @ApiProperty({
    description: "User nationality",
    example: "Cameroonian",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nationality: string;

  // @ApiProperty({
  //   description: "User address",
  //   example: "123 Main Street, Yaoundé",
  //   minLength: 5,
  // })
  // @IsString()
  // @IsNotEmpty()
  // @MinLength(5)
  // address: string;
}

// Profile Completion Response DTO
export class CompleteProfileResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  next_step: string;

  @ApiProperty()
  completed_at: Date;
}

// Onboarding Status DTO
export class OnboardingStatusDto {
  @ApiProperty()
  company_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  current_step: number;

  @ApiProperty()
  completed_steps: string[];

  @ApiProperty()
  next_step: string;

  @ApiProperty()
  is_complete: boolean;

  @ApiProperty()
  kyc_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";

  @ApiProperty()
  kyb_status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";

  @ApiProperty()
  banking_info_complete: boolean;

  @ApiProperty()
  profile_complete: boolean;
}

// Exchange Rate DTOs
export class CreateExchangeRateDto {
  @ApiProperty({
    description: "Source currency code",
    example: "USD",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  fromCurrency: string;

  @ApiProperty({
    description: "Target currency code",
    example: "EUR",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  toCurrency: string;

  @ApiProperty({
    description: "Exchange rate value",
    example: 0.85,
  })
  @IsNotEmpty()
  rate: number;

  @ApiProperty({
    description: "Source of the exchange rate",
    example: "ECB",
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: "Description of the exchange rate",
    example: "USD to EUR exchange rate",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Whether the exchange rate is active",
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateExchangeRateDto {
  @ApiProperty({
    description: "Exchange rate value",
    example: 0.87,
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  rate?: number;

  @ApiProperty({
    description: "Source of the exchange rate",
    example: "ECB",
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: "Description of the exchange rate",
    example: "Updated USD to EUR exchange rate",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Whether the exchange rate is active",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExchangeRateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  from_currency: string;

  @ApiProperty()
  to_currency: string;

  @ApiProperty()
  rate: number;

  @ApiProperty()
  source?: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CurrencyConversionDto {
  @ApiProperty({
    description: "Amount to convert",
    example: 100,
  })
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: "Source currency code",
    example: "USD",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  fromCurrency: string;

  @ApiProperty({
    description: "Target currency code",
    example: "EUR",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  toCurrency: string;
}

export class CurrencyConversionResponseDto {
  @ApiProperty()
  convertedAmount: number;

  @ApiProperty()
  rate: number;

  @ApiProperty()
  exchangeRateId: string;

  @ApiProperty()
  fromCurrency: string;

  @ApiProperty()
  toCurrency: string;
}

// Transaction Fee DTOs
export class CreateTransactionFeeDto {
  @ApiProperty({
    description: "Transaction type",
    example: "FUND",
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  transactionType: string;

  @ApiProperty({
    description: "Transaction category",
    example: "CARD",
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  transactionCategory: string;

  @ApiProperty({
    description: "Country ISO code",
    example: "US",
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  countryIsoCode: string;

  @ApiProperty({
    description: "Currency code",
    example: "USD",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  currency: string;

  @ApiProperty({
    description: "Fee percentage (optional)",
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  feePercentage?: number;

  @ApiProperty({
    description: "Fixed fee amount (optional)",
    example: 0.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  feeFixed?: number;

  @ApiProperty({
    description: "Fee type",
    example: "PERCENTAGE",
    enum: ["FIXED", "PERCENTAGE"],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(["FIXED", "PERCENTAGE"])
  type: "FIXED" | "PERCENTAGE";

  @ApiProperty({
    description: "Fee value",
    example: 2.5,
  })
  @IsNotEmpty()
  @IsNumber()
  value: number;

  @ApiProperty({
    description: "Whether the fee is active",
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: "Description of the fee",
    example: "Card funding fee for US",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTransactionFeeDto {
  @ApiProperty({
    description: "Fee percentage (optional)",
    example: 3.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  feePercentage?: number;

  @ApiProperty({
    description: "Fixed fee amount (optional)",
    example: 1.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  feeFixed?: number;

  @ApiProperty({
    description: "Fee type",
    example: "PERCENTAGE",
    enum: ["FIXED", "PERCENTAGE"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["FIXED", "PERCENTAGE"])
  type?: "FIXED" | "PERCENTAGE";

  @ApiProperty({
    description: "Fee value",
    example: 3.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiProperty({
    description: "Whether the fee is active",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: "Description of the fee",
    example: "Updated card funding fee for US",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class TransactionFeeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  transaction_type: string;

  @ApiProperty()
  transaction_category: string;

  @ApiProperty()
  country_iso_code: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  fee_percentage?: number;

  @ApiProperty()
  fee_fixed?: number;

  @ApiProperty()
  type: "FIXED" | "PERCENTAGE";

  @ApiProperty()
  value: number;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CalculateTransactionFeeDto {
  @ApiProperty({
    description: "Transaction amount",
    example: 1000,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: "Transaction type",
    example: "FUND",
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  transactionType: string;

  @ApiProperty({
    description: "Transaction category",
    example: "CARD",
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  transactionCategory: string;

  @ApiProperty({
    description: "Country ISO code",
    example: "US",
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  countryIsoCode: string;

  @ApiProperty({
    description: "Currency code",
    example: "USD",
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  currency: string;
}

export class CalculateTransactionFeeResponseDto {
  @ApiProperty()
  feeAmount: number;

  @ApiProperty()
  feeType: "FIXED" | "PERCENTAGE";

  @ApiProperty()
  feeValue: number;

  @ApiProperty()
  calculatedPercentage?: number;

  @ApiProperty()
  calculatedFixed?: number;

  @ApiProperty()
  transactionFeeId: string;
}

// ==================== ONBOARDING STEP DTOs ====================

// Onboarding Step DTOs
export class CreateOnboardingStepDto {
  @ApiProperty({
    description: "Company ID",
    example: "company-uuid",
  })
  @IsString()
  @IsNotEmpty()
  company_id: string;

  @ApiProperty({
    description: "Step name",
    example: "Personal Information",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: "Step slug",
    example: "personal_info",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  slug: string;

  @ApiProperty({
    description: "Step status",
    example: "PENDING",
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
    required: false,
    default: "PENDING",
  })
  @IsOptional()
  @IsEnum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"])
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

  @ApiProperty({
    description: "Step order",
    example: 1,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({
    description: "Step description",
    example: "Complete personal information and KYC",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateOnboardingStepDto {
  @ApiProperty({
    description: "Step name",
    example: "Personal Information",
    minLength: 2,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({
    description: "Step slug",
    example: "personal_info",
    minLength: 2,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @ApiProperty({
    description: "Step status",
    example: "IN_PROGRESS",
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"])
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

  @ApiProperty({
    description: "Step order",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({
    description: "Step description",
    example: "Complete personal information and KYC",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class OnboardingStepResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

  @ApiProperty()
  order: number;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class OnboardingStepListResponseDto {
  @ApiProperty({ type: [OnboardingStepResponseDto] })
  steps: OnboardingStepResponseDto[];

  @ApiProperty()
  total: number;
}

export class InitializeOnboardingStepsDto {
  @ApiProperty({
    description: "Company ID",
    example: "company-uuid",
  })
  @IsString()
  @IsNotEmpty()
  company_id: string;
}

export class InitializeOnboardingStepsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [OnboardingStepResponseDto] })
  steps: OnboardingStepResponseDto[];

  @ApiProperty()
  initialized_at: Date;
}

export class UpdateStepStatusDto {
  @ApiProperty({
    description: "Step ID",
    example: "step-uuid",
  })
  @IsString()
  @IsNotEmpty()
  step_id: string;

  @ApiProperty({
    description: "Step status",
    example: "IN_PROGRESS",
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"])
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

export class UpdateStepStatusResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: OnboardingStepResponseDto })
  step: OnboardingStepResponseDto;

  @ApiProperty()
  updated_at: Date;
}

export class GetOnboardingStepsDto {
  @ApiProperty({
    description: "Company ID",
    example: "company-uuid",
  })
  @IsString()
  @IsNotEmpty()
  company_id: string;

  @ApiProperty({
    description: "Filter by status",
    example: "PENDING",
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"])
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

export class GetOnboardingStepsResponseDto {
  @ApiProperty({ type: [OnboardingStepResponseDto] })
  steps: OnboardingStepResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  completed_count: number;

  @ApiProperty()
  pending_count: number;

  @ApiProperty()
  in_progress_count: number;

  @ApiProperty()
  failed_count: number;
}

// ==================== CLIENT CREDENTIALS AND WEBHOOK DTOs ====================

// Company Credentials Response DTO
export class CompanyCredentialsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  // @ApiProperty()
  // company_id: string;

  @ApiProperty()
  data: {
    webhook_is_active: boolean;
    webhook_url: string | null;
    client_id: string;
    client_key: string;
  };

  // @ApiProperty()
  // updated_at: Date;
}

// Update Webhook URL DTO
export class UpdateWebhookUrlDto {
  @ApiProperty({
    description: "Webhook URL for receiving notifications",
    example: "https://example.com/webhooks",
    required: true,
  })
  // @IsUrl({}, { message: "Enter a valid URL for the webhook" })
  webhook_url: string;

  @ApiProperty({
    description: "Enable or disable Webhook",
    required: false,
  })
  @IsOptional()
  webhook_is_active?: boolean;
}

// Update Webhook URL Response DTO
export class UpdateWebhookUrlResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  webhook_url: string | null;

  @ApiProperty()
  webhook_is_active: boolean;

  @ApiProperty()
  updated_at: Date;
}

// Regenerate Client Key Response DTO
export class RegenerateClientKeyResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  new_client_key: string;

  @ApiProperty()
  client_id: string;

  @ApiProperty()
  regenerated_at: Date;
}
