"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const card_service_1 = require("./card.service");
const card_dto_1 = require("./dto/card.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_business_decorator_1 = require("../common/decorators/current-business.decorator");
const response_dto_1 = require("../common/dto/response.dto");
let CardController = class CardController {
    constructor(cardService) {
        this.cardService = cardService;
    }
    async create(business, createCardDto) {
        return this.cardService.createCard(createCardDto);
    }
    async fundCard(business, cardId, fundDto) {
        const result = await this.cardService.fundCard(business.businessId, cardId, fundDto.amount);
        return {
            status: result.status,
            message: result.message,
        };
    }
    async withdrawFromCard(business, cardId, withdrawDto) {
        const result = await this.cardService.withdrawFromCard(business.businessId, cardId, withdrawDto.amount);
        return {
            status: result.status,
            message: result.message,
        };
    }
    async freezeCard(business, cardId) {
        const result = await this.cardService.freezeCard(business.businessId, cardId);
        return {
            success: result.success,
            message: result.message,
        };
    }
    async unfreezeCard(business, cardId) {
        const result = await this.cardService.unfreezeCard(business.businessId, cardId);
        return {
            success: result.success,
            message: result.message,
        };
    }
    async findAll(business) {
        return this.cardService.findAllByCompany(business.businessId);
    }
    async findOne(business, cardId) {
        return this.cardService.findOne(business.businessId, cardId);
    }
    async getCardTransactions(business, cardId) {
        return this.cardService.getTransactions(business.businessId, cardId);
    }
};
exports.CardController = CardController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: "Create virtual card",
        description: "Issue a new virtual card for a registered customer. Card creation costs the company the card_price from their USD wallet.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Card created successfully",
        type: card_dto_1.CreateCardResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Customer not found",
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Insufficient wallet balance to create card",
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, card_dto_1.CreateCardDto]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(":id/fund"),
    (0, swagger_1.ApiOperation)({
        summary: "Fund card",
        description: "Add funds to a card from the company USD wallet. The actual cost is amount × card_fund_rate.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Card funded successfully",
        type: response_dto_1.SuccessResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Insufficient wallet balance or card is frozen",
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Card not found",
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, card_dto_1.FundCardDto]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "fundCard", null);
__decorate([
    (0, common_1.Post)(":id/withdraw"),
    (0, swagger_1.ApiOperation)({
        summary: "Withdraw funds",
        description: "Withdraw funds from a card back to company USD wallet",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Funds withdrawn successfully",
        type: response_dto_1.SuccessResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Insufficient card balance or card is frozen",
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Card not found",
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, card_dto_1.WithdrawCardDto]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "withdrawFromCard", null);
__decorate([
    (0, common_1.Post)(":id/freeze"),
    (0, swagger_1.ApiOperation)({
        summary: "Freeze card",
        description: "Freeze a card to prevent transactions",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Card frozen successfully",
        type: response_dto_1.SuccessResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Card not found or terminated",
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Card is already frozen",
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "freezeCard", null);
__decorate([
    (0, common_1.Post)(":id/unfreeze"),
    (0, swagger_1.ApiOperation)({
        summary: "Unfreeze card",
        description: "Unfreeze a card to allow transactions",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Card unfrozen successfully",
        type: response_dto_1.SuccessResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Card not found or terminated",
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Card is not frozen",
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "unfreezeCard", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: "List all cards",
        description: "Retrieve all cards issued by the company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Cards retrieved successfully",
        type: [card_dto_1.CardResponseDto],
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiOperation)({
        summary: "Get card details",
        description: "Get detailed info for a single card",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Card details retrieved successfully",
        type: card_dto_1.CardResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Card not found",
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(":id/transactions"),
    (0, swagger_1.ApiOperation)({
        summary: "Get card transactions",
        description: "Get all transactions for a specific card",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Card transactions retrieved successfully",
        type: [card_dto_1.TransactionResponseDto],
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Card not found",
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CardController.prototype, "getCardTransactions", null);
exports.CardController = CardController = __decorate([
    (0, swagger_1.ApiTags)("Cards"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)("cards"),
    __metadata("design:paramtypes", [card_service_1.CardService])
], CardController);
//# sourceMappingURL=card.controller.js.map