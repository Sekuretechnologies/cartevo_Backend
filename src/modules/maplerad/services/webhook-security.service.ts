import { Injectable, Logger } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { WebhookSecurityConfig } from "./webhook.types";
import * as crypto from "crypto";

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
  verifyWebhookSignature(
    payload: string,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string
  ): boolean {
    try {
      if (!svixId || !svixTimestamp || !svixSignature) {
        this.logger.warn("Headers svix manquants pour vérification signature");
        return false;
      }

      // Construire le contenu signé selon la doc Maplerad
      const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

      // Récupérer le secret webhook depuis la configuration
      const webhookSecret = !!this.getWebhookSecret();
      if (!webhookSecret) {
        this.logger.error(
          "Secret webhook Maplerad non configuré dans getConfigInfo"
        );
        return false;
      }

      // Récupérer le secret depuis MapleradService (configuration structurée)
      const secretKey = this.getWebhookSecret();
      if (!secretKey) {
        this.logger.error(
          "Secret webhook Maplerad non configuré dans MapleradService"
        );
        return false;
      }

      // ✅ DEBUG: Log des informations de configuration
      this.logger.debug("🔐 DEBUG WEBHOOK SECRET", {
        hasWebhookSecret: !!webhookSecret,
        secretKeyLength: secretKey?.length || 0,
        secretKeyPrefix: secretKey?.substring(0, 10) || "N/A",
        isWhsecFormat: secretKey?.startsWith("whsec_") || false,
      });

      // Extraire la partie base64 du secret (après le préfixe whsec_)
      const secretBytes = secretKey.startsWith("whsec_")
        ? Buffer.from(secretKey.split("_")[1], "base64")
        : Buffer.from(secretKey, "utf8");

      // Calculer la signature HMAC SHA-256
      const expectedSignature = crypto
        .createHmac("sha256", secretBytes)
        .update(signedContent)
        .digest("base64");

      // Extraire les signatures depuis l'header (format: v1,signature1 v1,signature2)
      const signatures = svixSignature.split(" ");

      for (const sig of signatures) {
        const [version, signature] = sig.split(",");
        if (version === "v1") {
          // Comparaison constant-time pour éviter les attaques timing
          if (this.constantTimeCompare(signature, expectedSignature)) {
            return true;
          }
        }
      }

      this.logger.warn("Aucune signature valide trouvée", {
        expectedSignature: expectedSignature.substring(0, 10) + "...",
        receivedSignatures: signatures.length,
      });

      return false;
    } catch (error) {
      this.logger.error("Erreur vérification signature webhook", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 🔐 Récupère le secret webhook Maplerad
   */
  getWebhookSecret(): string {
    return process.env.MAPLERAD_WEBHOOK_SECRET;
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
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
  // private async validateSignature(
  //   payload: MapleradWebhookPayload,
  //   signature: string
  // ): Promise<boolean> {
  //   try {
  //     // TODO: Implement actual signature validation
  //     // This should use HMAC SHA-256 with the webhook secret
  //     const expectedSignature = "placeholder_signature";

  //     return signature === expectedSignature;
  //   } catch (error) {
  //     this.logger.error("Signature validation error:", error.message);
  //     return false;
  //   }
  // }

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
