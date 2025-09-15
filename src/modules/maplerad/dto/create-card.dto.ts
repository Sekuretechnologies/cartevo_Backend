import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsIn,
  Min,
  MaxLength,
} from "class-validator";

export class CreateCardDto {
  @IsNotEmpty()
  @IsString()
  customer_id: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(["VISA", "MASTERCARD", "visa", "mastercard"])
  brand: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name_on_card: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(2)
  amount: number;
}
