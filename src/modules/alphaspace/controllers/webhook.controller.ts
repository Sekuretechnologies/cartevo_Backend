import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { WebhookSecurityService } from "../services/webhook-security.service";
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from "@nestjs/swagger";

/**
 * AlphaSpace Webhook Controller
 * Handles secure webhook events from AlphaSpace payment provider
 * Implements bank-grade security with HMAC validation and replay protection
 */
@ApiTags("AlphaSpace Webhooks")
@Controller("alphaspace/webhooks")
export class AlphaSpaceWebhookController {
  constructor(private readonly webhookSecurity: WebhookSecurityService) {}

  /**
   * Receive and process AlphaSpace webhook events
   * Secure webhook processing with multiple security layers
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Process AlphaSpace webhook event",
    description: `
      Receives and securely processes webhook events from AlphaSpace.

      Security Features:
      - HMAC-SHA256 signature validation
      - Timestamp-based replay attack prevention
      - Webhook deduplication with TTL caching
      - Multi-layer security validation
      - Comprehensive audit logging

      Supported Events:
      - issuing.created.successful
      - issuing.funded.successful
      - issuing.frozen.successful
      - issuing.terminated.successful
      - transaction.successful
    `,
  })
  @ApiHeader({
    name: "x-alphaspace-signature",
    description: "HMAC-SHA256 signature for webhook authentication",
    required: true,
  })
  @ApiHeader({
    name: "x-alphaspace-timestamp",
    description: "Unix timestamp for replay attack prevention",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Webhook processed successfully",
    schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          example: "processed",
          description: "Processing status",
        },
        event: {
          type: "string",
          example: "issuing.created.successful",
          description: "Processed event type",
        },
        webhookId: {
          type: "string",
          example: "web_123456789",
          description: "Webhook ID",
        },
        securityChecksPassed: {
          type: "boolean",
          example: true,
          description: "Security validation result",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Webhook security validation failed",
    schema: {
      type: "object",
      properties: {
        error: {
          type: "string",
          example: "Unauthorized",
          description: "Error description",
        },
        reason: {
          type: "string",
          example: "HMAC signature verification failed",
          description: "Security failure reason",
        },
      },
    },
  })
  async handleWebhook(
    @Body() payload: any,
    @Headers("x-alphaspace-signature") signature?: string,
    @Headers("x-alphaspace-timestamp") timestamp?: string
  ) {
    try {
      // Extract webhook secret from environment
      // TODO: Make this configurable per company/environment
      const webhookSecret = process.env.ALPHASPACE_WEBHOOK_SECRET;

      // Validate webhook security
      const securityResult =
        await this.webhookSecurity.validateEnhancedWebhookSecurity(
          payload,
          signature || "",
          timestamp || "",
          webhookSecret
        );

      // Process webhook event securely
      const processingResult =
        await this.webhookSecurity.processWebhookEventSecurely(
          {
            event: payload.event,
            data: payload.data,
            webhook_id: payload.webhook_id,
            timestamp: payload.timestamp,
            signature: payload.signature,
          },
          securityResult
        );

      return processingResult;
    } catch (error: any) {
      console.error("ALPHASPACE WEBHOOK ERROR:", {
        error: error.message,
        event: payload?.event,
        webhookId: payload?.webhook_id,
        timestamp,
        stack: error.stack,
      });

      // Return error response without exposing internal details
      return {
        error: "Webhook processing failed",
        event: payload?.event,
        webhookId: payload?.webhook_id,
        reason: error.message.includes("security")
          ? "Security validation failed"
          : "Internal processing error",
      };
    }
  }
}
