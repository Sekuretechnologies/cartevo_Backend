import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class ModeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user || !user.mode) {
      throw new ForbiddenException("Mode information is missing in token");
    }

    // Si l'utilisateur est en preprod, on bloque
    if (user.mode === "preprod") {
      throw new ForbiddenException(
        "Access denied: this action is not allowed in preproduction mode"
      );
    }

    return true;
  }
}
