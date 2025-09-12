import CardModel from "@/models/prisma/cardModel";
import mapleradUtils from "@/utils/cards/maplerad";
import { CardStatus } from "@/utils/cards/maplerad/types";
import { Card } from "@prisma/client";

// Use Prisma Card type
type ICard = Card;

/**
 * Convert amount from smallest currency unit (e.g., cents to dollars)
 */
const convertFromSmallestUnit = (
  amount: number,
  currency: string = "USD"
): number => {
  // For USD and most currencies, amounts are in cents (divide by 100)
  // For some currencies like JPY, it might be different, but we'll use 100 as default
  const divisor = currency === "JPY" ? 1 : 100;
  return Math.round((amount / divisor) * 100) / 100;
};

/**
 * 🔍 Détecte si une carte est de type Maplerad
 */
const checkIfItsMapleradCard = (card: Card): boolean => {
  if (!card.provider) {
    console.warn(`⚠️ Carte ${card.id} sans cardType défini`, {
      cardId: card.id,
      provider_card_id: card.provider_card_id,
    });
    return false;
  }

  const cardType = card.provider.toLowerCase();
  const isMapleradType =
    cardType === "maplerad" || cardType.includes("maplerad");

  console.debug(`🔍 Vérification cardType`, {
    cardId: card.id,
    originalCardType: card.provider,
    normalizedCardType: cardType,
    isMapleradType,
  });

  return isMapleradType;
};

/**
 * 🗂️ Mappe les statuts Maplerad vers nos statuts locaux
 */
const mapMapleradStatus = (mapleradStatus: string): CardStatus => {
  switch (mapleradStatus?.toLowerCase()) {
    case "active":
      return CardStatus.ACTIVE;
    case "inactive":
    case "paused":
      return CardStatus.FROZEN; // Use FROZEN instead of BLOCKED
    case "terminated":
    case "closed":
      return CardStatus.TERMINATED;
    default:
      return CardStatus.ACTIVE; // Par défaut
  }
};

export interface CardMetadataUpdate {
  cardId: string;
  previousBalance: number;
  newBalance: number;
  previousStatus: CardStatus;
  newStatus: CardStatus;
  updated: boolean;
  updateSource:
    | "sudo_card_details"
    | "sudo_account_balance"
    | "maplerad_card_details";
}

export interface SyncResult {
  cardId: string;
  providerCardId: string;
  status: string;
  message: string;
  updated: boolean;
  oldData: {
    status: string;
    balance: number;
  };
  newData: {
    status: string;
    balance: number;
  };
}
export interface SynchronizationResults {
  totalCards: number;
  synchronizedCards: number;
  failedCards: number;
  results: Array<SyncResult>;
}

/**
 * 🔄 Synchronise les métadonnées d'une carte spécifique
 * ✅ NOUVEAU: Support Maplerad + Sudo selon le type de carte
 */
