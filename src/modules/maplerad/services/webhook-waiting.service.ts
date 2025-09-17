import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "events";
import { MapleradWebhookPayload } from "./webhook.types";
import { extractExpiryMonthYear } from "@/utils/shared/common";

interface WebhookWaitingResult {
  success: boolean;
  data?: any;
  error?: string;
  timeout?: boolean;
  source?: "webhook" | "polling" | "timeout";
  waitTime?: number;
}

interface CardCreationWebhookData {
  card: {
    id: string;
    name: string;
    masked_pan: string;
    type: "VIRTUAL" | "PHYSICAL";
    issuer: "VISA" | "MASTERCARD";
    currency: string;
    status: "ACTIVE" | "DISABLED";
    balance: number;
    auto_approve: boolean;
    // Additional fields that may be present in actual webhook
    card_number?: string;
    expiry?: string;
    expiry_month?: string;
    expiry_year?: string;
    cvv?: string;
    balance_updated_at?: string;
    address?: any;
    created_at?: string;
    updated_at?: string;
  };
  reference: string;
  event: string;
}

/**
 * Advanced Webhook Waiting Service for Maplerad Integration
 * Implements event-driven webhook waiting with timeout and cleanup
 * Adapted from Monix project for wavlet card creation process
 */
@Injectable()
export class WebhookWaitingService {
  private readonly logger = new Logger(WebhookWaitingService.name);
  private readonly eventEmitter = new EventEmitter();
  private readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private readonly WEBHOOK_EVENT_PREFIX = "webhook_";

  constructor() {
    // Set max listeners to handle multiple concurrent webhook waits
    this.eventEmitter.setMaxListeners(50);
  }

  /**
   * Wait for a webhook event with specified reference
   * @param reference - The webhook reference to wait for
   * @param timeoutMs - Timeout in milliseconds (default: 5 minutes)
   * @returns Promise resolving to webhook result
   */
  async waitForWebhook(
    reference: string,
    timeoutMs: number = this.DEFAULT_TIMEOUT
  ): Promise<WebhookWaitingResult> {
    this.logger.log(`⏳ Starting webhook wait for reference: ${reference}`, {
      reference,
      timeoutMs,
      action: "wait_start",
      timestamp: new Date().toISOString(),
    });

    return new Promise((resolve) => {
      const eventName = `${this.WEBHOOK_EVENT_PREFIX}${reference}`;
      let resolved = false;
      const startTime = Date.now();

      // Timeout handler
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.eventEmitter.removeAllListeners(eventName);
          const waitTime = Date.now() - startTime;

          this.logger.warn(`⏰ Webhook timeout for reference: ${reference}`, {
            reference,
            timeoutMs,
            waitTime,
            action: "timeout",
            timestamp: new Date().toISOString(),
          });

          resolve({
            success: false,
            timeout: true,
            error: `Webhook timeout after ${timeoutMs}ms`,
            source: "timeout",
            waitTime,
          });
        }
      }, timeoutMs);

