// AlphaSpace Main Service
// WAVLET adaptation of MONIX AlphaSpace service - PHASE 2: Core Functionality

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AlphaSpaceAuthService } from "./alphaspace-auth.service";
import axios from "axios";
import {
  WAVLETCreateCardData,
  WAVLETCardResult,
  AlphaSpaceCreateCardholderData,
  AlphaSpaceCreateCardData,
  AlphaSpaceCreateCardResponse,
  AlphaSpaceFundCardData,
  AlphaSpaceCardDetails,
} from "../../../config/alphaspace.config";

@Injectable()
export class AlphaSpaceService {
  private readonly logger = new Logger(AlphaSpaceService.name);

  constructor(
    private readonly alphaSpaceAuthService: AlphaSpaceAuthService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Test AlphaSpace connectivity and authentication
   * Phase 1: Basic functionality
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log("🔍 ALPHASPACE TEST - Testing connectivity");

      // Test authentication
      await this.alphaSpaceAuthService.authenticate();

      this.logger.log("✅ ALPHASPACE TEST - Connection successful");
      return {
        success: true,
        message: "AlphaSpace connection and authentication successful",
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE TEST - Connection failed", {
        error: error.message,
      });

      return {
        success: false,
        message: `AlphaSpace connection failed: ${error.message}`,
      };
    }
  }

  // ===== PHASE 2: Core Functionality =====

  /**
   * Create a new card (PHASE 2)
   * Full implementation with cardholder creation and card issuance
   */
  async createCard(cardData: WAVLETCreateCardData): Promise<WAVLETCardResult> {
    this.logger.log("💳 ALPHASPACE CREATE CARD - Starting card creation", {
      customerId: cardData.customer_id,
      companyId: cardData.company_id,
      brand: cardData.brand,
      amount: cardData.amount,
    });

    try {
      // 1. Validate input data
      await this.validateWAVLETCardData(cardData);

      // 2. Check company access and wallet balance if funding
      if (cardData.amount && cardData.amount > 0) {
        await this.validateCompanyWalletBalance(
          cardData.company_id,
          cardData.amount
        );
      }

      // 3. Check if customer exists and has proper data
      const customer = await this.prisma.customer.findUnique({
        where: { id: cardData.customer_id },
        include: { company: true },
      });

      if (!customer) {
        throw new BadRequestException("Customer not found");
      }

      if (customer.company_id !== cardData.company_id) {
        throw new BadRequestException(
          "Customer does not belong to this company"
        );
      }

      // 4. Create cardholder (customer) in AlphaSpace
      const cardholder = await this.createCardholder(customer);

      // 5. Create actual card
      const cardCreationResult = await this.createCardInternal(
        cardholder.id,
        cardData
      );

      // 6. Fund card if amount specified
      if (cardData.amount && cardData.amount > 0) {
        const fundingResult = await this.fundCardInternal(
          cardCreationResult.card.id,
          cardData.amount,
          cardData.company_id
        );

        this.logger.log("💰 ALPHASPACE FUND CARD - Card funded successfully", {
          cardId: cardCreationResult.card.id,
          amount: cardData.amount,
          walletId: fundingResult.walletId,
        });
      }

      // 7. Save to WAVLET database and wait for webhook
      const savedCard = await this.saveWAVLETCard(cardCreationResult, cardData);

      // 8. Return response
      const wavletResult = this.mapToWAVLETFormat(
        savedCard,
        cardCreationResult
      );

      this.logger.log("✅ ALPHASPACE CREATE CARD - Card creation successful", {
        wavletCardId: savedCard.id,
        alphaSpaceCardId: cardCreationResult.card.id,
        status: savedCard.status,
      });

      return {
        success: true,
        card: wavletResult,
        metadata: {
          provider: "alphaspce",
          cardholder_id: cardholder.id,
          fees: cardCreationResult.fees_meta,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CREATE CARD - Card creation failed", {
        error: error.message,
        customerId: cardData.customer_id,
        companyId: cardData.company_id,
        stack: error.stack,
      });

      throw new BadRequestException(`Card creation failed: ${error.message}`);
    }
  }

  /**
   * Fund an existing card (PHASE 2)
   */
  async fundCard(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<any> {
    this.logger.log("💰 ALPHASPACE FUND CARD - Starting card funding", {
      cardId,
      amount,
      companyId,
    });

    try {
      // 1. Validate card ownership and amount
      await this.validateCardAccess(cardId, companyId);
      await this.validateCompanyWalletBalance(companyId, amount);

      // 2. Get card details
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
      });

      if (!card || !card.provider_card_id) {
        throw new BadRequestException("Card not found or has no provider ID");
      }

      // 3. Fund card via wallet
      const fundingResult = await this.fundCardInternal(
        card.provider_card_id,
        amount,
        companyId
      );

      // 4. Record transaction
      await this.createWAVLETTransaction({
        type: "CARD_FUNDING",
        amount: amount,
        card_id: cardId,
        customer_id: card.customer_id,
        company_id: card.company_id,
        description: `Card funding - ${amount} USD`,
      });

      this.logger.log("✅ ALPHASPACE FUND CARD - Card funding successful", {
        cardId,
        amount,
        companyId,
      });

      return {
        success: true,
        card_id: cardId,
        amount: amount,
        new_balance: Number(card.balance) + amount,
        wallet_id: fundingResult.walletId,
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE FUND CARD - Card funding failed", {
        error: error.message,
        cardId,
        amount,
        companyId,
      });

      throw new BadRequestException(`Card funding failed: ${error.message}`);
    }
  }

  /**
   * Withdraw from card (PHASE 2)
   */
  async withdrawCard(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<any> {
    this.logger.log("💸 ALPHASPACE WITHDRAW CARD - Starting card withdrawal", {
      cardId,
      amount,
      companyId,
    });

    try {
      // 1. Validate card ownership
      await this.validateCardAccess(cardId, companyId);

      // 2. Get card details
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
      });

      if (!card || !card.provider_card_id) {
        throw new BadRequestException("Card not found or has no provider ID");
      }

      // 3. Check card balance
      if (card.balance < amount) {
        throw new BadRequestException("Insufficient card balance");
      }

      // 4. Withdraw from AlphaSpace card
      await this.withdrawCardInternal(card.provider_card_id, amount);

      // 5. Update WAVLET balance and get wallet ID for refund
      const walletId = await this.withdrawFromCardWallet(
        cardId,
        amount,
        companyId
      );

      // 6. Record transaction
      await this.createWAVLETTransaction({
        type: "CARD_WITHDRAWAL",
        amount: -amount, // Negative for withdrawal
        card_id: cardId,
        customer_id: card.customer_id,
        company_id: card.company_id,
        description: `Card withdrawal - ${amount} USD`,
      });

      this.logger.log(
        "✅ ALPHASPACE WITHDRAW CARD - Card withdrawal successful",
        {
          cardId,
          amount,
          newBalance: card.balance - amount,
          companyId,
        }
      );

      return {
        success: true,
        card_id: cardId,
        amount: amount,
        new_balance: card.balance - amount,
        wallet_id: walletId,
      };
    } catch (error: any) {
      this.logger.error(
        "❌ ALPHASPACE WITHDRAW CARD - Card withdrawal failed",
        {
          error: error.message,
          cardId,
          amount,
          companyId,
        }
      );

      throw new BadRequestException(`Card withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Get card details (PHASE 2)
   */
  async getCard(cardId: string, companyId: string): Promise<any> {
    try {
      // 1. Validate access
      await this.validateCardAccess(cardId, companyId);

      // 2. Get WAVLET card data
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: {
          customer: true,
        },
      });

      if (!card) {
        throw new BadRequestException("Card not found");
      }

      // 3. Get real-time balance from AlphaSpace (if provider_id exists)
      let realTimeBalance = card.balance;
      if (card.provider_card_id) {
        try {
          realTimeBalance = await this.getAlphaSpaceCardBalance(
            card.provider_card_id
          );
        } catch (error) {
          this.logger.warn(
            "Failed to get real-time balance from AlphaSpace, using cached balance",
            {
              cardId,
              providerCardId: card.provider_card_id,
              error: error.message,
            }
          );
        }
      }

      return {
        success: true,
        card: {
          id: card.id,
          customer_id: card.customer_id,
          status: card.status,
          balance: realTimeBalance,
          currency: card.currency,
          masked_pan: card.masked_number,
          expiry_month: card.expiry_month,
          expiry_year: card.expiry_year,
          brand: card.brand,
          provider: card.provider,
          is_virtual: card.is_virtual,
          is_physical: card.is_physical,
          created_at: card.created_at,
        },
        customer: {
          id: card.customer.email, // Return email as ID for compatibility
          name: `${card.customer.first_name} ${card.customer.last_name}`,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE GET CARD - Failed to get card details", {
        error: error.message,
        cardId,
        companyId,
      });

      throw new BadRequestException(
        `Failed to get card details: ${error.message}`
      );
    }
  }

  /**
   * Terminate card (PHASE 2)
   */
  async terminateCard(
    cardId: string,
    companyId: string,
    reason?: string
  ): Promise<any> {
    this.logger.log(
      "🪓 ALPHASPACE TERMINATE CARD - Starting card termination",
      {
        cardId,
        companyId,
        reason,
      }
    );

    try {
      // 1. Validate access
      await this.validateCardAccess(cardId, companyId);

      // 2. Get card details
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
      });

      if (!card || !card.provider_card_id) {
        throw new BadRequestException("Card not found or has no provider ID");
      }

      // 3. Get remaining balance before termination
      const remainingBalance = await this.getAlphaSpaceCardBalance(
        card.provider_card_id
      );

      // 4. Terminate card in AlphaSpace
      await this.terminateAlphaSpaceCard(card.provider_card_id);

      // 5. Refund remaining balance to wallet
      const walletId = await this.refundCardBalanceToWallet(
        cardId,
        remainingBalance,
        companyId
      );

      // 6. Update WAVLET card status
      await this.prisma.card.update({
        where: { id: cardId },
        data: {
          status: "TERMINATED",
          balance: 0, // Zero out balance
        },
      });

      // 7. Record final transaction
      await this.createWAVLETTransaction({
        type: "CARD_TERMINATION",
        amount: -remainingBalance, // Negative for termination refund
        card_id: cardId,
        customer_id: card.customer_id,
        company_id: card.company_id,
        description: `Card termination refund - ${remainingBalance} USD`,
      });

      this.logger.log(
        "✅ ALPHASPACE TERMINATE CARD - Card termination successful",
        {
          cardId,
          refundedAmount: remainingBalance,
          walletId,
          companyId,
        }
      );

      return {
        success: true,
        card_id: cardId,
        refunded_amount: remainingBalance,
        wallet_id: walletId,
        reason: reason || "Customer requested termination",
      };
    } catch (error: any) {
      this.logger.error(
        "❌ ALPHASPACE TERMINATE CARD - Card termination failed",
        {
          error: error.message,
          cardId,
          companyId,
        }
      );

      throw new BadRequestException(
        `Card termination failed: ${error.message}`
      );
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Validate WAVLET card creation data
   */
  private async validateWAVLETCardData(
    cardData: WAVLETCreateCardData
  ): Promise<void> {
    if (!cardData.customer_id || !cardData.company_id) {
      throw new BadRequestException("Customer ID and Company ID are required");
    }

    if (cardData.amount && cardData.amount < 0) {
      throw new BadRequestException("Amount must be positive");
    }

    if (
      cardData.brand &&
      !["VISA", "MASTERCARD"].includes(cardData.brand.toUpperCase())
    ) {
      throw new BadRequestException("Brand must be VISA or MASTERCARD");
    }
  }

  /**
   * Validate card access for company
   */
  private async validateCardAccess(
    cardId: string,
    companyId: string
  ): Promise<void> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new BadRequestException("Card not found");
    }

    if (card.company_id !== companyId) {
      throw new BadRequestException("Card does not belong to this company");
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

    if (wallet.payin_balance < amount) {
      throw new BadRequestException("Insufficient wallet balance");
    }
  }

  /**
   * Create cardholder in AlphaSpace using customer data
   */
  private async createCardholder(
    customer: any
  ): Promise<{ id: string; purpose: string }> {
    // Clean customer data for AlphaSpace
    const cardholderData: AlphaSpaceCreateCardholderData = {
      name: `${customer.first_name} ${customer.last_name}`.substring(0, 23),
      first_name: customer.first_name.substring(0, 12),
      last_name: customer.last_name.substring(0, 12),
      gender: customer.gender === "male" ? 0 : 1,
      date_of_birth: customer.date_of_birth.toISOString().split("T")[0], // YYYY-MM-DD
      email_address: this.cleanEmail(customer.email),
      purpose: "visacard-1", // Default to Visa, will be updated based on card creation
    };

    const token = await this.alphaSpaceAuthService.getValidAccessToken();
    const baseUrl = "https://lion.alpha.africa"; // Test environment

    try {
      const response = await axios.post(
        `${baseUrl}/alpha/cards/holder`,
        cardholderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data.status === "submitted") {
        // Wait for approval
        await this.waitForCardholderApproval(response.data.id);
      }

      return {
        id: response.data.id,
        purpose: cardholderData.purpose,
      };
    } catch (error: any) {
      this.logger.error("Failed to create AlphaSpace cardholder", {
        customerId: customer.id,
        error: error.response?.data || error.message,
      });
      throw new BadRequestException(
        "Failed to create cardholder in payment provider"
      );
    }
  }

  /**
   * Wait for cardholder approval (polling)
   */
  private async waitForCardholderApproval(
    cardholderId: string,
    maxAttempts = 10
  ): Promise<void> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();
    const baseUrl = "https://lion.alpha.africa";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${baseUrl}/alpha/cards/holder`, {
          params: { cardholder_id: cardholderId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        });

        if (response.data.status === "approved") {
          return;
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        this.logger.warn(
          `Cardholder approval check failed (attempt ${attempt + 1})`,
          {
            cardholderId,
            error: error.message,
          }
        );
      }
    }

    throw new BadRequestException("Cardholder approval timeout");
  }

  /**
   * Clean email for AlphaSpace compatibility
   */
  private cleanEmail(email: string): string {
    return email
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._@-]/g, "");
  }

  // ===== PLACEHOLDER METHODS =====
  // These would be implemented with actual AlphaSpace API calls

  private async createCardInternal(
    cardholderId: string,
    cardData: WAVLETCreateCardData
  ): Promise<AlphaSpaceCreateCardResponse["data"]> {
    // Mock implementation for Phase 2 demo
    // TODO: Replace with actual AlphaSpace API call
    const mockCardId = `card_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.logger.log(
      "🚧 ALPHASPACE CREATE CARD INTERNAL - Mock implementation used",
      {
        cardholderId,
        generatedCardId: mockCardId,
      }
    );

    return {
      fees: 1.0,
      fees_meta: {
        total: "1.00",
        fees: {
          issuance: "1.00",
          flat: "0.00",
        },
      },
      card: {
        id: mockCardId,
        card_token: `tok_${mockCardId.substring(5)}`,
        card_number: `411111${Math.floor(Math.random() * 900000) + 100000}5000`,
        balance: cardData.amount ? cardData.amount.toString() : "0.00",
        brand: cardData.brand?.toUpperCase() || "VISA",
        state: "ACTIVE",
        purpose:
          cardData.brand === "MASTERCARD" ? "mastercard-1" : "visacard-1",
      },
      details: {
        card_exp_month: new Date().getMonth() + 2,
        card_exp_year: new Date().getFullYear() + 3,
        card_cvv: Math.floor(Math.random() * 900) + 100,
      },
    };
  }

  private async fundCardInternal(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<{ walletId: string }> {
    // Mock implementation for Phase 2 demo
    const wallet = await this.prisma.wallet.findFirst({
      where: { company_id: companyId, currency: "USD" },
    });

    if (wallet) {
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          payin_balance: { decrement: amount },
          balance: { decrement: amount },
        },
      });
    }

    return { walletId: wallet?.id || "" };
  }

  private async withdrawCardInternal(
    cardId: string,
    amount: number
  ): Promise<void> {
    // Mock implementation for Phase 2 demo
    this.logger.log(
      "🚧 ALPHASPACE WITHDRAW CARD INTERNAL - Mock implementation used",
      {
        cardId,
        amount,
      }
    );
  }

  private async terminateAlphaSpaceCard(cardId: string): Promise<void> {
    // Mock implementation for Phase 2 demo
    this.logger.log(
      "🚧 ALPHASPACE TERMINATE CARD INTERNAL - Mock implementation used",
      {
        cardId,
      }
    );
  }

  private async getAlphaSpaceCardBalance(cardId: string): Promise<number> {
    // Mock implementation for Phase 2 demo
    return Math.floor(Math.random() * 100) + 10; // Random balance between 10-110
  }

  private async refundCardBalanceToWallet(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<string> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { company_id: companyId, currency: "USD" },
    });

    if (wallet) {
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          payin_balance: { increment: amount },
          balance: { increment: amount },
        },
      });

      await this.prisma.card.update({
        where: { id: cardId },
        data: { balance: { decrement: amount } },
      });

      return wallet.id;
    }

    return "";
  }

  private async withdrawFromCardWallet(
    cardId: string,
    amount: number,
    companyId: string
  ): Promise<string> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { company_id: companyId, currency: "USD" },
    });

    if (wallet) {
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          payin_balance: { increment: amount },
          balance: { increment: amount },
        },
      });

      await this.prisma.card.update({
        where: { id: cardId },
        data: { balance: { decrement: amount } },
      });

      return wallet.id;
    }

    return "";
  }

  private async saveWAVLETCard(
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
      status: "PENDING",
      balance: wavletData.amount || 0,
      currency: "USD",
      number: cardData.card.card_number || "",
      masked_number: `****-****-****-${
        cardData.card.card_number?.slice(-4) || "****"
      }`,
      first_six: cardData.card.card_number?.substring(0, 6) || "",
      last_four: cardData.card.card_number?.slice(-4) || "",
      cvv: cardData.details?.card_cvv || "",
      expiry_month: cardData.details?.card_exp_month || 0,
      expiry_year: cardData.details?.card_exp_year || 0,
      card_brand: cardData.card.brand?.toUpperCase() || "",
      is_virtual: true,
      is_physical: false,
      provider_metadata: cardData,
      fee_config: cardData.fees_meta,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return await this.prisma.card.create({
      data: cardPayload,
    });
  }

  private async createWAVLETTransaction(txData: any): Promise<any> {
    return await this.prisma.transaction.create({
      data: {
        id: uuidv4(),
        type: txData.type,
        amount: txData.amount,
        currency: "USD",
        company_id: txData.company_id,
        customer_id: txData.customer_id,
        card_id: txData.card_id,
        description: txData.description,
        status: "SUCCESS",
        category: "CARD",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  private mapToWAVLETFormat(card: any, cardCreationResult: any): any {
    return {
      id: card.id,
      customer_id: card.customer_id,
      status: card.status,
      balance: card.balance,
      currency: card.currency,
      masked_pan: card.masked_number,
      expiry_month: card.expiry_month,
      expiry_year: card.expiry_year,
      brand: card.card_brand,
      provider: card.provider,
      is_virtual: card.is_virtual,
      is_physical: card.is_physical,
      fees: cardCreationResult.fees_meta,
      created_at: card.created_at,
    };
  }

  // ===== LEGACY PHASE 1 METHODS =====

  /**
   * Get authentication status
   */
  async getAuthStatus(): Promise<{
    authenticated: boolean;
    hasValidToken: boolean;
    environment: string;
  }> {
    try {
      const token = this.alphaSpaceAuthService.getValidAccessToken();
      return {
        authenticated: true,
        hasValidToken: !!token,
        environment: "test",
      };
    } catch (error) {
      return {
        authenticated: false,
        hasValidToken: false,
        environment: "test",
      };
    }
  }

  /**
   * Clear authentication tokens (for testing)
   */
  clearAuthTokens(): void {
    this.alphaSpaceAuthService.clearTokens();
    this.logger.log("🧹 ALPHASPACE - Auth tokens cleared");
  }
}
