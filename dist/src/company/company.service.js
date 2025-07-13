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
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcrypt");
let CompanyService = class CompanyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCompanyUser(createDto) {
        try {
            const [existingUser, existingCompany] = await Promise.all([
                this.prisma.user.findUnique({
                    where: { email: createDto.email_user },
                }),
                this.prisma.company.findUnique({
                    where: { email: createDto.email_company },
                }),
            ]);
            if (existingUser) {
                throw new common_1.ConflictException('User with this email already exists');
            }
            if (existingCompany) {
                throw new common_1.ConflictException('Company with this email already exists');
            }
            const hashedPassword = await bcrypt.hash(createDto.password_user, 12);
            const clientId = this.generateClientId();
            const clientKey = this.generateClientKey();
            const hashedClientKey = await bcrypt.hash(clientKey, 12);
            const result = await this.prisma.$transaction(async (prisma) => {
                const company = await prisma.company.create({
                    data: {
                        name: createDto.name_company,
                        country: createDto.country_company,
                        email: createDto.email_company,
                        clientId,
                        clientKey: hashedClientKey,
                    },
                });
                const user = await prisma.user.create({
                    data: {
                        fullName: createDto.full_name_user,
                        email: createDto.email_user,
                        password: hashedPassword,
                        companyId: company.id,
                    },
                });
                let ownerRole = await prisma.role.findUnique({
                    where: { name: 'owner' },
                });
                if (!ownerRole) {
                    ownerRole = await prisma.role.create({
                        data: { name: 'owner' },
                    });
                }
                await prisma.userCompanyRole.create({
                    data: {
                        userId: user.id,
                        companyId: company.id,
                        roleId: ownerRole.id,
                    },
                });
                const wallets = await Promise.all([
                    prisma.wallet.create({
                        data: {
                            balance: 0,
                            active: true,
                            currency: 'XAF',
                            country: 'Cameroon',
                            countryIsoCode: 'CM',
                            companyId: company.id,
                        },
                    }),
                    prisma.wallet.create({
                        data: {
                            balance: 2000,
                            active: true,
                            currency: 'USD',
                            country: 'USA',
                            countryIsoCode: 'USA',
                            companyId: company.id,
                        },
                    }),
                ]);
                return { company, user, wallets };
            });
            return {
                status: true,
                message: 'Company and owner user created successfully. Proceed to next step.',
                user: this.mapUserToResponseDto(result.user),
                company: this.mapCompanyToResponseDto(result.company, clientKey),
                wallets: result.wallets.map(wallet => this.mapWalletToResponseDto(wallet)),
            };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException({
                success: false,
                message: 'Une erreur est survenue lors de l\'enregistrement',
                error: error.message,
            });
        }
    }
    async getCompanyBalance(companyId) {
        const wallets = await this.prisma.wallet.findMany({
            where: {
                companyId,
                active: true,
            },
        });
        return {
            wallets: wallets.map(wallet => this.mapWalletToResponseDto(wallet)),
        };
    }
    generateClientId() {
        const prefix = 'client_';
        const randomPart = Math.random().toString(36).substring(2, 15);
        return prefix + randomPart;
    }
    generateClientKey() {
        const length = 32;
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
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
            client_id: company.clientId,
            client_key: clientKey || '***hidden***',
            card_price: parseFloat(company.cardPrice?.toString() || '5.00'),
            card_fund_rate: parseFloat(company.cardFundRate?.toString() || '1.02'),
            created_at: company.createdAt,
            updated_at: company.updatedAt,
        };
    }
    mapUserToResponseDto(user) {
        return {
            id: user.id,
            full_name: user.fullName,
            email: user.email,
            company_id: user.companyId,
            step: user.step,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
        };
    }
    mapWalletToResponseDto(wallet) {
        return {
            id: wallet.id,
            balance: parseFloat(wallet.balance.toString()),
            active: wallet.active,
            currency: wallet.currency,
            country: wallet.country,
            country_iso_code: wallet.countryIsoCode,
            company_id: wallet.companyId,
            created_at: wallet.createdAt,
            updated_at: wallet.updatedAt,
        };
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompanyService);
//# sourceMappingURL=company.service.js.map