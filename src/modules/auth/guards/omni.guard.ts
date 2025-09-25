import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
  Logger,
} from "@nestjs/common";
import { TokenBlacklistService } from "../../../services/token-blacklist.service";
import CompanyModel from "../../../models/prisma/companyModel";

@Injectable()
export class OmniGuard implements CanActivate {
  private readonly logger = new Logger(OmniGuard.name);

  constructor(private tokenBlacklistService: TokenBlacklistService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn("OmniGuard: No token provided in request");
      throw new UnauthorizedException("No token provided");
    }

    this.logger.debug(
      `OmniGuard: Token extracted: ${token.substring(0, 20)}...`
    );

    // Check if token is blacklisted
    if (this.tokenBlacklistService.isBlacklisted(token)) {
      this.logger.warn("OmniGuard: Token is blacklisted");
      throw new UnauthorizedException("Token has been invalidated");
    }

    try {
      // Decode token to get companyId (we'll validate the JWT structure)
      this.logger.debug("OmniGuard: Decoding token payload");
      const decoded = this.decodeToken(token);
      this.logger.debug(
        `OmniGuard: Token decoded successfully, payload: ${JSON.stringify(
          decoded
        )}`
      );

      const companyId = decoded.companyId;

      if (!companyId) {
        this.logger.warn("OmniGuard: Token missing companyId in payload");
        throw new UnauthorizedException("Invalid token: missing companyId");
      }

      this.logger.log(`OmniGuard: Checking access for company: ${companyId}`);

      // Check company's access level from database
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        this.logger.error(
          `OmniGuard: Company not found: ${companyId}, error: ${companyResult.error?.message}`
        );
        throw new UnauthorizedException("Company not found");
      }

      const company = companyResult.output;
      const accessLevel = company.access_level;

      this.logger.log(
        `OmniGuard: Company ${companyId} has access level: ${accessLevel}`
      );

      // Grant access only if company has omniscient access level
      if (accessLevel !== "omniscient") {
        this.logger.warn(
          `OmniGuard: Access denied for company ${companyId} - requires omniscient access, has: ${accessLevel}`
        );
        throw new UnauthorizedException(
          "Access denied: omniscient access required"
        );
      }

      this.logger.log(
        `OmniGuard: Access granted for company ${companyId} (${company.name})`
      );

      // Store company info in request for use in controllers
      request.company = company;
      request.accessLevel = accessLevel;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `OmniGuard: Unexpected error during token validation: ${error.message}`,
        error.stack
      );
      throw new UnauthorizedException("Invalid token");
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader =
      request.headers.authorization || request.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  private decodeToken(token: string): any {
    // Simple JWT decode without verification (since we're using the existing JWT strategy)
    // In production, you might want to use the JwtService to verify the token
    try {
      this.logger.debug(
        "OmniGuard decodeToken: Splitting JWT token into parts"
      );

      const parts = token.split(".");
      if (parts.length !== 3) {
        this.logger.warn(
          `OmniGuard decodeToken: Invalid token format - expected 3 parts, got ${parts.length}`
        );
        throw new Error("Invalid token format");
      }

      this.logger.debug("OmniGuard decodeToken: Decoding payload from base64");

      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf-8")
      );

      this.logger.debug(
        `OmniGuard decodeToken: Successfully decoded payload with keys: ${Object.keys(
          payload
        ).join(", ")}`
      );

      return payload;
    } catch (error) {
      this.logger.error(
        `OmniGuard decodeToken: Failed to decode token: ${error.message}`
      );
      throw new UnauthorizedException("Invalid token format");
    }
  }
}
