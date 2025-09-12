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
  CardIssuanceError,
  InsufficientFundsError,
  WebhookTimeoutError,
} from "../types/cardIssuance.types";
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_CATEGORY,
} from "../types/transaction.types";

/**
 * Advanced Error Recovery Service
 * Implements sophisticated error handling strategies based on API success status
 */
export class ErrorRecoveryService {
  /**
   * Strategic error recovery based on API call success
   */
  static async handleStrategicError(
    error: any,
    context: {
      apiCallSucceeded: boolean;
      reservedAmount: number;
      customerId: string;
      companyId: string;
      reference: string;
      walletId: string;
      operationType: string;
    }
  ): Promise<ErrorRecoveryResult> {
    const {
      apiCallSucceeded,
      reservedAmount,
      customerId,
      companyId,
      reference,
      walletId,
      operationType,
    } = context;

    console.log("🔧 Starting strategic error recovery", {
      apiCallSucceeded,
      reservedAmount,
      customerId,
      reference,
      operationType,
      errorType: error.constructor.name,
      errorMessage: error.message,
    });

    try {
      if (!apiCallSucceeded) {
        // API failed - full service failure, refund all reserved funds
        return await this.handleServiceFailure({
          customerId,
          companyId,
          walletId,
          reservedAmount,
          reference,
          error,
          operationType,
        });
      } else {
        // API succeeded - service delivered, strategic fund management
        return await this.handleServiceDeliveredError({
          customerId,
          companyId,
          walletId,
          reservedAmount,
          reference,
          error,
          operationType,
        });
      }
    } catch (recoveryError: any) {
      console.error("🚨 Error recovery failed", {
        originalError: error.message,
        recoveryError: recoveryError.message,
        context,
      });

      throw new CardIssuanceError(
        `Error recovery failed: ${recoveryError.message}`,
        "ERROR_RECOVERY_FAILED",
        { originalError: error.message, recoveryError: recoveryError.message }
      );
    }
  }

  /**
   * Handle complete service failure with full fund refund
   */
  private static async handleServiceFailure(context: {
    customerId: string;
    companyId: string;
    walletId: string;
    reservedAmount: number;
    reference: string;
    error: any;
    operationType: string;
  }): Promise<ErrorRecoveryResult> {
    console.log("💸 Handling service failure - refunding all funds", {
      customerId: context.customerId,
      reservedAmount: context.reservedAmount,
      operationType: context.operationType,
      error: context.error.message,
    });

    // 1. Refund reserved funds to company wallet
    await UnifiedWalletService.refundFunds(
      context.walletId,
      context.reservedAmount,
      context.reference,
      `Service failure refund: ${context.error.message}`
    );

    // 2. Create refund transaction record
    await TransactionModel.create({
      id: uuidv4(),
      company_id: decision.customerId, // Using customerId as fallback for company_id
      customer_id: context.customerId,
      wallet_id: context.walletId,
      category: TRANSACTION_CATEGORY.REFUND,
      type: TRANSACTION_TYPE.REFUND,
      status: TRANSACTION_STATUS.SUCCESS,
      description: `Automatic refund - ${context.operationType} failed`,
      amount: context.reservedAmount,
      currency: "USD",
      reference: `refund-${context.reference}`,
      reason: context.error.message,
      created_at: utcToLocalTime(new Date())?.toISOString(),
      updated_at: utcToLocalTime(new Date())?.toISOString(),
    });

    // 3. Send failure notification
    await NotificationService.sendCardIssuanceFailureNotification(
      {
        customerId: context.customerId,
        companyId: context.companyId,
        amount: context.reservedAmount,
        currency: "USD",
        reference: context.reference,
      },
      `${context.operationType} failed: ${context.error.message}. Funds have been refunded automatically.`
    );

    console.log("✅ Service failure handled - funds refunded", {
      customerId: context.customerId,
      refundedAmount: context.reservedAmount,
      reference: context.reference,
    });

    return {
      strategy: "full_refund",
      fundsRefunded: true,
      refundAmount: context.reservedAmount,
      notificationSent: true,
      transactionCreated: true,
      reason: "api_call_failed",
    };
  }

