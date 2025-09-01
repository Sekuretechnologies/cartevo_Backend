import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import walletPhoneOperatorService, {
  IWalletPhoneOperatorData,
} from "@/services/wallet/walletPhoneOperator.service";

@Controller("wallet-phone-operators")
export class WalletPhoneOperatorController {
  @Post()
  async create(@Body() data: IWalletPhoneOperatorData) {
    return walletPhoneOperatorService.create(data);
  }

  @Get()
  async getAll(
    @Query("countryIsoCode") countryIsoCode?: string,
    @Query("currency") currency?: string
  ) {
    return walletPhoneOperatorService.getAll(countryIsoCode, currency);
  }

  @Get("by-country-currency/:countryIsoCode/:currency")
  async getByCountryAndCurrency(
    @Param("countryIsoCode") countryIsoCode: string,
    @Param("currency") currency: string
  ) {
    return walletPhoneOperatorService.getByCountryAndCurrency(
      countryIsoCode,
      currency
    );
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return walletPhoneOperatorService.getOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() data: Partial<IWalletPhoneOperatorData>
  ) {
    return walletPhoneOperatorService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return walletPhoneOperatorService.delete(id);
  }
}
