import { Injectable, Logger } from "@nestjs/common";
import {
  MapleradWebhookPayload,
  WebhookProcessingResult,
} from "../webhook.types";
import CardModel from "@/models/prisma/cardModel";
import TransactionModel from "@/models/prisma/transactionModel";
import CustomerLogsModel from "@/models/prisma/customerLogsModel";
import NotificationModel from "@/models/prisma/notificationModel";
import { v4 as uuidv4 } from "uuid";
import { encodeText } from "@/utils/shared/encryption";
import {
  TransactionCategory,
  TransactionType,
  TransactionStatus,
} from "@/types";

/**
 * MONIX-Style Transaction Event Handler
 * Handles all transaction-related webhook events
 */
@Injectable()
export class TransactionEventHandler {
  private readonly logger = new Logger(TransactionEventHandler.name);

  /**
   * 🎯 MONIX-STYLE: Process transaction-related webhook events
   */
  async process(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    const eventType = payload.event;

    this.logger.log("🎯 Processing transaction event", {
      eventType,
      cardId: payload.card_id,
      amount: payload.amount,
      type: payload.type,
    });

    switch (eventType) {
      case "issuing.transaction":
        return await this.handleIssuingTransaction(payload);

      default:
        return {
          success: false,
          message: `Unsupported transaction event type: ${eventType}`,
          processed: true,
        };
    }
  }

  /**
   * 💳 MONIX-STYLE: Handle issuing.transaction webhook
   */
  private async handleIssuingTransaction(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("💳 Processing issuing transaction", {
      cardId: payload.card_id,
      amount: payload.amount,
      type: payload.type,
      mode: payload.mode,
      status: payload.status,
    });

    try {
      // Find card in database
      const cardResult = await CardModel.getOne({
        provider_card_id: payload.card_id,
      });

      if (!cardResult.output) {
        this.logger.error(`❌ Card not found: ${payload.card_id}`);
        return {
          success: false,
          message: "Card not found in database",
          cardId: payload.card_id,
          processed: true,
        };
      }

      const card = cardResult.output;

      // Route based on transaction type
      switch (payload.type) {
        case "FUNDING":
          return await this.handleFundingTransaction(card, payload);

        case "WITHDRAWAL":
          return await this.handleWithdrawalTransaction(card, payload);

        case "AUTHORIZATION":
          return await this.handleAuthorizationTransaction(card, payload);

        case "SETTLEMENT":
          return await this.handleSettlementTransaction(card, payload);

        case "DECLINE":
          return await this.handleDeclineTransaction(card, payload);

        case "REVERSAL":
        case "REFUND":
          return await this.handleRefundTransaction(card, payload);

        case "TERMINATION":
          return await this.handleTerminationTransaction(card, payload);

        default:
          this.logger.warn(`⚠️ Unknown transaction type: ${payload.type}`);
          return {
            success: true,
            message: `Transaction type ${payload.type} acknowledged`,
            transactionType: payload.type,
            cardId: payload.card_id,
            processed: true,
          };
      }
    } catch (error: any) {
      this.logger.error(
        "❌ Issuing transaction processing failed:",
        error.message
      );
      return {
        success: false,
        message: `Failed to process transaction: ${error.message}`,
        transactionType: payload.type,
        cardId: payload.card_id,
        processed: true,
      };
    }
  }

