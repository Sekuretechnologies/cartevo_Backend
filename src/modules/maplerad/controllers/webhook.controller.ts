import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MapleradWebhookService } from "../services/maplerad-webhook.service";
import { WebhookSecurityService } from "../services/webhook-security.service";
import { WebhookEventRouter } from "../services/webhook-event-router.service";
import { MapleradWebhookPayload } from "../services/webhook.types";

/**
 * 🎣 MONIX-STYLE: Dedicated Webhook Management Controller
 * Handles webhook configuration, monitoring, and testing
 */
@Controller("webhooks")
@UseGuards(JwtAuthGuard)
export class WebhookManagementController {
  constructor(
    private readonly webhookService: MapleradWebhookService,
    private readonly securityService: WebhookSecurityService,
    private readonly eventRouter: WebhookEventRouter
  ) {}

  /**
   * 📊 Get webhook processing statistics
   */
  @Get("stats")
  async getWebhookStats(@Request() req: any) {
    console.log("📊 WEBHOOK CONTROLLER - Get Webhook Stats Request", {
      userId: req.user.id,
    });

    return this.webhookService.getProcessingStats();
  }

  /**
   * ⚙️ Update webhook security configuration
   */
  @Put("security")
  async updateWebhookSecurity(@Body() config: any, @Request() req: any) {
    console.log("⚙️ WEBHOOK CONTROLLER - Update Security Config Request", {
      userId: req.user.id,
      config: config,
    });

    this.webhookService.updateSecurityConfig(config);
    return {
      message: "Webhook security configuration updated successfully",
      updated_config: config,
    };
  }

  /**
   * 🔍 Test webhook processing with sample payload
   */
  @Post("test")
  async testWebhookProcessing(
    @Body() testPayload: MapleradWebhookPayload,
    @Request() req: any
  ) {
    console.log("🧪 WEBHOOK CONTROLLER - Test Webhook Processing Request", {
      userId: req.user.id,
      eventType: testPayload.event,
    });

    const result = await this.webhookService.processWebhookEvent(testPayload, {
      "x-test": "true",
      "user-agent": "Webhook-Test/1.0",
    });

    return {
      message: "Webhook test completed",
      test_payload: testPayload,
      result: result,
      processing_time: new Date().toISOString(),
    };
  }

  /**
   * 📋 Get supported webhook event types
   */
  @Get("events")
  async getSupportedEvents(@Request() req: any) {
    console.log("📋 WEBHOOK CONTROLLER - Get Supported Events Request", {
      userId: req.user.id,
    });

    const supportedEvents = this.eventRouter.getSupportedEventTypes();
    const routerStats = this.eventRouter.getProcessingStats();

    return {
      supported_events: supportedEvents,
      router_statistics: routerStats,
      total_supported: supportedEvents.length,
    };
  }

  /**
   * 🔐 Get webhook security status
   */
  @Get("security/status")
  async getSecurityStatus(@Request() req: any) {
    console.log("🔐 WEBHOOK CONTROLLER - Get Security Status Request", {
      userId: req.user.id,
    });

    // Note: This would need to be implemented in the security service
    return {
      signature_verification: "enabled", // TODO: Get from config
      rate_limiting: "enabled",
      origin_validation: "enabled",
      idempotency_check: "enabled",
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * 🧹 Cleanup rate limit data (admin only)
   */
  @Post("cleanup")
  async cleanupRateLimits(@Request() req: any) {
    console.log("🧹 WEBHOOK CONTROLLER - Cleanup Rate Limits Request", {
      userId: req.user.id,
    });

    this.securityService.cleanupRateLimits();

    return {
      message: "Rate limit data cleaned up successfully",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 📈 Get webhook processing metrics
   */
  @Get("metrics")
  async getWebhookMetrics(@Request() req: any) {
    console.log("📈 WEBHOOK CONTROLLER - Get Webhook Metrics Request", {
      userId: req.user.id,
    });

    const stats = this.webhookService.getProcessingStats();

    return {
      metrics: {
        total_processed: 0, // TODO: Implement actual metrics
        success_rate: 0,
        average_processing_time: 0,
        error_rate: 0,
      },
      router_stats: stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 🎯 Simulate webhook event processing
   */
  @Post("simulate")
  async simulateWebhookEvent(
    @Body()
    simulationData: {
      eventType: string;
      payload: any;
      headers?: Record<string, string>;
    },
    @Request() req: any
  ) {
    console.log("🎯 WEBHOOK CONTROLLER - Simulate Webhook Event Request", {
      userId: req.user.id,
      eventType: simulationData.eventType,
    });

    // Create a proper webhook payload for simulation
    const simulatedPayload: MapleradWebhookPayload = {
      event: simulationData.eventType,
      reference: `sim_${Date.now()}`,
      ...simulationData.payload,
    };

    const result = await this.webhookService.processWebhookEvent(
      simulatedPayload,
      simulationData.headers || { "x-simulation": "true" }
    );

    return {
      message: "Webhook simulation completed",
      simulation: {
        event_type: simulationData.eventType,
        simulated_at: new Date().toISOString(),
        payload: simulatedPayload,
      },
      result: result,
    };
  }
}
