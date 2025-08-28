import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Decimal } from "@prisma/client/runtime/library";
import { KybStatus } from "@prisma/client";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            company: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
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
        webhook_url: "",
        // card_price: new Decimal(5.0),
        // card_fund_rate: new Decimal(1.02),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        step: 2,
        kyb_status: KybStatus.NONE,
        business_name: "Test Company Business",
        business_phone_number: "+1234567890",
        business_address: "123 Test Street",
        business_type: "LLC",
        business_description: "Test business description",
        country_iso_code: "TC",
        country_phone_code: "+1",
        country_currency: "USD",
        tax_id_number: "TAX123456",
        business_website: "https://testcompany.com",
        source_of_funds: "Business Revenue",
        share_holding_document: "shareholding_doc.pdf",
        incorporation_certificate: "incorporation_cert.pdf",
        business_proof_of_address: "business_address_proof.pdf",
        memart: "Test Memart",
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

      await expect(service.generateToken(authDto)).rejects.toThrow(
        UnauthorizedException
      );
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
        webhook_url: "",
        // card_price: new Decimal(5.0),
        // card_fund_rate: new Decimal(1.02),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        step: 2,
        kyb_status: KybStatus.NONE,
        business_name: "Test Company Business",
        business_phone_number: "+1234567890",
        business_address: "123 Test Street",
        business_type: "LLC",
        business_description: "Test business description",
        country_iso_code: "TC",
        country_phone_code: "+1",
        country_currency: "USD",
        tax_id_number: "TAX123456",
        business_website: "https://testcompany.com",
        source_of_funds: "Business Revenue",
        share_holding_document: "shareholding_doc.pdf",
        incorporation_certificate: "incorporation_cert.pdf",
        business_proof_of_address: "business_address_proof.pdf",
        memart: "Test Memart",
      };

      jest
        .spyOn(prismaService.company, "findUnique")
        .mockResolvedValue(mockBusiness);

      await expect(service.generateToken(authDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
