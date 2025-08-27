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
const platform_express_1 = require("@nestjs/platform-express");
const company_service_1 = require("./company.service");
const userModel_1 = require("../../models/prisma/userModel");
const company_dto_1 = require("./dto/company.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_business_decorator_1 = require("../common/decorators/current-business.decorator");
let CompanyController = class CompanyController {
    constructor(companyService) {
        this.companyService = companyService;
    }
    async registerPersonalInfo(personalInfoDto, files) {
        return this.companyService.registerPersonalInfo(personalInfoDto, files);
    }
    async registerBusinessInfo(businessInfoDto, files) {
        return this.companyService.registerBusinessInfo(businessInfoDto, files);
    }
    async registerCompanyUser(createDto) {
        return this.companyService.createCompanyUser(createDto);
    }
    async getCompanyWallets(business) {
        return this.companyService.getCompanyBalance(business.businessId);
    }
    async getCompanyTransactions(business) {
        return this.companyService.getCompanyTransactions(business.businessId);
    }
    async getAllCompanies() {
        return this.companyService.getAllCompanies();
    }
    async getCompanyById(companyId) {
        return this.companyService.getCompanyById(companyId);
    }
    async updateKybStatus(companyId, updateKybStatusDto) {
        return this.companyService.updateKybStatus(companyId, updateKybStatusDto);
    }
    async createExchangeRate(business, createExchangeRateDto) {
        return this.companyService.createExchangeRate(business.businessId, createExchangeRateDto);
    }
    async getCompanyExchangeRates(business) {
        return this.companyService.getCompanyExchangeRates(business.businessId);
    }
    async updateExchangeRate(exchangeRateId, updateExchangeRateDto) {
        return this.companyService.updateExchangeRate(exchangeRateId, updateExchangeRateDto);
    }
    async deleteExchangeRate(exchangeRateId) {
        return this.companyService.deleteExchangeRate(exchangeRateId);
    }
    async convertCurrency(business, currencyConversionDto) {
        return this.companyService.convertCurrency(business.businessId, currencyConversionDto.amount, currencyConversionDto.fromCurrency, currencyConversionDto.toCurrency);
    }
    async createTransactionFee(business, createTransactionFeeDto) {
        return this.companyService.createTransactionFee(business.businessId, createTransactionFeeDto);
    }
    async getCompanyTransactionFees(business) {
        return this.companyService.getCompanyTransactionFees(business.businessId);
    }
    async updateTransactionFee(feeId, updateTransactionFeeDto) {
        return this.companyService.updateTransactionFee(feeId, updateTransactionFeeDto);
    }
    async deleteTransactionFee(feeId) {
        return this.companyService.deleteTransactionFee(feeId);
    }
    async calculateTransactionFee(business, calculateTransactionFeeDto) {
        return this.companyService.calculateTransactionFee(business.businessId, calculateTransactionFeeDto.amount, calculateTransactionFeeDto.transactionType, calculateTransactionFeeDto.transactionCategory, calculateTransactionFeeDto.countryIsoCode, calculateTransactionFeeDto.currency);
    }
    async completeKyc(business, completeKycDto, files) {
        return this.companyService.completeKyc(business.businessId, completeKycDto, files);
    }
    async completeKyb(business, completeKybDto, files) {
        return this.companyService.completeKyb(business.businessId, completeKybDto, files);
    }
    async addBankingInfo(business, bankingInfoDto) {
        return this.companyService.addBankingInfo(business.businessId, bankingInfoDto);
    }
    async completeProfile(business, completeProfileDto) {
        return this.companyService.completeProfile(business.businessId, completeProfileDto);
    }
    async getOnboardingStatus(business) {
        const userResult = await userModel_1.default.getOne({
            company_id: business.businessId,
        });
        if (userResult.error || !userResult.output) {
            throw new common_1.NotFoundException("User not found for this company");
        }
        const user = userResult.output;
        return this.companyService.getOnboardingStatus(business.businessId, user.id);
    }
};
exports.CompanyController = CompanyController;
__decorate([
    (0, common_1.Post)("register/step1"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "id_document_front", maxCount: 1 },
        { name: "id_document_back", maxCount: 1 },
        { name: "proof_of_address", maxCount: 1 },
    ])),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiOperation)({
        summary: "Step 1: Register personal information and create company",
        description: "Register personal information and create company with basic details. This is the first step of the 2-step registration process.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Personal information registered successfully",
        type: company_dto_1.PersonalInfoResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or registration failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: "User already exists",
        type: company_dto_1.CheckExistingUserResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [company_dto_1.PersonalInfoDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "registerPersonalInfo", null);
__decorate([
    (0, common_1.Post)("register/step2"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "share_holding_document", maxCount: 1 },
        { name: "incorporation_certificate", maxCount: 1 },
        { name: "proof_of_address", maxCount: 1 },
    ])),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiOperation)({
        summary: "Step 2: Complete business information",
        description: "Complete the company registration by providing business information. This is the second step of the 2-step registration process.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Business information completed successfully",
        type: company_dto_1.BusinessInfoResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or company not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Company not found or step 1 not completed",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [company_dto_1.BusinessInfoDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "registerBusinessInfo", null);
__decorate([
    (0, common_1.Post)("register"),
    (0, swagger_1.ApiOperation)({
        summary: "Register new company and owner user (Legacy)",
        description: 'Register a new company and its first user (assigned the "owner" role), generate client credentials, and create default wallets. This is the legacy single-step registration.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Company and owner user created successfully",
        type: company_dto_1.CreateCompanyUserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or registration failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: "User or company email already exists",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [company_dto_1.CompanyUserDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "registerCompanyUser", null);
__decorate([
    (0, common_1.Get)("wallets"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Get company wallets",
        description: "Get all active wallets for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Company wallets retrieved successfully",
        type: [company_dto_1.WalletResponseDto],
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getCompanyWallets", null);
__decorate([
    (0, common_1.Get)("transactions"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Get company transactions",
        description: "Get all active transactions for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Company transactions retrieved successfully",
        type: [company_dto_1.TransactionResponseDto],
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getCompanyTransactions", null);
__decorate([
    (0, common_1.Get)("admin"),
    (0, swagger_1.ApiOperation)({
        summary: "Get all companies",
        description: "Get all companies",
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getAllCompanies", null);
__decorate([
    (0, common_1.Get)("admin/:companyId"),
    (0, swagger_1.ApiOperation)({
        summary: "Get company by Id",
        description: "Get company by Id",
    }),
    __param(0, (0, common_1.Param)("companyId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getCompanyById", null);
__decorate([
    (0, common_1.Patch)(":companyId/kyb-status"),
    (0, swagger_1.ApiOperation)({
        summary: "Update company KYB status",
        description: "Update the KYB (Know Your Business) status for a company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "KYB status updated successfully",
        type: company_dto_1.UpdateKybStatusResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Company not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)("companyId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, company_dto_1.UpdateKybStatusDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "updateKybStatus", null);
__decorate([
    (0, common_1.Post)("exchange-rates"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Create exchange rate",
        description: "Create a new exchange rate for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Exchange rate created successfully",
        type: company_dto_1.ExchangeRateResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or creation failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.CreateExchangeRateDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "createExchangeRate", null);
__decorate([
    (0, common_1.Get)("exchange-rates"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Get company exchange rates",
        description: "Get all exchange rates for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Exchange rates retrieved successfully",
        type: [company_dto_1.ExchangeRateResponseDto],
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getCompanyExchangeRates", null);
__decorate([
    (0, common_1.Patch)("exchange-rates/:exchangeRateId"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Update exchange rate",
        description: "Update an existing exchange rate for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Exchange rate updated successfully",
        type: company_dto_1.ExchangeRateResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or update failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Exchange rate not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)("exchangeRateId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, company_dto_1.UpdateExchangeRateDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "updateExchangeRate", null);
__decorate([
    (0, common_1.Delete)("exchange-rates/:exchangeRateId"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Delete exchange rate",
        description: "Delete an exchange rate for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Exchange rate deleted successfully",
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Exchange rate not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)("exchangeRateId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "deleteExchangeRate", null);
__decorate([
    (0, common_1.Post)("exchange-rates/convert"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Convert currency",
        description: "Convert currency using the authenticated company's exchange rates",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Currency conversion successful",
        type: company_dto_1.CurrencyConversionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or conversion failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.CurrencyConversionDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "convertCurrency", null);
__decorate([
    (0, common_1.Post)("transaction-fees"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Create transaction fee",
        description: "Create a new transaction fee for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "Transaction fee created successfully",
        type: company_dto_1.TransactionFeeResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or creation failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.CreateTransactionFeeDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "createTransactionFee", null);
__decorate([
    (0, common_1.Get)("transaction-fees"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Get company transaction fees",
        description: "Get all transaction fees for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Transaction fees retrieved successfully",
        type: [company_dto_1.TransactionFeeResponseDto],
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getCompanyTransactionFees", null);
__decorate([
    (0, common_1.Patch)("transaction-fees/:feeId"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Update transaction fee",
        description: "Update an existing transaction fee for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Transaction fee updated successfully",
        type: company_dto_1.TransactionFeeResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or update failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Transaction fee not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)("feeId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, company_dto_1.UpdateTransactionFeeDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "updateTransactionFee", null);
__decorate([
    (0, common_1.Delete)("transaction-fees/:feeId"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Delete transaction fee",
        description: "Delete a transaction fee for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Transaction fee deleted successfully",
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Transaction fee not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)("feeId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "deleteTransactionFee", null);
__decorate([
    (0, common_1.Post)("transaction-fees/calculate"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Calculate transaction fee",
        description: "Calculate fee for a transaction using the authenticated company's fee structure",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Transaction fee calculated successfully",
        type: company_dto_1.CalculateTransactionFeeResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or calculation failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.CalculateTransactionFeeDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "calculateTransactionFee", null);
__decorate([
    (0, common_1.Post)("onboarding/kyc"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "id_document_front", maxCount: 1 },
        { name: "id_document_back", maxCount: 1 },
        { name: "proof_of_address", maxCount: 1 },
    ])),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiOperation)({
        summary: "Complete KYC information",
        description: "Complete Know Your Customer verification for the authenticated user",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "KYC information completed successfully",
        type: company_dto_1.CompleteKycResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or KYC completion failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "User not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.CompleteKycDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "completeKyc", null);
__decorate([
    (0, common_1.Post)("onboarding/kyb"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "share_holding_document", maxCount: 1 },
        { name: "incorporation_certificate", maxCount: 1 },
        { name: "business_proof_of_address", maxCount: 1 },
    ])),
    (0, swagger_1.ApiConsumes)("multipart/form-data"),
    (0, swagger_1.ApiOperation)({
        summary: "Complete KYB information",
        description: "Complete Know Your Business verification for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "KYB information completed successfully",
        type: company_dto_1.CompleteKybResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or KYB completion failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Company not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.CompleteKybDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "completeKyb", null);
__decorate([
    (0, common_1.Post)("onboarding/banking"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Add banking information",
        description: "Add banking details for the authenticated company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Banking information added successfully",
        type: company_dto_1.BankingInfoResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or banking info addition failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Company not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.BankingInfoDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "addBankingInfo", null);
__decorate([
    (0, common_1.Post)("onboarding/profile"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Complete user profile",
        description: "Complete additional user profile information",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Profile information completed successfully",
        type: company_dto_1.CompleteProfileResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error or profile completion failed",
        type: company_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "User not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, company_dto_1.CompleteProfileDto]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "completeProfile", null);
__decorate([
    (0, common_1.Get)("onboarding/status"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Get onboarding status",
        description: "Get the current onboarding status for the authenticated company and user",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Onboarding status retrieved successfully",
        type: company_dto_1.OnboardingStatusDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "Company or user not found",
        type: company_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_business_decorator_1.CurrentBusiness)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanyController.prototype, "getOnboardingStatus", null);
exports.CompanyController = CompanyController = __decorate([
    (0, swagger_1.ApiTags)("Company"),
    (0, common_1.Controller)("company"),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], CompanyController);
//# sourceMappingURL=company.controller.js.map