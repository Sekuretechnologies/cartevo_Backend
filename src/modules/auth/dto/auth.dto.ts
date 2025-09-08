import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEmail, IsOptional } from "class-validator";

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
