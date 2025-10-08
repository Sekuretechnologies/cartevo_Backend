// AlphaSpace Card Issuance Service
// Handles card creation and issuance processes
// WAVLET adaptation following MONIX AlphaSpace patterns

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AlphaSpaceAuthService } from "./alphaspace-auth.service";
import { Decimal } from "@prisma/client/runtime/library";
import alphaSpaceCardUtils from "../../../utils/cards/alphaspace/card";
import { v4 as uuidv4 } from "uuid";
import {
  WAVLETCreateCardData,
  WAVLETCardResult,
  AlphaSpaceCreateCardholderData,
  AlphaSpaceCreateCardData,
  AlphaSpaceCreateCardResponse,
} from "../../../config/alphaspace.config";

export interface CardIssuanceResult {
  success: boolean;
  message: string;
  card?: any;
  metadata?: any;
}

export interface PreviewResult {
  success: boolean;
  preview: {
    customer_name: string;
    brand: string;
    funding_amount: number;
    fees: any;
    total_cost: number;
    estimated_delivery_days: number;
  };
}

/**
 * AlphaSpace Card Issuance Service
 * Handles the complete card creation and issuance workflow
 */
@Injectable()
export class CardIssuanceService {
  private readonly logger = new Logger(CardIssuanceService.name);

  constructor(
    private readonly alphaSpaceAuthService: AlphaSpaceAuthService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Create and issue a new AlphaSpace card
   * Complete workflow: validation → cardholder creation → card issuance → database storage
   */
  async createCard(cardData: WAVLETCreateCardData): Promise<WAVLETCardResult> {
    this.logger.log("💳 ALPHASPACE CARD ISSUANCE - Starting card creation", {
      customerId: cardData.customer_id,
      companyId: cardData.company_id,
      brand: cardData.brand,
      amount: cardData.amount,
    });

    try {
      // 1. Validate input data
      await this.validateCardCreationData(cardData);

      // 2. Check company wallet balance if funding
      if (cardData.amount && cardData.amount > 0) {
        await this.validateCompanyWalletBalance(
          cardData.company_id,
          cardData.amount
        );
      }

      // 3. Check customer exists and belongs to company
      const customer = await this.validateCustomerAccess(
        cardData.customer_id,
        cardData.company_id
      );

      // 4. Create cardholder in AlphaSpace
      const cardholder = await this.createAlphaSpaceCardholder(customer);

      // 5. Issue the actual card
      const cardCreationResult = await this.issueAlphaSpaceCard(
        cardholder.id,
        cardData
      );

      // 6. Fund the card if amount specified
      let fundingResult = null;
      if (cardData.amount && cardData.amount > 0) {
        fundingResult = await this.fundNewCard(
          cardCreationResult.card.id,
          cardData.amount,
          cardData.company_id
        );
      }

      // 7. Save card data to WAVLET database
      const savedCard = await this.saveCardToDatabase(
        cardCreationResult,
        cardData
      );

      // 8. Format response
      const wavletCard = this.mapToWAVLETCardFormat(
        savedCard,
        cardCreationResult
      );

      this.logger.log(
        "✅ ALPHASPACE CARD ISSUANCE - Card created successfully",
        {
          cardId: savedCard.id,
          alphaSpaceCardId: cardCreationResult.card.id,
          customerId: cardData.customer_id,
          amount: cardData.amount,
          funded: !!fundingResult,
        }
      );

      return {
        success: true,
        card: wavletCard,
        metadata: {
          provider: "alphaspce",
          cardholder_id: cardholder.id,
          fees: cardCreationResult.fees_meta,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD ISSUANCE - Card creation failed", {
        customerId: cardData.customer_id,
        companyId: cardData.company_id,
        error: error.message,
        stack: error.stack,
      });

      // Cleanup any partial data if needed
      await this.handleIssuanceFailure(cardData, error);

      throw new BadRequestException(`Card issuance failed: ${error.message}`);
    }
  }

  /**
   * Issue a card with specific brand preferences
   */
  async issueCardWithBrand(
    customerId: string,
    companyId: string,
    preferredBrand: "VISA" | "MASTERCARD",
    amount?: number
  ): Promise<WAVLETCardResult> {
    const cardData: WAVLETCreateCardData = {
      customer_id: customerId,
      company_id: companyId,
      brand: preferredBrand,
      amount: amount,
    };

    return this.createCard(cardData);
  }

  /**
   * Preview card creation without actual issuance
   */
  async previewCardIssuance(
    cardData: WAVLETCreateCardData
  ): Promise<PreviewResult> {
    try {
      // 1. Validate data
      await this.validateCardCreationData(cardData);

      // 2. Check balances
      if (cardData.amount && cardData.amount > 0) {
        await this.validateCompanyWalletBalance(
          cardData.company_id,
          cardData.amount
        );
      }

      // 3. Get customer info
      const customer = await this.prisma.customer.findUnique({
        where: { id: cardData.customer_id },
      });

      // 4. Calculate fees and totals
      const fees = await this.calculateIssuanceFees(
        cardData.brand || "VISA",
        cardData.amount || 0
      );
      const totalCost = fees.total + (cardData.amount || 0);

      return {
        success: true,
        preview: {
          customer_name: `${customer?.first_name} ${customer?.last_name}`,
          brand: cardData.brand || "VISA",
          funding_amount: cardData.amount || 0,
          fees: fees,
          total_cost: totalCost,
          estimated_delivery_days: 1, // AlphaSpace cards are typically instant
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD PREVIEW - Preview failed", {
        customerId: cardData.customer_id,
        companyId: cardData.company_id,
        error: error.message,
      });

      throw new BadRequestException(`Preview failed: ${error.message}`);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate card creation input data
   */
  private async validateCardCreationData(
    cardData: WAVLETCreateCardData
  ): Promise<void> {
    if (!cardData.customer_id) {
      throw new BadRequestException("Customer ID is required");
    }

    if (!cardData.company_id) {
      throw new BadRequestException("Company ID is required");
    }

    if (cardData.amount !== undefined && cardData.amount < 0) {
      throw new BadRequestException("Funding amount must be positive");
    }

    if (
      cardData.brand &&
      !["VISA", "MASTERCARD"].includes(cardData.brand.toUpperCase())
    ) {
      throw new BadRequestException("Brand must be VISA or MASTERCARD");
    }
  }

  /**
   * Validate company wallet has sufficient balance
   */
  private async validateCompanyWalletBalance(
    companyId: string,
    amount: number
  ): Promise<void> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        company_id: companyId,
        currency: "USD",
      },
    });

