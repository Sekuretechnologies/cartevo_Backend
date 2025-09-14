import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { CompanyModel, UserModel } from "@/models";

export interface JwtPayload {
  sub: string;
  companyId?: string; // For both company and user tokens
  clientId?: string; // Optional for user tokens
  email?: string; // For user tokens
  roles?: string[]; // For user tokens
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
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    // Check if this is a user token (has email)
    if (payload.email) {
      const userResult = await UserModel.getOne(
        { id: payload.sub },
        {
          userCompanyRoles: {
            include: {
              role: true,
              company: true,
            },
          },
        }
      );

      if (userResult.error || !userResult.output) {
        throw new UnauthorizedException("Invalid user token");
      }

      const user = userResult.output;

      // Get user's companies and roles
      const userCompanies =
        user.userCompanyRoles?.map((ucr: any) => ({
          companyId: ucr.company.id,
          companyName: ucr.company.name,
          role: ucr.role.name,
        })) || [];

      let company: any = undefined;
      if (payload.companyId) {
        const companyResult = await CompanyModel.getOne({
          id: payload.companyId,
          // is_active: true,
        });
        company = companyResult.output;

        if (!company) {
          throw new UnauthorizedException("Invalid company token");
        }
      }
      console.log({
        userId: user.id,
        email: user.email,
        payload_companyId: payload.companyId,
        companyId: company?.id,
        companies: userCompanies,
        type: "user",
      });

      return {
        userId: user.id,
        email: user.email,
        companyId: company?.id,
        companies: userCompanies,
        type: "user",
      };
    }

    // Handle company token (has companyId but no email)
    if (payload.companyId && !payload.email) {
      const companyResult = await CompanyModel.getOne({
        id: payload.companyId,
        is_active: true,
      });
      const company = companyResult.output;

      if (!company) {
        throw new UnauthorizedException("Invalid company token");
      }

      return {
        companyId: company.id,
        clientId: company.clientId,
        companyName: company.name,
        type: "company",
      };
    }

    throw new UnauthorizedException("Invalid token structure");
  }
}
