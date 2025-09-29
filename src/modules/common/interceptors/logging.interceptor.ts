import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import * as jwt from "jsonwebtoken";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extract request details
    const method = request.method;
    const url = request.url;
    const query = request.query || {};
    const body = request.body || {};
    const headers = request.headers || {};

    // Extract access token from Authorization header
    const authHeader = headers.authorization || headers.Authorization;
    let accessToken = null;
    let tokenPayload = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);

      try {
        // Try to decode the token without verification for logging
        const parts = accessToken.split(".");
        if (parts.length === 3) {
          tokenPayload = JSON.parse(
            Buffer.from(parts[1], "base64").toString("utf-8")
          );
        }
      } catch (error) {
        this.logger.debug(
          `Failed to decode token for logging: ${error.message}`
        );
      }
    }

    // Log the API call details
    this.logger.log(`API Call: ${method} ${url}`);
    this.logger.debug(`Query Parameters: ${JSON.stringify(query)}`);
    this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    this.logger.debug(
      `Access Token: ${
        accessToken ? accessToken.substring(0, 20) + "..." : "None"
      }`
    );
    this.logger.debug(
      `Token Payload: ${tokenPayload ? JSON.stringify(tokenPayload) : "None"}`
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        this.logger.log(
          `API Response: ${method} ${url} - ${statusCode} (${duration}ms)`
        );
      })
    );
  }
}
