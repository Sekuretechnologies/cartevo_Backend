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
    async updateKybStatus(companyId, updateKybStatusDto) {
        return this.companyService.updateKybStatus(companyId, updateKybStatusDto);
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
        { name: "memart", maxCount: 1 },
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
    __metadata("design:paramtypes", [company_dto_1.CreateCompanyUserDto]),
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
    (0, common_1.Patch)(":companyId/kyb-status"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
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
exports.CompanyController = CompanyController = __decorate([
    (0, swagger_1.ApiTags)("Company"),
    (0, common_1.Controller)("company"),
    __metadata("design:paramtypes", [company_service_1.CompanyService])
], CompanyController);
//# sourceMappingURL=company.controller.js.map