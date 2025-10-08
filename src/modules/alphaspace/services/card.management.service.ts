// AlphaSpace Card Management Service
// Handles card operations: get, freeze, unfreeze, terminate
// WAVLET adaptation following Maplerad service patterns

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CardStatus } from "@prisma/client";
import { CurrentUserData } from "../../common/decorators/current-user.decorator";
import { v4 as uuidv4 } from "uuid";
import alphaSpaceCardUtils from "../../../utils/cards/alphaspace/card";
import { AlphaSpaceAuthService } from "./alphaspace-auth.service";

export interface CardManagementResult {
  success: boolean;
  message: string;
  data?: any;
  metadata?: any;
}

export interface CardStatistics {
  total: number;
  active: number;
  frozen: number;
  terminated: number;
  pending: number;
  failed: number;
  total_balance: number;
  available_slots?: number;
  by_customer?: any;
}

/**
 * Advanced Card Management Service for AlphaSpace
 * Handles card operations with WAVLET-specific features
 */
@Injectable()
export class CardManagementService {
  private readonly logger = new Logger(CardManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alphaSpaceAuthService: AlphaSpaceAuthService
  ) {}

  /**
   * Freeze an AlphaSpace card
   */
  async freezeCard(
    cardId: string,
    user: CurrentUserData
  ): Promise<CardManagementResult> {
    this.logger.log("🧊 ALPHASPACE CARD FREEZE FLOW - START", {
      cardId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership and status
      const card = await this.validateCardForManagement(cardId, user.companyId);

      // 2. Check if already frozen
      if (card.status === CardStatus.FROZEN) {
        throw new BadRequestException("Card is already frozen");
      }

      // 3. Check if card is terminable (not terminated)
      if (card.status === CardStatus.TERMINATED) {
        throw new BadRequestException("Cannot freeze a terminated card");
      }

      let alphaSpaceCallSucceeded = false;
      let freezeResult: any = null;

      try {
        // 4. Freeze card via AlphaSpace API
        freezeResult = await this.freezeAlphaSpaceCard(card.provider_card_id);
        alphaSpaceCallSucceeded = true;

        // 5. Update local card status
        await this.updateLocalCardStatus(cardId, CardStatus.FROZEN);

        // 6. Log freeze success
        await this.logCardManagementAction(
          cardId,
          card.customer_id,
          "freeze",
          "SUCCESS",
          {
            alphaSpace_result: freezeResult,
            previous_status: card.status,
            new_status: CardStatus.FROZEN,
          }
        );

        this.logger.log("✅ ALPHASPACE CARD FREEZE FLOW - COMPLETED", {
          cardId,
          success: true,
        });

        return {
          success: true,
          message: "Card frozen successfully",
          data: {
            card_id: cardId,
            previous_status: card.status,
            new_status: CardStatus.FROZEN,
            frozen_at: new Date().toISOString(),
            alphaSpace_reference: freezeResult?.reference,
          },
        };
      } catch (error: any) {
        // Handle freeze errors
        await this.handleCardManagementError(
          error,
          alphaSpaceCallSucceeded,
          cardId,
          card.customer_id,
          "freeze"
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD FREEZE FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card freeze failed: ${error.message}`);
    }
  }

  /**
   * Unfreeze an AlphaSpace card
   */
  async unfreezeCard(
    cardId: string,
    user: CurrentUserData
  ): Promise<CardManagementResult> {
    this.logger.log("🔥 ALPHASPACE CARD UNFREEZE FLOW - START", {
      cardId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership and status
      const card = await this.validateCardForManagement(cardId, user.companyId);

      // 2. Check if not frozen
      if (card.status !== CardStatus.FROZEN) {
        throw new BadRequestException("Card is not frozen");
      }

      let alphaSpaceCallSucceeded = false;
      let unfreezeResult: any = null;

      try {
        // 3. Unfreeze card via AlphaSpace API
        unfreezeResult = await this.unfreezeAlphaSpaceCard(
          card.provider_card_id
        );
        alphaSpaceCallSucceeded = true;

        // 4. Update local card status to ACTIVE
        await this.updateLocalCardStatus(cardId, CardStatus.ACTIVE);

        // 5. Log unfreeze success
        await this.logCardManagementAction(
          cardId,
          card.customer_id,
          "unfreeze",
          "SUCCESS",
          {
            alphaSpace_result: unfreezeResult,
            previous_status: card.status,
            new_status: CardStatus.ACTIVE,
          }
        );

        this.logger.log("✅ ALPHASPACE CARD UNFREEZE FLOW - COMPLETED", {
          cardId,
          success: true,
        });

        return {
          success: true,
          message: "Card unfrozen successfully",
          data: {
            card_id: cardId,
            previous_status: card.status,
            new_status: CardStatus.ACTIVE,
            unfrozen_at: new Date().toISOString(),
            alphaSpace_reference: unfreezeResult?.reference,
          },
        };
      } catch (error: any) {
        // Handle unfreeze errors
        await this.handleCardManagementError(
          error,
          alphaSpaceCallSucceeded,
          cardId,
          card.customer_id,
          "unfreeze"
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD UNFREEZE FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Card unfreeze failed: ${error.message}`);
    }
  }

  /**
   * Terminate an AlphaSpace card
   */
  async terminateCard(
    cardId: string,
    user: CurrentUserData
  ): Promise<CardManagementResult> {
    this.logger.log("💀 ALPHASPACE CARD TERMINATION FLOW - START", {
      cardId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership and status
      const card = await this.validateCardForManagement(cardId, user.companyId);

      // 2. Check if already terminated
      if (card.status === CardStatus.TERMINATED) {
        throw new BadRequestException("Card is already terminated");
      }

      // 3. Get current card balance for potential refund
      const currentBalance = Number(card.balance);

      let alphaSpaceCallSucceeded = false;
      let terminationResult: any = null;
      let refundProcessed = false;
      let refundAmount = 0;

      try {
        // 4. Terminate card via AlphaSpace API
        terminationResult = await this.terminateAlphaSpaceCard(
          card.provider_card_id
        );
        alphaSpaceCallSucceeded = true;

        // 5. Process balance refund if card has remaining balance
        if (currentBalance > 0) {
          refundAmount = currentBalance;
          await this.processTerminationRefund(
            card.customer_id,
            user.companyId,
            refundAmount,
            cardId
          );
          refundProcessed = true;
        }

        // 6. Update local card status
        await this.updateLocalCardStatus(cardId, CardStatus.TERMINATED, {
          balance: 0, // Zero out balance after refund
        });

        // 7. Log termination success
        await this.logCardManagementAction(
          cardId,
          card.customer_id,
          "terminate",
          "SUCCESS",
          {
            alphaSpace_result: terminationResult,
            previous_status: card.status,
            new_status: CardStatus.TERMINATED,
            refund_processed: refundProcessed,
            refund_amount: refundAmount,
            final_balance: 0,
          }
        );

        this.logger.log("✅ ALPHASPACE CARD TERMINATION FLOW - COMPLETED", {
          cardId,
          success: true,
          refundProcessed,
          refundAmount,
        });

        return {
          success: true,
          message: "Card terminated successfully",
          data: {
            card_id: cardId,
            previous_status: card.status,
            new_status: CardStatus.TERMINATED,
            terminated_at: new Date().toISOString(),
            refund_processed: refundProcessed,
            refund_amount: refundAmount,
            final_balance: 0,
            alphaSpace_reference: terminationResult?.reference,
          },
        };
      } catch (error: any) {
        // Handle termination errors
        await this.handleCardManagementError(
          error,
          alphaSpaceCallSucceeded,
          cardId,
          card.customer_id,
          "terminate"
        );
        throw error;
      }
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE CARD TERMINATION FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Card termination failed: ${error.message}`
      );
    }
  }

  /**
   * Get a single AlphaSpace card
   */
  async getCard(
    cardId: string,
    user: CurrentUserData,
    reveal?: boolean
  ): Promise<CardManagementResult> {
    this.logger.log("🔍 ALPHASPACE GET CARD FLOW - START", {
      cardId,
      userId: user.userId,
      reveal,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate card ownership
      const card = await this.validateCardAccess(cardId, user.companyId);

      // 2. Get card with sensitive data handling
      let cardData = card;

      if (reveal && card.cvv?.startsWith("ENC_")) {
        // Encrypted CVV handling (would decrypt if implemented)
        // For now, we'll just return masked data
        cardData = {
          ...cardData,
          cvv: this.maskCvv(card.cvv),
        };
      }

      // 3. Format response
      const formattedCard = {
        id: cardData.id,
        customer_id: cardData.customer_id,
        status: cardData.status,
        balance: Number(cardData.balance),
        currency: cardData.currency,
        number: reveal && cardData.number ? cardData.number : undefined,
        masked_number: cardData.masked_number,
        last4: cardData.last_four,
        cvv: reveal && cardData.cvv ? cardData.cvv : undefined,
        expiry_month: cardData.card_expiry_month,
        expiry_year: cardData.card_expiry_year,
        brand: cardData.card_brand,
        provider: cardData.provider,
        is_active: cardData.is_active,
        is_virtual: cardData.is_virtual,
        is_physical: cardData.is_physical,
        created_at: cardData.created_at,
        updated_at: cardData.updated_at,
      };

      this.logger.log("✅ ALPHASPACE GET CARD FLOW - COMPLETED", {
        cardId,
        success: true,
        revealedSensitive: reveal,
      });

      return {
        success: true,
        message: "Card retrieved successfully",
        data: formattedCard,
        metadata: {
          revealed_sensitive: reveal || false,
          provider: card.provider,
          last_sync: card.updated_at,
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE GET CARD FAILED", {
        cardId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(`Get card failed: ${error.message}`);
    }
  }

  /**
   * Get all cards for a customer
   */
  async getCustomerCards(
    customerId: string,
    user: CurrentUserData
  ): Promise<CardManagementResult> {
    this.logger.log("👤 ALPHASPACE GET CUSTOMER CARDS FLOW - START", {
      customerId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Validate customer ownership
      const customer = await this.validateCustomerAccess(customerId, user);

      // 2. Get all customer cards
      const cards = await this.prisma.card.findMany({
        where: {
          customer_id: customerId,
          company_id: user.companyId,
          provider: "alphaspce",
        },
        include: {
          customer: true,
        },
        orderBy: { created_at: "desc" },
      });

      // 3. Calculate statistics
      const statistics = this.calculateCardStatistics(cards);

      // 4. Format cards
      const formattedCards = cards.map((card: any) => ({
        id: card.id,
        status: card.status,
        balance: Number(card.balance),
        masked_number: card.masked_number,
        last4: card.last_four,
        brand: card.card_brand,
        currency: card.currency,
        created_at: card.created_at,
        updated_at: card.updated_at,
        is_active: card.is_active,
        is_virtual: card.is_virtual,
      }));

      this.logger.log("✅ ALPHASPACE GET CUSTOMER CARDS FLOW - COMPLETED", {
        customerId,
        cardsCount: cards.length,
        success: true,
      });

      return {
        success: true,
        message: `${cards.length} cards retrieved successfully`,
        data: {
          customer_id: customerId,
          statistics,
          cards: formattedCards,
        },
        metadata: {
          total_cards: cards.length,
          last_sync: new Date().toISOString(),
          provider: "alphaspace",
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE GET CUSTOMER CARDS FAILED", {
        customerId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Get customer cards failed: ${error.message}`
      );
    }
  }

  /**
   * Get all cards for a company
   */
  async getCompanyCards(user: CurrentUserData): Promise<CardManagementResult> {
    this.logger.log("🏢 ALPHASPACE GET COMPANY CARDS FLOW - START", {
      userId: user.userId,
      companyId: user.companyId,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Get all company AlphaSpace cards
      const cards = await this.prisma.card.findMany({
        where: {
          company_id: user.companyId,
          provider: "alphaspce",
        },
        include: {
          customer: true,
        },
        orderBy: { created_at: "desc" },
      });

      // 2. Calculate comprehensive statistics
      const statistics = this.calculateCompanyCardStatistics(cards);

      // 3. Format cards
      const formattedCards = cards.map((card: any) => ({
        id: card.id,
        customer_id: card.customer_id,
        status: card.status,
        balance: Number(card.balance),
        masked_number: card.masked_number,
        last4: card.last_four,
        brand: card.card_brand,
        currency: card.currency,
        created_at: card.created_at,
        updated_at: card.updated_at,
        is_active: card.is_active,
        is_virtual: card.is_virtual,
      }));

      this.logger.log("✅ ALPHASPACE GET COMPANY CARDS FLOW - COMPLETED", {
        companyId: user.companyId,
        cardsCount: cards.length,
        success: true,
      });

      return {
        success: true,
        message: `${cards.length} company cards retrieved successfully`,
        data: {
          company_id: user.companyId,
          statistics,
          cards: formattedCards,
        },
        metadata: {
          total_cards: cards.length,
          last_sync: new Date().toISOString(),
          provider: "alphaspace",
        },
      };
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE GET COMPANY CARDS FAILED", {
        companyId: user.companyId,
        error: error.message,
        userId: user.userId,
      });
      throw new BadRequestException(
        `Get company cards failed: ${error.message}`
      );
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate card for management operations
   */
  private async validateCardForManagement(
    cardId: string,
    companyId: string
  ): Promise<any> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      throw new NotFoundException("Card not found");
    }

    if (card.company_id !== companyId) {
      throw new BadRequestException("Card does not belong to this company");
    }

    // Check if it's an AlphaSpace card
    if (card.provider !== "alphaspce") {
      throw new BadRequestException("Card is not an AlphaSpace card");
    }

    return card;
  }

  /**
   * Validate card access for read operations
   */
  private async validateCardAccess(
    cardId: string,
    companyId: string
  ): Promise<any> {
    return this.validateCardForManagement(cardId, companyId);
  }

  /**
   * Validate customer access
   */
  private async validateCustomerAccess(
    customerId: string,
    user: CurrentUserData
  ): Promise<any> {
    const customer = await this.prisma.customer.findUnique({
      where: {
        id: customerId,
        company_id: user.companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }

  /**
   * Freeze card via AlphaSpace utils
   */
  private async freezeAlphaSpaceCard(providerCardId: string): Promise<any> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();

    try {
      this.logger.debug("Freezing AlphaSpace card using utils", {
        providerCardId,
      });

      // Use AlphaSpace utils to freeze the card
      const result = await alphaSpaceCardUtils.freezeCard(
        providerCardId,
        token
      );

      if (result.error) {
        throw new Error(result.error.message || "AlphaSpace freeze failed");
      }

      return {
        reference: `freeze_${providerCardId}_${Date.now()}`,
        status: "frozen",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("AlphaSpace freeze via utils failed", {
        providerCardId,
        error: error.message,
      });

      throw new Error("Card freeze failed in payment provider");
    }
  }

  /**
   * Unfreeze card via AlphaSpace utils
   */
  private async unfreezeAlphaSpaceCard(providerCardId: string): Promise<any> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();

    try {
      this.logger.debug("Unfreezing AlphaSpace card using utils", {
        providerCardId,
      });

      // Use AlphaSpace utils to unfreeze the card
      const result = await alphaSpaceCardUtils.unfreezeCard(
        providerCardId,
        token
      );

      if (result.error) {
        throw new Error(result.error.message || "AlphaSpace unfreeze failed");
      }

      return {
        reference: `unfreeze_${providerCardId}_${Date.now()}`,
        status: "active",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("AlphaSpace unfreeze via utils failed", {
        providerCardId,
        error: error.message,
      });

      throw new Error("Card unfreeze failed in payment provider");
    }
  }

  /**
   * Terminate card via AlphaSpace utils
   */
  private async terminateAlphaSpaceCard(providerCardId: string): Promise<any> {
    const token = await this.alphaSpaceAuthService.getValidAccessToken();

    try {
      this.logger.debug("Terminating AlphaSpace card using utils", {
        providerCardId,
      });

      // Use AlphaSpace utils to terminate the card
      const result = await alphaSpaceCardUtils.terminateCard(
        providerCardId,
        token
      );

      if (result.error) {
        throw new Error(result.error.message || "AlphaSpace terminate failed");
      }

      return {
        reference: `terminate_${providerCardId}_${Date.now()}`,
        status: "terminated",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error("AlphaSpace terminate via utils failed", {
        providerCardId,
        error: error.message,
      });

      throw new Error("Card termination failed in payment provider");
    }
  }

  /**
   * Update local card status
   */
  private async updateLocalCardStatus(
    cardId: string,
    status: CardStatus,
    additionalFields?: any
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (additionalFields) {
      Object.assign(updateData, additionalFields);
    }

    await this.prisma.card.update({
      where: { id: cardId },
      data: updateData,
    });
  }

  /**
   * Process termination refund
   */
  private async processTerminationRefund(
    customerId: string,
    companyId: string,
    amount: number,
    cardId: string
  ): Promise<void> {
    // Get USD wallet
    const usdWallet = await this.prisma.wallet.findFirst({
      where: {
        company_id: companyId,
        currency: "USD",
      },
    });

    if (usdWallet) {
      // Update wallet balance
      await this.prisma.wallet.update({
        where: { id: usdWallet.id },
        data: {
          balance: { increment: amount },
          payin_balance: { increment: amount },
        },
      });

      // Create refund transaction record
      await this.prisma.transaction.create({
        data: {
          id: uuidv4(),
          status: "SUCCESS",
          category: "CARD",
          type: "TERMINATION_REFUND",
          amount: amount,
          currency: "USD",
          customer_id: customerId,
          company_id: companyId,
          card_id: cardId,
          description: `Card termination refund: ${cardId}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      this.logger.debug("Termination refund processed", {
        customerId,
        cardId,
        amount,
        walletId: usdWallet.id,
      });
    }
  }

  /**
   * Log card management actions
   */
  private async logCardManagementAction(
    cardId: string,
    customerId: string,
    action: string,
    status: string,
    details: any
  ): Promise<void> {
    await this.prisma.customerLogs.create({
      data: {
        customer_id: customerId,
        action: `card-${action}`,
        status,
        log_json: {
          card_id: cardId,
          action,
          ...details,
        },
        log_txt: `AlphaSpace card ${action} ${status.toLowerCase()}: ${cardId}`,
        created_at: new Date(),
      },
    });
  }

  /**
   * Handle card management errors
   */
  private async handleCardManagementError(
    error: any,
    alphaSpaceCallSucceeded: boolean,
    cardId: string,
    customerId: string,
    action: string
  ): Promise<void> {
    await this.prisma.customerLogs.create({
      data: {
        customer_id: customerId,
        action: `card-${action}`,
        status: "FAILED",
        log_json: {
          card_id: cardId,
          action,
          error: error.message,
          alphaSpace_succeeded: alphaSpaceCallSucceeded,
        },
        log_txt: `AlphaSpace card ${action} failed: ${error.message}`,
        created_at: new Date(),
      },
    });
  }

  /**
   * Calculate card statistics
   */
  private calculateCardStatistics(cards: any[]): CardStatistics {
    return {
      total: cards.length,
      active: cards.filter((c) => c.status === CardStatus.ACTIVE).length,
      frozen: cards.filter((c) => c.status === CardStatus.FROZEN).length,
      terminated: cards.filter((c) => c.status === CardStatus.TERMINATED)
        .length,
      pending: cards.filter((c) => c.status === CardStatus.PENDING).length,
      failed: cards.filter((c) => c.status === CardStatus.FAILED).length,
      total_balance: cards.reduce(
        (sum, card) => sum + Number(card.balance || 0),
        0
      ),
      available_slots: Math.max(
        0,
        10 - cards.filter((c) => c.status !== CardStatus.TERMINATED).length
      ),
    };
  }

  /**
   * Calculate company card statistics
   */
  private calculateCompanyCardStatistics(cards: any[]): any {
    const stats = this.calculateCardStatistics(cards);

    // Add company-specific statistics
    stats.by_customer = cards.reduce((acc, card) => {
      const customerId = card.customer_id;
      if (!acc[customerId]) {
        acc[customerId] = {
          customer_id: customerId,
          cards_count: 0,
          total_balance: 0,
          active_cards: 0,
        };
      }
      acc[customerId].cards_count++;
      acc[customerId].total_balance += Number(card.balance || 0);
      if (card.status === CardStatus.ACTIVE) {
        acc[customerId].active_cards++;
      }
      return acc;
    }, {});

    return stats;
  }

  /**
   * Mask CVV for security
   */
  private maskCvv(cvv: string): string {
    return cvv ? "***" : "";
  }
}
