import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthTokenRequestDto, AuthTokenResponseDto } from "./dto/auth.dto";
import { CompanyModel } from "@/models";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async generateToken(
    authDto: AuthTokenRequestDto
  ): Promise<AuthTokenResponseDto> {
    const companyResult = await CompanyModel.getOne({
      id: authDto.client_id,
      is_active: true,
    });
    const company = companyResult.output;

    if (!company) {
      throw new UnauthorizedException("Invalid client credentials");
    }

    // Verify client key
    const isValidKey = await bcrypt.compare(
      authDto.client_key,
      company.client_key
    );
    if (!isValidKey) {
      throw new UnauthorizedException("Invalid client credentials");
    }

    const payload = {
      sub: company.id,
      businessId: company.id,
      clientId: company.client_id,
    };

    const expiresIn = this.configService.get<string>("JWT_EXPIRES_IN") || "24h";
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: this.parseExpiresIn(expiresIn),
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    // Convert JWT expiration format to seconds
    if (expiresIn.endsWith("h")) {
      return parseInt(expiresIn.slice(0, -1)) * 3600;
    } else if (expiresIn.endsWith("d")) {
      return parseInt(expiresIn.slice(0, -1)) * 86400;
    } else if (expiresIn.endsWith("m")) {
      return parseInt(expiresIn.slice(0, -1)) * 60;
    } else {
      return parseInt(expiresIn) || 86400;
    }
  }
}