  /**
   * 💰 MONIX-STYLE: Handle funding transaction
   */
  private async handleFundingTransaction(
    card: any,
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("💰 Processing funding transaction", {
      cardId: card.id,
      amount: payload.amount,
      status: payload.status,
    });

    try {
      const usdAmount = Math.abs(Number(payload.amount || 0)) / 100;

      // Create funding transaction
      const transaction = await TransactionModel.create({
        id: uuidv4(),
        amount: usdAmount,
        currency: "USD",
        category: TransactionCategory.CARD,
        type: TransactionType.FUND,
        status:
          payload.status === "SUCCESS"
            ? TransactionStatus.SUCCESS
            : TransactionStatus.FAILED,
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: "Card funding",
        created_at: new Date().toISOString(),
      });

      // Update balance if successful
      if (payload.status === "SUCCESS") {
        const newBalance = card.balance + usdAmount;
        await CardModel.update(card.id, { balance: newBalance });
      }

      return {
        success: true,
        message: "Funding transaction processed",
        transactionType: "FUNDING",
        cardId: card.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Funding transaction failed:", error.message);
      return {
        success: false,
        message: `Failed to process funding: ${error.message}`,
        transactionType: "FUNDING",
        cardId: card.id,
        processed: true,
      };
    }
  }

  /**
   * 💸 MONIX-STYLE: Handle withdrawal transaction
   */
  private async handleWithdrawalTransaction(
    card: any,
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("💸 Processing withdrawal transaction", {
      cardId: card.id,
      amount: payload.amount,
      status: payload.status,
    });

    try {
      const usdAmount = Math.abs(Number(payload.amount || 0)) / 100;

      // Create withdrawal transaction
      const transaction = await TransactionModel.create({
        id: uuidv4(),
        amount: usdAmount,
        currency: "USD",
        category: TransactionCategory.CARD,
        type: TransactionType.WITHDRAW,
        status:
          payload.status === "SUCCESS"
            ? TransactionStatus.SUCCESS
            : TransactionStatus.FAILED,
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: "Card withdrawal",
        created_at: new Date().toISOString(),
      });

      // Update balance if successful (debit)
      if (payload.status === "SUCCESS") {
        const newBalance = card.balance - usdAmount;
        await CardModel.update(card.id, { balance: newBalance });
      }

      return {
        success: true,
        message: "Withdrawal transaction processed",
        transactionType: "WITHDRAWAL",
        cardId: card.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Withdrawal transaction failed:", error.message);
      return {
        success: false,
        message: `Failed to process withdrawal: ${error.message}`,
        transactionType: "WITHDRAWAL",
        cardId: card.id,
        processed: true,
      };
    }
  }

  /**
   * 🏦 MONIX-STYLE: Handle authorization transaction
   */
  private async handleAuthorizationTransaction(
    card: any,
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("🏦 Processing authorization transaction", {
      cardId: card.id,
      amount: payload.amount,
      status: payload.status,
    });

    try {
      const usdAmount = Math.abs(Number(payload.amount || 0)) / 100;

      // Create authorization transaction
      const transaction = await TransactionModel.create({
        id: uuidv4(),
        amount: usdAmount,
        currency: "USD",
        category: TransactionCategory.CARD,
        type: TransactionType.AUTHORIZATION,
        status:
          payload.status === "SUCCESS"
            ? TransactionStatus.SUCCESS
            : TransactionStatus.FAILED,
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: `Payment authorization - ${
          payload.merchant?.name || "Unknown merchant"
        }`,
        created_at: new Date().toISOString(),
      });

      // Update balance if successful (debit)
      if (payload.status === "SUCCESS") {
        const newBalance = card.balance - usdAmount;
        await CardModel.update(card.id, { balance: newBalance });
      }

      return {
        success: true,
        message: "Authorization transaction processed",
        transactionType: "AUTHORIZATION",
        cardId: card.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Authorization transaction failed:", error.message);
      return {
        success: false,
        message: `Failed to process authorization: ${error.message}`,
        transactionType: "AUTHORIZATION",
        cardId: card.id,
        processed: true,
      };
    }
  }

  /**
   * 🏁 MONIX-STYLE: Handle settlement transaction
   */
  private async handleSettlementTransaction(
    card: any,
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("🏁 Processing settlement transaction", {
      cardId: card.id,
      amount: payload.amount,
      status: payload.status,
    });

    try {
      const usdAmount = Math.abs(Number(payload.amount || 0)) / 100;

      // Create settlement transaction
      const transaction = await TransactionModel.create({
        id: uuidv4(),
        amount: usdAmount,
        currency: "USD",
        category: "CARD",
        type: "SETTLEMENT",
        status: payload.status === "SUCCESS" ? "SUCCESS" : "FAILED",
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: `Payment settlement - ${
          payload.merchant?.name || "Unknown merchant"
        }`,
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: "Settlement transaction processed",
        transactionType: "SETTLEMENT",
        cardId: card.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Settlement transaction failed:", error.message);
      return {
        success: false,
        message: `Failed to process settlement: ${error.message}`,
        transactionType: "SETTLEMENT",
        cardId: card.id,
        processed: true,
      };
    }
  }

  /**
   * ❌ MONIX-STYLE: Handle decline transaction
   */
  private async handleDeclineTransaction(
    card: any,
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("❌ Processing decline transaction", {
      cardId: card.id,
      amount: payload.amount,
      status: payload.status,
    });

    try {
      const usdAmount = Math.abs(Number(payload.amount || 0)) / 100;

      // Create failed transaction
      const transaction = await TransactionModel.create({
        id: uuidv4(),
        amount: usdAmount,
        currency: "USD",
        category: "CARD",
        type: "AUTHORIZATION",
        status: "FAILED",
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: `Payment declined - ${
          payload.merchant?.name || "Unknown merchant"
        }`,
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: "Decline transaction processed",
        transactionType: "DECLINE",
        cardId: card.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Decline transaction failed:", error.message);
      return {
        success: false,
        message: `Failed to process decline: ${error.message}`,
        transactionType: "DECLINE",
        cardId: card.id,
        processed: true,
      };
    }
  }

  /**
   * ↩️ MONIX-STYLE: Handle refund transaction
   */
  private async handleRefundTransaction(
    card: any,
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("↩️ Processing refund transaction", {
      cardId: card.id,
      amount: payload.amount,
      type: payload.type,
    });

    try {
      const usdAmount = Math.abs(Number(payload.amount || 0)) / 100;

      // Create refund transaction
      const transaction = await TransactionModel.create({
        id: uuidv4(),
        amount: usdAmount,
        currency: "USD",
        category: "CARD",
        type: payload.type === "REFUND" ? "REFUND" : "REVERSAL",
        status: "SUCCESS",
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: `${payload.type} - ${
          payload.merchant?.name || "Unknown merchant"
        }`,
        created_at: new Date().toISOString(),
      });

      // Update balance (credit for refunds)
      const newBalance = card.balance + usdAmount;
      await CardModel.update(card.id, { balance: newBalance });

      return {
        success: true,
        message: "Refund transaction processed",
        transactionType: payload.type,
        cardId: card.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Refund transaction failed:", error.message);
      return {
        success: false,
        message: `Failed to process refund: ${error.message}`,
        transactionType: payload.type,
        cardId: card.id,
        processed: true,
      };
    }
  }

  /**
   * 🛑 MONIX-STYLE: Handle termination transaction
   */
  private async handleTerminationTransaction(
    card: any,
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    this.logger.log("🛑 Processing termination transaction", {
      cardId: card.id,
      amount: payload.amount,
    });

    try {
      const usdAmount = Math.abs(Number(payload.amount || 0)) / 100;

      // Create termination transaction
      const transaction = await TransactionModel.create({
        id: uuidv4(),
        amount: usdAmount,
        currency: "USD",
        category: "CARD",
        type: "TERMINATION",
        status: "SUCCESS",
        customer_id: card.customer_id,
        company_id: card.company_id,
        card_id: card.id,
        provider: encodeText("maplerad"),
        description: "Card termination refund",
        created_at: new Date().toISOString(),
      });

      // Update balance (credit for termination refund)
      const newBalance = card.balance + usdAmount;
      await CardModel.update(card.id, { balance: newBalance });

      return {
        success: true,
        message: "Termination transaction processed",
        transactionType: "TERMINATION",
        cardId: card.id,
        processed: true,
      };
    } catch (error: any) {
      this.logger.error("❌ Termination transaction failed:", error.message);
      return {
        success: false,
        message: `Failed to process termination: ${error.message}`,
        transactionType: "TERMINATION",
        cardId: card.id,
        processed: true,
      };
    }
  }
}