  /**
   * Handle errors after successful API call - strategic fund management
   */
  private static async handleServiceDeliveredError(context: {
    customerId: string;
    companyId: string;
    walletId: string;
    reservedAmount: number;
    reference: string;
    error: any;
    operationType: string;
  }): Promise<ErrorRecoveryResult> {
    console.log(
      "🎯 Handling post-API error - service delivered, funds conserved",
      {
        customerId: context.customerId,
        reservedAmount: context.reservedAmount,
        operationType: context.operationType,
        error: context.error.message,
        strategy: "funds_kept",
      }
    );

    // 1. Log the strategic decision to keep funds
    await this.logStrategicDecision({
      customerId: context.customerId,
      amount: context.reservedAmount,
      reference: context.reference,
      decision: "funds_kept",
      reason: "service_delivered_successfully",
      operationType: context.operationType,
      errorContext: context.error.message,
    });

    // 2. Attempt data recovery if possible
    let dataRecoverySucceeded = false;
    try {
      dataRecoverySucceeded = await this.attemptDataRecovery(context);
    } catch (recoveryError: any) {
      console.warn("⚠️ Data recovery failed but service was delivered", {
        customerId: context.customerId,
        reference: context.reference,
        recoveryError: recoveryError.message,
      });
    }

    // 3. Send notification about the situation
    await NotificationService.sendCardIssuanceSuccessNotification({
      customerId: context.customerId,
      companyId: context.companyId,
      amount: context.reservedAmount,
      currency: "USD",
      reference: context.reference,
    });

    // 4. Create record of the strategic decision
    await TransactionModel.create({
      id: uuidv4(),
      company_id: decision.customerId, // Using customerId as fallback for company_id
      customer_id: context.customerId,
      wallet_id: context.walletId,
      category: TRANSACTION_CATEGORY.FEE,
      type: TRANSACTION_TYPE.CARD_ISSUANCE_FIRST,
      status: TRANSACTION_STATUS.SUCCESS,
      description: `${context.operationType} completed - service delivered`,
      amount: context.reservedAmount,
      currency: "USD",
      reference: context.reference,
      reason: "Service delivered successfully despite processing error",
      created_at: utcToLocalTime(new Date())?.toISOString(),
      updated_at: utcToLocalTime(new Date())?.toISOString(),
    });

    console.log(
      "✅ Post-API error handled - service delivered, funds conserved",
      {
        customerId: context.customerId,
        conservedAmount: context.reservedAmount,
        dataRecovered: dataRecoverySucceeded,
        reference: context.reference,
      }
    );

    return {
      strategy: "funds_kept",
      fundsRefunded: false,
      conservedAmount: context.reservedAmount,
      notificationSent: true,
      transactionCreated: true,
      dataRecoveryAttempted: true,
      dataRecoverySucceeded,
      reason: "service_delivered",
    };
  }

