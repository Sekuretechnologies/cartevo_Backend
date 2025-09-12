/**
 * REFACTORED: Card Issuance Adapted Service
 *
 * This file now uses the new unified CardIssuanceService for better maintainability,
 * error handling, and separation of concerns.
 */

import { CardIssuanceService, CardIssuanceRequest } from "./services";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "./services/notificationService";

/**
 * Initialize services with dependencies
 */
let servicesInitialized = false;

const initializeServices = () => {
  if (!servicesInitialized) {
    const configService = new ConfigService();
    NotificationService.initialize(configService);
    servicesInitialized = true;
  }
};

/**
 * Issue a retail card using the refactored CardIssuanceService
 * ADAPTED VERSION: Customer belongs to company, uses company USD wallet
 */
const issueRetailCardAdapted = async (
  issueCardDto: any,
  customerId: string,
  name?: string,
  color?: string
) => {
  // Initialize services if not already done
  initializeServices();

  console.log("🚀 Using refactored CardIssuanceService for card creation", {
    customerId,
    providedFields: Object.keys(issueCardDto).filter(
      (key) => issueCardDto[key] !== undefined
    ),
  });

  // Prepare request for the new service
  const request: CardIssuanceRequest = {
    customerId,
    cardBrand: issueCardDto.cardBrand,
    initialBalance: issueCardDto.initialBalance,
    clientReference: issueCardDto.clientReference,
    name: name || issueCardDto.name,
    color: color || issueCardDto.color,
  };

  // Use the refactored service
  return CardIssuanceService.issueRetailCard(request);
};

export { issueRetailCardAdapted };
