import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";

export class AuthTokenRequestDto {
  @ApiProperty({
    description: "Business client ID",
    example: "client_12345",
  })
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @ApiProperty({
    description: "Business client key",
    example: "key_abcdef123456",
  })
  @IsString()
  @IsNotEmpty()
  client_key: string;
}

export class AuthTokenResponseDto {
  @ApiProperty({
    description: "JWT access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  access_token: string;

  @ApiProperty({
    description: "Token type",
    example: "Bearer",
  })
  token_type: string;

  @ApiProperty({
    description: "Token expiration time in seconds",
    example: 86400,
  })
  expires_in: number;
}

// New DTOs for multi-company login
export class CheckEmailRequestDto {
  @ApiProperty({
    description: "User email address to check",
    example: "user@company.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CheckEmailResponseDto {
  @ApiProperty({
    description: "Whether the email exists in the system",
  })
  exists: boolean;

  @ApiProperty({
    description: "Number of companies the email is associated with",
  })
  company_count: number;

  @ApiProperty({
    description: "List of companies if multiple exist",
    required: false,
  })
  companies?: Array<{
    id: string;
    name: string;
    country: string;
  }>;
}

export class LoginWithCompanyRequestDto {
  @ApiProperty({
    description: "User email address",
    example: "user@company.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "User password",
    example: "SecurePass123!",
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description:
      "Company ID to login to (required when user has multiple companies)",
    example: "company-uuid-123",
    required: false,
  })
  @IsString()
  @IsOptional()
  company_id?: string;
}

export class LoginWithCompanyResponseDto {
  @ApiProperty({
    description: "Whether login was successful",
  })
  success: boolean;

  @ApiProperty({
    description: "Response message",
  })
  message: string;

  @ApiProperty({
    description: "Whether OTP verification is required",
    required: false,
  })
  requires_otp?: boolean;

  @ApiProperty({
    description: "Company information if login successful",
    required: false,
  })
  company?: {
    id: string;
    name: string;
    country: string;
  };
}

export class SelectCompanyRequestDto {
  @ApiProperty({
    description: "Temporary token received from verify-otp",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @ApiProperty({
    description: "Company ID to select",
    example: "company-uuid-123",
  })
  @IsString()
  @IsNotEmpty()
  company_id: string;
}

export class SelectCompanyResponseDto {
  @ApiProperty({
    description: "Whether company selection was successful",
  })
  success: boolean;

  @ApiProperty({
    description: "Response message",
  })
  message: string;

  @ApiProperty({
    description: "Full access token for the selected company",
  })
  access_token: string;

  @ApiProperty({
    description: "User information",
  })
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    company_id: string;
    status: string;
    step: number;
    role: string;
    created_at: Date;
    updated_at: Date;
  };

  @ApiProperty({
    description: "Selected company information",
  })
  company: {
    id: string;
    name: string;
    country: string;
    onboarding_is_completed: boolean;
    clearance?: string;
  };

  @ApiProperty({
    description: "Where to redirect the user after login",
    example: "dashboard",
    enum: ["dashboard", "step2", "waiting"],
  })
  redirect_to: string;
}

export class ValidateInvitationTokenDto {
  @ApiProperty({
    description: "Invitation token from the email link",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ValidateInvitationResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ required: false })
  invitation_id?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  company?: {
    id: string;
    name: string;
    country: string;
  };

  @ApiProperty({ required: false })
  user_id?: string;

  @ApiProperty({ required: false })
  role?: string;

  @ApiProperty({ required: false })
  user_exists?: boolean;

  @ApiProperty({ required: false })
  existing_companies?: number;
}

export class AcceptInvitationDto {
  @ApiProperty({
    description: "Invitation token from the email link",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: "Password for existing users (required for existing users)",
    example: "SecurePass123!",
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;
}

export class AcceptInvitationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  access_token?: string;

  @ApiProperty({ required: false })
  user?: object;

  @ApiProperty()
  company: {
    id: string;
    name: string;
    country: string;
  };

  @ApiProperty({ required: false })
  redirect_to?: string;
}

export class RegisterWithInvitationDto {
  @ApiProperty({
    description: "Invitation token from the email link",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  invitation_token: string;

  @ApiProperty({
    description: "User email address",
    example: "user@company.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "User full name",
    example: "John Doe",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  full_name: string;

  @ApiProperty({
    description: "User password",
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
  password: string;
}