  /**
   * Attempt to recover data after successful API call but processing error
   */
  private static async attemptDataRecovery(context: {
    customerId: string;
    reference: string;
    operationType: string;
  }): Promise<boolean> {
    console.log("🔄 Attempting data recovery", {
      customerId: context.customerId,
      reference: context.reference,
      operationType: context.operationType,
    });

    try {
      // For card issuance, check if card was created via webhook
      if (context.operationType.includes("card")) {
        return await this.recoverCardData(context.reference);
      }

      // For other operations, check transaction status
      return await this.recoverTransactionData(context.reference);
    } catch (error: any) {
      console.error("❌ Data recovery failed", {
        reference: context.reference,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Attempt to recover card data from webhook or API
   */
  private static async recoverCardData(reference: string): Promise<boolean> {
    try {
      // Check if card was created via webhook
      const cardResult = await CardModel.get({ client_reference: reference });

      if (
        !cardResult.error &&
        cardResult.output &&
        cardResult.output.length > 0
      ) {
        console.log("✅ Card data recovered via webhook", {
          reference,
          cardId: cardResult.output[0].id,
          status: cardResult.output[0].status,
        });
        return true;
      }

      console.log("ℹ️ No card data found for recovery", { reference });
      return false;
    } catch (error: any) {
      console.error("❌ Card data recovery failed", {
        reference,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Attempt to recover transaction data
   */
  private static async recoverTransactionData(
    reference: string
  ): Promise<boolean> {
    try {
      const transactionResult = await TransactionModel.get({ reference });

      if (
        !transactionResult.error &&
        transactionResult.output &&
        transactionResult.output.length > 0
      ) {
        console.log("✅ Transaction data recovered", {
          reference,
          transactionId: transactionResult.output[0].id,
          status: transactionResult.output[0].status,
        });
        return true;
      }

      return false;
    } catch (error: any) {
      console.error("❌ Transaction data recovery failed", {
        reference,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Log strategic decision for audit trail
   */
  private static async logStrategicDecision(decision: {
    customerId: string;
    amount: number;
    reference: string;
    decision: "funds_kept" | "funds_refunded";
    reason: string;
    operationType: string;
    errorContext: string;
  }): Promise<void> {
    console.log("📋 Logging strategic error recovery decision", decision);

    // In a production system, this would be logged to a dedicated audit table
    // For now, we'll use the existing transaction logging
    try {
      await TransactionModel.create({
        id: uuidv4(),
        company_id: decision.customerId, // Note: Using customerId as company_id placeholder
        customer_id: decision.customerId,
        category: TRANSACTION_CATEGORY.FEE,
        type: TRANSACTION_TYPE.CARD_ISSUANCE_FIRST,
        status: TRANSACTION_STATUS.SUCCESS,
        description: `Strategic decision: ${decision.decision}`,
        amount: decision.amount,
        currency: "USD",
        reference: `audit-${decision.reference}`,
        reason: `${decision.reason} - ${decision.errorContext}`,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });
    } catch (error: any) {
      console.error("Failed to log strategic decision", {
        decision: decision.decision,
        error: error.message,
      });
      // Don't fail the main process for audit logging issues
    }
  }

  /**
   * Handle fund reservation with automatic rollback on failure
   */
  static async reserveFundsWithAutoRollback<T>(
    walletId: string,
    amount: number,
    description: string,
    reference: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; rollbackPerformed: boolean }> {
    console.log("🔒 Reserving funds with auto-rollback", {
      walletId,
      amount,
      reference,
      description,
    });

    // Reserve funds
    await UnifiedWalletService.reserveFunds(
      walletId,
      amount,
      description,
      reference
    );

    let rollbackPerformed = false;

    try {
      // Execute the operation
      const result = await operation();

      console.log("✅ Operation succeeded with reserved funds", {
        reference,
        amount,
        rollbackPerformed: false,
      });

      return { result, rollbackPerformed: false };
    } catch (error: any) {
      // Operation failed - rollback the reservation
      console.warn("💸 Operation failed - rolling back fund reservation", {
        walletId,
        amount,
        reference,
        error: error.message,
      });

      try {
        await UnifiedWalletService.refundFunds(
          walletId,
          amount,
          reference,
          `Automatic rollback: ${error.message}`
        );
        rollbackPerformed = true;
      } catch (rollbackError: any) {
        console.error("🚨 Critical: Fund rollback failed", {
          walletId,
          amount,
          reference,
          originalError: error.message,
          rollbackError: rollbackError.message,
        });
        // This is a critical situation requiring manual intervention
      }

      throw error;
    }
  }

  /**
   * Comprehensive transaction cleanup after errors
   */
  static async performTransactionCleanup(
    transactionId: string,
    cleanupContext: {
      customerId: string;
      companyId: string;
      reference: string;
      errorReason: string;
    }
  ): Promise<CleanupResult> {
    console.log("🧹 Performing transaction cleanup", {
      transactionId,
      reference: cleanupContext.reference,
      reason: cleanupContext.errorReason,
    });

    const cleanupActions = [];

    try {
      // 1. Update transaction status to failed
      const updateResult = await TransactionModel.update(transactionId, {
        status: TRANSACTION_STATUS.FAILED,
        reason: cleanupContext.errorReason,
        updated_at: new Date(),
      });

      if (!updateResult.error) {
        cleanupActions.push("transaction_status_updated");
      }

      // 2. Create cleanup audit record
      await TransactionModel.create({
        id: uuidv4(),
        company_id: cleanupContext.companyId,
        customer_id: cleanupContext.customerId,
        category: TRANSACTION_CATEGORY.FEE,
        type: TRANSACTION_TYPE.REFUND,
        status: TRANSACTION_STATUS.SUCCESS,
        description: "Transaction cleanup performed",
        amount: 0,
        currency: "USD",
        reference: `cleanup-${cleanupContext.reference}`,
        reason: cleanupContext.errorReason,
        created_at: utcToLocalTime(new Date())?.toISOString(),
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      cleanupActions.push("audit_record_created");

      console.log("✅ Transaction cleanup completed", {
        transactionId,
        cleanupActions,
        reference: cleanupContext.reference,
      });

      return {
        success: true,
        actionsPerformed: cleanupActions,
        transactionId,
        reference: cleanupContext.reference,
      };
    } catch (error: any) {
      console.error("❌ Transaction cleanup failed", {
        transactionId,
        error: error.message,
        cleanupActions,
      });

      return {
        success: false,
        actionsPerformed: cleanupActions,
        transactionId,
        reference: cleanupContext.reference,
        error: error.message,
      };
    }
  }

  /**
   * Handle webhook timeout with appropriate recovery
   */
  static async handleWebhookTimeout(
    reference: string,
    timeoutMs: number,
    context: {
      customerId: string;
      companyId: string;
      walletId: string;
      reservedAmount: number;
      operationType: string;
    }
  ): Promise<WebhookTimeoutRecovery> {
    console.log("⏰ Handling webhook timeout", {
      reference,
      timeoutMs,
      operationType: context.operationType,
    });

    // 1. Check if the operation actually succeeded despite timeout
    const operationResult = await this.checkOperationStatus(
      reference,
      context.operationType
    );

    if (operationResult.succeeded) {
      // Operation succeeded but webhook was slow
      console.log("✅ Operation succeeded despite webhook timeout", {
        reference,
        operationType: context.operationType,
        result: operationResult,
      });

      return {
        operationSucceeded: true,
        fundsRefunded: false,
        reason: "operation_succeeded_slow_webhook",
        recommendedAction: "keep_funds_notify_user",
        operationResult,
      };
    } else {
      // True timeout - operation likely failed
      console.warn("❌ True webhook timeout - likely operation failure", {
        reference,
        operationType: context.operationType,
      });

      // Refund funds due to uncertainty
      await UnifiedWalletService.refundFunds(
        context.walletId,
        context.reservedAmount,
        reference,
        `Webhook timeout - operation status uncertain`
      );

      // Send timeout notification
      await NotificationService.sendCardIssuanceFailureNotification(
        {
          customerId: context.customerId,
          companyId: context.companyId,
          amount: context.reservedAmount,
          currency: "USD",
          reference,
        },
        `Operation timed out after ${timeoutMs}ms. Funds have been refunded automatically.`
      );

      return {
        operationSucceeded: false,
        fundsRefunded: true,
        refundAmount: context.reservedAmount,
        reason: "webhook_timeout",
        recommendedAction: "refund_and_notify",
      };
    }
  }

  /**
   * Check if operation actually succeeded despite webhook issues
   */
  private static async checkOperationStatus(
    reference: string,
    operationType: string
  ): Promise<{ succeeded: boolean; data?: any }> {
    try {
      if (operationType.includes("card")) {
        // For card operations, check if card exists
        const cardResult = await CardModel.get({ client_reference: reference });
        return {
          succeeded:
            !cardResult.error &&
            cardResult.output &&
            cardResult.output.length > 0,
          data: cardResult.output?.[0],
        };
      }

      // For other operations, check transaction status
      const transactionResult = await TransactionModel.get({ reference });
      return {
        succeeded:
          !transactionResult.error &&
          transactionResult.output &&
          transactionResult.output.length > 0,
        data: transactionResult.output?.[0],
      };
    } catch (error: any) {
      console.error("Failed to check operation status", {
        reference,
        operationType,
        error: error.message,
      });
      return { succeeded: false };
    }
  }

  /**
   * Validate error recovery prerequisites
   */
  static validateRecoveryContext(context: {
    apiCallSucceeded: boolean;
    reservedAmount: number;
    customerId: string;
    reference: string;
  }): void {
    const errors = [];

    if (typeof context.apiCallSucceeded !== "boolean") {
      errors.push("apiCallSucceeded must be boolean");
    }

    if (!context.customerId) {
      errors.push("customerId is required");
    }

    if (!context.reference) {
      errors.push("reference is required");
    }

    if (context.reservedAmount <= 0) {
      errors.push("reservedAmount must be positive");
    }

    if (errors.length > 0) {
      throw new CardIssuanceError(
        `Invalid recovery context: ${errors.join(", ")}`,
        "INVALID_RECOVERY_CONTEXT"
      );
    }
  }
}

// Result interfaces
export interface ErrorRecoveryResult {
  strategy: "full_refund" | "funds_kept";
  fundsRefunded: boolean;
  refundAmount?: number;
  conservedAmount?: number;
  notificationSent: boolean;
  transactionCreated: boolean;
  dataRecoveryAttempted?: boolean;
  dataRecoverySucceeded?: boolean;
  reason: string;
}

export interface CleanupResult {
  success: boolean;
  actionsPerformed: string[];
  transactionId: string;
  reference: string;
  error?: string;
}

export interface WebhookTimeoutRecovery {
  operationSucceeded: boolean;
  fundsRefunded: boolean;
  refundAmount?: number;
  reason: string;
  recommendedAction: string;
  operationResult?: any;
}
