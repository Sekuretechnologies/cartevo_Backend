import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import TransactionModel from "@/models/prisma/transactionModel";
import { checkAfribapayTransactionStatus } from "@/utils/wallet/afribapay";
import { updateTransactionStatus } from "@/services/wallet/updateTransactionStatus";

type PollMeta = { attempts: number; lastCheckMs: number };

@Injectable()
export class WalletFundingPollerService {
  private readonly logger = new Logger(WalletFundingPollerService.name);
  private readonly pollCache: Map<string, PollMeta> = new Map();

  // Poll every 30 seconds
  @Interval(30_000)
  async pollPendingFundingTransactions(): Promise<void> {
    try {
      // Fetch PENDING wallet funding transactions from Afribapay
      const pending = await TransactionModel.get({
        status: "PENDING",
        category: "WALLET",
        type: "FUND",
        provider: "afribapay",
      });

      if (pending.error || !Array.isArray(pending.output)) return;

      const transactions = pending.output as any[];
      if (!transactions.length) return;

      for (const trx of transactions) {
        const reference: string | null = trx.reference;
        if (!reference) {
          continue; // cannot poll without provider transaction id
        }

        const meta = this.pollCache.get(trx.id) || { attempts: 0, lastCheckMs: 0 };
        const now = Date.now();
        const backoffMs = this.computeBackoffMs(meta.attempts);
        if (now - meta.lastCheckMs < backoffMs) {
          continue; // respect backoff
        }

        try {
          const result = await checkAfribapayTransactionStatus(reference);
          this.logger.debug("Polling provider status", {
            trxId: trx.id,
            reference,
            attempts: meta.attempts,
            providerStatus: result.output?.data?.status || result.output?.status,
          });

          if (result.error) {
            // leave as is; will retry later
            this.pollCache.set(trx.id, { attempts: meta.attempts + 1, lastCheckMs: now });
            continue;
          }

          const providerStatus = String(
            result.output?.data?.status || result.output?.status || ""
          ).toUpperCase();

          if (providerStatus.includes("SUCCESS") || providerStatus.includes("COMPLETED")) {
            await updateTransactionStatus(String(trx.type), {
              reference: String(reference),
              status: "SUCCESS",
              external_reference: String(trx.id),
              withoutNotifications: true,
            });
            // reset cache on terminal status
            this.pollCache.delete(trx.id);
          } else if (providerStatus.includes("FAILED") || providerStatus.includes("EXPIRED")) {
            await updateTransactionStatus(String(trx.type), {
              reference: String(reference),
              status: providerStatus,
              external_reference: String(trx.id),
              withoutNotifications: true,
            });
            this.pollCache.delete(trx.id);
          } else {
            // still pending; re-schedule
            this.pollCache.set(trx.id, { attempts: meta.attempts + 1, lastCheckMs: now });
          }
        } catch (err: any) {
          this.logger.warn("Provider status check failed", {
            trxId: trx.id,
            reference,
            message: err?.message,
          });
          this.pollCache.set(trx.id, { attempts: meta.attempts + 1, lastCheckMs: now });
        }
      }
    } catch (error: any) {
      this.logger.error("Polling loop error", error?.message || error);
    }
  }

  private computeBackoffMs(attempts: number): number {
    // 0->0s, 1->15s, 2->45s, 3->120s, 4->300s, 5->600s, 6+ -> 1200s
    const steps = [0, 15, 45, 120, 300, 600, 1200];
    const idx = Math.min(attempts + 1, steps.length - 1);
    return steps[idx] * 1000;
  }
}




