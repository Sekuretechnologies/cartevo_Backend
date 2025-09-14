import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CardService } from "./card.service";
import {
  CreateCardDto,
  FundCardDto,
  WithdrawCardDto,
  CardResponseDto,
  CreateCardResponseDto,
  TransactionResponseDto,
} from "./dto/card.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "../common/decorators/current-user.decorator";
import { SuccessResponseDto } from "../common/dto/response.dto";

@ApiTags("Cards")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cards")
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  @ApiOperation({
    summary: "Create virtual card",
    description:
      "Issue a new virtual card for a registered customer. Card creation costs the company the card_price from their USD wallet.",
  })
  @ApiResponse({
    status: 201,
    description: "Card created successfully",
    type: CreateCardResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Customer not found",
  })
  @ApiResponse({
    status: 400,
    description: "Insufficient wallet balance to create card",
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createCardDto: CreateCardDto
  ): Promise<CreateCardResponseDto> {
    return this.cardService.createCard(createCardDto);
  }

  @Post(":id/fund")
  @ApiOperation({
    summary: "Fund card",
    description:
      "Add funds to a card from the company USD wallet. The actual cost is amount × card_fund_rate.",
  })
  @ApiResponse({
    status: 200,
    description: "Card funded successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Insufficient wallet balance or card is frozen",
  })
  @ApiResponse({
    status: 404,
    description: "Card not found",
  })
  async fundCard(
    @CurrentUser() user: CurrentUserData,
    @Param("id") cardId: string,
    @Body() fundDto: FundCardDto
  ): Promise<SuccessResponseDto> {
    // Use first company as default for now - should be updated to accept company_id parameter
    const companyId = user.companies?.[0]?.companyId;
    if (!companyId) {
      throw new Error("User does not belong to any company");
    }

    const result = await this.cardService.fundCard(
      companyId,
      cardId,
      fundDto.amount
    );
    return {
      status: result.status,
      message: result.message,
    };
  }

  @Post(":id/withdraw")
  @ApiOperation({
    summary: "Withdraw funds",
    description: "Withdraw funds from a card back to company USD wallet",
  })
  @ApiResponse({
    status: 200,
    description: "Funds withdrawn successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Insufficient card balance or card is frozen",
  })
  @ApiResponse({
    status: 404,
    description: "Card not found",
  })
  async withdrawFromCard(
    @CurrentUser() user: CurrentUserData,
    @Param("id") cardId: string,
    @Body() withdrawDto: WithdrawCardDto
  ): Promise<SuccessResponseDto> {
    // Use first company as default for now - should be updated to accept company_id parameter
    const companyId = user.companies?.[0]?.companyId;
    if (!companyId) {
      throw new Error("User does not belong to any company");
    }

    const result = await this.cardService.withdrawFromCard(
      companyId,
      cardId,
      withdrawDto.amount
    );
    return {
      status: result.status,
      message: result.message,
    };
  }

  @Post(":id/freeze")
  @ApiOperation({
    summary: "Freeze card",
    description: "Freeze a card to prevent transactions",
  })
  @ApiResponse({
    status: 200,
    description: "Card frozen successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Card not found or terminated",
  })
  @ApiResponse({
    status: 400,
    description: "Card is already frozen",
  })
  async freezeCard(
    @CurrentUser() user: CurrentUserData,
    @Param("id") cardId: string
  ): Promise<SuccessResponseDto> {
    // Use first company as default for now - should be updated to accept company_id parameter
    const companyId = user.companies?.[0]?.companyId;
    if (!companyId) {
      throw new Error("User does not belong to any company");
    }

    const result = await this.cardService.freezeCard(companyId, cardId);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post(":id/unfreeze")
  @ApiOperation({
    summary: "Unfreeze card",
    description: "Unfreeze a card to allow transactions",
  })
  @ApiResponse({
    status: 200,
    description: "Card unfrozen successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Card not found or terminated",
  })
  @ApiResponse({
    status: 400,
    description: "Card is not frozen",
  })
  async unfreezeCard(
    @CurrentUser() user: CurrentUserData,
    @Param("id") cardId: string
  ): Promise<SuccessResponseDto> {
    // Use first company as default for now - should be updated to accept company_id parameter
    const companyId = user.companies?.[0]?.companyId;
    if (!companyId) {
      throw new Error("User does not belong to any company");
    }

    const result = await this.cardService.unfreezeCard(companyId, cardId);
    return {
      success: result.success,
      message: result.message,
    };
  }

  // @Post(":id/terminate")
  // @ApiOperation({
  //   summary: "Terminate card",
  //   description:
  //     "Permanently terminate a card and return remaining balance to company USD wallet",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: "Card terminated successfully",
  //   type: SuccessResponseDto,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: "Card not found or already terminated",
  // })
  // async terminateCard(
  //   @CurrentBusiness() business: CurrentBusinessData,
  //   @Param("id") cardId: string
  // ): Promise<SuccessResponseDto> {
  //   const result = await this.cardService.terminateCard(
  //     business.businessId,
  //     cardId
  //   );
  //   return {
  //     success: result.success,
  //     message: result.message,
  //   };
  // }

  @Get()
  @ApiOperation({
    summary: "List all cards",
    description: "Retrieve all cards issued by the company",
  })
  @ApiResponse({
    status: 200,
    description: "Cards retrieved successfully",
    type: [CardResponseDto],
  })
  async findAll(
    @CurrentUser() user: CurrentUserData
  ): Promise<CardResponseDto[]> {
    // Use first company as default for now - should be updated to accept company_id parameter
    const companyId = user.companies?.[0]?.companyId;
    if (!companyId) {
      throw new Error("User does not belong to any company");
    }

    return this.cardService.findAllByCompany(companyId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get card details",
    description: "Get detailed info for a single card",
  })
  @ApiResponse({
    status: 200,
    description: "Card details retrieved successfully",
    type: CardResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Card not found",
  })
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param("id") cardId: string
  ): Promise<CardResponseDto> {
    // Use first company as default for now - should be updated to accept company_id parameter
    const companyId = user.companies?.[0]?.companyId;
    if (!companyId) {
      throw new Error("User does not belong to any company");
    }

    return this.cardService.findOne(companyId, cardId);
  }

  @Get(":id/transactions")
  @ApiOperation({
    summary: "Get card transactions",
    description: "Get all transactions for a specific card",
  })
  @ApiResponse({
    status: 200,
    description: "Card transactions retrieved successfully",
    type: [TransactionResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: "Card not found",
  })
  async getCardTransactions(
    @CurrentUser() user: CurrentUserData,
    @Param("id") cardId: string
  ): Promise<TransactionResponseDto[]> {
    // Use first company as default for now - should be updated to accept company_id parameter
    const companyId = user.companies?.[0]?.companyId;
    if (!companyId) {
      throw new Error("User does not belong to any company");
    }

    return this.cardService.getTransactions(companyId, cardId);
  }
}
