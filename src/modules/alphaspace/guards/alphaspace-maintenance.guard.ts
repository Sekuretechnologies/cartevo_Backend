// AlphaSpace Maintenance Guard
// Implements production maintenance mode for graceful degradation
// WAVLET enhancement for enterprise-grade deployment capabilities

import {
  Injectable,
  ExecutionContext,
  CanActivate,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import CompanyModel from "../../../models/prisma/companyModel";

/**
 * AlphaSpace Maintenance Guard
 *
 * Implements production maintenance mode with graceful degradation:
 * - Blocks normal users during maintenance
 * - Allows SUPER_ADMIN (omniscient) access always
 * - Provides proactive user communication
 * - Enables zero-downtime provider switching
 */
@Injectable()
export class AlphaSpaceMaintenanceGuard implements CanActivate {
  private readonly logger = new Logger(AlphaSpaceMaintenanceGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.debug(
      `AlphaSpace Maintenance Check - ${request.method} ${request.url}`
    );

    // Check if maintenance mode is enabled
    const maintenanceMode = process.env.ALPHASPACE_MAINTENANCE_MODE === "true";

    if (!maintenanceMode) {
      this.logger.debug(
        "✅ AlphaSpace maintenance mode disabled - allowing access"
      );
      return true;
    }

    this.logger.warn(
      "🚧 AlphaSpace maintenance mode ACTIVE - checking access level"
    );

    // Check if user is SUPER_ADMIN (omniscient access level)
    const isSuperAdmin = await this.isSuperAdmin(request);

    if (isSuperAdmin) {
      this.logger.log("👑 SUPER_ADMIN access granted during maintenance mode");
      return true;
    }

    // Maintenance mode active - block normal users
    this.logger.warn("🚫 Normal user access blocked due to maintenance mode");

    this.sendMaintenanceNotification(request);

    throw new ServiceUnavailableException({
      message: "AlphaSpace card services under maintenance",
      estimatedReturn: "2 hours",
      maintenance: {
        service: "AlphaSpace Card Provider",
        reason: "Scheduled maintenance and system updates",
        estimatedDuration: 120, // minutes
        alternativeActions: [
          "Use alternative payment methods",
          "Contact support for urgent transactions",
        ],
        contact: {
          email: "support@wavlet.com",
          emergency: "+1-800-SUPPORT",
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if the current user is a SUPER_ADMIN (omniscient company)
   */
  private async isSuperAdmin(request: any): Promise<boolean> {
    try {
      // Extract company ID from JWT payload (stored by JWT strategy)
      const companyId = request.user?.companyId || request.company?.id;

      if (!companyId) {
        this.logger.debug("No company ID found in request - not super admin");
        return false;
      }

      // Check company access level
      const companyResult = await CompanyModel.getOne({ id: companyId });
      if (companyResult.error || !companyResult.output) {
        this.logger.warn(
          `Company lookup failed for ID ${companyId}: ${companyResult.error?.message}`
        );
        return false;
      }

      const company = companyResult.output;
      const isSuperAdmin = company.access_level === "omniscient";

      this.logger.debug(
        `Company ${companyId} (${company.name}) access level: ${company.access_level} - Super Admin: ${isSuperAdmin}`
      );

      return isSuperAdmin;
    } catch (error) {
      this.logger.error(`Error checking super admin status: ${error.message}`);
      return false; // Fail safe - deny access if check fails
    }
  }

  /**
   * Send maintenance notification to user
   * TODO: Integrate with actual notification service when implemented
   */
  private sendMaintenanceNotification(request: any): void {
    try {
      const userId = request.user?.sub || request.user?.id;
      const userEmail = request.user?.email;

      // Log the blocked access attempt
      this.logger.log(
        `📧 Maintenance notification would be sent to user: ${userId} (${userEmail})`
      );

      // TODO: Implement actual notification sending
      // await this.notificationService.sendMaintenanceAlert(userId, {
      //   subject: "Card Services Maintenance",
      //   estimatedDowntime: 120,
      //   alternativePaymentMethods: true,
      // });

      // For now, just log the notification that would be sent
      const notificationData = {
        type: "MAINTENANCE_ALERT",
        userId: userId,
        userEmail: userEmail,
        service: "AlphaSpace Card Provider",
        message: "Card services are currently under maintenance",
        estimatedReturn: "2 hours",
        timestamp: new Date().toISOString(),
        alternativeActions: [
          "Use alternative payment methods",
          "Contact support for urgent transactions",
        ],
      };

      this.logger.log("📬 Maintenance notification payload", notificationData);
    } catch (error) {
      this.logger.error(
        `Failed to send maintenance notification: ${error.message}`
      );
    }
  }
}
