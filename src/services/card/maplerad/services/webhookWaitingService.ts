// services/WebhookWaitingService.ts

import { EventEmitter } from "events";

/**
 * Résultat retourné par waitForWebhook()
 */
export interface WebhookWaitingResult {
  success: boolean;
  data?: any;
  error?: string;
  timeout?: boolean;
}

/**
 * Health status interface
 */
export interface WebhookServiceHealth {
  activeWaits: number;
  maxListeners: number;
  failureCount: number;
  isCircuitOpen: boolean;
  uptime: number;
  totalWaitsProcessed: number;
  averageWaitTime: number;
}

export class WebhookWaitingService {
  private readonly eventEmitter = new EventEmitter();
  private readonly DEFAULT_TIMEOUT = 300_000; // 5 minutes

  // Reliability improvements
  private activeWaits = new Map<
    string,
    { startTime: number; timeoutMs: number }
  >();
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIME = 60000; // 1 minute
  private totalWaitsProcessed = 0;
  private totalWaitTime = 0;

  constructor() {
    // Critical fix: Increase max listeners for production reliability
    this.eventEmitter.setMaxListeners(1000);

    // Handle process termination gracefully
    process.on("SIGTERM", () => this.shutdown());
    process.on("SIGINT", () => this.shutdown());
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      if (Date.now() - this.lastFailureTime < this.RECOVERY_TIME) {
        return true;
      }
      // Reset circuit after recovery time
      this.failureCount = 0;
    }
    return false;
  }

  /**
   * 🕐 Attend la réception d'un webhook pour une référence donnée
   */
  async waitForWebhook(
    reference: string,
    timeoutMs: number = this.DEFAULT_TIMEOUT
  ): Promise<WebhookWaitingResult> {
    // Circuit breaker check
    if (this.isCircuitOpen()) {
      console.warn(
        `[circuit_breaker] 🚫 Circuit breaker open for reference=${reference}`
      );
      return {
        success: false,
        error: "Circuit breaker open - webhook service temporarily unavailable",
      };
    }

    // Track active wait for memory monitoring
    const startTime = Date.now();
    this.activeWaits.set(reference, { startTime, timeoutMs });

    console.log(
      `[wait_start] ⏳ Attente webhook pour référence=${reference}, timeoutMs=${timeoutMs}, activeWaits=${this.activeWaits.size}`
    );

    return new Promise((resolve) => {
      const eventName = this.getEventName(reference);
      let resolved = false;

      // Sécurité : on déclenche un timeout si jamais pas de réponse
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.eventEmitter.removeAllListeners(eventName);
          this.activeWaits.delete(reference);

          // Increment failure count for circuit breaker
          this.failureCount++;
          this.lastFailureTime = Date.now();

          console.warn(
            `[timeout] ⏰ Timeout webhook référence=${reference}, failures=${this.failureCount}`
          );
          resolve({
            success: false,
            timeout: true,
            error: `Webhook timeout after ${timeoutMs}ms`,
          });
        }
      }, timeoutMs);

      // Dès qu'on reçoit l'événement, on résout la promesse
      this.eventEmitter.once(eventName, (result: WebhookWaitingResult) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.activeWaits.delete(reference);

          // Update metrics
          const waitTime = Date.now() - startTime;
          this.totalWaitsProcessed++;
          this.totalWaitTime += waitTime;

          // Reset failure count on success
          if (result.success) {
            this.failureCount = Math.max(0, this.failureCount - 1);
          }

          console.log(
            `[webhook_received] ✅ Webhook reçu pour référence=${reference}, success=${result.success}, waitTime=${waitTime}ms`
          );
          resolve(result);
        }
      });
    });
  }

  /**
   * 📢 Notifie qu'un webhook a été reçu pour une référence
   */
  notifyWebhookReceived(reference: string, result: WebhookWaitingResult): void {
    const eventName = this.getEventName(reference);
    console.debug(
      `[notify] 📢 Notification webhook référence=${reference}, success=${
        result.success
      }, hasData=${!!result.data}`
    );
    this.eventEmitter.emit(eventName, result);
  }

  /**
   * 🧹 Nettoie les listeners pour une référence (en cas d'abandon)
   */
  cleanupWebhookWaiting(reference: string): void {
    const eventName = this.getEventName(reference);
    this.eventEmitter.removeAllListeners(eventName);
    console.debug(`[cleanup] 🧹 Nettoyage listeners référence=${reference}`);
  }

  /**
   * Get health status for monitoring
   */
  getHealthStatus(): WebhookServiceHealth {
    const averageWaitTime =
      this.totalWaitsProcessed > 0
        ? this.totalWaitTime / this.totalWaitsProcessed
        : 0;

    return {
      activeWaits: this.activeWaits.size,
      maxListeners: this.eventEmitter.getMaxListeners(),
      failureCount: this.failureCount,
      isCircuitOpen: this.isCircuitOpen(),
      uptime: process.uptime(),
      totalWaitsProcessed: this.totalWaitsProcessed,
      averageWaitTime: Math.round(averageWaitTime),
    };
  }

  /**
   * Get count of active webhook waits
   */
  getActiveWaitCount(): number {
    return this.activeWaits.size;
  }

  /**
   * Wait for webhook with retry mechanism
   */
  async waitForWebhookWithRetry(
    reference: string,
    timeoutMs: number = this.DEFAULT_TIMEOUT,
    maxRetries: number = 3
  ): Promise<WebhookWaitingResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `[retry_attempt] 🔄 Attempt ${attempt}/${maxRetries} for reference=${reference}`
      );

      try {
        const result = await this.waitForWebhook(reference, timeoutMs);

        if (result.success) {
          console.log(
            `[retry_success] ✅ Success on attempt ${attempt} for reference=${reference}`
          );
          return result;
        }

        // If this was the last attempt, return the failure
        if (attempt === maxRetries) {
          console.warn(
            `[retry_failed] ❌ All ${maxRetries} attempts failed for reference=${reference}`
          );
          return result;
        }

        // Wait before retry with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(
          `[retry_delay] ⏳ Waiting ${delayMs}ms before retry for reference=${reference}`
        );
        await this.delay(delayMs);
      } catch (error) {
        console.error(
          `[retry_error] 💥 Error on attempt ${attempt} for reference=${reference}:`,
          error
        );

        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Failed after ${maxRetries} attempts: ${error.message}`,
          };
        }

        // Wait before retry
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await this.delay(delayMs);
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: "Unexpected error in retry mechanism",
    };
  }

  /**
   * Graceful shutdown - complete pending waits
   */
  async shutdown(): Promise<void> {
    console.log(
      `[shutdown] 🔄 Starting graceful shutdown, ${this.activeWaits.size} active waits`
    );

    // Complete all pending waits with timeout error
    const shutdownPromises = Array.from(this.activeWaits.keys()).map(
      async (reference) => {
        console.log(
          `[shutdown] 📤 Completing pending wait for reference=${reference}`
        );

        this.notifyWebhookReceived(reference, {
          success: false,
          error: "Service shutting down",
        });

        // Small delay to allow cleanup
        await this.delay(10);
      }
    );

    await Promise.all(shutdownPromises);

    // Clean up all listeners
    this.eventEmitter.removeAllListeners();

    console.log(`[shutdown] ✅ Graceful shutdown completed`);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Construit le nom d'événement interne */
  private getEventName(reference: string): string {
    return `webhook_${reference}`;
  }
}

const webhookWaitingService = new WebhookWaitingService();

export default webhookWaitingService;
