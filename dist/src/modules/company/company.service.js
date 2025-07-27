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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const companyModel_1 = require("../../models/prisma/companyModel");
const userModel_1 = require("../../models/prisma/userModel");
const walletModel_1 = require("../../models/prisma/walletModel");
const roleModel_1 = require("../../models/prisma/roleModel");
const userCompanyRoleModel_1 = require("../../models/prisma/userCompanyRoleModel");
let CompanyService = class CompanyService {
    constructor() { }
    async createCompanyUser(createDto) {
        try {
            const [existingUserResult, existingCompanyResult] = await Promise.all([
                userModel_1.default.getOne({ email: createDto.email_user }),
                companyModel_1.default.getOne({ email: createDto.email_company }),
            ]);
            const existingUser = existingUserResult.output;
            const existingCompany = existingCompanyResult.output;
            if (existingUser) {
                throw new common_1.ConflictException("User with this email already exists");
            }
            if (existingCompany) {
                throw new common_1.ConflictException("Company with this email already exists");
            }
            const hashedPassword = await bcrypt.hash(createDto.password_user, 12);
            const clientId = this.generateClientId();
            const clientKey = this.generateClientKey();
            const hashedClientKey = await bcrypt.hash(clientKey, 12);
            const result = await companyModel_1.default.operation(async (prisma) => {
                const companyResult = await companyModel_1.default.create({
                    name: createDto.name_company,
                    country: createDto.country_company,
                    email: createDto.email_company,
                    client_id: clientId,
                    client_key: hashedClientKey,
                });
                if (companyResult.error)
                    throw new common_1.BadRequestException(companyResult.error.message);
                const company = companyResult.output;
                const userResult = await userModel_1.default.create({
                    full_name: createDto.full_name_user,
                    email: createDto.email_user,
                    password: hashedPassword,
                    company_id: company.id,
                });
                if (userResult.error)
                    throw new common_1.BadRequestException(userResult.error.message);
                const user = userResult.output;
                let ownerRoleResult = await roleModel_1.default.getOne({ name: "owner" });
                let ownerRole = ownerRoleResult.output;
                if (!ownerRole) {
                    const roleCreateResult = await roleModel_1.default.create({ name: "owner" });
                    if (roleCreateResult.error)
                        throw new common_1.BadRequestException(roleCreateResult.error.message);
                    ownerRole = roleCreateResult.output;
                }
                const ucrResult = await userCompanyRoleModel_1.default.create({
                    user_id: user.id,
                    company_id: company.id,
                    role_id: ownerRole.id,
                });
                if (ucrResult.error)
                    throw new common_1.BadRequestException(ucrResult.error.message);
                const walletsResult = await Promise.all([
                    walletModel_1.default.create({
                        balance: 0,
                        active: true,
                        currency: "XAF",
                        country: "Cameroon",
                        country_iso_code: "CM",
                        company_id: company.id,
                    }),
                    walletModel_1.default.create({
                        balance: 2000,
                        active: true,
                        currency: "USD",
                        country: "USA",
                        country_iso_code: "USA",
                        company_id: company.id,
                    }),
                ]);
                const wallets = walletsResult.map((w) => w.output);
                return { company, user, wallets };
            });
            return {
                status: true,
                message: "Company and owner user created successfully. Proceed to next step.",
                user: this.mapUserToResponseDto(result.user),
                company: this.mapCompanyToResponseDto(result.company, clientKey),
                wallets: result.wallets.map((wallet) => this.mapWalletToResponseDto(wallet)),
            };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException({
                success: false,
                message: "Une erreur est survenue lors de l'enregistrement",
                error: error.message,
            });
        }
    }
    async getCompanyBalance(companyId) {
        const walletsResult = await walletModel_1.default.get({
            company_id: companyId,
            active: true,
        });
        if (walletsResult.error) {
            throw new common_1.BadRequestException(walletsResult.error.message);
        }
        const wallets = walletsResult.output;
        return {
            wallets: wallets.map((wallet) => this.mapWalletToResponseDto(wallet)),
        };
    }
    generateClientId() {
        const prefix = "client_";
        const randomPart = Math.random().toString(36).substring(2, 15);
        return prefix + randomPart;
    }
    generateClientKey() {
        const length = 32;
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
    mapCompanyToResponseDto(company, clientKey) {
        return {
            id: company.id,
            name: company.name,
            country: company.country,
            email: company.email,
            client_id: company.client_id,
            client_key: clientKey || "***hidden***",
            card_price: parseFloat(company.card_price?.toString() || "5.00"),
            card_fund_rate: parseFloat(company.card_fund_rate?.toString() || "1.02"),
            created_at: company.created_at,
            updated_at: company.updated_at,
        };
    }
    mapUserToResponseDto(user) {
        return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            company_id: user.company_id,
            step: user.step,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }
    mapWalletToResponseDto(wallet) {
        return {
            id: wallet.id,
            balance: parseFloat(wallet.balance.toString()),
            active: wallet.active,
            currency: wallet.currency,
            country: wallet.country,
            country_iso_code: wallet.country_iso_code,
            company_id: wallet.company_id,
            created_at: wallet.created_at,
            updated_at: wallet.updated_at,
        };
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CompanyService);
//# sourceMappingURL=company.service.js.map