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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
const models_1 = require("../../models");
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async generateToken(authDto) {
        const companyResult = await models_1.CompanyModel.getOne({
            id: authDto.client_id,
            is_active: true,
        });
        const company = companyResult.output;
        if (!company) {
            throw new common_1.UnauthorizedException("Invalid client credentials");
        }
        const isValidKey = await bcrypt.compare(authDto.client_key, company.client_key);
        if (!isValidKey) {
            throw new common_1.UnauthorizedException("Invalid client credentials");
        }
        const payload = {
            sub: company.id,
            businessId: company.id,
            clientId: company.client_id,
        };
        const expiresIn = this.configService.get("JWT_EXPIRES_IN") || "24h";
        const accessToken = this.jwtService.sign(payload, { expiresIn });
        return {
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: this.parseExpiresIn(expiresIn),
        };
    }
    parseExpiresIn(expiresIn) {
        if (expiresIn.endsWith("h")) {
            return parseInt(expiresIn.slice(0, -1)) * 3600;
        }
        else if (expiresIn.endsWith("d")) {
            return parseInt(expiresIn.slice(0, -1)) * 86400;
        }
        else if (expiresIn.endsWith("m")) {
            return parseInt(expiresIn.slice(0, -1)) * 60;
        }
        else {
            return parseInt(expiresIn) || 86400;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map