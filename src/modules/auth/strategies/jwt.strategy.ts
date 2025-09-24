import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { CompanyModel, UserModel } from "@/models";
import env from "@/env";
import * as jwt from "jsonwebtoken";

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
  private secrets: string[];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        // Try to verify with each secret
        let payload: JwtPayload | null = null;
        let error: any = null;

        for (const secret of this.getSecrets()) {
          try {
            payload = jwt.verify(rawJwtToken, secret) as JwtPayload;
            break;
          } catch (err) {
            error = err;
          }
        }

        if (payload) {
          done(null, payload);
        } else {
          done(error, null);
        }
      },
    });

    this.secrets = this.getSecrets();
  }

  private getSecrets(): string[] {
    const secrets = [env.JWT_SECRET];
    if (env.CROSS_ENV_JWT_SECRET) {
      secrets.push(env.CROSS_ENV_JWT_SECRET);
    }
    return secrets;
  }

  async validate(payload: JwtPayload) {
    // Check if this is a user token (has email)
    if (payload.email) {
      const userResult = await UserModel.getOne(
        { id: payload.sub },
        {
          userCompanyRoles: {
            where: {
              is_active: true,
            },
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

      let companyId: any = undefined;
      // Get user's companies and roles
      const userCompanies =
        user.userCompanyRoles?.map((ucr: any) => {
          if (payload.companyId === ucr.company.id) companyId = ucr.company.id;
          return {
            companyId: ucr.company.id,
            companyName: ucr.company.name,
            role: ucr.role.name,
          };
        }) || [];

      if (!companyId) {
        throw new UnauthorizedException("Invalid company token");
      }

      return {
        userId: user.id,
        email: user.email,
        companyId,
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
