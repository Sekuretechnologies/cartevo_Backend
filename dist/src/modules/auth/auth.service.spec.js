"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const library_1 = require("@prisma/client/runtime/library");
const auth_service_1 = require("./auth.service");
const prisma_service_1 = require("../prisma/prisma.service");
describe("AuthService", () => {
    let service;
    let prismaService;
    let jwtService;
    let configService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: {
                        company: {
                            findUnique: jest.fn(),
                        },
                    },
                },
                {
                    provide: jwt_1.JwtService,
                    useValue: {
                        sign: jest.fn(),
                    },
                },
                {
                    provide: config_1.ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        prismaService = module.get(prisma_service_1.PrismaService);
        jwtService = module.get(jwt_1.JwtService);
        configService = module.get(config_1.ConfigService);
    });
    it("should be defined", () => {
        expect(service).toBeDefined();
    });
    describe("generateToken", () => {
        it("should generate token for valid credentials", async () => {
            const authDto = {
                client_id: "test_client",
                client_key: "test_key",
            };
            const hashedKey = await bcrypt.hash("test_key", 10);
            const mockBusiness = {
                id: "company-1",
                name: "Test Company",
                country: "Test Country",
                email: "test@company.com",
                client_id: "test_client",
                client_key: hashedKey,
                card_price: new library_1.Decimal(5.0),
                card_fund_rate: new library_1.Decimal(1.02),
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            };
            jest
                .spyOn(prismaService.company, "findUnique")
                .mockResolvedValue(mockBusiness);
            jest.spyOn(jwtService, "sign").mockReturnValue("mock-jwt-token");
            jest.spyOn(configService, "get").mockReturnValue("24h");
            const result = await service.generateToken(authDto);
            expect(result).toEqual({
                access_token: "mock-jwt-token",
                token_type: "Bearer",
                expires_in: 86400,
            });
        });
        it("should throw UnauthorizedException for invalid client_id", async () => {
            const authDto = {
                client_id: "invalid_client",
                client_key: "test_key",
            };
            jest.spyOn(prismaService.company, "findUnique").mockResolvedValue(null);
            await expect(service.generateToken(authDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it("should throw UnauthorizedException for invalid client_key", async () => {
            const authDto = {
                client_id: "test_client",
                client_key: "wrong_key",
            };
            const hashedKey = await bcrypt.hash("correct_key", 10);
            const mockBusiness = {
                id: "company-1",
                name: "Test Company",
                country: "Test Country",
                email: "test@company.com",
                client_id: "test_client",
                client_key: hashedKey,
                card_price: new library_1.Decimal(5.0),
                card_fund_rate: new library_1.Decimal(1.02),
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            };
            jest
                .spyOn(prismaService.company, "findUnique")
                .mockResolvedValue(mockBusiness);
            await expect(service.generateToken(authDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map