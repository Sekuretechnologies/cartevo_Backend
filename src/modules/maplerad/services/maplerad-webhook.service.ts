import { Injectable, Logger } from "@nestjs/common";
import {
  MapleradWebhookPayload,
  WebhookProcessingResult,
} from "./webhook.types";
import { WebhookSecurityService } from "./webhook-security.service";
import { WebhookEventRouter } from "./webhook-event-router.service";

/**
 * MONIX-Style Advanced Webhook Service for Maplerad
 * Implements comprehensive webhook processing with enterprise-grade features
 * Refactored for maintainability with modular architecture
 */
@Injectable()
export class MapleradWebhookService {
  private readonly logger = new Logger(MapleradWebhookService.name);

  constructor(
    private readonly securityService: WebhookSecurityService,
    private readonly eventRouter: WebhookEventRouter
  ) {}

  /**
   * 🎣 MONIX-STYLE: Process Maplerad webhook events with advanced features
   */
  async processWebhookEvent(
    payload: MapleradWebhookPayload,
    headers?: any
  ): Promise<WebhookProcessingResult> {
    const webhookId = payload.reference || `webhook-${Date.now()}`;
    const eventType = payload.event;

    this.logger.log("🎣 MONIX-STYLE WEBHOOK PROCESSING - START", {
      webhookId,
      eventType,
      cardId: payload.card_id,
      amount: payload.amount,
      reference: payload.reference,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. 🔐 Verify webhook signature (MONIX-STYLE)
      const svixId = headers?.["svix-id"] || headers?.["x-svix-id"];
      const svixTimestamp =
        headers?.["svix-timestamp"] || headers?.["x-svix-timestamp"];
      const svixSignature =
        headers?.["svix-signature"] || headers?.["x-svix-signature"];

      const isSignatureValid =
        await this.securityService.verifyWebhookSignature(
          JSON.stringify(payload),
          svixId,
          svixTimestamp,
          svixSignature
        );
      if (!isSignatureValid) {
        this.logger.error(`❌ Webhook signature verification failed`, {
          webhookId,
          eventType,
          hasSignature: !!headers?.signature,
        });
        throw new Error("Invalid webhook signature");
      }

      // 2. 🚦 Rate limiting check
      const clientIp =
        headers?.["x-forwarded-for"] || headers?.["x-real-ip"] || "unknown";
      const isAllowed = await this.securityService.checkRateLimit(clientIp);
      if (!isAllowed) {
        this.logger.warn(`🚦 Rate limit exceeded for IP: ${clientIp}`);
        throw new Error("Rate limit exceeded");
      }

      // 3. 🔄 Check idempotency (MONIX-STYLE)
      if (await this.securityService.isWebhookAlreadyProcessed(webhookId)) {
        return {
          success: true,
          message: "Webhook already processed (idempotent)",
          processed: true,
        };
      }

      // 4. 🎯 Route to appropriate handler (MONIX-STYLE)
      const result = await this.eventRouter.routeEvent(payload);

      this.logger.log("✅ MONIX-STYLE WEBHOOK PROCESSING - COMPLETED", {
        webhookId,
        eventType,
        success: result.success,
        processed: result.processed,
        processingTime: Date.now(),
      });

      return result;
    } catch (error: any) {
      this.logger.error("❌ MONIX-STYLE WEBHOOK PROCESSING - FAILED", {
        webhookId,
        eventType,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Webhook processing failed: ${error.message}`,
        processed: true,
      };
    }
  }

  /**
   * � MONIX-STYLE: Get webhook processing statistics
   */
  getProcessingStats(): any {
    return {
      router: this.eventRouter.getProcessingStats(),
      security: {
        signatureVerificationEnabled: true, // TODO: Get from config
        rateLimitEnabled: true,
      },
    };
  }

  /**
   * ⚙️ MONIX-STYLE: Update security configuration
   */
  updateSecurityConfig(config: any): void {
    this.securityService.updateConfig(config);
  }
}
