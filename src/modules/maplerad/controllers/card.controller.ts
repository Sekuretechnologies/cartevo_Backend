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
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CardIssuanceService } from "../services/card.issuance.service";
import { CardFundService } from "../services/card.fund.service";
import { CardWithdrawService } from "../services/card.withdraw.service";
import { CardManagementService } from "../services/card.management.service";
import { CreateCardDto } from "../dto/create-card.dto";
import { FundCardDto } from "../dto/fund-card.dto";
import { WithdrawCardDto } from "../dto/withdraw-card.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

/**
 * 🎯 MONIX-STYLE: Dedicated Card Operations Controller
 * Handles all card-related operations with modular services
 */
@ApiTags("Cards")
@ApiBearerAuth()
@Controller("cards")
@UseGuards(JwtAuthGuard)
export class CardOperationsController {
  constructor(
    private readonly issuanceService: CardIssuanceService,
    private readonly fundService: CardFundService,
    private readonly withdrawService: CardWithdrawService,
    private readonly managementService: CardManagementService
  ) {}

  /**
   * 🚀 Create a new Maplerad virtual card
   */
  @Post()
  async createCard(@Body() createCardDto: CreateCardDto, @Request() req: any) {
    console.log("🚀 CARD CONTROLLER - Create Card Request", {
      customerId: createCardDto.customer_id,
      brand: createCardDto.brand,
      amount: createCardDto.amount,
      userId: req.user.userId,
    });

    return this.issuanceService.issueRetailCard(createCardDto, req.user);
  }

  /**
   * 💰 Fund an existing Maplerad card
   */
  @Post(":cardId/fund")
  async fundCard(
    @Param("cardId") cardId: string,
    @Body() fundCardDto: FundCardDto,
    @Request() req: any
  ) {
    console.log("💰 CARD CONTROLLER - Fund Card Request", {
      cardId,
      customerId: fundCardDto.customer_id,
      amount: fundCardDto.amount,
      userId: req.user.userId,
    });

    // Add cardId to the DTO for service processing
    const fundDtoWithCardId = { ...fundCardDto, card_id: cardId };

    return this.fundService.fundCard(fundDtoWithCardId, req.user);
  }

  /**
   * 💸 Withdraw from a Maplerad card
   */
  @Post(":cardId/withdraw")
  async withdrawFromCard(
    @Param("cardId") cardId: string,
    @Body() withdrawCardDto: WithdrawCardDto,
    @Request() req: any
  ) {
    console.log("💸 CARD CONTROLLER - Withdraw Card Request", {
      cardId,
      customerId: withdrawCardDto.customer_id,
      amount: withdrawCardDto.amount,
      userId: req.user.userId,
    });

    // Add cardId to the DTO for service processing
    const withdrawDtoWithCardId = { ...withdrawCardDto, card_id: cardId };

    return this.withdrawService.withdrawFromCard(
      withdrawDtoWithCardId,
      req.user
    );
  }

  /**
   * 🔍 Get card details
   */
  @Get(":cardId")
  async getCard(
    @Param("cardId") cardId: string,
    @Query("reveal") reveal: string,
    @Request() req: any
  ) {
    console.log("🔍 CARD CONTROLLER - Get Card Request", {
      cardId,
      reveal: reveal === "true",
      userId: req.user.userId,
    });

    return this.managementService.getCard(cardId, req.user, reveal === "true");
  }

  /**
   * 📊 Get card transactions
   */
  @Get(":cardId/transactions")
  async getCardTransactions(
    @Param("cardId") cardId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Request() req: any
  ) {
    console.log("📊 CARD CONTROLLER - Get Card Transactions Request", {
      cardId,
      page,
      limit,
      userId: req.user.userId,
    });

    return this.managementService.getCardTransactions(cardId, req.user, {
      limit,
    });
  }

  /**
   * 🧊 Freeze a Maplerad card
   */
  @Put(":cardId/freeze")
  async freezeCard(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("🧊 CARD CONTROLLER - Freeze Card Request", {
      cardId,
      userId: req.user.userId,
    });

    return this.managementService.freezeCard(cardId, req.user);
  }

  /**
   * 🔥 Unfreeze a Maplerad card
   */
  @Put(":cardId/unfreeze")
  async unfreezeCard(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("🔥 CARD CONTROLLER - Unfreeze Card Request", {
      cardId,
      userId: req.user.userId,
    });

    return this.managementService.unfreezeCard(cardId, req.user);
  }

  /**
   * 🗑️ Terminate a Maplerad card
   */
  @Delete(":cardId")
  async terminateCard(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("🗑️ CARD CONTROLLER - Terminate Card Request", {
      cardId,
      userId: req.user.userId,
    });

    return this.managementService.terminateCard(cardId, req.user);
  }

  /**
   * 📋 Get all Maplerad cards for the company
   */
  @Get()
  async getCompanyCards(
    @Request() req: any,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string
  ) {
    console.log("📋 CARD CONTROLLER - Get Company Cards Request", {
      page,
      limit,
      status,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.managementService.getCompanyCards(req.user);
  }

  /**
   * 💳 Get card balance (via getCard with reveal)
   */
  @Get(":cardId/balance")
  async getCardBalance(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("💳 CARD CONTROLLER - Get Card Balance Request", {
      cardId,
      userId: req.user.userId,
    });

    const cardResult = await this.managementService.getCard(
      cardId,
      req.user,
      true
    );

    return {
      card_id: cardId,
      balance: cardResult.card?.balance || 0,
      currency: cardResult.card?.currency || "USD",
    };
  }

  /**
   * 🔄 Update card limits (placeholder - not implemented in service)
   */
  // @Put(":cardId/limits")
  // async updateCardLimits(
  //   @Param("cardId") cardId: string,
  //   @Body() limits: { dailyLimit?: number; monthlyLimit?: number },
  //   @Request() req: any
  // ) {
  //   console.log("🔄 CARD CONTROLLER - Update Card Limits Request", {
  //     cardId,
  //     limits,
  //     userId: req.user.userId,
  //   });

  //   // Placeholder response - service doesn't implement this yet
  //   return {
  //     message: "Card limits update not yet implemented",
  //     card_id: cardId,
  //     requested_limits: limits,
  //   };
  // }
}
