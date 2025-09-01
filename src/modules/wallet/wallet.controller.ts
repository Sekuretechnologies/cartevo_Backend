import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { IWalletFunding } from "@/services/wallet/walletFunding.service";

export interface IWalletCreate {
  company_id: string;
  currency: string;
  country: string;
  country_iso_code: string;
  country_phone_code?: string;
}

export interface IWalletUpdate {
  balance?: number;
  active?: boolean;
  country_phone_code?: string;
}

@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  async createWallet(@Body() data: IWalletCreate) {
    return this.walletService.createWallet(data);
  }

  @Get()
  async getAllWallets(@Query("companyId") companyId?: string) {
    return this.walletService.getAllWallets(companyId);
  }

  @Get(":id")
  async getWalletById(@Param("id") id: string) {
    return this.walletService.getWalletById(id);
  }

  @Put(":id")
  async updateWallet(@Param("id") id: string, @Body() data: IWalletUpdate) {
    return this.walletService.updateWallet(id, data);
  }

  @Delete(":id")
  async deleteWallet(@Param("id") id: string) {
    return this.walletService.deleteWallet(id);
  }

  @Post("fund")
  async fundWallet(@Body() data: IWalletFunding) {
    return this.walletService.fundWallet(data);
  }

  @Get("balance/:walletId")
  async getWalletBalance(@Param("walletId") walletId: string) {
    return this.walletService.getWalletBalance(walletId);
  }
}
