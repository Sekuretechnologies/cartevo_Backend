import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * AlphaSpace Feature Flag Service
 * Enables gradual rollout and A/B testing of AlphaSpace functionality
 * Supports global and company-specific feature flags
 */
@Injectable()
export class AlphaSpaceFeatureFlagService {
  private readonly logger = new Logger(AlphaSpaceFeatureFlagService.name);

  // Global feature flags with default values
  private readonly GLOBAL_FLAGS = {
    ALPHASPACE_ENABLED: process.env.ALPHASPACE_ENABLED === "true",
    ALPHASPACE_WEBHOOKS_ENABLED:
      process.env.ALPHASPACE_WEBHOOKS_ENABLED !== "false",
    ALPHASPACE_FEE_MANAGEMENT_ENABLED:
      process.env.ALPHASPACE_FEE_MANAGEMENT_ENABLED === "true",
    ALPHASPACE_ADVANCED_SECURITY_ENABLED:
      process.env.ALPHASPACE_ADVANCED_SECURITY_ENABLED !== "false",
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if AlphaSpace is globally enabled
   */
  isAlphaSpaceGloballyEnabled(): boolean {
    return this.GLOBAL_FLAGS.ALPHASPACE_ENABLED;
  }

  /**
   * Check if AlphaSpace is enabled for a specific company
   * Allow for company-level override, defaulting to global setting
   */
  async isAlphaSpaceEnabledForCompany(companyId?: string): Promise<boolean> {
    // If no company context, return global flag
    if (!companyId) {
      return this.isAlphaSpaceGloballyEnabled();
    }

    try {
      // Check for company-specific override
      const companySetting = await this.prisma.companySetting.findUnique({
        where: {
          company_id_key: {
            company_id: companyId,
            key: "alphaspace_enabled",
          },
        },
      });

      // If explicit setting exists, use it
      if (companySetting) {
        return companySetting.value === "true";
      }

      // Fall back to global setting
      return this.isAlphaSpaceGloballyEnabled();
    } catch (error) {
      // On database error, default to global setting
      this.logger.error("Error checking company-specific AlphaSpace setting", {
        companyId,
        error: error.message,
      });
      return this.isAlphaSpaceGloballyEnabled();
    }
  }

  /**
   * Enable AlphaSpace for a specific company
   */
  async enableAlphaSpaceForCompany(companyId: string): Promise<void> {
    try {
      await this.prisma.companySetting.upsert({
        where: {
          company_id_key: {
            company_id: companyId,
            key: "alphaspace_enabled",
          },
        },
        update: {
          value: "true",
          updated_at: new Date(),
        },
        create: {
          company_id: companyId,
          key: "alphaspace_enabled",
          value: "true",
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      this.logger.log("AlphaSpace enabled for company", { companyId });
    } catch (error) {
      this.logger.error("Failed to enable AlphaSpace for company", {
        companyId,
        error: error.message,
      });
      throw new Error(`Failed to enable AlphaSpace: ${error.message}`);
    }
  }

  /**
   * Disable AlphaSpace for a specific company
   */
  async disableAlphaSpaceForCompany(companyId: string): Promise<void> {
    try {
      await this.prisma.companySetting.upsert({
        where: {
          company_id_key: {
            company_id: companyId,
            key: "alphaspace_enabled",
          },
        },
        update: {
          value: "false",
          updated_at: new Date(),
        },
        create: {
          company_id: companyId,
          key: "alphaspace_enabled",
          value: "false",
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      this.logger.log("AlphaSpace disabled for company", { companyId });
    } catch (error) {
      this.logger.error("Failed to disable AlphaSpace for company", {
        companyId,
        error: error.message,
      });
      throw new Error(`Failed to disable AlphaSpace: ${error.message}`);
    }
  }

  /**
   * Check if advanced features are enabled
   */
  isAdvancedFeaturesEnabled(): boolean {
    return this.GLOBAL_FLAGS.ALPHASPACE_FEE_MANAGEMENT_ENABLED;
  }

  /**
   * Check if webhooks are enabled
   */
  areWebhooksEnabled(): boolean {
    return this.GLOBAL_FLAGS.ALPHASPACE_WEBHOOKS_ENABLED;
  }

  /**
   * Check if advanced security is enabled
   */
  isAdvancedSecurityEnabled(): boolean {
    return this.GLOBAL_FLAGS.ALPHASPACE_ADVANCED_SECURITY_ENABLED;
  }

  /**
   * Get all company AlphaSpace settings
   */
  async getCompanyAlphaSpaceSettings(companyId: string): Promise<any> {
    try {
      const settings = await this.prisma.companySetting.findMany({
        where: {
          company_id: companyId,
          key: {
            startsWith: "alphaspace_",
          },
        },
        orderBy: {
          updated_at: "desc",
        },
      });

      return {
        companyId,
        globalEnabled: this.isAlphaSpaceGloballyEnabled(),
        companyEnabled: await this.isAlphaSpaceEnabledForCompany(companyId),
        features: {
          feeManagement: this.isAdvancedFeaturesEnabled(),
          webhooks: this.areWebhooksEnabled(),
          advancedSecurity: this.isAdvancedSecurityEnabled(),
        },
        companySettings: settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as any),
      };
    } catch (error) {
      this.logger.error("Failed to get company AlphaSpace settings", {
        companyId,
        error: error.message,
      });

      // Return minimal settings on error
      return {
        companyId,
        globalEnabled: this.isAlphaSpaceGloballyEnabled(),
        companyEnabled: this.isAlphaSpaceGloballyEnabled(),
        features: {
          feeManagement: this.isAdvancedFeaturesEnabled(),
          webhooks: this.areWebhooksEnabled(),
          advancedSecurity: this.isAdvancedSecurityEnabled(),
        },
        error: "Failed to retrieve company settings",
      };
    }
  }

  /**
   * Set multiple feature flags for a company
   */
  async setCompanyFeatures(
    companyId: string,
    features: {
      enabled?: boolean;
      webhooksEnabled?: boolean;
      feeManagementEnabled?: boolean;
      advancedSecurityEnabled?: boolean;
    }
  ): Promise<void> {
    try {
      const updates = [];

      if (features.enabled !== undefined) {
        updates.push(
          this.prisma.companySetting.upsert({
            where: {
              company_id_key: {
                company_id: companyId,
                key: "alphaspace_enabled",
              },
            },
            update: {
              value: features.enabled.toString(),
              updated_at: new Date(),
            },
            create: {
              company_id: companyId,
              key: "alphaspace_enabled",
              value: features.enabled.toString(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          })
        );
      }

      if (features.webhooksEnabled !== undefined) {
        updates.push(
          this.prisma.companySetting.upsert({
            where: {
              company_id_key: {
                company_id: companyId,
                key: "alphaspace_webhooks_enabled",
              },
            },
            update: {
              value: features.webhooksEnabled.toString(),
              updated_at: new Date(),
            },
            create: {
              company_id: companyId,
              key: "alphaspace_webhooks_enabled",
              value: features.webhooksEnabled.toString(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          })
        );
      }

      if (features.feeManagementEnabled !== undefined) {
        updates.push(
          this.prisma.companySetting.upsert({
            where: {
              company_id_key: {
                company_id: companyId,
                key: "alphaspace_fee_management_enabled",
              },
            },
            update: {
              value: features.feeManagementEnabled.toString(),
              updated_at: new Date(),
            },
            create: {
              company_id: companyId,
              key: "alphaspace_fee_management_enabled",
              value: features.feeManagementEnabled.toString(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          })
        );
      }

      if (features.advancedSecurityEnabled !== undefined) {
        updates.push(
          this.prisma.companySetting.upsert({
            where: {
              company_id_key: {
                company_id: companyId,
                key: "alphaspace_advanced_security_enabled",
              },
            },
            update: {
              value: features.advancedSecurityEnabled.toString(),
              updated_at: new Date(),
            },
            create: {
              company_id: companyId,
              key: "alphaspace_advanced_security_enabled",
              value: features.advancedSecurityEnabled.toString(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          })
        );
      }

      await this.prisma.$transaction(updates);

      this.logger.log("AlphaSpace features updated for company", {
        companyId,
        features,
      });
    } catch (error) {
      this.logger.error("Failed to update company AlphaSpace features", {
        companyId,
        features,
        error: error.message,
      });
      throw new Error(`Failed to update features: ${error.message}`);
    }
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStatistics(): Promise<any> {
    try {
      // Count companies with AlphaSpace enabled
      const enabledCompanies = await this.prisma.companySetting.count({
        where: {
          key: "alphaspace_enabled",
          value: "true",
        },
      });

      const totalCompanies = await this.prisma.company.count();

      return {
        globalEnabled: this.isAlphaSpaceGloballyEnabled(),
        totalCompanies,
        enabledCompanies,
        adoptionRate:
          totalCompanies > 0 ? (enabledCompanies / totalCompanies) * 100 : 0,
        features: {
          feeManagement: this.isAdvancedFeaturesEnabled(),
          webhooks: this.areWebhooksEnabled(),
          advancedSecurity: this.isAdvancedSecurityEnabled(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Failed to get deployment statistics", {
        error: error.message,
      });

      return {
        error: "Failed to retrieve deployment statistics",
        globalEnabled: this.isAlphaSpaceGloballyEnabled(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Reset company settings to global defaults
   */
  async resetCompanyToDefaults(companyId: string): Promise<void> {
    try {
      // Remove all company-specific AlphaSpace settings
      await this.prisma.companySetting.deleteMany({
        where: {
          company_id: companyId,
          key: {
            startsWith: "alphaspace_",
          },
        },
      });

      this.logger.log("Company AlphaSpace settings reset to defaults", {
        companyId,
      });
    } catch (error) {
      this.logger.error("Failed to reset company AlphaSpace settings", {
        companyId,
        error: error.message,
      });
      throw new Error(`Failed to reset settings: ${error.message}`);
    }
  }
}
