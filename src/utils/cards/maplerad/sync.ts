import CardModel from "@/models/prisma/cardModel";
import TransactionModel from "@/models/prisma/transactionModel";
import UserModel from "@/models/prisma/userModel";
import CustomerModel from "@/models/prisma/customerModel";
import ExchangeRateModel from "@/models/prisma/exchangeRateModel";
import { convertFromSmallestUnit } from "./tools";
import mapleradUtils from "./index";
import { utcToLocalTime } from "@/utils/date";
import env from "@/env";
import { TransactionStatus } from "@/types";
import {
  CardStatus,
  CardTransactionStatus,
  ICard,
  SyncResult,
  SynchronizationResults,
  BulkSyncResult,
} from "./types";

// Utility functions
const getDollarRate = (countryIsoCode: string): number => {
  // Simplified exchange rate logic
  const rates: { [key: string]: number } = {
    CM: 620.5, // Cameroon
    GA: 620.5, // Gabon
    BJ: 620.5, // Benin
    CD: 2800, // Congo (higher rate)
  };
  return rates[countryIsoCode] || 620.5;
};

const isMapleradCard = (card: ICard): boolean => {
  if (!card.provider) return false;
  const provider = card.provider.toLowerCase();
  return provider === "maplerad" || provider.includes("maplerad");
};

const mapMapleradStatusToCardStatus = (mapleradStatus: string): CardStatus => {
  switch (mapleradStatus?.toLowerCase()) {
    case "active":
      return CardStatus.ACTIVE;
    case "inactive":
    case "paused":
    case "frozen":
      return CardStatus.FROZEN;
    case "terminated":
    case "closed":
      return CardStatus.TERMINATED;
    default:
      return CardStatus.ACTIVE;
  }
};

const mapMapleradTransactionTypeToLocal = (mapleradTx: any): string => {
  // Map Maplerad transaction types to local types
  if (mapleradTx.type?.toLowerCase().includes("purchase")) return "purchase";
  if (mapleradTx.type?.toLowerCase().includes("payment")) return "purchase";
  if (mapleradTx.type?.toLowerCase().includes("withdrawal")) return "withdraw";
  if (mapleradTx.type?.toLowerCase().includes("funding")) return "fund";
  if (mapleradTx.type?.toLowerCase().includes("topup")) return "fund";
  return "purchase"; // Default
};

const mapMapleradTxStatus = (status: string): CardTransactionStatus => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "success":
    case "successful":
      return CardTransactionStatus.SUCCESS;
    case "failed":
    case "failure":
      return CardTransactionStatus.FAILED;
    case "cancelled":
    case "canceled":
      return CardTransactionStatus.CANCELLED;
    case "pending":
    default:
      return CardTransactionStatus.PENDING;
  }
};

/**
 * 🔄 Synchronise les cartes d'un utilisateur avec Maplerad
 */
const syncUserCards = async (userId: string): Promise<void> => {
  const cardsResult = await CardModel.get({ user_id: userId });
  const cards: ICard[] = cardsResult.output;

  for (const card of cards) {
    if (card.provider_card_id && isMapleradCard(card)) {
      await syncCardWithMaplerad(card.provider_card_id);
    }
  }
};

/**
 * 🔄 Synchronise une carte spécifique avec Maplerad
 */
const syncCardWithMaplerad = async (mapleradCardId: string): Promise<ICard> => {
  try {
    // Récupérer les infos de la carte depuis Maplerad
    const mapleradCardResult = await mapleradUtils.getCardDetailsFromMaplerad(
      mapleradCardId
    );

    if (mapleradCardResult.error) {
      throw new Error(
        `Failed to get card details: ${mapleradCardResult.error.message}`
      );
    }

    const mapleradCard =
      mapleradCardResult.output?.data || mapleradCardResult.output;

    // Trouver la carte dans notre base
    let cardResult = await CardModel.getOne({
      provider_card_id: mapleradCardId,
    });
    let card: ICard = cardResult.output;

    if (!card) {
      throw new Error(`Card with Maplerad ID ${mapleradCardId} not found`);
    }

    // Mettre à jour le statut et le solde selon la réponse Maplerad
    const updates = {
      status: mapMapleradStatusToCardStatus(mapleradCard.status),
      balance: mapleradCard.balance || mapleradCard.available_balance || 0,
    };

    const updateResult = await CardModel.update(card.id, updates);
    if (updateResult.error) {
      throw updateResult.error;
    }
    card = { ...card, ...updates };
    // await this.cardRepository.save(card);

    // Synchroniser les transactions
    await syncCardTransactions(card);

    return card;
  } catch (error: any) {
    console.error(
      `Failed to sync card with Maplerad: ${mapleradCardId}`,
      error
    );
    throw error;
  }
};

/**
 * 🔄 Synchronise les transactions d'une carte
 */
