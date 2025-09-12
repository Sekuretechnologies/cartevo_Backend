import {
  CardModel,
  TransactionModel,
  CustomerModel,
  CompanyModel,
} from "@/models";
import { v4 as uuidv4 } from "uuid";
import { utcToLocalTime } from "@/utils/date";
import { NotificationService } from "./notificationService";
import { UnifiedWalletService } from "./walletService";
import {
  MapleradWebhookPayload,
  TransactionWebhookPayload,
  CardChargeWebhookPayload,
  WebhookProcessingResult,
  TransactionCorrelationData,
  FailureFeeContext,
  WebhookProcessingError,
} from "../types/webhook.types";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
} from "../types/transaction.types";

/**
 * Comprehensive Transaction Processing Service
 * Handles all Maplerad webhook transaction events with advanced correlation and fee management
 */
export class TransactionProcessingService {
  // Cache for balance snapshots before decline transactions
  private static balanceSnapshotCache = new Map<
    string,
    {
      balance: number;
      timestamp: number;
      cardId: string;
    }
  >();

  // Cache for pending failure fee processing
  private static failureFeeQueue = new Map<string, FailureFeeContext>();

  /**
   * Main transaction processing entry point
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
   * Process settlement transactions
   */
  private static async processSettlementTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`🏁 Processing SETTLEMENT transaction`, {
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
    await this.storeBalanceSnapshot(payload.card_id, payload.reference);

    // 3. Schedule failure fee verification (30 seconds)
    setTimeout(async () => {
      await this.verifyAndApplyFailureFee(payload, card);
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
   * Process refund/reversal transactions
   */
  private static async processRefundTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`🔄 Processing ${payload.type} transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      status: payload.status,
    });

    const transaction = await this.recordTransactionFromWebhook(payload, card);

    // Update card balance for successful refunds
    if (payload.status === "SUCCESS") {
      const newBalance = card.balance + this.convertFromCents(payload.amount);
      await CardModel.update(card.id, {
        balance: newBalance,
        updated_at: new Date(),
      });
    }

    return {
      success: true,
      message: `${payload.type} transaction recorded`,
      processed: true,
      transactionType: payload.type,
      cardId: payload.card_id,
      metadata: {
        processingTimeMs: 0,
        correlatedTransaction: transaction.id,
        balanceUpdated: payload.status === "SUCCESS",
      },
    };
  }

  /**
   * Process cross-border fee transactions
   */
  private static async processCrossBorderTransaction(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<WebhookProcessingResult> {
    console.log(`🌍 Processing CROSS-BORDER fee transaction`, {
      cardId: payload.card_id,
      amount: payload.amount,
      status: payload.status,
    });

    const transaction = await this.recordTransactionFromWebhook(payload, card);

    return {
      success: true,
      message: "Cross-border fee recorded",
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
    // Check if transaction already exists (idempotency)
    const existingTransaction = await TransactionModel.get({
      reference: payload.reference,
    });

    if (!existingTransaction.error && existingTransaction.output.length > 0) {
      console.log("Transaction already exists, skipping creation", {
        reference: payload.reference,
        existingId: existingTransaction.output[0].id,
      });
      return existingTransaction.output[0];
    }

    // Create new transaction
    const transactionResult = await TransactionModel.create({
      id: uuidv4(),
      company_id: card.company_id,
      customer_id: card.customer_id,
      wallet_id: card.wallet_id || null,
      card_id: card.id,
      category: TRANSACTION_CATEGORY.CARD,
      type: this.mapTransactionType(payload.type, payload.mode),
      status: this.mapTransactionStatus(payload.status),
      description: this.buildTransactionDescription(payload),
      amount: this.convertFromCents(payload.amount),
      currency: payload.currency || "USD",
      fee_amount: payload.fee ? this.convertFromCents(payload.fee) : 0,
      net_amount: this.calculateNetAmount(payload),
      reference: payload.reference,
      reason: payload.description,
      metadata: JSON.stringify({
        merchantName: payload.merchant?.name,
        merchantCity: payload.merchant?.city,
        merchantCountry: payload.merchant?.country,
        cardAcceptorMcc: payload.card_acceptor_mcc,
        approvalCode: payload.approval_code,
        settled: payload.settled,
        mapleradType: payload.type,
        mode: payload.mode,
      }),
      created_at: utcToLocalTime(new Date())?.toISOString(),
      updated_at: utcToLocalTime(new Date())?.toISOString(),
    });

    if (transactionResult.error) {
      throw new WebhookProcessingError(
        `Failed to create transaction: ${transactionResult.error}`,
        payload.type,
        payload.card_id,
        payload.reference
      );
    }

    return transactionResult.output;
  }

  /**
   * Get local card by Maplerad card ID
   */
  private static async getLocalCard(mapleradCardId: string): Promise<any> {
    const cardResult = await CardModel.get({
      provider_card_id: mapleradCardId,
    });

    if (
      cardResult.error ||
      !cardResult.output ||
      cardResult.output.length === 0
    ) {
      throw new WebhookProcessingError(
        `Card not found: ${mapleradCardId}`,
        "unknown",
        mapleradCardId
      );
    }

    return cardResult.output[0];
  }

  /**
   * Convert cents to dollars
   */
  private static convertFromCents(amountInCents: number): number {
    return Math.round((amountInCents / 100) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Map Maplerad transaction types to local types
   */
  private static mapTransactionType(mapleradType: string, mode?: string): any {
    const mappings = {
      AUTHORIZATION:
        mode === "DEBIT" ? TRANSACTION_TYPE.PAYMENT : TRANSACTION_TYPE.REFUND,
      SETTLEMENT: TRANSACTION_TYPE.PAYMENT,
      DECLINE: TRANSACTION_TYPE.PAYMENT_FAILED,
      FUNDING: TRANSACTION_TYPE.FUNDING,
      WITHDRAWAL: TRANSACTION_TYPE.WITHDRAWAL,
      REVERSAL: TRANSACTION_TYPE.REFUND,
      REFUND: TRANSACTION_TYPE.REFUND,
      "CROSS-BORDER": TRANSACTION_TYPE.FEE,
    };

    return mappings[mapleradType] || TRANSACTION_TYPE.OTHER;
  }

  /**
   * Map Maplerad transaction status to local status
   */
  private static mapTransactionStatus(mapleradStatus: string): any {
    const mappings = {
      SUCCESS: TRANSACTION_STATUS.SUCCESS,
      FAILED: TRANSACTION_STATUS.FAILED,
      PENDING: TRANSACTION_STATUS.PENDING,
      DECLINED: TRANSACTION_STATUS.FAILED,
    };

    return mappings[mapleradStatus] || TRANSACTION_STATUS.PENDING;
  }

  /**
   * Build transaction description
   */
  private static buildTransactionDescription(
    payload: TransactionWebhookPayload
  ): string {
    const merchantName = payload.merchant?.name || "Unknown merchant";

    switch (payload.type) {
      case "AUTHORIZATION":
        return payload.status === "SUCCESS"
          ? `Payment authorized - ${merchantName}`
          : `Payment declined - ${merchantName}`;
      case "SETTLEMENT":
        return `Payment settled - ${merchantName}`;
      case "DECLINE":
        return `Payment declined - ${merchantName}`;
      case "REVERSAL":
        return `Transaction reversed - ${merchantName}`;
      case "REFUND":
        return `Refund processed - ${merchantName}`;
      case "CROSS-BORDER":
        return `Cross-border fee - ${merchantName}`;
      default:
        return (
          payload.description || `Transaction ${payload.type} - ${merchantName}`
        );
    }
  }

  /**
   * Calculate net amount based on transaction type
   */
  private static calculateNetAmount(
    payload: TransactionWebhookPayload
  ): number {
    const baseAmount = this.convertFromCents(payload.amount);

    switch (payload.type) {
      case "AUTHORIZATION":
      case "SETTLEMENT":
        return payload.mode === "DEBIT" ? -baseAmount : baseAmount;
      case "DECLINE":
      case "CROSS-BORDER":
        return 0; // No net amount for fees or declined transactions
      case "REFUND":
      case "REVERSAL":
        return baseAmount; // Always positive for refunds
      default:
        return baseAmount;
    }
  }

  /**
   * Store balance snapshot before decline for failure fee verification
   */
  private static async storeBalanceSnapshot(
    cardId: string,
    reference: string
  ): Promise<void> {
    try {
      // Get current card balance from local database
      const cardResult = await CardModel.getOne({ provider_card_id: cardId });
      if (cardResult.error) {
        console.warn("Could not store balance snapshot - card not found", {
          cardId,
        });
        return;
      }

      const card = cardResult.output;
      this.balanceSnapshotCache.set(reference, {
        balance: Number(card.balance),
        timestamp: Date.now(),
        cardId: card.id,
      });

      console.log("📸 Balance snapshot stored", {
        reference,
        cardId: card.id,
        balance: card.balance,
      });

      // Auto-expire after 5 minutes
      setTimeout(() => {
        this.balanceSnapshotCache.delete(reference);
      }, 300000);
    } catch (error: any) {
      console.error("Failed to store balance snapshot", {
        cardId,
        reference,
        error: error.message,
      });
    }
  }

  /**
   * Verify if Maplerad charged failure fee and apply ours if needed
   */
  private static async verifyAndApplyFailureFee(
    payload: TransactionWebhookPayload,
    card: any
  ): Promise<void> {
    try {
      const snapshot = this.balanceSnapshotCache.get(payload.reference);
      if (!snapshot) {
        console.warn("No balance snapshot found for failure fee verification", {
          reference: payload.reference,
        });
        return;
      }

      // Get current balance
      const currentCardResult = await CardModel.getOne({ id: snapshot.cardId });
      if (currentCardResult.error) {
        console.error("Could not verify current balance for failure fee", {
          cardId: snapshot.cardId,
        });
        return;
      }

      const currentBalance = Number(currentCardResult.output.balance);
      const balanceReduction = snapshot.balance - currentBalance;

      console.log("🔍 Failure fee verification", {
        reference: payload.reference,
        balanceBeforeDecline: snapshot.balance,
        balanceAfterDecline: currentBalance,
        balanceReduction,
        expectedMapleradFee: 0.3,
      });

      // If Maplerad charged ~$0.30, no additional fee needed
      if (Math.abs(balanceReduction - 0.3) < 0.05) {
        console.log("✅ Maplerad already charged failure fee", {
          cardId: payload.card_id,
          chargeDetected: balanceReduction,
        });
        return;
      }

      // Apply our failure fee since Maplerad didn't charge
      await this.applyFailureFee(card, 0.5, payload.reference);

      console.log("💰 Applied failure fee - Maplerad did not charge", {
        cardId: payload.card_id,
        feeApplied: 0.5,
        reason: "maplerad_no_charge",
      });
    } catch (error: any) {
      console.error("Error in failure fee verification", {
        reference: payload.reference,
        error: error.message,
      });
    } finally {
      // Cleanup snapshot
      this.balanceSnapshotCache.delete(payload.reference);
    }
  }

  /**
   * Apply failure fee when Maplerad hasn't charged
   */
  private static async applyFailureFee(
    card: any,
    feeAmount: number,
    reference: string
  ): Promise<void> {
    try {
      // Create failure fee transaction
      await TransactionModel.create({
        id: uuidv4(),
        company_id: card.company_id,
        customer_id: card.customer_id,
        wallet_id: card.wallet_id,
        card_id: card.id,
        category: TRANSACTION_CATEGORY.CARD,
        type: TRANSACTION_TYPE.PAYMENT_SUCCESS_FEE,
        status: TRANSACTION_STATUS.SUCCESS,
        description: `Payment failure fee`,
        amount: feeAmount,
        currency: "USD",
        fee_amount: feeAmount,
        net_amount: -feeAmount,
        reference: `failure-fee-${reference}`,
        reason: "Payment declined - failure fee applied",
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      // Update card balance
      const newBalance = Number(card.balance) - feeAmount;
      await CardModel.update(card.id, {
        balance: newBalance,
        updated_at: new Date(),
      });

      // Send notification
      await NotificationService.sendCardIssuanceFailureNotification(
        {
          customerId: card.customer_id,
          companyId: card.company_id,
          amount: feeAmount,
          currency: "USD",
          reference: reference,
        },
        `Payment failure fee of $${feeAmount} applied due to declined transaction`
      );

      console.log("✅ Failure fee applied successfully", {
        cardId: card.id,
        feeAmount,
        newBalance,
        reference,
      });
    } catch (error: any) {
      console.error("Failed to apply failure fee", {
        cardId: card.id,
        feeAmount,
        error: error.message,
      });
    }
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
      console.log("💰 Processing successful payment fees", {
        cardId: payload.card_id,
        amount: payload.amount,
        merchantName: payload.merchant?.name,
      });

      // For now, log that fees would be processed
      // In production, this would integrate with the company's fee structure
      const transactionAmount = this.convertFromCents(payload.amount);
      const estimatedFee = Math.max(0.25, transactionAmount * 0.01); // 1% or $0.25 minimum

      console.log("📊 Payment fee calculation", {
        transactionAmount,
        estimatedFee,
        merchantName: payload.merchant?.name,
        cardId: card.id,
      });

      // TODO: Integrate with actual fee collection system
      // await FeeCollectionService.collectPaymentSuccessFee({
      //   cardId: card.id,
      //   customerId: card.customer_id,
      //   amount: estimatedFee,
      //   reference: payload.reference
      // });
    } catch (error: any) {
      console.error("Failed to process payment fees asynchronously", {
        cardId: payload.card_id,
        error: error.message,
      });
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
      const amount = this.convertFromCents(payload.amount);
      const merchantName = payload.merchant?.name || "Unknown merchant";

      await NotificationService.sendCardIssuanceSuccessNotification({
        customerId: card.customer_id,
        companyId: card.company_id,
        cardId: card.id,
        amount: amount,
        currency: payload.currency || "USD",
        reference: payload.reference,
      });

      console.log("✅ Payment success notification sent", {
        cardId: card.id,
        amount,
        merchantName,
        customerId: card.customer_id,
      });
    } catch (error: any) {
      console.error("Failed to send payment success notification", {
        cardId: payload.card_id,
        error: error.message,
      });
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
      const transactionAmount = this.convertFromCents(payload.amount);
      const cardBalance = Number(card.balance);
      const missingAmount = Math.max(0, transactionAmount - cardBalance);
      const merchantName = payload.merchant?.name || "the merchant";

      await NotificationService.sendCardIssuanceFailureNotification(
        {
          customerId: card.customer_id,
          companyId: card.company_id,
          cardId: card.id,
          amount: transactionAmount,
          currency: payload.currency || "USD",
          reference: payload.reference,
        },
        `Payment of $${transactionAmount.toFixed(
          2
        )} at ${merchantName} was declined. You need $${missingAmount.toFixed(
          2
        )} more on your card.`
      );

      console.log("📱 Insufficient funds notification sent", {
        cardId: card.id,
        transactionAmount,
        cardBalance,
        missingAmount,
        merchantName,
      });
    } catch (error: any) {
      console.error("Failed to send insufficient funds notification", {
        cardId: payload.card_id,
        error: error.message,
      });
    }
  }

  /**
   * Get transaction correlation data
   */
  static async getTransactionCorrelation(
    reference: string
  ): Promise<TransactionCorrelationData | null> {
    try {
      const transactionResult = await TransactionModel.get({ reference });

      if (
        transactionResult.error ||
        !transactionResult.output ||
        transactionResult.output.length === 0
      ) {
        return null;
      }

      const transaction = transactionResult.output[0];

      return {
        localTransactionId: transaction.id,
        cardId: transaction.card_id,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        merchantName: transaction.metadata
          ? JSON.parse(transaction.metadata).merchantName
          : undefined,
        status: transaction.status,
        correlatedAt: new Date(),
      };
    } catch (error: any) {
      console.error("Failed to get transaction correlation", {
        reference,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Clean up expired balance snapshots and failure fee contexts
   */
  static async cleanupExpiredData(): Promise<void> {
    const now = Date.now();
    const expiredReferences: string[] = [];

    // Clean up expired balance snapshots (older than 5 minutes)
    for (const [reference, snapshot] of this.balanceSnapshotCache.entries()) {
      if (now - snapshot.timestamp > 300000) {
        expiredReferences.push(reference);
      }
    }

    for (const reference of expiredReferences) {
      this.balanceSnapshotCache.delete(reference);
    }

    // Clean up expired failure fee queue items
    for (const [reference, context] of this.failureFeeQueue.entries()) {
      if (now - context.balanceBeforeDecline > 600000) {
        // 10 minutes
        this.failureFeeQueue.delete(reference);
      }
    }

    if (expiredReferences.length > 0) {
      console.log("🧹 Cleaned up expired webhook data", {
        expiredSnapshots: expiredReferences.length,
        remainingSnapshots: this.balanceSnapshotCache.size,
        remainingFeeQueue: this.failureFeeQueue.size,
      });
    }
  }
}
