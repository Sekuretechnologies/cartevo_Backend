import { IsNotEmpty, IsString, IsNumber, Min } from "class-validator";

export class WithdrawCardDto {
  @IsNotEmpty()
  @IsString()
  customer_id: string;

  @IsNotEmpty()
  @IsString()
  card_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;
}