      // Webhook event handler
      this.eventEmitter.once(eventName, (result: WebhookWaitingResult) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          const waitTime = Date.now() - startTime;

          this.logger.log(`✅ Webhook received for reference: ${reference}`, {
            reference,
            success: result.success,
            source: result.source,
            waitTime,
            action: "webhook_received",
            timestamp: new Date().toISOString(),
          });

          resolve({
            ...result,
            waitTime,
          });
        }
      });
    });
  }

  /**
   * Notify that a webhook has been received and processed
   * This method should be called by the webhook controller/service
   * @param reference - The webhook reference
   * @param payload - The webhook payload
   */
  notifyWebhookReceived(
    reference: string,
    payload: MapleradWebhookPayload
  ): void {
    const eventName = `${this.WEBHOOK_EVENT_PREFIX}${reference}`;

    this.logger.debug(`📢 Processing webhook notification: ${reference}`, {
      reference,
      event: payload.event,
      hasCard: !!payload.card,
      action: "notify",
      timestamp: new Date().toISOString(),
    });

    let result: WebhookWaitingResult;

    // Process different webhook event types
    switch (payload.event) {
      case "issuing.created.successful":
        result = this.processCardCreationSuccess(payload);
        break;

      case "issuing.created.failed":
        result = this.processCardCreationFailure(payload);
        break;

      case "issuing.transaction":
        result = this.processTransactionWebhook(payload);
        break;

      default:
        result = {
          success: true,
          data: payload,
          source: "webhook",
        };
        break;
    }

    // Emit the event to resolve waiting promises
    this.eventEmitter.emit(eventName, result);

    this.logger.debug(`📢 Webhook notification emitted: ${reference}`, {
      reference,
      event: payload.event,
      success: result.success,
      action: "notify_complete",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Process successful card creation webhook
   */
  private processCardCreationSuccess(
    payload: MapleradWebhookPayload
  ): WebhookWaitingResult {
    if (!payload.card) {
      return {
        success: false,
        error: "Card data missing in webhook payload",
        source: "webhook",
      };
    }

    // Use type assertion to access additional properties that may be present
    const card = payload.card as any;

    // Parse expiry field (format: "MM/YY") to extract month and year
    const expiry = card.expiry || "";
    const { expiry_month, expiry_year } = extractExpiryMonthYear(expiry);

    const cardData: CardCreationWebhookData = {
      card: {
        id: payload.card.id,
        name: payload.card.name,
        masked_pan: payload.card.masked_pan,
        type: payload.card.type as "VIRTUAL" | "PHYSICAL",
        issuer: payload.card.issuer as "VISA" | "MASTERCARD",
        currency: payload.card.currency,
        status: payload.card.status as "ACTIVE" | "DISABLED",
        balance: payload.card.balance,
        auto_approve: payload.card.auto_approve,
        // Additional fields that may be present in actual webhook
        card_number: card.card_number || "",
        expiry: expiry,
        expiry_month: expiry_month,
        expiry_year: expiry_year,
        cvv: card.cvv || "",
        balance_updated_at: card.balance_updated_at || "",
        address: card.address || {},
        created_at: card.created_at || "",
        updated_at: card.updated_at || "",
      },
      reference: payload.reference || "",
      event: payload.event,
    };

    return {
      success: true,
      data: cardData,
      source: "webhook",
    };
  }

  /**
   * Process failed card creation webhook
   */
  private processCardCreationFailure(
    payload: MapleradWebhookPayload
  ): WebhookWaitingResult {
    return {
      success: false,
      error: payload.reason || "Card creation failed",
      data: payload,
      source: "webhook",
    };
  }

  /**
   * Process transaction webhook
   */
  private processTransactionWebhook(
    payload: MapleradWebhookPayload
  ): WebhookWaitingResult {
    return {
      success: true,
      data: payload,
      source: "webhook",
    };
  }

  /**
   * Clean up listeners for a specific reference
   * Should be called when abandoning a webhook wait
   * @param reference - The webhook reference to clean up
   */
  cleanupWebhookWaiting(reference: string): void {
    const eventName = `${this.WEBHOOK_EVENT_PREFIX}${reference}`;
    this.eventEmitter.removeAllListeners(eventName);

    this.logger.debug(`🧹 Cleaned up webhook listeners: ${reference}`, {
      reference,
      action: "cleanup",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current listener count for monitoring
   */
  getListenerCount(reference?: string): number {
    if (reference) {
      const eventName = `${this.WEBHOOK_EVENT_PREFIX}${reference}`;
      return this.eventEmitter.listenerCount(eventName);
    }
    return this.eventEmitter.eventNames().length;
  }

  /**
   * Force timeout for a specific reference (for testing/cleanup)
   */
  forceTimeout(reference: string): void {
    const eventName = `${this.WEBHOOK_EVENT_PREFIX}${reference}`;
    this.eventEmitter.emit(eventName, {
      success: false,
      timeout: true,
      error: "Forced timeout",
      source: "timeout",
    });

    this.logger.debug(`⚡ Forced timeout for reference: ${reference}`, {
      reference,
      action: "force_timeout",
      timestamp: new Date().toISOString(),
    });
  }
}
