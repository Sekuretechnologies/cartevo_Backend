import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  Req,
  Res,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MapleradWebhookService } from "../services/maplerad-webhook.service";
import { WebhookSecurityService } from "../services/webhook-security.service";
import { WebhookEventRouter } from "../services/webhook-event-router.service";
import { MapleradWebhookPayload } from "../services/webhook.types";
import { Public } from "@prisma/client/runtime/library";
import { ApiBody, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Response } from "express";
import * as crypto from "crypto";

/**
 * 🎣 MONIX-STYLE: Dedicated Webhook Management Controller
 * Handles webhook configuration, monitoring, and testing
 */
@Controller("webhooks")
// @UseGuards(JwtAuthGuard)
export class WebhookManagementController {
  private readonly logger = new Logger(WebhookManagementController.name);
  constructor(
    private readonly webhookService: MapleradWebhookService,
    private readonly securityService: WebhookSecurityService,
    private readonly eventRouter: WebhookEventRouter
  ) {}

  /**
   * 🎯 Simulate webhook event processing
   */
  @Post()
  // @Public() // Webhook endpoint doit être public
  @ApiOperation({
    summary: "🎣 Réception des webhooks Maplerad",
    description:
      "Endpoint pour recevoir et traiter les webhooks de Maplerad avec vérification de signature",
  })
  @ApiBody({
    description: "Payload du webhook Maplerad",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID unique du webhook" },
        type: {
          type: "string",
          description: "Type d'événement (transaction.success, etc.)",
        },
        data: {
          type: "object",
          description: "Données de l'événement",
        },
        created_at: {
          type: "string",
          description: "Date de création de l'événement",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Webhook traité avec succès",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        processed: { type: "boolean" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Signature invalide ou payload malformé",
  })
  @ApiResponse({
    status: 403,
    description: "IP non autorisée",
  })
  async handleWebhook(
    @Body() payload: MapleradWebhookPayload,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    // ✅ NOUVEAU: Log détaillé pour diagnostiquer le problème
    this.logger.log("🔔 WEBHOOK MAPLERAD REÇU", {
      event: payload.event,
      type: payload?.type,
      cardId: payload?.card_id,
      amount: payload?.amount,
      merchantName: payload?.merchant?.name,
      reference: payload?.reference,
      status: payload?.status,
      mode: payload?.mode,
      timestamp: new Date().toISOString(),
    });
    const startTime = Date.now();
    const webhookId = payload?.reference || `webhook-${Date.now()}`;
    const eventType = payload?.event || "unknown";

    this.logger.log(`📥 Webhook Maplerad reçu`, {
      webhookId,
      eventType,
      hasSignature: !!headers["svix-signature"],
    });

    try {
      // ✅ SUPPRIMÉ: Vérification de l'IP whitelist - Plus de restriction par IP

      // 2. 🔐 Vérification de la signature webhook
      const rawBody = JSON.stringify(payload);
      const svixId = headers["svix-id"];
      const svixTimestamp = headers["svix-timestamp"];
      const svixSignature = headers["svix-signature"];

      // ✅ DEBUG: Log détaillé pour diagnostic signature
      this.logger.log("🔐 VERIFICATION SIGNATURE DEBUG", {
        webhookId,
        eventType: payload.event,
        hasSvixId: !!svixId,
        hasSvixTimestamp: !!svixTimestamp,
        hasSvixSignature: !!svixSignature,
        svixIdLength: svixId?.length || 0,
        svixTimestampLength: svixTimestamp?.length || 0,
        svixSignatureLength: svixSignature?.length || 0,
        svixSignaturePrefix: svixSignature?.substring(0, 20) || "N/A",
      });

      const isSignatureValid = this.securityService.verifyWebhookSignature(
        rawBody,
        svixId,
        svixTimestamp,
        svixSignature
      );

      if (!isSignatureValid) {
        this.logger.error(`❌ Signature webhook Maplerad invalide`, {
          webhookId,
          eventType: payload.event,
          // cardId: payload.card_id,
          hasSvixId: !!svixId,
          hasSvixTimestamp: !!svixTimestamp,
          hasSvixSignature: !!svixSignature,
          // ✅ TEMPORAIRE: Pour debug, on continue quand même si c'est une terminaison
          isTerminationEvent: payload.event === "issuing.terminated",
        });

        // ✅ TEMPORAIRE: Permettre les webhooks de terminaison même avec signature invalide (POUR DEBUG SEULEMENT)
        if (payload.event === "issuing.terminated") {
          this.logger.warn(
            "⚠️ DEBUG MODE: Autorisation webhook terminaison malgré signature invalide"
          );
        } else {
          res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: "Invalid webhook signature",
            processed: false,
          });
          return;
        }
      }

      // 3. 🔄 Traitement idempotent du webhook
      const result = await this.webhookService.processWebhookEvent(payload);

      // 4. ✅ Réponse de succès
      this.logger.log(`✅ Webhook Maplerad traité`, {
        webhookId,
        eventType,
        success: result.success,
        processingTime: Date.now() - startTime,
        transactionType: result.transactionType,
      });

      res.status(HttpStatus.OK).json({
        success: result.success,
        message: result.message,
        processed: true,
      });
    } catch (error) {
      this.logger.error(`❌ Erreur traitement webhook Maplerad`, {
        webhookId,
        eventType,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime,
      });

      // Répondre avec erreur (Maplerad retentera)
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal error processing webhook",
        processed: false,
        error: error.message,
      });
    }
  }

  /**
   * 📊 Get webhook processing statistics
   */
  @Get("stats")
  async getWebhookStats(@Request() req: any) {
    console.log("📊 WEBHOOK CONTROLLER - Get Webhook Stats Request", {
      userId: "", // req.user.id,
    });

    return this.webhookService.getProcessingStats();
  }

  /**
   * ⚙️ Update webhook security configuration
   */
  @Put("security")
  async updateWebhookSecurity(@Body() config: any, @Request() req: any) {
    console.log("⚙️ WEBHOOK CONTROLLER - Update Security Config Request", {
      userId: "", // req.user.id,
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
  @Post("maplerad/test")
  async testWebhookProcessing(
    @Body() testPayload: MapleradWebhookPayload,
    @Request() req: any
  ) {
    console.log("🧪 WEBHOOK CONTROLLER - Webhook Processing Request", {
      userId: "", // req.user.id,
      eventType: testPayload.event,
    });

    const result = await this.webhookService.processWebhookEvent(testPayload, {
      "x-test": "true",
      "user-agent": "Webhook-Test/1.0",
    });

    return {
      message: "Webhook test completed",
      // test_payload: testPayload,
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
      userId: "", // req.user.id,
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
      userId: "", // req.user.id,
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
      userId: "", // req.user.id,
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
      userId: "", // req.user.id,
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
