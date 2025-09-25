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
        // Try to find the correct secret for this token
        const secrets = this.getSecrets();

        let validSecret: string | null = null;
        for (let i = 0; i < secrets.length; i++) {
          try {
            // Try to verify with this secret (without full decode, just check signature)
            jwt.verify(rawJwtToken, secrets[i], { ignoreExpiration: true });
            validSecret = secrets[i];
            break;
          } catch (err) {
            // Continue to next secret
          }
        }

        if (validSecret) {
          done(null, validSecret);
        } else {
          done(new Error("Invalid token"), null);
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
    console.log(
      `JwtStrategy validate: Processing payload with keys: ${Object.keys(
        payload
      ).join(", ")}`
    );

    // Check if this is a user token (has email)
    if (payload.email) {
      console.log(
        `JwtStrategy validate: Validating user token for user ${payload.sub}, email ${payload.email}, company ${payload.companyId}`
      );

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
        console.error(
          `JwtStrategy validate: User lookup failed for ${payload.sub}: ${userResult.error?.message}`
        );
        throw new UnauthorizedException("Invalid user token");
      }

      const user = userResult.output;
      console.log(
        `JwtStrategy validate: User found with ${
          user.userCompanyRoles?.length || 0
        } active company roles`
      );

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
        console.warn(
          `JwtStrategy validate: User ${
            payload.sub
          } does not have access to company ${
            payload.companyId
          }. Active roles: ${JSON.stringify(userCompanies)}`
        );
        throw new UnauthorizedException("Invalid company token");
      }

      console.log(
        `JwtStrategy validate: User token validated successfully for user ${user.id} in company ${companyId}`
      );

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
