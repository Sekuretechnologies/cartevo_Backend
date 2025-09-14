import { Injectable, Logger } from "@nestjs/common";
import {
  MapleradWebhookPayload,
  WebhookProcessingResult,
} from "../webhook.types";
import { CardStatus } from "@prisma/client";
import CardModel from "@/models/prisma/cardModel";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import TransactionModel from "@/models/prisma/transactionModel";
import { v4 as uuidv4 } from "uuid";
import { encodeText } from "@/utils/shared/encryption";
import {
  TransactionCategory,
  TransactionType,
  TransactionStatus,
} from "@/types";

/**
 * MONIX-Style Card Event Handler
 * Handles all card-related webhook events
 */
@Injectable()
export class CardEventHandler {
  private readonly logger = new Logger(CardEventHandler.name);

  /**
   * 🎯 MONIX-STYLE: Process card-related webhook events
   */
  async process(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    const eventType = payload.event;

    this.logger.log("🎯 Processing card event", {
      eventType,
      cardId: payload.card_id,
      reference: payload.reference,
    });

    switch (eventType) {
      case "issuing.created.successful":
        return await this.handleCardCreated(payload);

      case "issuing.created.failed":
        return await this.handleCardCreationFailed(payload);

      case "issuing.terminated":
        return await this.handleCardTerminated(payload);

      case "issuing.charge":
        return await this.handleCardCharge(payload);

      case "card.updated":
        return await this.handleCardUpdated(payload);

      default:
        return {
          success: false,
          message: `Unsupported card event type: ${eventType}`,
          processed: true,
        };
    }
  }

