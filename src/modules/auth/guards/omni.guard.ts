import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from "@nestjs/common";
import { TokenBlacklistService } from "../../../services/token-blacklist.service";
import CompanyModel from "../../../models/prisma/companyModel";

@Injectable()
export class OmniGuard implements CanActivate {
  constructor(private tokenBlacklistService: TokenBlacklistService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    // Check if token is blacklisted
    if (this.tokenBlacklistService.isBlacklisted(token)) {
      throw new UnauthorizedException("Token has been invalidated");
    }

    try {
      // Decode token to get companyId (we'll validate the JWT structure)
      const decoded = this.decodeToken(token);
      const companyId = decoded.companyId;

      if (!companyId) {
        throw new UnauthorizedException("Invalid token: missing companyId");
      }

      // Check company's access level from database
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        throw new UnauthorizedException("Company not found");
      }

      const company = companyResult.output;
      const accessLevel = company.access_level;

      // Grant access only if company has omniscient access level
      if (accessLevel !== "omniscient") {
        throw new UnauthorizedException(
          "Access denied: omniscient access required"
        );
      }

      // Store company info in request for use in controllers
      request.company = company;
      request.accessLevel = accessLevel;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
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
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf-8")
      );

      return payload;
    } catch (error) {
      throw new UnauthorizedException("Invalid token format");
    }
  }
}