    if (!wallet) {
      throw new BadRequestException("Company wallet not found");
    }

    if (wallet.payin_balance.lessThan(amount)) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${wallet.payin_balance}, Required: ${amount}`
      );
    }
  }

  /**
   * Validate customer belongs to company
   */
  private async validateCustomerAccess(
    customerId: string,
    companyId: string
  ): Promise<any> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException("Customer not found");
    }

    if (customer.company_id !== companyId) {
      throw new BadRequestException("Customer does not belong to this company");
    }

    return customer;
  }

  /**
   * Calculate card issuance fees
   */
  private async calculateIssuanceFees(
    brand: string,
    amount: number
  ): Promise<any> {
    // AlphaSpace fee structure (simplified for Phase 2)
    const baseFee = 1.0; // USD 1.00 issuance fee
    const percentageFee = amount > 0 ? amount * 0.02 : 0; // 2% of funding amount

    return {
      issuance: 1.0,
      funding_percentage: amount * 0.02,
      total: baseFee + percentageFee,
    };
  }

  /**
   * Create cardholder in AlphaSpace using utils
   */
  private async createAlphaSpaceCardholder(
    customer: any
  ): Promise<{ id: string; purpose: string }> {
    // Prepare customer data in AlphaSpace format
    const customerData = {
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      country: customer.country || "US",
      date_of_birth: customer.date_of_birth
        ? customer.date_of_birth.toISOString().split("T")[0]
        : new Date("1990-01-01").toISOString().split("T")[0],
    };

    const token = await this.alphaSpaceAuthService.getValidAccessToken();

    try {
      this.logger.debug("Creating AlphaSpace customer using utils", {
        customerId: customer.id,
        email: customerData.email,
      });

      // Use AlphaSpace utils to create customer
      const result = await alphaSpaceCardUtils.createCustomer(
        customerData,
        token
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Extract customer ID from response
      const customerId = result.output?.data?.id || result.output?.id;

      if (!customerId) {
        throw new Error("No customer ID returned from AlphaSpace");
      }

      return {
        id: customerId,
        purpose: "visacard-1", // Default purpose
      };
    } catch (error: any) {
      this.logger.error("Failed to create AlphaSpace customer using utils", {
        customerId: customer.id,
        error: error.message,
      });
      throw new BadRequestException(
        "Failed to create card profile in payment provider"
      );
    }
  }

  /**
   * Issue card via AlphaSpace API
   */
  private async issueAlphaSpaceCard(
    cardholderId: string,
    cardData: WAVLETCreateCardData
  ): Promise<any> {
    const cardRequest: AlphaSpaceCreateCardData = {
      cardholder_id: cardholderId,
      purpose: cardData.brand === "MASTERCARD" ? "mastercard-1" : "visacard-1",
    };

    const token = await this.alphaSpaceAuthService.getValidAccessToken();
    const baseUrl = "https://lion.alpha.africa";

    try {
      this.logger.debug("Issuing AlphaSpace card", {
        cardholderId,
        purpose: cardRequest.purpose,
      });

      const response = await axios.post(
        `${baseUrl}/alpha/cards/create`,
        cardRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return (response as any).data.data;
    } catch (error: any) {
      this.logger.error("Failed to issue AlphaSpace card", {
        cardholderId,
        purpose: cardRequest.purpose,
        error: error.response?.data || error.message,
      });
      throw new BadRequestException(
        "Failed to issue card from payment provider"
      );
    }
  }

  /**
   * Fund newly issued card
   */
  private async fundNewCard(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<any> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();
    const baseUrl = "https://lion.alpha.africa";

    try {
      this.logger.debug("Funding newly issued card", {
        cardId,
        amount,
        companyId,
      });

      // Find company wallet
      const wallet = await this.prisma.wallet.findFirst({
        where: { company_id: companyId, currency: "USD" },
      });

      if (!wallet || wallet.payin_balance.lessThan(amount)) {
        throw new BadRequestException(
          "Insufficient wallet balance for funding"
        );
      }

      // Reserve funds atomically
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          payin_balance: { decrement: amount },
          balance: { decrement: amount },
        },
      });

      // Fund card in AlphaSpace
      const response = await axios.post(
        `${baseUrl}/alpha/cards/fund/${cardId}`,
        { amount: amount.toString() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      this.logger.debug("Card funding completed", {
        cardId,
        amount,
        walletId: wallet.id,
        transactionId: (response as any).data?.transaction_id,
      });

      return {
        success: true,
        walletId: wallet.id,
        transaction_id: (response as any).data?.transaction_id,
        funded_at: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("Failed to fund newly issued card", {
        cardId,
        amount,
        error: error.response?.data || error.message,
      });
      throw new BadRequestException("Failed to fund newly issued card");
    }
  }

  /**
   * Save card to WAVLET database
   */
  private async saveCardToDatabase(
    cardData: any,
    wavletData: WAVLETCreateCardData
  ): Promise<any> {
    const cardPayload = {
      id: uuidv4(),
      userId: wavletData.customer_id,
      company_id: wavletData.company_id,
      customer_id: wavletData.customer_id,
      provider: "alphaspce",
      provider_card_id: cardData.card.id,
      status: "PENDING", // Wait for webhook to confirm ACTIVE status
      balance: wavletData.amount || 0,
      currency: "USD",
      number: cardData.card.card_number || "",
      masked_number: this.maskCardNumber(cardData.card.card_number),
      first_six: cardData.card.card_number?.substring(0, 6) || "",
      last_four: cardData.card.card_number?.slice(-4) || "",
      cvv: cardData.details?.card_cvv
        ? this.encryptCvv(cardData.details.card_cvv)
        : "",
      expiry_month: cardData.details?.card_exp_month || 0,
      expiry_year: cardData.details?.card_exp_year || 0,
      brand: cardData.card.brand?.toUpperCase() || "",
      is_virtual: true,
      is_physical: false,
      provider_metadata: cardData,
      fee_config: cardData.fees_meta,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      const savedCard = await this.prisma.card.create({
        data: cardPayload as any,
      });

      this.logger.debug("Card saved to WAVLET database", {
        cardId: savedCard.id,
        alphaSpaceCardId: cardData.card.id,
      });

      return savedCard;
    } catch (error: any) {
      this.logger.error("Failed to save card to database", {
        error: error.message,
        customerId: wavletData.customer_id,
        alphaSpaceCardId: cardData.card.id,
      });
      throw new BadRequestException("Failed to save card information");
    }
  }

  /**
   * Handle issuance failure and cleanup
   */
  private async handleIssuanceFailure(
    cardData: WAVLETCreateCardData,
    error: any
  ): Promise<void> {
    // Log failure for monitoring
    this.logger.error("Card issuance failure - cleanup initiated", {
      customerId: cardData.customer_id,
      companyId: cardData.company_id,
      amount: cardData.amount,
      error: error.message,
    });

    // TODO: Implement cleanup logic for partial card creation
    // This would include:
    // - Deleting partially created AlphaSpace cardholder/card
    // - Rolling back any wallet debits
    // - Logging the cleanup action
  }

  /**
   * Utility methods
   */
  private generateCardId(): string {
    return `wav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private maskCardNumber(cardNumber: string | undefined): string {
    if (!cardNumber) return "****-****-****-****";
    const lastFour = cardNumber.slice(-4);
    return `****-****-****-${lastFour}`;
  }

  private encryptCvv(cvv: string): string {
    // TODO: Implement CVV encryption (critical for security)
    // For Phase 2, we'll use a simple mask for development
    return `ENC_${cvv}`;
  }

  private cleanEmail(email: string): string {
    return email
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._@-]/g, "");
  }

  private mapToWAVLETCardFormat(savedCard: any, creationResult: any): any {
    return {
      id: savedCard.id,
      customer_id: savedCard.customer_id,
      status: savedCard.status,
      balance: Number(savedCard.balance),
      currency: savedCard.currency,
      masked_pan: savedCard.masked_number,
      expiry_month: savedCard.expiry_month,
      expiry_year: savedCard.expiry_year,
      brand: savedCard.brand,
      provider: savedCard.provider,
      is_virtual: savedCard.is_virtual,
      is_physical: savedCard.is_physical,
      fees: creationResult.fees_meta,
      created_at: savedCard.created_at,
    };
  }
}
