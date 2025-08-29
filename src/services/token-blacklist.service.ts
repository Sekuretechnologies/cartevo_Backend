import { Injectable } from "@nestjs/common";

@Injectable()
export class TokenBlacklistService {
  // In-memory storage for blacklisted tokens
  // In production, consider using Redis or database
  private blacklistedTokens: Set<string> = new Set();

  /**
   * Add a token to the blacklist
   * @param token - JWT token to blacklist
   * @param expiryTime - When the token naturally expires (to auto-cleanup)
   */
  addToBlacklist(token: string, expiryTime?: Date): void {
    this.blacklistedTokens.add(token);

    // Auto-cleanup expired tokens after expiry time
    if (expiryTime) {
      const cleanupDelay = expiryTime.getTime() - Date.now();
      if (cleanupDelay > 0) {
        setTimeout(() => {
          this.blacklistedTokens.delete(token);
        }, cleanupDelay);
      }
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token - JWT token to check
   * @returns true if token is blacklisted
   */
  isBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  /**
   * Remove a token from the blacklist (useful for testing)
   * @param token - JWT token to remove
   */
  removeFromBlacklist(token: string): void {
    this.blacklistedTokens.delete(token);
  }

  /**
   * Get the count of blacklisted tokens
   * @returns number of blacklisted tokens
   */
  getBlacklistCount(): number {
    return this.blacklistedTokens.size;
  }

  /**
   * Clear all blacklisted tokens (useful for testing)
   */
  clearBlacklist(): void {
    this.blacklistedTokens.clear();
  }

  /**
   * Extract token from Authorization header
   * @param authHeader - Authorization header value
   * @returns extracted token or null
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}
