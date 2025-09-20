import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import CustomerProviderMappingModel from "@/models/prisma/customerProviderMappingModel";
import ProviderSyncMetadataModel from "@/models/prisma/providerSyncMetadataModel";
import { MapleradUtils } from "../utils/maplerad.utils";

/**
 * Customer Sync Service
 * Handles customer synchronization with Maplerad
 * Extracted to break circular dependency between CardIssuanceService and CardSyncService
 */
@Injectable()
export class CustomerSyncService {
  private readonly logger = new Logger(CustomerSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sync customers with provider (lightweight sync for provider_customer_id mapping)
   */
  async syncCustomers(
    companyId: string,
    options?: {
      force?: boolean;
      startDate?: Date;
      maxConcurrency?: number;
    }
  ): Promise<any> {
    this.logger.log("👥🔄 CUSTOMER SYNC FLOW - START", {
      companyId,
      options,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Check if sync is needed
      this.logger.log("🔍 CHECKING SYNC NECESSITY", {
        companyId,
        force: options?.force || false,
        timestamp: new Date().toISOString(),
      });

      const lastSyncDate = await ProviderSyncMetadataModel.getLastSyncDate(
        companyId,
        "maplerad",
        "customers"
      );

      this.logger.log("📅 LAST SYNC DATE CHECKED", {
        companyId,
        lastSyncDate: lastSyncDate?.toISOString() || "never",
        timestamp: new Date().toISOString(),
      });

      if (!options?.force && lastSyncDate) {
        const hoursSinceLastSync =
          (new Date().getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

        this.logger.log("⏰ HOURS SINCE LAST SYNC", {
          companyId,
          hoursSinceLastSync: hoursSinceLastSync.toFixed(2),
          threshold: 1,
          timestamp: new Date().toISOString(),
        });

        if (hoursSinceLastSync < 1) {
          this.logger.log("⚡ SYNC SKIPPED - RECENTLY SYNCED", {
            companyId,
            lastSyncDate: lastSyncDate.toISOString(),
            hoursSinceLastSync: hoursSinceLastSync.toFixed(2),
            timestamp: new Date().toISOString(),
          });

          return {
            success: true,
            message: "Customer sync not needed - recently synced",
            last_sync: lastSyncDate,
            skipped: true,
          };
        }
      }

      // 2. Fetch customers from Maplerad
      this.logger.log("🌐 FETCHING CUSTOMERS FROM MAPLERAD", {
        companyId,
        timestamp: new Date().toISOString(),
      });

      const mapleradStartTime = Date.now();
      const mapleradCustomersResult = await MapleradUtils.getCustomers();
      const mapleradDuration = Date.now() - mapleradStartTime;

      this.logger.log("📡 MAPLERAD API RESPONSE RECEIVED", {
        companyId,
        duration: `${mapleradDuration}ms`,
        hasError: !!mapleradCustomersResult.error,
        timestamp: new Date().toISOString(),
      });

      if (mapleradCustomersResult.error) {
        this.logger.error("❌ MAPLERAD API ERROR", {
          companyId,
          error: mapleradCustomersResult.error.message,
          duration: `${mapleradDuration}ms`,
          timestamp: new Date().toISOString(),
        });

        // Continue with empty array instead of throwing
        this.logger.warn("⚠️ CONTINUING WITH EMPTY MAPLERAD CUSTOMERS", {
          companyId,
          reason: "API error, proceeding with local data only",
          timestamp: new Date().toISOString(),
        });
      }

      const mapleradCustomers = mapleradCustomersResult.output?.data || [];

      this.logger.log("📊 MAPLERAD CUSTOMERS PROCESSED", {
        companyId,
        mapleradCustomerCount: mapleradCustomers.length,
        timestamp: new Date().toISOString(),
      });

      if (mapleradCustomers.length === 0) {
        this.logger.log("🚫 NO MAPLERAD CUSTOMERS FOUND", {
          companyId,
          reason: "Empty response from Maplerad API",
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          message: "No customers found in Maplerad",
          customers_processed: 0,
        };
      }

      // 3. Get local customers for this company
      this.logger.log("🏠 FETCHING LOCAL CUSTOMERS", {
        companyId,
        timestamp: new Date().toISOString(),
      });

      const localCustomersResult = await this.prisma.customer.findMany({
        where: {
          company_id: companyId,
        },
      });

      this.logger.log("📈 LOCAL CUSTOMERS RETRIEVED", {
        companyId,
        localCustomerCount: localCustomersResult.length,
        timestamp: new Date().toISOString(),
      });

      // 4. Match and sync customer mappings
      const maxConcurrency = options?.maxConcurrency || 5;
      this.logger.log("🔗 STARTING CUSTOMER MAPPING SYNC", {
        companyId,
        localCustomers: localCustomersResult.length,
        mapleradCustomers: mapleradCustomers.length,
        maxConcurrency,
        timestamp: new Date().toISOString(),
      });

      const mappingStartTime = Date.now();
      const results = await this.syncCustomerMappingsWithMaplerad(
        localCustomersResult,
        mapleradCustomers,
        companyId,
        maxConcurrency
      );
      const mappingDuration = Date.now() - mappingStartTime;

      this.logger.log("🔗 CUSTOMER MAPPING SYNC COMPLETED", {
        companyId,
        duration: `${mappingDuration}ms`,
        resultsCount: results.length,
        timestamp: new Date().toISOString(),
      });

      // 5. Update sync metadata
      this.logger.log("📝 UPDATING SYNC METADATA", {
        companyId,
        provider: "maplerad",
        syncType: "customers",
        timestamp: new Date().toISOString(),
      });

      await this.updateSyncMetadata(companyId, "maplerad", "customers");

      // 6. Calculate summary
      const summary = this.calculateCustomerSyncSummary(results);

      this.logger.log("✅ CUSTOMER SYNC FLOW - COMPLETED", {
        companyId,
        summary: {
          mapleradCustomers: mapleradCustomers.length,
          localCustomers: localCustomersResult.length,
          mappingsCreated: summary.created,
          mappingsUpdated: summary.updated,
          mappingsSkipped: summary.skipped,
          successful: summary.successful,
          failed: summary.failed,
        },
        totalDuration: `${Date.now() - Date.parse(new Date().toISOString())}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        company_id: companyId,
        summary,
        results,
        synced_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("❌ CUSTOMER SYNC FAILED", {
        companyId: companyId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException(`Customer sync failed: ${error.message}`);
    }
  }

  /**
   * Sync customer mappings with Maplerad (matches by email and updates provider_customer_id)
   */
  private async syncCustomerMappingsWithMaplerad(
    localCustomers: any[],
    mapleradCustomers: any[],
    companyId: string,
    maxConcurrency: number = 5
  ): Promise<any[]> {
    this.logger.log("🔗 CUSTOMER MAPPING SYNC - START", {
      companyId,
      localCustomerCount: localCustomers.length,
      mapleradCustomerCount: mapleradCustomers.length,
      maxConcurrency,
      timestamp: new Date().toISOString(),
    });

    const results = [];

    // Create email lookup map for Maplerad customers
    this.logger.log("📧 BUILDING EMAIL LOOKUP MAP", {
      companyId,
      mapleradCustomersCount: mapleradCustomers.length,
      timestamp: new Date().toISOString(),
    });

    const mapleradEmailMap = new Map();
    let emailCount = 0;
    for (const mapleradCustomer of mapleradCustomers) {
      if (mapleradCustomer.email) {
        mapleradEmailMap.set(
          mapleradCustomer.email.toLowerCase(),
          mapleradCustomer
        );
        emailCount++;
      }
    }

    this.logger.log("📧 EMAIL LOOKUP MAP BUILT", {
      companyId,
      emailsMapped: emailCount,
      totalMapleradCustomers: mapleradCustomers.length,
      emailsSkipped: mapleradCustomers.length - emailCount,
      timestamp: new Date().toISOString(),
    });

    // Process local customers in batches to control concurrency
    const totalBatches = Math.ceil(localCustomers.length / maxConcurrency);
    this.logger.log("🔄 STARTING BATCH PROCESSING", {
      companyId,
      totalCustomers: localCustomers.length,
      batchSize: maxConcurrency,
      totalBatches,
      timestamp: new Date().toISOString(),
    });

    for (let i = 0; i < localCustomers.length; i += maxConcurrency) {
      const batchIndex = Math.floor(i / maxConcurrency) + 1;
      const batch = localCustomers.slice(i, i + maxConcurrency);

      this.logger.log("📦 PROCESSING CUSTOMER BATCH", {
        companyId,
        batchIndex,
        totalBatches,
        batchSize: batch.length,
        customersProcessed: i,
        customersRemaining: localCustomers.length - i,
        timestamp: new Date().toISOString(),
      });

      const batchStartTime = Date.now();
      const batchPromises = batch.map(async (localCustomer: any) => {
        try {
          const result = await this.syncCustomerMappingWithMaplerad(
            localCustomer,
            mapleradEmailMap,
            companyId
          );
          return { customerId: localCustomer.id, result, success: true };
        } catch (error: any) {
          this.logger.error("❌ CUSTOMER MAPPING FAILED", {
            companyId,
            customerId: localCustomer.id,
            customerEmail: localCustomer.email,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
          return {
            customerId: localCustomer.id,
            error: error.message,
            success: false,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchDuration = Date.now() - batchStartTime;

      const successfulInBatch = batchResults.filter((r) => r.success).length;
      const failedInBatch = batchResults.filter((r) => !r.success).length;

      this.logger.log("✅ BATCH PROCESSING COMPLETED", {
        companyId,
        batchIndex,
        totalBatches,
        batchDuration: `${batchDuration}ms`,
        successful: successfulInBatch,
        failed: failedInBatch,
        timestamp: new Date().toISOString(),
      });

      results.push(...batchResults);
    }

    this.logger.log("🔗 CUSTOMER MAPPING SYNC COMPLETED", {
      companyId,
      totalResults: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      timestamp: new Date().toISOString(),
    });

    return results;
  }

  /**
   * Sync single customer mapping with Maplerad (matches by email)
   */
  private async syncCustomerMappingWithMaplerad(
    localCustomer: any,
    mapleradEmailMap: Map<string, any>,
    companyId: string
  ): Promise<any> {
    this.logger.log("🔍 SYNCING INDIVIDUAL CUSTOMER MAPPING", {
      companyId,
      customerId: localCustomer.id,
      customerEmail: localCustomer.email,
      timestamp: new Date().toISOString(),
    });

    try {
      // Find matching Maplerad customer by email
      const customerEmail = localCustomer.email?.toLowerCase();
      this.logger.log("🔎 LOOKING UP MAPLERAD CUSTOMER BY EMAIL", {
        companyId,
        customerId: localCustomer.id,
        searchEmail: customerEmail,
        timestamp: new Date().toISOString(),
      });

      const mapleradCustomer = mapleradEmailMap.get(customerEmail);

      if (!mapleradCustomer) {
        this.logger.log("🚫 NO MATCHING MAPLERAD CUSTOMER FOUND", {
          companyId,
          customerId: localCustomer.id,
          searchEmail: customerEmail,
          reason: "Email not found in Maplerad customer list",
          timestamp: new Date().toISOString(),
        });

        return {
          action: "skipped",
          message: "No matching Maplerad customer found by email",
          local_email: localCustomer.email,
        };
      }

      this.logger.log("✅ MAPLERAD CUSTOMER MATCH FOUND", {
        companyId,
        customerId: localCustomer.id,
        localEmail: localCustomer.email,
        mapleradEmail: mapleradCustomer.email,
        mapleradCustomerId: mapleradCustomer.id,
        timestamp: new Date().toISOString(),
      });

      // Check if we already have a mapping for this customer and provider
      this.logger.log("🔍 CHECKING EXISTING MAPPING", {
        companyId,
        customerId: localCustomer.id,
        provider: "maplerad",
        timestamp: new Date().toISOString(),
      });

      const existingMappingResult =
        await CustomerProviderMappingModel.getByCustomerAndProvider(
          localCustomer.id,
          "maplerad"
        );

      const existingMapping = existingMappingResult.output;

      if (
        existingMapping &&
        existingMapping.provider_customer_id === mapleradCustomer.id
      ) {
        this.logger.log("⚡ MAPPING ALREADY EXISTS AND IS UP TO DATE", {
          companyId,
          customerId: localCustomer.id,
          existingMappingId: existingMapping.id,
          providerCustomerId: existingMapping.provider_customer_id,
          timestamp: new Date().toISOString(),
        });

        return {
          action: "skipped",
          message: "Customer mapping already exists and is up to date",
          provider_customer_id: existingMapping.provider_customer_id,
          local_email: localCustomer.email,
          maplerad_email: mapleradCustomer.email,
        };
      }

      // Determine action type
      const actionType = existingMapping ? "updated" : "created";
      this.logger.log("🔄 UPSERTING CUSTOMER MAPPING", {
        companyId,
        customerId: localCustomer.id,
        action: actionType,
        existingMappingId: existingMapping?.id || "none",
        newProviderCustomerId: mapleradCustomer.id,
        timestamp: new Date().toISOString(),
      });

      // Upsert the customer provider mapping using the model
      const upsertStartTime = Date.now();
      const mappingResult = await CustomerProviderMappingModel.upsert(
        localCustomer.id,
        "maplerad",
        mapleradCustomer.id
      );
      const upsertDuration = Date.now() - upsertStartTime;

      if (mappingResult.error) {
        this.logger.error("❌ MAPPING UPSERT FAILED", {
          companyId,
          customerId: localCustomer.id,
          error: mappingResult.error.message,
          duration: `${upsertDuration}ms`,
          timestamp: new Date().toISOString(),
        });

        throw new Error(
          `Failed to upsert customer mapping: ${mappingResult.error.message}`
        );
      }

      this.logger.log("✅ CUSTOMER MAPPING UPSERTED SUCCESSFULLY", {
        companyId,
        customerId: localCustomer.id,
        action: actionType,
        mappingId: mappingResult.output?.id,
        providerCustomerId: mapleradCustomer.id,
        duration: `${upsertDuration}ms`,
        timestamp: new Date().toISOString(),
      });

      return {
        action: actionType,
        provider_customer_id: mapleradCustomer.id,
        mapping_id: mappingResult.output?.id,
        local_email: localCustomer.email,
        maplerad_email: mapleradCustomer.email,
      };
    } catch (error: any) {
      this.logger.error("❌ CUSTOMER MAPPING SYNC FAILED", {
        companyId,
        customerId: localCustomer.id,
        customerEmail: localCustomer.email,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Calculate customer sync summary
   */
  private calculateCustomerSyncSummary(results: any[]): any {
    const summary = {
      totalCustomers: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const result of results) {
      if (result.success && result.result) {
        const action = result.result.action;
        if (action === "created") summary.created++;
        else if (action === "updated") summary.updated++;
        else if (action === "skipped") summary.skipped++;
      }
    }

    return summary;
  }

  /**
   * Update sync metadata after successful sync
   */
  private async updateSyncMetadata(
    companyId: string,
    providerName: string,
    syncType: string
  ): Promise<void> {
    try {
      await ProviderSyncMetadataModel.upsert(
        companyId,
        providerName,
        syncType,
        new Date()
      );

      this.logger.log("📝 Sync metadata updated", {
        companyId,
        providerName,
        syncType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Failed to update sync metadata", {
        companyId,
        providerName,
        syncType,
        error: error.message,
      });
      // Don't throw error here - sync metadata update failure shouldn't break the sync process
    }
  }
}