const syncCardTransactions = async (card: ICard): Promise<void> => {
  // Récupérer les transactions des 30 derniers jours
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);

  try {
    // Récupérer l'utilisateur de la carte
    const userResult = await UserModel.getOne({ id: card.user_id });
    if (userResult.error) {
      throw userResult.error;
    }
    const user = userResult.output;

    // Récupérer et synchroniser les transactions depuis Maplerad
    const mapleradTransactions =
      await mapleradUtils.getCardTransactionsFromMaplerad(
        String(card.provider_card_id),
        fromDate
      );

    // Pour chaque transaction Maplerad, vérifier si elle existe déjà et la créer/mettre à jour
    for (const mapleradTx of mapleradTransactions) {
      const existingTxResult = await TransactionModel.getOne({
        order_id: mapleradTx.transactionId,
      });
      const existingTx = existingTxResult.output;

      if (!existingTx) {
        // ✅ CORRECTION: Mapper correctement les types Maplerad vers types locaux
        const localType = mapMapleradTransactionTypeToLocal(mapleradTx);

        // Créer une nouvelle transaction
        const xafAmount = Math.trunc(
          Math.abs(Number(mapleradTx.amount)) *
            getDollarRate(user?.country_iso_code!)
        );
        const usdAmount = Math.abs(Number(mapleradTx.amount));

        // Get company_id from user
        const companyId = user?.company_id || "default-company";

        const transactionData = {
          amount: xafAmount,
          currency: "XAF",
          category: "card",
          type: localType,
          user_id: String(card.user_id),
          card_id: String(card.id),
          company_id: companyId,
          order_id: mapleradTx.transactionId,
          provider: "maplerad",
          status: mapMapleradTxStatus(mapleradTx.status),
          description: mapleradTx.merchantName || "",
          created_at: utcToLocalTime(mapleradTx.createdAt),
        };

        const transactionSkrResult = await TransactionModel.create(
          transactionData
        );
        const transactionSkr = transactionSkrResult.output;
        //   const transaction = this.cardTransactionRepository.create({
        //     card,
        //     amount:Math.abs(ma pleradTx.amount),
        //     type: localType,
        //     status: this.mapMapleradTxStatus(mapleradTx.status),
        //     description:
        //       mapleradTx.merchantName ||
        //       this.sanitizeTransactionDescription(mapleradTx.description),
        //     merchantName: mapleradTx.merchantName,
        //     merchantCategory: mapleradTx.merchantCategory,
        //     location: mapleradTx.location,
        //     externalReference: mapleradTx.transactionId,
        //     reference: this.generateReference(),
        //     createdAt: new Date(mapleradTx.createdAt),
        //     completedAt: mapleradTx.completedAt
        //       ? new Date(mapleradTx.completedAt)
        //       : undefined,
        //   });

        //   await this.cardTransactionRepository.save(transaction);
      } else if (existingTx.status === CardTransactionStatus.PENDING) {
        // Mettre à jour le statut si la transaction est en attente

        let updates: any = {
          status: mapMapleradTxStatus(mapleradTx.status),
        };
        if (mapleradTx.completedAt) {
          // existingTx.completedAt = new Date(mapleradTx.completedAt);
          updates.updated_at = utcToLocalTime(mapleradTx.completedAt);
        }
        const updatedTrxSkrResult = await TransactionModel.update(
          existingTx.id,
          updates
        );
        //   await this.cardTransactionRepository.save(existingTx);
      }
    }

    console.debug(`Synchronisation transactions Maplerad complétée`, {
      cardId: card.id,
      mapleradCardId: card.provider_card_id,
      transactionsProcessed: mapleradTransactions.length,
    });
  } catch (error: any) {
    console.error(`Erreur synchronisation transactions Maplerad`, {
      cardId: card.id,
      mapleradCardId: card.provider_card_id,
      error: error?.message,
    });
  }
};

/**
 * 🔄 Synchronise toutes les cartes Maplerad actives
 */
const syncAllActiveMapleradCards = async (): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> => {
  const activeCardsResult = await CardModel.get({ status: CardStatus.ACTIVE });
  const activeCards = activeCardsResult.output;
  //   where: { status: CardStatus.ACTIVE },
  //   select: [
  //     "id",
  //     "midenCardId",
  //     "userId",
  //     "status",
  //     "balance",
  //     "currency",
  //     "cardBrand",
  //     "cardClass",
  //     "cardType",
  //     "firstSix",
  //     "lastFour",
  //     "nameOnCard",
  //     "isPhysical",
  //     "terminateDate",
  //     "createdAt",
  //     "updatedAt",
  //   ],
  // });

  // Filtrer seulement les cartes Maplerad
  const mapleradCards = activeCards.filter((card: any) => isMapleradCard(card));

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const card of mapleradCards) {
    try {
      await syncCardWithMaplerad(card.provider_card_id);
      synced++;
    } catch (error: any) {
      failed++;
      errors.push(`Card ${card.provider_card_id}: ${error.message}`);
    }
  }

  console.log(`Synchronisation cartes Maplerad terminée`, {
    total: mapleradCards.length,
    synced,
    failed,
    errors: errors.length,
  });

  return { synced, failed, errors };
};

/**
 * 📊 Récupère les statistiques de synchronisation Maplerad
 */
const getSyncStats = async (): Promise<{
  totalMapleradCards: number;
  activeMapleradCards: number;
  lastSyncStatus: string;
  environment: string;
}> => {
  const allCardsResult = await CardModel.get({
    // status:CardStatus.ACTIVE,
    provider: "maplerad",
  });
  const mapleradCards = allCardsResult.output;

  // const mapleradCards = allCards.filter((card:any) => isMapleradCard(card));
  const activeMapleradCards = mapleradCards.filter(
    (card: any) => card.status === CardStatus.ACTIVE
  );

  return {
    totalMapleradCards: mapleradCards.length,
    activeMapleradCards: activeMapleradCards.length,
    lastSyncStatus: "not_implemented", // TODO: Tracker le dernier statut de sync
    environment: env.NODE_ENV,
  };
};

const mapleradSynchronizationService = {
  syncUserCards,
  syncAllActiveMapleradCards,
  syncCardTransactions,
  syncCardWithMaplerad,
};
export default mapleradSynchronizationService;
