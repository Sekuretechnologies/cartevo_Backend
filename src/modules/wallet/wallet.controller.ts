import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IWalletCreate, WalletService } from "./wallet.service";
import { IWalletFunding } from "@/services/wallet/walletFunding.service";
import {
  IWalletWithdrawal,
  withdrawFromWallet,
} from "@/services/wallet/walletWithdrawal.service";
import { ApiBearerAuth, ApiTags, ApiProperty } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentBusiness,
  CurrentBusinessData,
} from "../common/decorators/current-business.decorator";
import {
  CurrentUser,
  CurrentUserData,
} from "../common/decorators/current-user.decorator";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export interface DepositToWalletSubmitProps {
  sourceWallet: {
    id: string;
    currency: string;
    amount: number;
    feeAmount: number;
    totalAmount: number;
  };
  destinationWallet: {
    id: string;
    currency: string;
    amount: number;
  };
  exchangeRate: {
    rate: number;
    fromCurrency: string;
    toCurrency: string;
  };
}

export class SourceWalletDto {
  @ApiProperty({
    description: "Source wallet ID",
    example: "wallet-123",
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "Source wallet currency",
    example: "USD",
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: "Amount to transfer",
    example: 100,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: "Fee amount",
    example: 5,
  })
  @IsNumber()
  @Min(0)
  feeAmount: number;

  @ApiProperty({
    description: "Total amount (amount + fee)",
    example: 105,
  })
  @IsNumber()
  @Min(0.01)
  totalAmount: number;
}

export class DestinationWalletDto {
  @ApiProperty({
    description: "Destination wallet ID",
    example: "wallet-456",
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "Destination wallet currency",
    example: "EUR",
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: "Converted amount to receive",
    example: 85,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class ExchangeRateDto {
  @ApiProperty({
    description: "Exchange rate",
    example: 0.85,
  })
  @IsNumber()
  // @Min(0.0001)
  rate: number;

  @ApiProperty({
    description: "From currency",
    example: "USD",
  })
  @IsString()
  @IsNotEmpty()
  fromCurrency: string;

  @ApiProperty({
    description: "To currency",
    example: "EUR",
  })
  @IsString()
  @IsNotEmpty()
  toCurrency: string;
}

export class DepositToWalletDto {
  @ApiProperty({
    description: "Source wallet details",
    type: SourceWalletDto,
  })
  @ValidateNested()
  @Type(() => SourceWalletDto)
  sourceWallet: SourceWalletDto;

  @ApiProperty({
    description: "Destination wallet details",
    type: DestinationWalletDto,
  })
  @ValidateNested()
  @Type(() => DestinationWalletDto)
  destinationWallet: DestinationWalletDto;

  @ApiProperty({
    description: "Exchange rate details",
    type: ExchangeRateDto,
  })
  @ValidateNested()
  @Type(() => ExchangeRateDto)
  exchangeRate: ExchangeRateDto;
}

// export interface IWalletCreate {
//   company_id: string;
//   currency: string;
//   // country: string;
//   country_iso_code: string;
//   // country_phone_code?: string;
// }

export interface IWalletUpdate {
  balance?: number;
  active?: boolean;
  country_phone_code?: string;
}

@ApiTags("Wallets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("wallets")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  async createWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() data: IWalletCreate
  ) {
    return this.walletService.createWallet(user.companyId, data);
  }

  @Get()
  async getAllWallets(@CurrentUser() user: CurrentUserData) {
    console.log("getAllWallets  -- @CurrentUser() user:: ", user);

    return this.walletService.getAllWallets(user.companyId);
  }

  @Get(":id")
  async getWalletById(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.walletService.getWalletById(user.companyId, id);
  }

  @Put(":id")
  async updateWallet(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() data: IWalletUpdate
  ) {
    return this.walletService.updateWallet(user.companyId, id, data);
  }

  @Delete(":id")
  async deleteWallet(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.walletService.deleteWallet(user.companyId, id);
  }

  @Post("fund")
  async fundWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() data: IWalletFunding
  ) {
    console.log("Token type:", user.type);
    console.log("Current user:", data.userId);
    console.log("Current company/business ID:", user.companyId);

    const fundData: IWalletFunding = {
      walletId: data.walletId,
      companyId: user.companyId,
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
      provider: "afribapay",
      operator: data.operator || "mtn",
      phone: data.phone,
      // email: "",
      // orderId: "",
    };
    return this.walletService.fundWallet(fundData);
  }

  @Post("withdraw")
  async withdrawFromWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() data: IWalletWithdrawal
  ) {
    return withdrawFromWallet(user.companyId, data);
  }

  @Post("deposit")
  async depositToWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() data: DepositToWalletDto
  ) {
    return this.walletService.depositToWallet(user.companyId, data);
  }

  @Get("balance/:walletId")
  async getWalletBalance(
    @CurrentUser() user: CurrentUserData,
    @Param("walletId") walletId: string
  ) {
    return this.walletService.getWalletBalance(user.companyId, walletId);
  }
}
