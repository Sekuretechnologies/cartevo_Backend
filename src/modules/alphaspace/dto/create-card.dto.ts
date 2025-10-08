import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsIn,
  Min,
  MaxLength,
  IsOptional,
} from "class-validator";

export class CreateCardDto {
  @IsNotEmpty()
  @IsString()
  customer_id: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(["VISA", "MASTERCARD", "visa", "mastercard"])
  brand: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name_on_card?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
