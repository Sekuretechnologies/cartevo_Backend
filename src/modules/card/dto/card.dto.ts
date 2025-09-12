import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
} from "class-validator";

export class CreateCardDto {
  @ApiProperty({
    description: "Customer ID to issue the card for",
    example: "cust_12345",
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  name_on_card: string;

  @ApiProperty()
  brand: string;
}

export class FundCardDto {
  @ApiProperty({
    description: "Customer ID who is executing the funding action",
    example: "cust_12345",
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description: "Amount to add to the card",
    example: 100.5,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class WithdrawCardDto {
  @ApiProperty({
    description: "Customer ID who is executing the withdrawal action",
    example: "cust_12345",
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description: "Amount to withdraw from the card",
    example: 50.25,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class CardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customer_id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  number: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export class CreateCardResponseDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  card: CardResponseDto;

  // @ApiProperty()
  // transaction: {
  //   id: string;
  //   type: string;
  //   amount: number;
  //   card_balance_before: number;
  //   card_balance_after: number;
  //   wallet_balance_before: number;
  //   wallet_balance_after: number;
  // };
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  id_card: string;

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
}
