import { KybStatus, KycStatus, UserStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class KycDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  message: string;

  @IsEnum([KycStatus.APPROVED, KycStatus.REJECTED] as const, {
    message: "value must be APPROVED or REJECTED",
  })
  value: KycStatus;
}

export class KybDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsOptional()
  message: string;

  @IsEnum([KybStatus.APPROVED, KybStatus.REJECTED] as const, {
    message: "value must be APPROVED or REJECTED",
  })
  value: KybStatus;
}


export class ToggleUserStatusDto {
  status: UserStatus
}