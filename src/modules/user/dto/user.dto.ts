import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({
    description: "User email address",
    example: "user@company.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "User role within the company",
    example: "admin",
    enum: ["admin", "user"],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(["admin", "user"], { message: "Role must be either admin or user" })
  role: string;
}

export class RegisterUserDto {
  @ApiProperty({
    description: "User email address",
    example: "user@company.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Invitation code received via email",
    example: "INV_1234567890",
  })
  @IsString()
  @IsNotEmpty()
  invitation_code: string;

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
  password: string;
}

export class LoginDto {
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
}

export class VerifyOtpDto {
  @ApiProperty({
    description: "User email address",
    example: "user@company.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "One-time password received via email",
    example: "123456",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}

export class UpdateUserDto {
  @ApiProperty({
    description: "User full name",
    example: "John Doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(255)
  full_name?: string;

  @ApiProperty({
    description: "User role within the company",
    example: "admin",
    enum: ["admin", "user"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsEnum(["admin", "user"], { message: "Role must be either admin or user" })
  role?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  first_name?: string;

  @ApiProperty()
  last_name?: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  company_id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  step: number;

  @ApiProperty()
  role: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

// Logout Response DTO
export class LogoutResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({
    description: "Timestamp when the token was invalidated",
  })
  logged_out_at: Date;
}

export class CreateUserResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  user: UserResponseDto;

  @ApiProperty()
  invitation_code: string;
}

export class AuthResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  requires_otp: boolean;
}

export class LoginSuccessResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user: UserResponseDto;

  @ApiProperty()
  company: {
    id: string;
    name: string;
    country: string;
    is_onboarding_completed: boolean;
  };

  @ApiProperty({
    description: "Where to redirect the user after login",
    example: "dashboard",
    enum: ["dashboard", "step2", "waiting"],
  })
  redirect_to: string;
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
