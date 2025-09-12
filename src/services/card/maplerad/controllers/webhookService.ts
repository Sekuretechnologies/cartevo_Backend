import { CardModel, TransactionModel, UserModel } from "@/models";
import { v4 as uuidv4 } from "uuid";
import { utcToLocalTime } from "@/utils/date";
import {
  CardStatus,
  CardTransactionStatus,
} from "@/utils/cards/maplerad/types";
import { NotificationService } from "../services/notificationService";
import {
  MapleradWebhookPayload,
  TransactionWebhookPayload,
  CardCreatedWebhookPayload,
  CardCreationFailedWebhookPayload,
  CardTerminatedWebhookPayload,
  CardChargeWebhookPayload,
  WebhookProcessingResult,
  TransactionCorrelationData,
  FailureFeeContext,
  WebhookProcessingError,
  WEBHOOK_EVENT_CONFIGS,
} from "../types/webhook.types";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
} from "../types/transaction.types";

/**
 * Webhook Service
 * Handles Maplerad webhook processing for card events
 */
export class WebhookService {
  /**
   * Process card creation success webhook
   */
  static async processCardCreated(payload: any) {
    try {
      console.log("🎉 Processing card creation success webhook", {
        reference: payload.reference,
        cardId: payload.card?.id,
        cardName: payload.card?.name,
      });

      // Create card in database (simplified - would need metadata from tracking service)
      const cardResult = await CardModel.create({
        id: payload.card?.id || uuidv4(),
        company_id: "company-id", // Would need to get from metadata
        customer_id: "customer-id", // Would need to get from metadata
        status: CardStatus.ACTIVE,
        balance: payload.card?.balance || 0,
        number: "****",
        cvv: "***",
        expiry_month: 12,
        expiry_year: 2029,
        currency: payload.card?.currency || "USD",
        country: "US",
        country_iso_code: "US",
        provider_card_id: payload.card?.id,
        masked_number: payload.card?.masked_pan,
        name: payload.card?.name || "CARD HOLDER",
        provider: "maplerad",
        brand: payload.card?.issuer === "VISA" ? "VISA" : "MASTERCARD",
        is_active: true,
        is_virtual: true,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (cardResult.error) {
        throw new Error("Failed to create card in database");
      }

      // Send success notification
      await NotificationService.sendCardIssuanceSuccessNotification({
        customerId: "customer-id", // Would need to get from metadata
        companyId: "company-id", // Would need to get from metadata
        amount: payload.card?.balance || 0,
        currency: payload.card?.currency || "USD",
        reference: payload.reference,
      });

      return {
        success: true,
        message: "Card creation webhook processed successfully",
        processed: true,
        cardId: payload.card?.id,
      };
    } catch (error: any) {
      console.error("❌ Error processing card creation webhook:", error);
      return {
        success: false,
        message: `Failed to process card creation: ${error.message}`,
        processed: false,
      };
    }
  }

  /**
   * Process card creation failure webhook
   */
  static async processCardCreationFailed(payload: any) {
    try {
      console.log("❌ Processing card creation failure webhook", {
        reference: payload.reference,
        reason: payload.reason,
      });

      // Send failure notification
      await NotificationService.sendCardIssuanceFailureNotification(
        {
          customerId: "customer-id", // Would need to get from metadata
          companyId: "company-id", // Would need to get from metadata
          amount: 0,
          currency: "USD",
          reference: payload.reference,
        },
        payload.reason || "Unknown reason"
      );

      return {
        success: true,
        message: "Card creation failure webhook processed",
        processed: true,
      };
    } catch (error: any) {
      console.error(
        "❌ Error processing card creation failure webhook:",
        error
      );
      return {
        success: false,
        message: `Failed to process failure webhook: ${error.message}`,
        processed: false,
      };
    }
  }

  /**
   * Process card termination webhook
   */
  static async processCardTerminated(payload: any) {
    try {
      console.log("🛑 Processing card termination webhook", {
        cardId: payload.card_id,
        amount: payload.amount,
        reason: payload.reason,
      });

      // Update card status
      const updateResult = await CardModel.update(payload.card_id, {
        status: CardStatus.TERMINATED,
        balance_usd: 0,
        balance_xaf: 0,
        balance_user_currency: 0,
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (updateResult.error) {
        throw new Error("Failed to update card status");
      }

      return {
        success: true,
        message: "Card termination webhook processed successfully",
        processed: true,
        cardId: payload.card_id,
      };
    } catch (error: any) {
      console.error("❌ Error processing card termination webhook:", error);
      return {
        success: false,
        message: `Failed to process termination: ${error.message}`,
        processed: false,
      };
    }
  }

  /**
   * Process funding transaction webhook
   */
  static async processFundingTransaction(payload: any) {
    try {
      console.log("💰 Processing funding transaction webhook", {
        cardId: payload.card_id,
        amount: payload.amount,
        reference: payload.reference,
      });

      // Update transaction status if it exists
      if (payload.reference) {
        await TransactionModel.update(payload.reference, {
          status: CardTransactionStatus.SUCCESS,
          order_id: payload.reference,
          updated_at: utcToLocalTime(new Date())?.toISOString(),
        });

        // Update card balance
        if (payload.card_id && payload.amount) {
          const cardResult = await CardModel.getOne({ id: payload.card_id });
          if (!cardResult.error && cardResult.output) {
            const currentBalance = cardResult.output.balance_usd || 0;
            await CardModel.update(payload.card_id, {
              balance_usd: currentBalance + payload.amount / 100, // Convert cents to dollars
              updated_at: utcToLocalTime(new Date())?.toISOString(),
            });
          }
        }
      }

      return {
        success: true,
        message: "Funding transaction webhook processed successfully",
        processed: true,
        cardId: payload.card_id,
      };
    } catch (error: any) {
      console.error("❌ Error processing funding transaction webhook:", error);
      return {
        success: false,
        message: `Failed to process funding: ${error.message}`,
        processed: false,
      };
    }
  }

  /**
   * Process withdrawal transaction webhook
   */
  static async processWithdrawalTransaction(payload: any) {
    try {
      console.log("💸 Processing withdrawal transaction webhook", {
        cardId: payload.card_id,
        amount: payload.amount,
        reference: payload.reference,
      });

      // Update transaction status if it exists
      if (payload.reference) {
        await TransactionModel.update(payload.reference, {
          status: CardTransactionStatus.SUCCESS,
          order_id: payload.reference,
          updated_at: utcToLocalTime(new Date())?.toISOString(),
        });

        // Update card balance
        if (payload.card_id && payload.amount) {
          const cardResult = await CardModel.getOne({ id: payload.card_id });
          if (!cardResult.error && cardResult.output) {
            const currentBalance = cardResult.output.balance_usd || 0;
            await CardModel.update(payload.card_id, {
              balance_usd: currentBalance - payload.amount / 100, // Convert cents to dollars
              updated_at: utcToLocalTime(new Date())?.toISOString(),
            });
          }
        }
      }

      return {
        success: true,
        message: "Withdrawal transaction webhook processed successfully",
        processed: true,
        cardId: payload.card_id,
      };
    } catch (error: any) {
      console.error(
        "❌ Error processing withdrawal transaction webhook:",
        error
      );
      return {
        success: false,
        message: `Failed to process withdrawal: ${error.message}`,
        processed: false,
      };
    }
  }

  /**
   * Main webhook handler with comprehensive event processing
   */
  static async handleWebhook(
    payload: MapleradWebhookPayload
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const eventType = payload.event;
    const webhookConfig = WEBHOOK_EVENT_CONFIGS[eventType];

    console.log(`🔔 Processing Maplerad webhook: ${eventType}`, {
      eventType,
      reference: payload.reference,
      cardId: (payload as any).card_id,
      critical: webhookConfig?.critical || false,
    });

    try {
      let result: WebhookProcessingResult;

      switch (eventType) {
        case "issuing.transaction":
          result = await this.processTransaction(
            payload as TransactionWebhookPayload
          );
          break;

        case "issuing.created.successful":
          result = await this.processCardCreated(
            payload as CardCreatedWebhookPayload
          );
          break;

        case "issuing.created.failed":
          result = await this.processCardCreationFailed(
            payload as CardCreationFailedWebhookPayload
          );
          break;

        case "issuing.terminated":
          result = await this.processCardTerminated(
            payload as CardTerminatedWebhookPayload
          );
          break;

        case "issuing.charge":
          result = await this.processCardCharge(
            payload as CardChargeWebhookPayload
          );
          break;

        default:
          console.warn(`Unknown webhook event type: ${eventType}`);
          result = {
            success: true,
            message: `Event type ${eventType} acknowledged but not processed`,
            processed: true,
            transactionType: eventType,
          };
      }

      // Add processing metadata
      result.metadata = {
        ...result.metadata,
        processingTimeMs: Date.now() - startTime,
      };

      console.log(`✅ Webhook processed successfully: ${eventType}`, {
        processingTime: result.metadata.processingTimeMs,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      console.error("❌ Error in webhook handler:", error);

      return {
        success: false,
        message: `Webhook processing failed: ${error.message}`,
        processed: false,
        transactionType: eventType,
        errors: [error.message],
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Comprehensive transaction processing for all transaction types
   */
  static async processTransaction(
    payload: TransactionWebhookPayload
  ): Promise<WebhookProcessingResult> {
    console.log(`💳 Processing ${payload.type} transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      status: payload.status,
      mode: payload.mode,
      merchantName: payload.merchant?.name,
    });

    try {
      // Get local card for context
      const card = await this.getLocalCard(payload.card_id);

      switch (payload.type) {
        case "AUTHORIZATION":
          return await this.processAuthorizationTransaction(payload, card);

        case "SETTLEMENT":
          return await this.processSettlementTransaction(payload, card);

        case "DECLINE":
          return await this.processDeclineTransaction(payload, card);

        case "FUNDING":
          return await this.processFundingTransaction(payload);

        case "WITHDRAWAL":
          return await this.processWithdrawalTransaction(payload);

        case "REVERSAL":
        case "REFUND":
          return await this.processRefundTransaction(payload, card);

        case "CROSS-BORDER":
          return await this.processCrossBorderTransaction(payload, card);

        default:
          return {
            success: true,
            message: `Transaction type ${payload.type} acknowledged`,
            processed: true,
            transactionType: payload.type,
            cardId: payload.card_id,
          };
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${payload.type} transaction:`, error);

      return {
        success: false,
        message: `Failed to process ${payload.type}: ${error.message}`,
        processed: false,
        transactionType: payload.type,
        cardId: payload.card_id,
        errors: [error.message],
      };
    }
  }

  /**
   * Process authorization transactions (payment attempts)
   */
  private static async processAuthorizationTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`🏦 Processing AUTHORIZATION transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      status: payload.status,
      merchantName: payload.merchant?.name,
    });

    // Record transaction immediately
    const transaction = await this.recordTransactionFromWebhook(payload, card);

    const isSuccessfulPayment =
      payload.status === "SUCCESS" && payload.mode === "DEBIT";

    if (isSuccessfulPayment) {
      // Process fees asynchronously for performance
      setImmediate(() => {
        this.processSuccessfulPaymentFeesAsync(
          payload,
          card,
          transaction
        ).catch((error) =>
          console.error("Async fee processing failed:", error)
        );
      });

      // Send notification asynchronously
      setImmediate(() => {
        this.sendPaymentSuccessNotificationAsync(payload, card).catch((error) =>
          console.error("Async notification failed:", error)
        );
      });
    }

    return {
      success: true,
      message: isSuccessfulPayment
        ? "Authorization recorded (fees processing asynchronously)"
        : "Authorization recorded",
      processed: true,
      transactionType: "AUTHORIZATION",
      cardId: payload.card_id,
      metadata: {
        processingTimeMs: 0,
        correlatedTransaction: transaction.id,
        feesApplied: isSuccessfulPayment,
        notificationSent: isSuccessfulPayment,
      },
    };
  }

  /**
   * Process decline transactions with intelligent fee management
   */
  private static async processDeclineTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`❌ Processing DECLINE transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      merchantName: payload.merchant?.name,
      description: payload.description,
    });

    // 1. Record declined transaction immediately
    const transaction = await this.recordTransactionFromWebhook(payload, card);

    // 2. Store balance before decline for fee verification
    const balanceContext = await this.storeBalanceSnapshot(
      payload.card_id,
      payload.reference
    );

    // 3. Schedule failure fee verification (30 seconds)
    setTimeout(async () => {
      await this.verifyAndApplyFailureFee(payload, balanceContext);
    }, 30000);

    // 4. Handle insufficient funds notification
    if (payload.description?.toLowerCase().includes("no sufficient funds")) {
      setImmediate(() => {
        this.sendInsufficientFundsNotificationAsync(payload, card).catch(
          (error) =>
            console.error("Insufficient funds notification failed:", error)
        );
      });
    }

    return {
      success: true,
      message: "Decline transaction recorded (failure fee check scheduled)",
      processed: true,
      transactionType: "DECLINE",
      cardId: payload.card_id,
      metadata: {
        processingTimeMs: 0,
        correlatedTransaction: transaction.id,
        feesApplied: false, // Will be determined later
        notificationSent: payload.description
          ?.toLowerCase()
          .includes("no sufficient funds"),
      },
    };
  }

  /**
   * Process card charge webhooks (failure fees from Maplerad)
   */
  static async processCardCharge(
    payload: CardChargeWebhookPayload
  ): Promise<WebhookProcessingResult> {
    console.log(`💰 Processing card charge (failure fee)`, {
      cardId: payload.card_id,
      amount: payload.amount,
      transactionDate: payload.transaction_date,
    });

    try {
      const card = await this.getLocalCard(payload.card_id);

      // Record the failure fee transaction
      await TransactionModel.create({
        id: uuidv4(),
        company_id: card.company_id,
        customer_id: card.customer_id,
        wallet_id: card.wallet_id,
        card_id: card.id,
        category: TRANSACTION_CATEGORY.CARD,
        type: TRANSACTION_TYPE.PAYMENT_FAILURE_FEE,
        status: TRANSACTION_STATUS.SUCCESS,
        description: `Payment failure fee - ${
          payload.reason || "Transaction declined"
        }`,
        amount: this.convertFromCents(payload.amount),
        currency: payload.currency || "USD",
        reference: `failure-fee-${payload.reference}`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      // Update card balance
      const newBalance = card.balance - this.convertFromCents(payload.amount);
      await CardModel.update(card.id, {
        balance: newBalance,
        updated_at: new Date(),
      });

      // Send notification about the fee
      await NotificationService.sendCardIssuanceFailureNotification(
        {
          customerId: card.customer_id,
          companyId: card.company_id,
          amount: this.convertFromCents(payload.amount),
          currency: payload.currency || "USD",
          reference: payload.reference,
        },
        `Payment failure fee applied: ${
          payload.reason || "Transaction declined"
        }`
      );

      return {
        success: true,
        message: "Card charge processed successfully",
        processed: true,
        transactionType: "CHARGE",
        cardId: payload.card_id,
        metadata: {
          processingTimeMs: 0,
          balanceUpdated: true,
          feesApplied: true,
          notificationSent: true,
        },
      };
    } catch (error: any) {
      console.error(`❌ Error processing card charge:`, error);

      return {
        success: false,
        message: `Failed to process card charge: ${error.message}`,
        processed: false,
        transactionType: "CHARGE",
        cardId: payload.card_id,
        errors: [error.message],
      };
    }
  }

  /**
   * Get local card from database
   */
  private static async getLocalCard(cardId: string): Promise<any> {
    const cardResult = await CardModel.getOne({ id: cardId });
    if (cardResult.error || !cardResult.output) {
      throw new Error(`Card not found: ${cardId}`);
    }
    return cardResult.output;
  }

  /**
   * Process settlement transactions
   */
  private static async processSettlementTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`💰 Processing SETTLEMENT transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      status: payload.status,
    });

    const transaction = await this.recordTransactionFromWebhook(payload, card);

    return {
      success: true,
      message: "Settlement transaction recorded",
      processed: true,
      transactionType: "SETTLEMENT",
      cardId: payload.card_id,
      metadata: {
        processingTimeMs: 0,
        correlatedTransaction: transaction.id,
      },
    };
  }

  /**
   * Process refund transactions
   */
  private static async processRefundTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`🔄 Processing REFUND transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      status: payload.status,
    });

    const transaction = await this.recordTransactionFromWebhook(payload, card);

    return {
      success: true,
      message: "Refund transaction recorded",
      processed: true,
      transactionType: "REFUND",
      cardId: payload.card_id,
      metadata: {
        processingTimeMs: 0,
        correlatedTransaction: transaction.id,
      },
    };
  }

  /**
   * Process cross-border transactions
   */
  private static async processCrossBorderTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`🌍 Processing CROSS-BORDER transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      status: payload.status,
    });

    const transaction = await this.recordTransactionFromWebhook(payload, card);

    return {
      success: true,
      message: "Cross-border transaction recorded",
      processed: true,
      transactionType: "CROSS-BORDER",
      cardId: payload.card_id,
      metadata: {
        processingTimeMs: 0,
        correlatedTransaction: transaction.id,
      },
    };
  }

  /**
   * Record transaction from webhook payload
   */
  private static async recordTransactionFromWebhook(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<any> {
    const transactionResult = await TransactionModel.create({
      id: uuidv4(),
      status:
        payload.status === "SUCCESS"
          ? CardTransactionStatus.SUCCESS
          : CardTransactionStatus.FAILED,
      amount: payload.amount || 0,
      fee_amount: payload.fee || 0,
      category: TRANSACTION_CATEGORY.CARD,
      type: payload.type?.toLowerCase() || "unknown",
      user_id: card?.customer_id || "user-id",
      card_id: payload.card_id,
      company_id: card?.company_id || "company-id",
      provider: "maplerad",
      currency: payload.currency || "USD",
      reference: payload.reference || `WEBHOOK_${Date.now()}`,
      description: payload.description || `Transaction ${payload.type}`,
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (transactionResult.error) {
      throw new Error("Failed to create transaction");
    }

    return transactionResult.output;
  }

  /**
   * Process successful payment fees asynchronously
   */
  private static async processSuccessfulPaymentFeesAsync(
    payload: TransactionWebhookPayload,
    card: any,
    transaction: any
  ): Promise<void> {
    try {
      console.log(`💰 Processing fees for successful payment`, {
        transactionId: transaction.id,
        amount: payload.amount,
      });

      // Fee processing logic would go here
      // This is a placeholder for the actual fee calculation and application
    } catch (error: any) {
      console.error("Error processing payment fees:", error);
    }
  }

  /**
   * Send payment success notification asynchronously
   */
  private static async sendPaymentSuccessNotificationAsync(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<void> {
    try {
      console.log(`📧 Sending payment success notification`, {
        cardId: payload.card_id,
        amount: payload.amount,
      });

      // Notification logic would go here
      // This is a placeholder for the actual notification sending
    } catch (error: any) {
      console.error("Error sending payment success notification:", error);
    }
  }

  /**
   * Store balance snapshot for fee verification
   */
  private static async storeBalanceSnapshot(
    cardId: string,
    reference: string
  ): Promise<any> {
    try {
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error || !cardResult.output) {
        throw new Error(`Card not found: ${cardId}`);
      }

      const card = cardResult.output;
      return {
        cardId,
        reference,
        balanceBefore: card.balance_usd || 0,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error("Error storing balance snapshot:", error);
      throw error;
    }
  }

  /**
   * Verify and apply failure fee
   */
  private static async verifyAndApplyFailureFee(
    payload: TransactionWebhookPayload,
    balanceContext: any
  ): Promise<void> {
    try {
      console.log(`🔍 Verifying failure fee application`, {
        cardId: payload.card_id,
        reference: payload.reference,
      });

      // Failure fee verification logic would go here
      // This is a placeholder for the actual fee verification and application
    } catch (error: any) {
      console.error("Error verifying failure fee:", error);
    }
  }

  /**
   * Send insufficient funds notification asynchronously
   */
  private static async sendInsufficientFundsNotificationAsync(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<void> {
    try {
      console.log(`🚫 Sending insufficient funds notification`, {
        cardId: payload.card_id,
        amount: payload.amount,
      });

      // Insufficient funds notification logic would go here
      // This is a placeholder for the actual notification sending
    } catch (error: any) {
      console.error("Error sending insufficient funds notification:", error);
    }
  }

  /**
   * Convert amount from cents to dollars
   */
  private static convertFromCents(amount: number): number {
    return Math.round((amount / 100) * 100) / 100;
  }
}
