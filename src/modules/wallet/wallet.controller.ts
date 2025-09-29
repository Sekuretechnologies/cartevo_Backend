import { IWalletFunding } from "@/services/wallet/walletFunding.service";
import { WalletInternalTransferService } from "@/services/wallet/walletInternalTransfer.service";
import { WalletTransferBetweenService } from "@/services/wallet/walletTransferBetween.service";
import {
  WithdrawalRequest as IWalletWithdrawal,
  WalletWithdrawalService,
} from "@/services/wallet/walletWithdrawal.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "../common/decorators/current-user.decorator";
import { WalletTestService } from "./wallet-test.service";
import { IWalletCreate, WalletService } from "./wallet.service";

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
  constructor(
    private readonly walletService: WalletService,
    private readonly walletTestService: WalletTestService
  ) {}

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

  @Patch(":id")
  async patchWallet(
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

  @Post(":id/disable")
  async disableWallet(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() body: { reason?: string }
  ) {
    return this.walletService.disableWallet(user.companyId, id, body?.reason);
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
    // Expecting data to include walletId, amount, phone_number, operator, reason
    const { walletId, amount, phone_number, operator, reason } =
      (data as any) || {};
    if (!walletId) {
      throw new Error("walletId is required in request body");
    }
    const reqData: IWalletWithdrawal = {
      amount,
      phone_number,
      operator,
      reason,
      user_id: (user.userId || user.companyId) as string,
    };
    return WalletWithdrawalService.processWithdrawal(walletId, reqData);
  }

  @Post("deposit")
  async depositToWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() data: DepositToWalletDto
  ) {
    return this.walletService.depositToWallet(user.companyId, data);
  }

  @Post(":id/transfer-internal")
  async transferInternal(
    @CurrentUser() user: CurrentUserData,
    @Param("id") walletId: string,
    @Body()
    body: {
      amount: number;
      direction: "PAYIN_TO_PAYOUT" | "PAYOUT_TO_PAYIN";
      reason?: string;
    }
  ) {
    return WalletInternalTransferService.transferInternal(walletId, {
      amount: body.amount,
      direction: body.direction,
      reason: body.reason,
      user_id: (user.userId || user.companyId) as string,
    });
  }

  @Post(":id/transfer-internal-advanced")
  async transferInternalAdvanced(
    @CurrentUser() user: CurrentUserData,
    @Param("id") walletId: string,
    @Body()
    body: {
      amount: number;
      from_type: 'MAIN' | 'PAYIN' | 'PAYOUT';
      to_type: 'MAIN' | 'PAYIN' | 'PAYOUT' | 'WITHDRAW';
      reason?: string;
      phone_number?: string; // required if to_type = WITHDRAW
      operator?: string; // required if to_type = WITHDRAW
    }
  ) {
    return WalletInternalTransferService.transferInternalAdvanced(walletId, {
      amount: body.amount,
      from_type: body.from_type,
      to_type: body.to_type,
      reason: body.reason,
      user_id: (user.userId || user.companyId) as string,
      phone_number: body.phone_number,
      operator: body.operator,
    });
  }

  @Post("transfer-between")
  async transferBetween(
    @CurrentUser() user: CurrentUserData,
    @Body()
    body: {
      from_wallet_id: string;
      to_wallet_id: string;
      amount: number;
      reason?: string;
    }
  ) {
    return WalletTransferBetweenService.transferBetween({
      from_wallet_id: body.from_wallet_id,
      to_wallet_id: body.to_wallet_id,
      amount: body.amount,
      reason: body.reason,
      user_id: (user.userId || user.companyId) as string,
    });
  }

  @Get(":id/available-for-transfer")
  async getAvailableWallets(
    @CurrentUser() user: CurrentUserData,
    @Param("id") sourceWalletId: string
  ) {
    return WalletTransferBetweenService.getAvailableWallets(
      sourceWalletId,
      user.companyId as string
    );
  }

  @Post("calculate-transfer-fees")
  async calculateTransferFees(
    @CurrentUser() user: CurrentUserData,
    @Body()
    body: {
      from_currency: string;
      to_currency: string;
      amount: number;
      country_iso_code?: string;
    }
  ) {
    return WalletTransferBetweenService.calculateTransferFees(
      user.companyId as string,
      body.from_currency,
      body.to_currency,
      body.amount,
      body.country_iso_code
    );
  }

  @Get("balance/:walletId")
  async getWalletBalance(
    @CurrentUser() user: CurrentUserData,
    @Param("walletId") walletId: string
  ) {
    return this.walletService.getWalletBalance(user.companyId, walletId);
  }

  /**
   * Credit test wallets (Company USD wallet + Maplerad test wallet)
   * Only works in sandbox mode for security
   */
  @Post("credit-test-wallet")
  @ApiOperation({
    summary: "Credit test wallet",
    description: "Credits the company USD wallet. Only works in sandbox mode.",
  })
  @ApiResponse({
    status: 200,
    description: "Test wallets credited successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Test wallets credited successfully",
        },
        wallet: {
          type: "object",
          properties: {
            walletId: { type: "string" },
            previousBalance: { type: "number" },
            newBalance: { type: "number" },
            creditedAmount: { type: "number" },
          },
        },
        timestamp: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid parameters or not in sandbox mode",
  })
  @ApiResponse({
    status: 500,
    description: "Internal server error",
  })
  async creditTestWallet(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { amount: number; currency?: string; sandbox: boolean }
  ) {
    return this.walletTestService.creditTestWallet(
      user.companyId,
      user.userId,
      body
    );
  }
}
