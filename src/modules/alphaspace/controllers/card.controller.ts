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
import { AlphaSpaceMaintenanceGuard } from "../guards/alphaspace-maintenance.guard";
import { CardIssuanceService } from "../services/card.issuance.service";
import { CardFundService } from "../services/card.fund.service";
import { CardWithdrawService } from "../services/card.withdraw.service";
import { CardManagementService } from "../services/card.management.service";
import { CreateCardDto } from "../dto/create-card.dto";
import { FundCardDto } from "../dto/fund-card.dto";
import { WithdrawCardDto } from "../dto/withdraw-card.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

/**
 * 🎯 MONIX-STYLE: Dedicated AlphaSpace Card Operations Controller
 * Handles all AlphaSpace card-related operations with modular services
 */
@ApiTags("AlphaSpace Cards")
@ApiBearerAuth()
@Controller("alphaspace/cards")
@UseGuards(JwtAuthGuard, AlphaSpaceMaintenanceGuard)
export class AlphaSpaceCardController {
  constructor(
    private readonly issuanceService: CardIssuanceService,
    private readonly fundService: CardFundService,
    private readonly withdrawService: CardWithdrawService,
    private readonly managementService: CardManagementService
  ) {}

  /**
   * 🚀 Create a new AlphaSpace virtual card (Drop-in replacement for Maplerad)
   */
  @Post()
  async createCard(@Body() createCardDto: CreateCardDto, @Request() req: any) {
    console.log("🚀 ALPHASPACE CARD CONTROLLER - Create Card Request", {
      customerId: createCardDto.customer_id,
      brand: createCardDto.brand,
      amount: createCardDto.amount,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    // Convert string brand to literal union type
    let brand: "VISA" | "MASTERCARD" | undefined;
    if (createCardDto.brand?.toUpperCase() === "VISA") {
      brand = "VISA";
    } else if (createCardDto.brand?.toUpperCase() === "MASTERCARD") {
      brand = "MASTERCARD";
    }

    return this.issuanceService.createCard({
      customer_id: createCardDto.customer_id,
      company_id: req.user.companyId,
      brand: brand,
      name_on_card: createCardDto.name_on_card,
      amount: createCardDto.amount,
    });
  }

  /**
   * 💰 Fund an existing AlphaSpace card
   */
  @Post(":cardId/fund")
  async fundCard(
    @Param("cardId") cardId: string,
    @Body() fundCardDto: FundCardDto,
    @Request() req: any
  ) {
    console.log("💰 ALPHASPACE CARD CONTROLLER - Fund Card Request", {
      cardId,
      customerId: fundCardDto.customer_id,
      amount: fundCardDto.amount,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.fundService.fundCard(cardId, fundCardDto.amount, req.user);
  }

  /**
   * 💸 Withdraw from an AlphaSpace card to company wallet
   */
  @Post(":cardId/withdraw")
  async withdrawFromCard(
    @Param("cardId") cardId: string,
    @Body() withdrawCardDto: WithdrawCardDto,
    @Request() req: any
  ) {
    console.log("💸 ALPHASPACE CARD CONTROLLER - Withdraw Card Request", {
      cardId,
      customerId: withdrawCardDto.customer_id,
      amount: withdrawCardDto.amount,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.withdrawService.withdrawFromCard(
      cardId,
      withdrawCardDto.amount,
      req.user
    );
  }

  /**
   * 🔍 Get AlphaSpace card details
   */
  @Get(":cardId")
  async getCard(
    @Param("cardId") cardId: string,
    @Query("reveal") reveal: string,
    @Request() req: any
  ) {
    console.log("🔍 ALPHASPACE CARD CONTROLLER - Get Card Request", {
      cardId,
      reveal: reveal === "true",
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.managementService.getCard(cardId, req.user, reveal === "true");
  }

  /**
   * 📊 Get AlphaSpace card funding history
   */
  @Get(":cardId/funding-history")
  async getCardFundingHistory(
    @Param("cardId") cardId: string,
    @Query("limit") limit: number = 20,
    @Request() req: any
  ) {
    console.log(
      "📊 ALPHASPACE CARD CONTROLLER - Get Card Funding History Request",
      {
        cardId,
        limit,
        userId: req.user.userId,
        companyId: req.user.companyId,
      }
    );

    return this.fundService.getCardFundingHistory(cardId, req.user, {
      limit,
    });
  }

  /**
   * 🧊 Freeze an AlphaSpace card
   */
  @Put(":cardId/freeze")
  async freezeCard(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("🧊 ALPHASPACE CARD CONTROLLER - Freeze Card Request", {
      cardId,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.managementService.freezeCard(cardId, req.user);
  }

  /**
   * 🔥 Unfreeze an AlphaSpace card
   */
  @Put(":cardId/unfreeze")
  async unfreezeCard(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("🔥 ALPHASPACE CARD CONTROLLER - Unfreeze Card Request", {
      cardId,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.managementService.unfreezeCard(cardId, req.user);
  }

  /**
   * 🗑️ Terminate an AlphaSpace card with balance refund
   */
  @Delete(":cardId")
  async terminateCard(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("🗑️ ALPHASPACE CARD CONTROLLER - Terminate Card Request", {
      cardId,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.managementService.terminateCard(cardId, req.user);
  }

  /**
   * 📋 Get all AlphaSpace cards for the company
   */
  @Get()
  async getCompanyCards(
    @Request() req: any,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string,
    @Query("sync") sync?: string
  ) {
    console.log("📋 ALPHASPACE CARD CONTROLLER - Get Company Cards Request", {
      page,
      limit,
      status,
      sync: sync === "true",
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    return this.managementService.getCompanyCards(req.user);
  }

  /**
   * 💳 Get AlphaSpace card balance (via getCard with reveal)
   */
  @Get(":cardId/balance")
  async getCardBalance(@Param("cardId") cardId: string, @Request() req: any) {
    console.log("💳 ALPHASPACE CARD CONTROLLER - Get Card Balance Request", {
      cardId,
      userId: req.user.userId,
      companyId: req.user.companyId,
    });

    const cardResult = await this.managementService.getCard(
      cardId,
      req.user,
      true
    );

    return {
      card_id: cardId,
      balance: cardResult.data?.balance || 0,
      currency: cardResult.data?.currency || "USD",
    };
  }
}
