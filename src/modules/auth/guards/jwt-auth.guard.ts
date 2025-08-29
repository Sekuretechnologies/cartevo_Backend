import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TokenBlacklistService } from "../../../services/token-blacklist.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private tokenBlacklistService: TokenBlacklistService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // First, let the parent AuthGuard handle JWT validation
    const canActivate = super.canActivate(context);

    if (typeof canActivate === "boolean" && canActivate) {
      // If JWT is valid, check if token is blacklisted
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);

      if (token && this.tokenBlacklistService.isBlacklisted(token)) {
        throw new UnauthorizedException("Token has been invalidated");
      }
    }

    return canActivate;
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader =
      request.headers.authorization || request.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }
}
