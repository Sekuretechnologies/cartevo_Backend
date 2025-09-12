import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { MapleradService } from "./maplerad.service";
import {
  CreateCardDto,
  FundCardDto,
  WithdrawCardDto,
  CardResponseDto,
  CreateCardResponseDto,
  TransactionResponseDto,
} from "../card/dto/card.dto";
import {
  CurrentUser,
  CurrentUserData,
} from "@/modules/common/decorators/current-user.decorator";
import { CurrentBusiness } from "@/modules/common/decorators/current-business.decorator";
import { OwnerGuard } from "@/modules/common/guards/owner.guard";
import {
  CardManagementService,
  CardTransactionService,
} from "@/services/card/maplerad/controllers";

@ApiTags("Maplerad Cards")
@Controller("maplerad/cards")
@UseGuards(OwnerGuard)
export class MapleradController {
  constructor(private readonly mapleradService: MapleradService) {}

  @Post()
  @ApiOperation({ summary: "Create a new Maplerad card" })
  @ApiResponse({
    status: 201,
    description: "Card created successfully",
    type: CreateCardResponseDto,
  })
  async createCard(
    @Body() createCardDto: CreateCardDto,
    @CurrentUser() user: CurrentUserData
  ): Promise<CreateCardResponseDto> {
    const result = await CardManagementService.createCard(user, {
      brand: createCardDto.brand,
      color: "blue", // Default color since not in DTO
      name: createCardDto.name_on_card,
      amount: createCardDto.amount,
    });

    return result.output as CreateCardResponseDto;
  }

  @Post(":cardId/fund")
  @ApiOperation({ summary: "Fund a Maplerad card" })
  @ApiResponse({
    status: 200,
    description: "Card funded successfully",
  })
  async fundCard(
    @Param("cardId") cardId: string,
    @Body() fundCardDto: FundCardDto,
    @CurrentUser() user: CurrentUserData
  ): Promise<{ status: string; message: string }> {
    return this.mapleradService.fundCard(
      user.companyId,
      cardId,
      fundCardDto.amount,
      fundCardDto.customer_id
    );
  }

  @Post(":cardId/withdraw")
  @ApiOperation({ summary: "Withdraw from a Maplerad card" })
  @ApiResponse({
    status: 200,
    description: "Withdrawal successful",
  })
  async withdrawFromCard(
    @Param("cardId") cardId: string,
    @Body() withdrawCardDto: WithdrawCardDto,
    @CurrentUser() user: CurrentUserData
  ): Promise<{ status: string; message: string }> {
    return this.mapleradService.withdrawFromCard(
      user.companyId,
      cardId,
      withdrawCardDto.amount,
      withdrawCardDto.customer_id
    );
  }

  @Put(":cardId/freeze")
  @ApiOperation({ summary: "Freeze a Maplerad card" })
  @ApiResponse({
    status: 200,
    description: "Card frozen successfully",
  })
  async freezeCard(
    @Param("cardId") cardId: string,
    @Body() body: { customer_id: string },
    @CurrentUser() user: CurrentUserData
  ): Promise<{ success: boolean; message: string }> {
    return this.mapleradService.freezeCard(
      user.companyId,
      cardId,
      body.customer_id
    );
  }

  @Put(":cardId/unfreeze")
  @ApiOperation({ summary: "Unfreeze a Maplerad card" })
  @ApiResponse({
    status: 200,
    description: "Card unfrozen successfully",
  })
  async unfreezeCard(
    @Param("cardId") cardId: string,
    @Body() body: { customer_id: string },
    @CurrentUser() user: CurrentUserData
  ): Promise<{ success: boolean; message: string }> {
    return this.mapleradService.unfreezeCard(
      user.companyId,
      cardId,
      body.customer_id
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all Maplerad cards for company" })
  @ApiResponse({
    status: 200,
    description: "Cards retrieved successfully",
    type: [CardResponseDto],
  })
  async findAllByCompany(
    @CurrentUser() user: CurrentUserData
  ): Promise<CardResponseDto[]> {
    return this.mapleradService.findAllByCompany(user.companyId);
  }

  @Get(":cardId")
  @ApiOperation({ summary: "Get a specific Maplerad card" })
  @ApiResponse({
    status: 200,
    description: "Card retrieved successfully",
    type: CardResponseDto,
  })
  async findOne(
    @Param("cardId") cardId: string,
    @Query("reveal") reveal: boolean,
    @CurrentUser() user: CurrentUserData
  ): Promise<CardResponseDto> {
    return this.mapleradService.findOne(user.companyId, cardId, reveal);
  }

  @Get(":cardId/transactions")
  @ApiOperation({ summary: "Get transactions for a Maplerad card" })
  @ApiResponse({
    status: 200,
    description: "Transactions retrieved successfully",
    type: [TransactionResponseDto],
  })
  async getTransactions(
    @Param("cardId") cardId: string,
    @CurrentUser() user: CurrentUserData
  ): Promise<TransactionResponseDto[]> {
    return this.mapleradService.getTransactions(user.companyId, cardId);
  }
}
