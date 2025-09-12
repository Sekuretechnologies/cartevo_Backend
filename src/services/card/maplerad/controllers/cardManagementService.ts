import {
  CardModel,
  NotificationModel,
  TransactionModel,
  UserModel,
} from "@/models";
import { v4 as uuidv4 } from "uuid";
import { utcToLocalTime } from "@/utils/date";
import { CardStatus } from "@/utils/cards/maplerad/types";
import { CardIssuanceService } from "../services/cardIssuanceService";
import { NotificationService } from "../services/notificationService";
import { CurrentUserData } from "@/modules/common/decorators/current-user.decorator";

/**
 * Card Management Service
 * Handles card-related operations like creation, status management, and details retrieval
 */
export class CardManagementService {
  /**
   * Get all customer cards with synchronized data
   */
  static async getCustomerCardsWithSync(customerId: string) {
    try {
      // Get all Maplerad cards for the customer
      const cardsResult = await CardModel.get({
        customer_id: customerId,
        provider: "maplerad",
        is_active: true,
      });

      if (cardsResult.error) {
        console.error("❌ Error retrieving customer cards:", cardsResult.error);
        throw new Error("Failed to retrieve customer cards");
      }

      const cards = cardsResult.output || [];

      console.log(
        `Retrieved ${cards.length} synchronized Maplerad cards for customer ${customerId}`
      );

      return {
        status: "success",
        message: "Cards retrieved with synchronization",
        data: {
          cards: cards,
        },
      };
    } catch (err: any) {
      console.error("Maplerad getCustomerCardsWithSync error:", err);
      throw new Error("Error retrieving customer cards");
    }
  }

  /**
   * Create a new card using the refactored CardIssuanceService
   */
  static async createCard(
    user: CurrentUserData,
    cardData: {
      brand: string;
      color: string;
      name: string;
      amount: number;
    }
  ) {
    try {
      // Use the refactored CardIssuanceService
      const request = {
        customerId: user.userId,
        cardBrand: cardData.brand,
        initialBalance: cardData.amount,
        clientReference: `CARD_${Date.now()}`,
        name: cardData.name,
        color: cardData.color,
      };

      const result = await CardIssuanceService.issueRetailCard(request);

      if (result.error) {
        throw result.error;
      }

      return result;
    } catch (err: any) {
      console.log(user.email, err);
      throw new Error("Failed to create card");
    }
  }

  /**
   * Get card details
   */
  static async getCardDetails(cardId: string) {
    try {
      const cardResult = await CardModel.getOne({ id: cardId });

      if (cardResult.error) {
        throw new Error("Card not found");
      }

      const card = cardResult.output;

      if (!card) {
        throw new Error("Card not found");
      }

      return {
        status: "success",
        data: card,
      };
    } catch (err: any) {
      console.error("Maplerad getCardDetails error:", err);
      throw new Error("Error retrieving card details");
    }
  }

  /**
   * Toggle card status (active ↔ inactive)
   */
  static async toggleCardStatus(cardId: string, userId: string) {
    try {
      // Get the card
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error || !cardResult.output) {
        throw new Error("Card not found");
      }
      const card = cardResult.output;

      // Check if it's a Maplerad card
      if (card.provider !== "maplerad") {
        throw new Error("This card is not a Maplerad card");
      }

      if (card.status === CardStatus.TERMINATED) {
        throw new Error("This card is terminated");
      }

      // Determine new status
      const newStatus =
        card.status === CardStatus.ACTIVE
          ? CardStatus.FROZEN
          : CardStatus.ACTIVE;

      // Update card status
      const updateResult = await CardModel.update(card.id, {
        status: newStatus,
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (updateResult.error) {
        throw new Error("Failed to update card status");
      }

      return {
        status: "success",
        message: `Card status updated to ${newStatus}`,
        data: {
          cardId,
          newStatus,
        },
      };
    } catch (err: any) {
      console.error("toggleCardStatus error:", err);
      throw new Error("Error updating card status");
    }
  }

  /**
   * Terminate a card
   */
  static async terminateCard(cardId: string, userId: string) {
    try {
      // Get the card
      const cardResult = await CardModel.getOne({ id: cardId });
      if (cardResult.error || !cardResult.output) {
        throw new Error("Card not found");
      }
      const card = cardResult.output;

      // Check if it's a Maplerad card
      if (card.provider !== "maplerad") {
        throw new Error("This card is not a Maplerad card");
      }

      if (card.status === CardStatus.TERMINATED) {
        throw new Error("This card is already terminated");
      }

      // Update card status to terminated
      const updateResult = await CardModel.update(card.id, {
        status: CardStatus.TERMINATED,
        balance: 0,
        updated_at: utcToLocalTime(new Date())?.toISOString(),
      });

      if (updateResult.error) {
        throw new Error("Failed to terminate card");
      }

      const terminatedCard = updateResult.output;

      return {
        status: "success",
        data: {
          card: terminatedCard,
        },
      };
    } catch (err: any) {
      console.error("terminateCard error:", err);
      throw new Error("Error terminating card");
    }
  }

  /**
   * Hide a card (soft delete)
   */
  static async hideCard(cardId: string) {
    try {
      const updateResult = await CardModel.update(cardId, {
        active: false,
      });

      if (updateResult.error) {
        throw new Error("Failed to hide card");
      }

      return {
        status: "success",
        message: "Card hidden successfully",
      };
    } catch (err: any) {
      console.error("Maplerad hideCard error:", err);
      throw new Error("Error hiding card");
    }
  }
}
