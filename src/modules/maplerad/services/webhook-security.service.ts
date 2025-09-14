import { Injectable, Logger } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { MapleradWebhookPayload, WebhookSecurityConfig } from "./webhook.types";

/**
 * MONIX-Style Webhook Security Service
 * Handles signature verification, rate limiting, and security validations
 */
@Injectable()
export class WebhookSecurityService {
  private readonly logger = new Logger(WebhookSecurityService.name);

  private config: WebhookSecurityConfig = {
    signatureVerificationEnabled: false, // TODO: Enable in production
    allowedOrigins: ["maplerad.com", "api.maplerad.com"],
    rateLimitEnabled: true,
    maxRequestsPerMinute: 100,
  };

  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  /**
   * 🔐 MONIX-STYLE: Verify webhook signature
   */
  async verifyWebhookSignature(
    payload: MapleradWebhookPayload,
    headers?: any
  ): Promise<boolean> {
    try {
      if (!this.config.signatureVerificationEnabled) {
        this.logger.warn("⚠️ Webhook signature verification is disabled");
        return true; // Allow for development
      }

      const signature = headers?.signature || headers?.["x-signature"];

      if (!signature) {
        this.logger.error("❌ No webhook signature provided");
        return false;
      }

      // TODO: Implement full HMAC SHA-256 verification
      // This is a placeholder for the MONIX-style signature verification
      const isValid = await this.validateSignature(payload, signature);

      if (!isValid) {
        this.logger.error("❌ Invalid webhook signature");
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error("Signature verification error:", error.message);
      return false;
    }
  }

  /**
   * 🚦 MONIX-STYLE: Rate limiting check
   */
  async checkRateLimit(ipAddress: string): Promise<boolean> {
    if (!this.config.rateLimitEnabled) {
      return true;
    }

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const key = ipAddress;

    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or new entry
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= this.config.maxRequestsPerMinute) {
      this.logger.warn(`🚦 Rate limit exceeded for IP: ${ipAddress}`);
      return false;
    }

    current.count++;
    return true;
  }

  /**
   * 🔍 MONIX-STYLE: Validate origin
   */
  async validateOrigin(origin: string): Promise<boolean> {
    if (!origin) return true; // Allow if no origin provided

    const isAllowed = this.config.allowedOrigins.some((allowed) =>
      origin.includes(allowed)
    );

    if (!isAllowed) {
      this.logger.warn(`🚫 Invalid origin: ${origin}`);
    }

    return isAllowed;
  }

  /**
   * 🔄 MONIX-STYLE: Idempotency check
   */
  async isWebhookAlreadyProcessed(webhookId: string): Promise<boolean> {
    // TODO: Implement proper idempotency storage (Redis/cache)
    // For now, return false to allow processing
    return false;
  }

  /**
   * 🔐 MONIX-STYLE: Validate signature (placeholder)
   */
  private async validateSignature(
    payload: MapleradWebhookPayload,
    signature: string
  ): Promise<boolean> {
    try {
      // TODO: Implement actual signature validation
      // This should use HMAC SHA-256 with the webhook secret
      const expectedSignature = "placeholder_signature";

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error("Signature validation error:", error.message);
      return false;
    }
  }

  /**
   * ⚙️ MONIX-STYLE: Update security configuration
   */
  updateConfig(newConfig: Partial<WebhookSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.log("🔧 Security configuration updated", this.config);
  }

  /**
   * 🧹 MONIX-STYLE: Clean up old rate limit entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCounts.entries()) {
      if (now > value.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}
