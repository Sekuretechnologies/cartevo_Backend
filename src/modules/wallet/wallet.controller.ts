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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentBusiness,
  CurrentBusinessData,
} from "../common/decorators/current-business.decorator";
import {
  CurrentUser,
  CurrentUserData,
} from "../common/decorators/current-user.decorator";

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
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() data: IWalletCreate
  ) {
    return this.walletService.createWallet(business.businessId, data);
  }

  @Get()
  async getAllWallets(@CurrentBusiness() business: CurrentBusinessData) {
    return this.walletService.getAllWallets(business.businessId);
  }

  @Get(":id")
  async getWalletById(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("id") id: string
  ) {
    return this.walletService.getWalletById(business.businessId, id);
  }

  @Put(":id")
  async updateWallet(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("id") id: string,
    @Body() data: IWalletUpdate
  ) {
    return this.walletService.updateWallet(business.businessId, id, data);
  }

  @Delete(":id")
  async deleteWallet(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("id") id: string
  ) {
    return this.walletService.deleteWallet(business.businessId, id);
  }

  @Post("fund")
  async fundWallet(
    @CurrentBusiness() business: CurrentBusinessData,
    @CurrentUser() user: CurrentUserData,
    // @Param("id") walletId: string,
    @Body() data: IWalletFunding
  ) {
    console.log("Current user:", user.userId, user.email);
    console.log("Current business:", business.businessId);
    const fundData: IWalletFunding = {
      walletId: data.walletId,
      companyId: business.businessId,
      userId: user.userId,
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
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() data: IWalletWithdrawal
  ) {
    return withdrawFromWallet(business.businessId, data);
  }

  @Get("balance/:walletId")
  async getWalletBalance(
    @CurrentBusiness() business: CurrentBusinessData,
    @Param("walletId") walletId: string
  ) {
    return this.walletService.getWalletBalance(business.businessId, walletId);
  }
}
