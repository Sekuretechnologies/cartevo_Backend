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
} from "class-validator";

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
  @IsUrl({}, { message: "Enter a valid URL for the website" })
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

  @ApiProperty()
  card_price: number;

  @ApiProperty()
  card_fund_rate: number;

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