const syncCardMetadata = async (
  // cardId: string
  card: ICard
): Promise<SyncResult> => {
  // CardMetadataUpdate
  const cardId = card.id;
  // const cardResult = await CardModel.getOne({ id: cardId });
  // const card = cardResult.output;

  const cardSyncResult: SyncResult = {
    cardId: String(card.id),
    providerCardId: String(card.provider_card_id),
    status: "",
    message: "",
    updated: false,
    oldData: {
      status: "",
      balance: 0,
    },
    newData: {
      status: "",
      balance: 0,
    },
  };

  if (!card || !card.provider_card_id) {
    cardSyncResult.status = "failed";
    cardSyncResult.message = `Carte ${cardId} non trouvée ou sans ID provider`;
    cardSyncResult.updated = false;
    return cardSyncResult;
    // throw new Error(`Carte ${cardId} non trouvée ou sans ID provider`);
  }

  const previousBalance = Number(card.balance) || 0;
  const previousStatus = card.status as CardStatus;
  const isMapleradCard = checkIfItsMapleradCard(card);

  // ✅ DEBUG: Afficher les détails de détection
  console.debug(`🔍 DÉTECTION PROVIDER pour carte ${cardId}`, {
    cardId: card.id,
    provider_card_id: card.provider_card_id,
    isMapleradDetected: isMapleradCard,
    providerDetected: isMapleradCard ? "Maplerad" : "Sudo",
  });

  let currentBalance = previousBalance;
  let newStatus: CardStatus = previousStatus;
  let updateSource: CardMetadataUpdate["updateSource"] =
    "maplerad_card_details";

  try {
    if (isMapleradCard) {
      // 🔵 MAPLERAD: Récupérer les détails via l'API Maplerad
      console.debug(
        `🔵 Synchronisation carte Maplerad ${card.provider_card_id}`,
        {
          cardId: card.id,
          provider: "Maplerad",
        }
      );

      const mapleradResult = await mapleradUtils.getCardDetailsFromMaplerad(
        card.provider_card_id
      );
      if (mapleradResult.error) {
        cardSyncResult.status = "failed";
        cardSyncResult.message = `Erreur récupération détails carte: ${mapleradResult.error.message}`;
        cardSyncResult.oldData = {
          status: previousStatus,
          balance: previousBalance,
        };
        cardSyncResult.newData = {
          status: previousStatus,
          balance: previousBalance,
        };
        cardSyncResult.updated = false;
        return cardSyncResult;
        // throw mapleradResult.error;
      }
      const mapleradResponse = mapleradResult.output;
      const mapleradData = mapleradResponse?.data || mapleradResponse;

      // Extraire balance et statut depuis Maplerad
      currentBalance = convertFromSmallestUnit(
        mapleradData?.balance || 0,
        mapleradData?.currency || "USD"
      );
      newStatus = mapMapleradStatus(mapleradData?.status) || previousStatus;
      updateSource = "maplerad_card_details";

      console.debug(`✅ Données Maplerad récupérées`, {
        cardId: card.id,
        mapleradCardId: card.provider_card_id,
        previousBalance,
        currentBalance,
        previousStatus,
        newStatus,
        mapleradStatus: mapleradData?.status,
        balanceInSmallestUnit: mapleradData?.balance,
      });
    }

    // 4. Vérifier s'il y a des changements
    const balanceChanged = Math.abs(currentBalance - previousBalance) > 0.01;
    const statusChanged = newStatus !== previousStatus;
    const hasChanges = balanceChanged || statusChanged;

    // 5. Mettre à jour si nécessaire
    if (hasChanges) {
      const updateData: Partial<ICard> = {};

      if (balanceChanged) {
        updateData.balance = currentBalance as any; // Prisma will handle the conversion
      }

      if (statusChanged) {
        updateData.status = newStatus as any;
      }

      const updateResult = await CardModel.update({ id: card.id }, updateData);

      // if (updateResult.error) {
      //   throw updateResult.error;
      // }
      if (updateResult.error) {
        cardSyncResult.status = "failed";
        cardSyncResult.message = `Erreur mise à jour BD locale: ${updateResult.error.message}`;
        cardSyncResult.oldData = {
          status: previousStatus,
          balance: previousBalance,
        };
        cardSyncResult.newData = {
          status: previousStatus,
          balance: previousBalance,
        };
        cardSyncResult.updated = false;
        // failedCount++;
        return cardSyncResult;
        // throw updateResult.error;
      }

      console.debug(`✅ Métadonnées carte mises à jour`, {
        cardId: card.id,
        sudoCardId: card.provider_card_id,
        balanceChanged: balanceChanged
          ? `${previousBalance} → ${currentBalance}`
          : false,
        statusChanged: statusChanged
          ? `${previousStatus} → ${newStatus}`
          : false,
        updateSource,
      });
    }

    cardSyncResult.status = "success";
    cardSyncResult.message = hasChanges
      ? "Carte synchronisée avec succès"
      : "Carte déjà à jour";
    cardSyncResult.oldData = {
      status: previousStatus,
      balance: previousBalance,
    };
    cardSyncResult.newData = {
      status: newStatus,
      balance: currentBalance,
    };
    cardSyncResult.updated = false;

    return cardSyncResult;
  } catch (error: any) {
    console.error(`❌ Erreur sync métadonnées carte ${cardId}`, {
      error: error?.message,
      sudoCardId: card.provider_card_id,
    });
    throw error;
  }
};

