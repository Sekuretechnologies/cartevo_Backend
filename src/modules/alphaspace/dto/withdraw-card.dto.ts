import { IsNotEmpty, IsString, IsNumber, Min } from "class-validator";

export class WithdrawCardDto {
  @IsNotEmpty()
  @IsString()
  customer_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}
