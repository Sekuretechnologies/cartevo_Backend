import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { CompanyModel } from "@/models";

export interface JwtPayload {
  sub: string;
  businessId: string;
  clientId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      secretOrKey: process.env.JWT_SECRET, // configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const companyResult = await CompanyModel.getOne({
      id: payload.businessId,
      is_active: true,
    });
    const company = companyResult.output;

    if (!company) {
      throw new UnauthorizedException("Invalid token");
    }

    return {
      businessId: company.id,
      clientId: company.clientId,
      businessName: company.name,
    };
  }
}
