import { Injectable, Logger } from "@nestjs/common";
import {
  MapleradWebhookPayload,
  WebhookProcessingResult,
} from "./webhook.types";
import { CardEventHandler } from "./handlers/card-event.handler";
import { TransactionEventHandler } from "./handlers/transaction-event.handler";

/**
 * MONIX-Style Webhook Event Router
 * Routes webhook events to appropriate handlers based on event type
 */
@Injectable()
export class WebhookEventRouter {
  private readonly logger = new Logger(WebhookEventRouter.name);

  constructor(
    private readonly cardHandler: CardEventHandler,
    private readonly transactionHandler: TransactionEventHandler
  ) {}

  /**
   * 🎯 MONIX-STYLE: Route webhook events to handlers
   */
  async routeEvent(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    const eventType = payload.event;

    this.logger.log("🎯 Routing webhook event", {
      eventType,
      cardId: payload.card_id,
      reference: payload.reference,
    });

    try {
      // Route based on event type
      switch (eventType) {
        // Card-related events
        case "issuing.created.successful":
        case "issuing.created.failed":
        case "issuing.terminated":
        case "issuing.charge":
        case "card.updated":
          return await this.cardHandler.process(payload);

        // Transaction-related events
        case "issuing.transaction":
          return await this.transactionHandler.process(payload);

        // Default handler for unhandled events
        default:
          this.logger.warn(
            `⚠️ MONIX-STYLE: Unhandled event type: ${eventType}`
          );
          return {
            success: true,
            message: `Event type ${eventType} acknowledged but not processed`,
            processed: true,
          };
      }
    } catch (error: any) {
      this.logger.error("❌ Event routing failed:", {
        eventType,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Event routing failed: ${error.message}`,
        processed: true,
      };
    }
  }

  /**
   * 📊 MONIX-STYLE: Get supported event types
   */
  getSupportedEventTypes(): string[] {
    return [
      "issuing.transaction",
      "issuing.created.successful",
      "issuing.created.failed",
      "issuing.terminated",
      "issuing.charge",
      "card.updated",
    ];
  }

  /**
   * 🔍 MONIX-STYLE: Check if event type is supported
   */
  isEventTypeSupported(eventType: string): boolean {
    return this.getSupportedEventTypes().includes(eventType);
  }

  /**
   * 📈 MONIX-STYLE: Get event processing statistics
   */
  getProcessingStats(): any {
    return {
      supportedEvents: this.getSupportedEventTypes(),
      handlers: {
        card: this.cardHandler.constructor.name,
        transaction: this.transactionHandler.constructor.name,
      },
    };
  }
}
