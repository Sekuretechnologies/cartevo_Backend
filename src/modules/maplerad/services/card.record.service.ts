import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { decodeText, encodeText } from "@/utils/shared/encryption";
import CardModel from "@/models/prisma/cardModel";

/**
 * Card Record Service
 * Handles local card record creation and management
 * Extracted to break circular dependency between CardIssuanceService and CardSyncService
 */
@Injectable()
export class CardRecordService {
  private readonly logger = new Logger(CardRecordService.name);

  /**
   * Create local card record
   */
  async createLocalCardRecord(
    cardId: string,
    customer: any,
    company: any,
    dto: any,
    finalCard: any
  ): Promise<any> {
    // Encrypt sensitive data
    const encryptedCardNumber = encodeText(finalCard.cardNumber || "***");
    const encryptedCvv = encodeText(finalCard.cvv || "***");

    const newCardResult = await CardModel.create({
      id: cardId,
      status: "ACTIVE",
      customer_id: customer.id,
      company_id: customer.company_id,
      country: customer.country_iso_code,
      brand: dto.brand,
      provider: encodeText("maplerad"),
      currency: "USD",
      name: dto.name_on_card,
      balance: dto.amount,
      reference: finalCard.id,
      provider_card_id: finalCard.id,
      number: `tkMplr_${encryptedCardNumber}`,
      masked_number:
        finalCard.maskedPan || `****-****-****-${finalCard.last4 || "****"}`,
      last4: finalCard.last4,
      cvv: `tkMplr_${encryptedCvv}`,
      expiry_month: finalCard.expiryMonth || 12,
      expiry_year: finalCard.expiryYear || 99,
      postal_code: customer.postal_code || "00000",
      street: customer.address || "",
      city: customer.city || "",
      state_code: customer.state || "",
      country_iso_code: customer.country_iso_code,
      is_active: true,
      is_virtual: true,
      provider_card_metadata: finalCard,
    });

    if (newCardResult.error) {
      this.logger.error("Local card creation error", {
        error: newCardResult.error,
      });
      throw new BadRequestException("Failed to save card locally");
    }

    return newCardResult.output;
  }
}
