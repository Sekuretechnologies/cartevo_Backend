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
import walletPhoneNumberService, {
  IWalletPhoneNumberData,
} from "@/services/wallet/walletPhoneNumber.service";

@Controller("wallet-phone-numbers")
export class WalletPhoneNumberController {
  @Post()
  async create(@Body() data: IWalletPhoneNumberData) {
    return walletPhoneNumberService.create(data);
  }

  @Get()
  async getAll(@Query("walletId") walletId?: string) {
    return walletPhoneNumberService.getAll(walletId);
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return walletPhoneNumberService.getOne(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() data: Partial<IWalletPhoneNumberData>
  ) {
    return walletPhoneNumberService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return walletPhoneNumberService.delete(id);
  }
}
