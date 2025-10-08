import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
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
  mode?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private secrets: string[];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        this.logger.debug(
          `JwtStrategy: Request details - URL: ${request.url}, Method: ${
            request.method
          }, Token: ${rawJwtToken.substring(0, 20)}..., Query: ${JSON.stringify(
            request.query
          )}, Body: ${JSON.stringify(request.body)}`
        );

        // Try to find the correct secret for this token
        const secrets = this.getSecrets();

        this.logger.debug(
          `JwtStrategy: Trying verification with ${secrets.length} secrets`
        );

        let validSecret: string | null = null;
        for (let i = 0; i < secrets.length; i++) {
          try {
            // Try to verify with this secret (without full decode, just check signature)
            jwt.verify(rawJwtToken, secrets[i], { ignoreExpiration: true });
            validSecret = secrets[i];
            this.logger.debug(
              `JwtStrategy: Token can be verified with secret ${i + 1}`
            );
            break;
          } catch (err) {
            // Continue to next secret
          }
        }

        if (validSecret) {
          done(null, validSecret);
        } else {
          this.logger.warn(
            `JwtStrategy: Token cannot be verified with any available secret`
          );
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
    this.logger.debug(
      `JwtStrategy validate: Processing payload with keys: ${Object.keys(
        payload
      ).join(", ")}`
    );

    // Check if this is a user token (has email)
    if (payload.email) {
      this.logger.log(
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
        this.logger.error(
          `JwtStrategy validate: User lookup failed for ${payload.sub}: ${userResult.error?.message}`
        );
        throw new UnauthorizedException("Invalid user token");
      }

      const user = userResult.output;
      this.logger.debug(
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
        this.logger.warn(
          `JwtStrategy validate: User ${
            payload.sub
          } does not have access to company ${
            payload.companyId
          }. Active roles: ${JSON.stringify(userCompanies)}`
        );
        throw new UnauthorizedException("Invalid company token");
      }

      this.logger.log(
        `JwtStrategy validate: User token validated successfully for user ${user.id} in company ${companyId}`
      );

      return {
        userId: user.id,
        email: user.email,
        companyId,
        companies: userCompanies,
        type: "user",
        mode: payload.mode,
      };
    }

    // Handle company token (has companyId but no email)
    if (payload.companyId && !payload.email) {
      this.logger.log(
        `JwtStrategy validate: Validating company token for company ${payload.companyId}`
      );

      const companyResult = await CompanyModel.getOne({
        id: payload.companyId,
        is_active: true,
      });
      const company = companyResult.output;

      if (!company) {
        this.logger.error(
          `JwtStrategy validate: Company lookup failed for ${payload.companyId}`
        );
        throw new UnauthorizedException("Invalid company token");
      }

      this.logger.log(
        `JwtStrategy validate: Company token validated successfully for company ${company.name} (${company.id})`
      );

      return {
        companyId: company.id,
        clientId: company.clientId,
        companyName: company.name,
        type: "company",
      };
    }

    this.logger.warn(
      `JwtStrategy validate: Invalid token structure - missing email or companyId`
    );
    throw new UnauthorizedException("Invalid token structure");
  }
}