export interface BulkSyncResult {
  totalCards: number;
  updatedCards: number;
  skippedCards: number;
  failedCards: number;
  updates: SyncResult[];
  errors: Array<{ cardId: string; error: string }>;
}
/**
 * 📊 Synchronise toutes les cartes d'un utilisateur
 */
const syncCustomerCardsMetadata = async (
  customerId: string
): Promise<BulkSyncResult> => {
  const cardsResult = await CardModel.get({
    customer_id: customerId,
    provider: "maplerad",
    active: true,
  });
  if (cardsResult.error) {
    console.error(
      "❌ Erreur récupération cartes utilisateur:",
      cardsResult.error
    );
    throw cardsResult.error;
  }
  const customerCards = cardsResult.output || [];

  const result: BulkSyncResult = {
    totalCards: customerCards.length,
    updatedCards: 0,
    skippedCards: 0,
    failedCards: 0,
    updates: [],
    errors: [],
  };

  if (customerCards.length > 0) {
    for (const card of customerCards) {
      if (!card.provider_card_id) {
        result.skippedCards++;
        continue;
      }

      try {
        const updateResult = await syncCardMetadata(card);
        result.updates.push(updateResult);

        if (updateResult.updated) {
          result.updatedCards++;
        }
        if (updateResult.status === "failed") {
          result.failedCards++;
          result.errors.push({
            cardId: card.id,
            error: updateResult.message,
          });
        }
      } catch (error: any) {
        result.failedCards++;
        result.errors.push({
          cardId: card.id,
          error: error.message,
        });
      }
    }
  }

  console.log(`🔄 Sync métadonnées utilisateur ${customerId} terminé`, {
    totalCards: result.totalCards,
    updatedCards: result.updatedCards,
    skippedCards: result.skippedCards,
    failedCards: result.failedCards,
  });

  const synchronizationResults: SynchronizationResults = {
    totalCards: result.totalCards,
    synchronizedCards: result.updatedCards,
    failedCards: result.failedCards,
    results: result.updates,
  };

  return result;
};

/**
 * 🚀 Middleware pour GET /api/cards - Synchronise avant de retourner
 */
const syncAndGetUserCards = async (customerId: string): Promise<ICard[]> => {
  // 1. Synchroniser les métadonnées en arrière-plan (best effort)
  try {
    await syncCustomerCardsMetadata(customerId);
  } catch (error: any) {
    console.warn(`⚠️ Sync métadonnées échouée, retour données locales`, {
      customerId,
      error: error?.message,
    });
  }

  // 2. Retourner les cartes (maintenant à jour)
  const cardsResult = await CardModel.get({
    customer_id: customerId,
    active: true,
  });
  const cards = cardsResult.output;

  return cards;
};

/**
 * 📅 Extrait la date d'expiration depuis les données Sudo
 */
const extractExpiryDate = (cardData: any): string | null => {
  if (!cardData) return null;

  // Sudo peut retourner la date d'expiration sous différents formats
  if (cardData.expiryDate) {
    return cardData.expiryDate;
  }

  if (cardData.expiry) {
    return cardData.expiry;
  }

  if (cardData.expirationDate) {
    return cardData.expirationDate;
  }

  // Format MM/YY ou MM/YYYY
  if (cardData.expiryMonth && cardData.expiryYear) {
    const month = String(cardData.expiryMonth).padStart(2, "0");
    const year = String(cardData.expiryYear);
    return `${month}/${year.length === 4 ? year.slice(-2) : year}`;
  }

  return null;
};

const cardMetadataSyncService = {
  syncAndGetUserCards,
  syncCardMetadata,
  syncCustomerCardsMetadata,
};

export default cardMetadataSyncService;
