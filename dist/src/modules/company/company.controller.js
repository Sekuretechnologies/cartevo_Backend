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
exports.CompanyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const company_service_1 = require("./company.service");
const company_dto_1 = require("./dto/company.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_business_decorator_1 = require("../common/decorators/current-business.decorator");
let CompanyController = class CompanyController {
    constructor(companyService) {
        this.companyService = companyService;
    }
    async registerCompanyUser(createDto) {
        return this.companyService.createCompanyUser(createDto);
    }
    async getCompanyWallets(business) {
        return this.companyService.getCompanyBalance(business.businessId);
    }
};
exports.CompanyController = CompanyController;
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({
        summary: 'Register new company and owner user',
        description: 'Register a new company and its first user (assigned the "owner" role), generate client credentials, and create default wallets.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Company and owner user created successfully',
        type: company_dto_1.CreateCompanyUserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Validation error or registration failed',
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'User or company email already exists',
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [company_dto_1.CreateCompanyUserDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "registerCompanyUser", null);
__decorate([
    (0, common_1.Get)('wallets'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: 'Get company wallets',
        description: 'Get all active wallets for the authenticated company',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Company wallets retrieved successfully',
        type: [company_dto_1.WalletResponseDto],
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getCompanyWallets", null);
exports.CompanyController = CompanyController = __decorate([
    (0, swagger_1.ApiTags)('Company'),
    (0, common_1.Controller)('company'),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], CompanyController);
//# sourceMappingURL=company.controller.js.map