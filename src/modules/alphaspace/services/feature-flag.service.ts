import { Injectable, Logger } from "@nestjs/common";

/**
 * AlphaSpace Feature Flag Service
 * Enables gradual rollout and A/B testing of AlphaSpace functionality
 * Currently uses environment variables only since CompanySetting model doesn't exist
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

  /**
   * Check if AlphaSpace is globally enabled
   */
  isAlphaSpaceGloballyEnabled(): boolean {
    return this.GLOBAL_FLAGS.ALPHASPACE_ENABLED;
  }

  /**
   * Check if AlphaSpace is enabled for a specific company
   * For now, always use global setting since CompanySetting model doesn't exist
   */
  async isAlphaSpaceEnabledForCompany(companyId?: string): Promise<boolean> {
    // Always return global setting for now
    return this.isAlphaSpaceGloballyEnabled();
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
   * Dummy methods for compatibility - always throw error since no CompanySetting model
   */
  async enableAlphaSpaceForCompany(companyId: string): Promise<void> {
    throw new Error(
      "Company-specific settings not supported - use environment variables"
    );
  }

  async disableAlphaSpaceForCompany(companyId: string): Promise<void> {
    throw new Error(
      "Company-specific settings not supported - use environment variables"
    );
  }

  async getCompanyAlphaSpaceSettings(companyId: string): Promise<any> {
    return {
      companyId,
      globalEnabled: this.isAlphaSpaceGloballyEnabled(),
      companyEnabled: this.isAlphaSpaceGloballyEnabled(),
      features: {
        feeManagement: this.isAdvancedFeaturesEnabled(),
        webhooks: this.areWebhooksEnabled(),
        advancedSecurity: this.isAdvancedSecurityEnabled(),
      },
      note: "Company-specific settings not implemented - using global config",
    };
  }

  async setCompanyFeatures(companyId: string, features: any): Promise<void> {
    throw new Error(
      "Company-specific settings not supported - use environment variables"
    );
  }

  async getDeploymentStatistics(): Promise<any> {
    return {
      globalEnabled: this.isAlphaSpaceGloballyEnabled(),
      totalCompanies: 1, // No database access
      enabledCompanies: 1,
      adoptionRate: 100,
      features: {
        feeManagement: this.isAdvancedFeaturesEnabled(),
        webhooks: this.areWebhooksEnabled(),
        advancedSecurity: this.isAdvancedSecurityEnabled(),
      },
      timestamp: new Date().toISOString(),
      note: "Simplified statistics - no database access",
    };
  }

  async resetCompanyToDefaults(companyId: string): Promise<void> {
    throw new Error(
      "Company-specific settings not supported - use environment variables"
    );
  }
}
