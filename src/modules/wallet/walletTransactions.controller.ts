import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WalletTransactionsService } from "./walletTransactions.service";
import {
  CurrentBusiness,
  CurrentBusinessData,
} from "../common/decorators/current-business.decorator";

@ApiTags("Wallet Transactions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("wallet/transactions")
export class WalletTransactionsController {
  constructor(
    private readonly walletTransactionsService: WalletTransactionsService
  ) {}

  @Get()
  async getWalletTransactions(
    @CurrentBusiness() business: CurrentBusinessData,
    @Query("walletId") walletId?: string,
    @Query("customerId") customerId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.walletTransactionsService.getWalletTransactions(
      business.businessId,
      walletId,
      customerId,
      status,
      limit,
      offset
    );
  }

  @Get(":id")
  async getWalletTransactionById(@Param("id") id: string) {
    return this.walletTransactionsService.getWalletTransactionById(id);
  }

  @Get("wallet/:walletId")
  async getWalletTransactionsByWallet(@Param("walletId") walletId: string) {
    return this.walletTransactionsService.getWalletTransactionsByWallet(
      walletId
    );
  }

  @Get("customer/:customerId")
  async getWalletTransactionsByCustomer(
    @Param("customerId") customerId: string
  ) {
    return this.walletTransactionsService.getWalletTransactionsByCustomer(
      customerId
    );
  }

  @Get("status/:status")
  async getWalletTransactionsByStatus(@Param("status") status: string) {
    return this.walletTransactionsService.getWalletTransactionsByStatus(status);
  }
}