  /**
   * 🎉 MONIX-STYLE: Handle card creation success
   */
  private async handleCardCreated(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("🎉 Processing card creation success", {
      reference: payload.reference,
      cardId: payload.card?.id,
      balance: payload.card?.balance,
    });

    try {
      // Create card in database
      const newCard = await CardModel.create({
        id: uuidv4(),
        customer_id: "temp_customer_id", // TODO: Get from metadata
        company_id: "temp_company_id", // TODO: Get from metadata
        provider_card_id: payload.card?.id,
        status: CardStatus.ACTIVE,
        balance: payload.card?.balance || 0,
        currency: payload.card?.currency || "USD",
        number: "4111111111111111", // Placeholder
        cvv: "123", // Placeholder
        expiry_month: 12,
        expiry_year: 2025,
        masked_number: payload.card?.masked_pan,
        brand: payload.card?.issuer === "VISA" ? "visa" : "mastercard",
        provider: encodeText("maplerad"),
        country: "US",
        country_iso_code: "USA",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Log success
      await CustomerLogsModel.create({
        customer_id: "temp_customer_id",
        action: "webhook-card-created",
        status: "SUCCESS",
        log_json: {
          card_id:
            typeof newCard === "string" ? newCard : JSON.stringify(newCard),
          maplerad_card_id: payload.card?.id,
          reference: payload.reference,
          balance: payload.card?.balance,
        },
        log_txt: `Card created via webhook`,
        created_at: new Date(),
      });

      return {
        success: true,
        message: "Card creation webhook processed successfully",
        cardId: payload.card?.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Card creation webhook failed:", error.message);
      return {
        success: false,
        message: `Failed to process card creation: ${error.message}`,
        processed: true,
      };
    }
  }

  /**
   * ❌ MONIX-STYLE: Handle card creation failure
   */
  private async handleCardCreationFailed(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.error("❌ Processing card creation failure", {
      reference: payload.reference,
      reason: payload.reason,
    });

    // Log failure
    await CustomerLogsModel.create({
      customer_id: "temp_customer_id",
      action: "webhook-card-creation-failed",
      status: "FAILED",
      log_json: {
        reference: payload.reference,
        reason: payload.reason,
        amount: payload.amount,
      },
      log_txt: `Card creation failed: ${payload.reason}`,
      created_at: new Date(),
    });

    return {
      success: true,
      message: "Card creation failure webhook processed",
      processed: true,
    };
  }

  /**
   * 🛑 MONIX-STYLE: Handle card termination
   */
  private async handleCardTerminated(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("🛑 Processing card termination", {
      cardId: payload.card_id,
      amount: payload.amount,
      reason: payload.reason,
    });

    try {
      // Find and update card
      const cardResult = await CardModel.getOne({
        provider_card_id: payload.card_id,
      });

      if (!cardResult.output) {
        return {
          success: false,
          message: "Card not found for termination",
          cardId: payload.card_id,
          processed: true,
        };
      }

      const card = cardResult.output;

      // Update card status
      await CardModel.update(card.id, {
        status: CardStatus.TERMINATED,
        balance: 0,
        terminate_date: new Date().toISOString(),
      });

      // Log termination
      await CustomerLogsModel.create({
        customer_id: card.customer_id,
        action: "webhook-card-terminated",
        status: "SUCCESS",
        log_json: {
          card_id: card.id,
          maplerad_card_id: payload.card_id,
          reason: payload.reason,
          amount: payload.amount,
        },
        log_txt: `Card terminated via webhook`,
        created_at: new Date(),
      });

      return {
        success: true,
        message: "Card termination processed successfully",
        cardId: payload.card_id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Card termination webhook failed:", error.message);
      return {
        success: false,
        message: `Failed to process termination: ${error.message}`,
        cardId: payload.card_id,
        processed: true,
      };
    }
  }

  /**
   * 💰 MONIX-STYLE: Handle card charge (failure fees)
   */
  private async handleCardCharge(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("💰 Processing card charge", {
      cardId: payload.card_id,
      amount: payload.amount,
      transactionDate: payload.transaction_date,
    });

    try {
      // Find card
      const cardResult = await CardModel.getOne({
        provider_card_id: payload.card_id,
      });

      if (!cardResult.output) {
        return {
          success: false,
          message: "Card not found for charge processing",
          cardId: payload.card_id,
          processed: true,
        };
      }

      const card = cardResult.output;

      // Record failure fee transaction
      const feeAmount = Math.abs(Number(payload.amount || 0)) / 100;

      const feeTransaction = await TransactionModel.create({
        id: uuidv4(),
        amount: feeAmount,
        currency: "USD",
        category: TransactionCategory.CARD,
        type: TransactionType.PAYMENT_FAILURE_FEE,
        status: TransactionStatus.SUCCESS,
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: "Payment failure fee",
        created_at: new Date().toISOString(),
      });

      // Log fee
      await CustomerLogsModel.create({
        customer_id: card.customer_id,
        action: "webhook-payment-failure-fee",
        status: "SUCCESS",
        log_json: {
          card_id: card.id,
          fee_amount: feeAmount,
          transaction_id: feeTransaction.output.id,
          transaction_date: payload.transaction_date,
        },
        log_txt: `Payment failure fee recorded: $${feeAmount}`,
        created_at: new Date(),
      });

      return {
        success: true,
        message: "Payment failure fee recorded",
        transactionType: "PAYMENT_FAILURE_FEE",
        cardId: payload.card_id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Card charge processing failed:", error.message);
      return {
        success: false,
        message: `Failed to process charge: ${error.message}`,
        cardId: payload.card_id,
        processed: true,
      };
    }
  }

  /**
   * 🔄 MONIX-STYLE: Handle card updated
   */
  private async handleCardUpdated(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("🔄 Processing card update", {
      cardId: payload.card_id,
      status: payload.status,
    });

    try {
      // Find card
      const cardResult = await CardModel.getOne({
        provider_card_id: payload.card_id,
      });

      if (!cardResult.output) {
        return {
          success: false,
          message: "Card not found for update",
          cardId: payload.card_id,
          processed: true,
        };
      }

      const card = cardResult.output;

      // Map status
      const statusMapping = {
        active: CardStatus.ACTIVE,
        inactive: CardStatus.FROZEN,
        canceled: CardStatus.TERMINATED,
      };

      const newStatus =
        statusMapping[payload.status?.toLowerCase()] || CardStatus.ACTIVE;

      if (newStatus !== card.status) {
        await CardModel.update(card.id, { status: newStatus });

        // Log status change
        await CustomerLogsModel.create({
          customer_id: card.customer_id,
          action: "webhook-card-status-updated",
          status: "SUCCESS",
          log_json: {
            card_id: card.id,
            old_status: card.status,
            new_status: newStatus,
            maplerad_status: payload.status,
          },
          log_txt: `Card status updated via webhook`,
          created_at: new Date(),
        });
      }

      return {
        success: true,
        message: "Card status updated successfully",
        cardId: payload.card_id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Card update webhook failed:", error.message);
      return {
        success: false,
        message: `Failed to update card: ${error.message}`,
        cardId: payload.card_id,
        processed: true,
      };
    }
  }
}
