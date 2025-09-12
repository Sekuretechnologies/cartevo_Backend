import {
  CardPaymentMethodType,
  CardTransactionStatus,
  CardTransactionType,
  generateFeeReference,
  isAMapleradCard,
  NotificationType,
  TransactionType,
} from "@/utils/transactions/card/maplerad/tools";
import cardFeeOptimizedService from "./services/cardFeeService";
import {
  CardModel,
  ICard,
  ITransaction,
  IUser,
  NotificationModel,
  TransactionModel,
  UserModel,
} from "@/models";
import mapleradUtils from "@/utils/transactions/card/maplerad";
import { utcToLocalTime } from "@/utils/dateUtils";
import mapleradWalletService from "./walletService";
import { notificationQueueService } from "@/services/queues";
import { CurrencyManager } from "@/utils/shared/currencyManager";
import { DebtType } from "@/utils/shared/debtManager";
import { SimplifiedDebtManager } from "@/utils/shared/simplifiedDebtManager";

export interface DebtCreationContext {
  cardId: string;
  userId: string;
  sudoTransactionId: string;
  amount: number;
  currency: string;
  merchantName?: string;
  merchantCategory?: string;
  location?: string;
  terminal?: any;
  transactionMetadata?: any;
  isFailedPayment: boolean;
  localTransaction?: any;
  localCurrency?: string;
}

export interface FeeCollectionResult {
  success: boolean;
  method: "card" | "wallet" | "debt" | "none";
  feeAmount: number;
  feeAmountXaf: number;
  debtCreated?: PaymentDebt;
  cardTransactionId?: string;
  walletTransactionId?: string;
  error?: string;
  reason?: string;
}

export enum PaymentDebtStatus {
  PENDING = "pending",
  RECOVERED = "recovered",
  CANCELLED = "cancelled",
}
export interface PaymentDebt {
  id: string;
  userId: string;
  cardId: string;
  amountUsd: number;
  status: PaymentDebtStatus;
  originalPaymentInfo: any;
  midenTransactionId: string;
  isPaymentSuccess: boolean;
  recoveredAt: Date;
  recoveryTransactionId: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}
/**
 * 💰 Collecte les frais de paiement selon la priorité : carte → wallet → dette
 * ✅ NOUVELLE RÈGLE : Frais appliqués uniquement si le montant de la transaction réussie est supérieur à 1
 */
const collectPaymentFee = async (
  context: DebtCreationContext
): Promise<FeeCollectionResult> => {
  console.log(`💰 Collecte des frais pour paiement`, {
    cardId: context.cardId,
    userId: context.userId,
    amount: context.amount,
    currency: context.currency,
    merchantName: context.merchantName,
  });

  // ✅ NOUVELLE RÈGLE : Vérifier si le montant est supérieur à 1
  if (context.amount <= 1) {
    console.log(`✅ Frais non appliqués - Montant trop faible`, {
      cardId: context.cardId,
      userId: context.userId,
      amount: context.amount,
      currency: context.currency,
      reason: "Montant de transaction <= 1",
    });

    return {
      success: true,
      method: "none",
      feeAmount: 0,
      feeAmountXaf: 0,
      reason: "Montant de transaction <= 1",
    };
  }

  try {
    // 1. Calculer les frais selon les tranches configurées
    const feeCalculation =
      await cardFeeOptimizedService.calculateCardOperationFee(
        CardTransactionType.PAYMENT_SUCCESS_FEE,
        context.amount,
        context.currency as any,
        "CM"
      );

    const feeAmountUsd = feeCalculation.feeUsd;
    const feeAmountXaf = feeCalculation.feeXaf;

    console.debug(`📊 Frais calculés`, {
      feeAmountUsd,
      feeAmountXaf,
      rangeUsed: (feeCalculation as any).rangeUsed,
      exchangeRate: feeCalculation.exchangeRate,
    });

    // 2. Récupérer la carte
    const cardResult = await CardModel.getOne({
      provider_card_id: context.cardId,
    });
    const card: ICard = cardResult.output;

    if (!card) {
      throw new Error(`Carte ${context.cardId} non trouvée`);
    }

    const userResult = await UserModel.getOne({
      id: card.user_id,
    });
    const user = userResult.output;

    const countryCode = user.country_iso_code?.substring(0, 2);
    const localCurrency = CurrencyManager.getCurrencySymbol(
      user.country_iso_code
    );
    const localFeeAmount = CurrencyManager.getLocalAmount(
      feeAmountUsd,
      countryCode!
    );

    // 3. Tentative 1 : Débiter la carte via API
    try {
      console.log(`🚀 TENTATIVE RETRAIT CARTE`, {
        cardId: context.cardId,
        feeAmountUsd,
        cardBalance: card.balance_usd,
        cardType: card.brand,
      });

      return await collectFromCard(
        card,
        feeAmountUsd,
        feeAmountXaf,
        localFeeAmount,
        localCurrency,
        context
      );
    } catch (cardError: any) {
      console.error(`❌ RETRAIT CARTE ÉCHOUÉ - FALLBACK WALLET`, {
        cardId: context.cardId,
        feeAmountUsd,
        feeAmountXaf,
        error: cardError.message,
        cardBalance: card.balance_usd,
      });
      // Continuer vers wallet si retrait carte échoue
    }

    // 4. Tentative 2 : Débiter le wallet
    // ✅ SÉCURITÉ: Vérifier qu'aucun retrait n'a été fait sur la carte avant de débiter le wallet
    if (isAMapleradCard(card)) {
      try {
        const currentBalance = await mapleradUtils.getRealCardBalance(
          String(card.provider_card_id)
        );
        const balanceBefore = Number(card.balance_usd) || 0;
        const actualDebit = balanceBefore - currentBalance;

        console.warn(`🔍 Vérification avant fallback wallet`, {
          cardId: context.cardId,
          balanceBefore,
          currentBalance,
          actualDebit,
          feeAmountUsd,
          hasBeenDebited: Math.abs(actualDebit - feeAmountUsd) < 0.05,
        });

        // Si l'argent a déjà été débité de la carte, ne pas débiter le wallet
        if (Math.abs(actualDebit - feeAmountUsd) < 0.05) {
          console.warn(
            `⚠️ PRÉLÈVEMENT DÉJÀ EFFECTUÉ sur la carte - Pas de fallback wallet`,
            {
              cardId: context.cardId,
              actualDebit,
              feeAmountUsd,
              reason: "Éviter double prélèvement",
            }
          );

          // Créer la transaction pour refléter le prélèvement réussi
          const feeTransactionResult = await TransactionModel.createTransaction(
            {
              status: CardTransactionStatus.COMPLETED,
              order_id: `fee-recovered-${Date.now()}`,
              reference: generateFeeReference(),
              description: `Frais de paiement prélevés - ${
                context.merchantName || "Transaction"
              }`,
              amount_xaf: feeAmountXaf,
              amount_usd: feeAmountUsd,
              amount_user_currency: localFeeAmount,
              currency: localCurrency,
              fee_xaf: 0,
              fee_usd: 0,
              category: "card",
              type: CardTransactionType.PAYMENT_SUCCESS_FEE,
              user_id: String(card.user_id),
              card_id: String(card.id),
              // old_balance_xaf: user.balance_xaf,
              // new_balance_xaf: new_balance_xaf,
              // card_old_balance_usd: data.balance,
              // card_new_balance_usd: 0,
              merchant: {
                name: context.merchantName,
              },
              country: user?.country,
              country_iso_code: user?.country_iso_code,
              created_at: utcToLocalTime(new Date())?.toISOString(),
              updated_at: utcToLocalTime(new Date())?.toISOString(),
            }
          );
          const feeTransaction = feeTransactionResult.output;

          return {
            success: true,
            method: "card",
            feeAmount: feeAmountUsd,
            feeAmountXaf,
            cardTransactionId: feeTransaction.id,
          };
        }
      } catch (error: any) {
        console.warn(
          `⚠️ Impossible de vérifier le solde avant fallback wallet`,
          {
            cardId: context.cardId,
            error: error.message,
          }
        );
      }
    }

    try {
      return await collectFromWallet(
        String(card.user_id),
        feeAmountUsd,
        feeAmountXaf,
        context
      );
    } catch (walletError: any) {
      console.warn(`❌ Wallet insuffisant`, {
        userId: String(card.user_id),
        feeAmountXaf,
        error: walletError.message,
      });

      // 5. Dernier recours : Créer une dette
      return await createDebt(
        user,
        card,
        localFeeAmount,
        localCurrency,
        feeAmountUsd,
        feeAmountXaf,
        context
      );
    }
  } catch (error: any) {
    console.error(`❌ Erreur lors de la collecte des frais`, {
      cardId: context.cardId,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      method: "debt",
      feeAmount: 0,
      feeAmountXaf: 0,
      error: error.message,
    };
  }
};

// Fonction helper pour vérifier si une carte est active pour la déduction de frais
const isCardActiveForFeeDeduction = (card: any): boolean => {
  if (!card || !card.status) {
    return false;
  }

  const inactiveStatuses = ["TERMINATED", "DEACTIVATED"];

  // Une carte n'est active pour les frais d'échec que si elle n'est pas dans les statuts inactifs
  return !inactiveStatuses.includes(card.status.toUpperCase());
};

/**
 * 💳 Collecte depuis la carte via API appropriée (Maplerad ou Sudo)
 * ✅ CORRECTIONS APPLIQUÉES : Vérification solde, validation robuste, vérification post-retrait
 */
const collectFromCard = async (
  card: ICard,
  feeAmountUsd: number,
  feeAmountXaf: number,
  localFeeAmount: number,
  localCurrency: string,
  context: DebtCreationContext
): Promise<FeeCollectionResult> => {
  const isMapleradCard = isAMapleradCard(card);
  const providerName = isMapleradCard ? "Maplerad" : "Sudo";

  if (!isCardActiveForFeeDeduction(card)) {
    console.log(
      `Carte ${
        card?.status || "UNKNOWN"
      } inactive - Pas de déduction de frais appliquée`
    );
    throw new Error(`Carte inactive - Pas de déduction de frais appliquée`); // Retourner false pour indiquer que les frais n'ont pas été déduits
  }

  // ✅ DEBUG CRITIQUE: Vérifier que cette méthode est bien appelée
  console.log(`🚀 DÉBUT COLLECTFROMCARD`, {
    cardId: context.cardId,
    feeAmountUsd,
    isMapleradCard,
    providerName,
    cardBalance: card.balance_usd,
  });

  // ✅ NOUVELLE VÉRIFICATION : Maplerad rejette les montants < 1$
  if (isMapleradCard && feeAmountUsd < 1) {
    console.warn(`⚠️ Montant trop faible pour Maplerad`, {
      cardId: context.cardId,
      feeAmountUsd,
      provider: providerName,
      reason: "Maplerad rejette les montants < 1$",
    });
    throw new Error(
      `Montant ${feeAmountUsd}$ trop faible pour Maplerad (minimum: 1$)`
    );
  }

  // ✅ NOUVEAU: Vérifier le solde réel depuis Maplerad API
  if (isMapleradCard && isCardActiveForFeeDeduction(card)) {
    // ✅ CRITIQUE : Récupérer le solde RÉEL depuis Maplerad API
    let realBalance: number;
    try {
      realBalance = await mapleradUtils.getRealCardBalance(
        String(card.provider_card_id)
      );
    } catch (error: any) {
      console.error(`❌ Impossible de récupérer le solde réel Maplerad`, {
        cardId: context.cardId,
        provider_card_id: card.provider_card_id,
        error: error.message,
      });
      throw new Error(`Erreur récupération solde réel: ${error.message}`);
    }

    const localBalance = Number(card.balance_usd) || 0;

    console.log("localBalance", localBalance);

    console.log(`🔍 Vérification solde carte Maplerad (RÉEL vs LOCAL)`, {
      cardId: context.cardId,
      provider_card_id: card.provider_card_id,
      localBalance,
      realBalance,
      difference: Math.abs(localBalance - realBalance),
      feeAmountUsd,
      minimumRequired: 1,
    });

    // ✅ NOUVEAU : Correction automatique si différence significative
    if (Math.abs(localBalance - realBalance) > 0.01) {
      console.warn(`⚠️ Incohérence solde détectée - Mise à jour automatique`, {
        cardId: context.cardId,
        localBalance,
        realBalance,
        difference: Math.abs(localBalance - realBalance),
        action: "UPDATE_LOCAL_BALANCE",
      });

      // Mettre à jour le solde local ET l'objet card
      //   await this.cardRepository.update(card.id, { balance: realBalance });
      await CardModel.updateCard(card.id, { balance_usd: realBalance });
      card.balance_usd = realBalance; // ✅ CORRECTION: Mettre à jour l'objet card aussi
    }

    // ✅ UTILISER LE SOLDE RÉEL pour la vérification
    if (realBalance < 1) {
      console.warn(`⚠️ Solde réel insuffisant pour retrait Maplerad`, {
        cardId: context.cardId,
        provider_card_id: card.provider_card_id,
        realBalance,
        minimumRequired: 1,
        feeAmountUsd,
        reason: "Solde réel < 1$ minimum",
      });
      throw new Error(
        `Solde réel insuffisant: ${realBalance.toFixed(
          2
        )}$ disponible, minimum 1$ requis`
      );
    }
  }

  console.log(`💳 Retrait via API ${providerName}`, {
    cardId: context.cardId,
    provider_card_id: card.provider_card_id,
    feeAmountUsd,
    feeAmountXaf,
    brand: card.brand,
    provider: providerName,
    cardBalance: isMapleradCard ? Number(card.balance_usd) : "N/A",
  });

  try {
    let withdrawalResponse: any;
    const balanceBefore = isMapleradCard ? Number(card.balance_usd) : 0;

    if (isMapleradCard) {
      // 1a. Utiliser l'API Maplerad pour les cartes Maplerad
      console.debug(`🟦 Appel API Maplerad - withdrawFromCard`, {
        cardId: card.provider_card_id,
        amount: feeAmountUsd,
        balanceBefore,
      });

      try {
        const withdrawalResult = await mapleradUtils.withdrawFromCard(
          String(card.provider_card_id), // ID Maplerad de la carte
          feeAmountUsd // Montant en USD
        );
        if (withdrawalResult.error) {
          throw withdrawalResult.error;
        }
        withdrawalResponse = withdrawalResult.output;
        console.log(`✅ MAPLERAD WITHDRAW - RÉPONSE REÇUE`, {
          cardId: card.provider_card_id,
          hasResponse: !!withdrawalResponse,
          responseKeys: withdrawalResponse
            ? Object.keys(withdrawalResponse)
            : null,
          // ✅ DEBUG CRITIQUE: Structure complète de la réponse
          fullResponse: JSON.stringify(withdrawalResponse, null, 2),
          status: withdrawalResponse?.status,
          message: withdrawalResponse?.message,
          dataId: withdrawalResponse?.data?.id,
          hasData: !!withdrawalResponse?.data,
          hasError: !!withdrawalResponse?.error,
        });
      } catch (withdrawError: any) {
        console.error(`❌ MAPLERAD WITHDRAW - EXCEPTION`, {
          cardId: card.provider_card_id,
          error: withdrawError.message,
          stack: withdrawError.stack,
        });
        throw withdrawError; // Re-throw l'erreur pour que le catch parent la récupère
      }
    }

    console.debug(`🔄 Réponse ${providerName} withdrawal`, {
      cardId: context.cardId,
      response: withdrawalResponse,
      feeAmountUsd,
      provider: providerName,
    });

    // ✅ AMÉLIORÉ: Vérification plus robuste du succès
    let isWithdrawalSuccessful = false;
    let withdrawalStatus = "failed";

    if (isMapleradCard) {
      // ✅ SIMPLE: Vérification directe selon la réponse Maplerad
      // Format de réponse Maplerad : { status: true, message: "Successfully debited card", data: { id: "..." } }
      isWithdrawalSuccessful =
        withdrawalResponse?.status === true && withdrawalResponse?.data?.id;

      withdrawalStatus = isWithdrawalSuccessful ? "completed" : "failed";

      // ✅ SIMPLE: Log du résultat + DEBUG CRITIQUE
      console.log(`🔍 RETRAIT CARTE - RÉSULTAT CRITIQUE`, {
        cardId: context.cardId,
        status: withdrawalResponse?.status,
        message: withdrawalResponse?.message,
        transactionId: withdrawalResponse?.data?.id,
        isSuccessful: isWithdrawalSuccessful,
        // ✅ DEBUG: Structure complète pour identifier le problème
        fullResponse: JSON.stringify(withdrawalResponse, null, 2),
      });
    } else {
      // ✅ SUDO: Vérification multiple (même logique que la route)
      const hasErrorMessage =
        (withdrawalResponse as any)?.message
          ?.toLowerCase()
          ?.includes("failed") ||
        (withdrawalResponse as any)?.message?.toLowerCase()?.includes("error");

      isWithdrawalSuccessful =
        !hasErrorMessage &&
        (withdrawalResponse as any)?.statusCode === 200 &&
        (withdrawalResponse?.responseCode === "00" ||
          (withdrawalResponse?.responseCode === "09" &&
            withdrawalResponse?.data?.status === "pending"));

      withdrawalStatus = withdrawalResponse?.data?.status || "failed";

      console.debug(`🔍 Sudo withdrawal result`, {
        cardId: context.cardId,
        hasErrorMessage,
        statusCode: (withdrawalResponse as any)?.statusCode,
        responseCode: withdrawalResponse?.responseCode,
        dataStatus: withdrawalResponse?.data?.status,
        isSuccessful: isWithdrawalSuccessful,
        status: withdrawalStatus,
      });
    }

    // ✅ NOUVEAU: Vérification post-retrait pour Maplerad
    if (isWithdrawalSuccessful && isMapleradCard) {
      try {
        // Récupérer le nouveau solde de la carte
        // const updatedCard = await this.cardRepository.findOne({
        //   where: { id: card.id },
        // });
        const updatedCardResult = await CardModel.getOne({
          id: card.id,
        });
        const updatedCard: ICard = updatedCardResult.output;

        const balanceAfter = Number(updatedCard.balance_usd);
        const actualDebit = balanceBefore - balanceAfter;

        console.debug(`🔍 Vérification post-retrait Maplerad`, {
          cardId: context.cardId,
          balanceBefore,
          balanceAfter,
          expectedDebit: feeAmountUsd,
          actualDebit,
          difference: Math.abs(actualDebit - feeAmountUsd),
        });

        // Tolérance de 0.01$ pour les arrondis
        if (Math.abs(actualDebit - feeAmountUsd) > 0.01) {
          console.warn(`⚠️ Incohérence de solde détectée`, {
            cardId: context.cardId,
            expectedDebit: feeAmountUsd,
            actualDebit,
            balanceBefore,
            balanceAfter,
            difference: Math.abs(actualDebit - feeAmountUsd),
            reason: "Le débit réel ne correspond pas au montant attendu",
          });

          // Considérer comme échec si le débit ne correspond pas
          isWithdrawalSuccessful = false;
          withdrawalStatus = "failed";
        }
      } catch (error: any) {
        console.warn(`⚠️ Impossible de vérifier le solde post-retrait`, {
          cardId: context.cardId,
          error: error.message,
          reason: "Erreur lors de la récupération du solde mis à jour",
        });
        // En cas d'erreur de vérification, on considère comme échec par sécurité
        isWithdrawalSuccessful = false;
        withdrawalStatus = "failed";
      }
    }

    if (!isWithdrawalSuccessful) {
      console.error(
        `❌ Retrait ${providerName} échoué - AUCUNE TRANSACTION CRÉÉE`,
        {
          cardId: context.cardId,
          feeAmountUsd,
          cardBalance: isMapleradCard ? balanceBefore : "N/A",
          responseStatus: withdrawalResponse?.status,
          responseMessage: (withdrawalResponse as any)?.message,
          responseError: (withdrawalResponse as any)?.error,
          provider: providerName,
          withdrawalStatus,
          action: "NO_TRANSACTION_CREATED",
        }
      );

      // ✅ CORRECTION: Message d'erreur plus précis
      const errorMessage =
        (withdrawalResponse as any)?.error ||
        (withdrawalResponse as any)?.message ||
        "Erreur inconnue";

      throw new Error(`Retrait carte ${providerName} échoué: ${errorMessage}`);
    }

    const userResult = await UserModel.getOne({
      id: card.user_id,
    });
    const user = userResult.output;

    // ✅ CORRECTION: Créer la transaction UNIQUEMENT si le retrait a réussi
    const feeTransactionResult = await TransactionModel.createTransaction({
      status: CardTransactionStatus.COMPLETED,
      order_id: isMapleradCard
        ? withdrawalResponse.data?.id || `card-${Date.now()}` // ID du withdraw
        : withdrawalResponse.data?.id || `card-${Date.now()}`, // ID du transfer

      reference: generateFeeReference(),
      description: `Frais de paiement prélevés - ${
        context.merchantName || "Transaction"
      }`,
      amount_xaf: feeAmountXaf,
      amount_usd: feeAmountUsd,
      amount_user_currency: localFeeAmount,
      currency: localCurrency,
      fee_xaf: 0,
      fee_usd: 0,
      category: "card",
      type: CardTransactionType.PAYMENT_SUCCESS_FEE,
      user_id: String(card.user_id),
      card_id: String(card.id),
      // old_balance_xaf: user.balance_xaf,
      // new_balance_xaf: new_balance_xaf,
      // card_old_balance_usd: data.balance,
      // card_new_balance_usd: 0,
      merchant: {
        name: context.merchantName,
      },
      country: user?.country,
      country_iso_code: user?.country_iso_code,
      created_at: utcToLocalTime(new Date())?.toISOString(),
      updated_at: utcToLocalTime(new Date())?.toISOString(),
    });
    const feeTransaction = feeTransactionResult.output;

    console.log(`✅ Frais collectés depuis la carte via ${providerName}`, {
      cardId: context.cardId,
      feeAmountUsd,
      feeAmountXaf,
      transactionId: feeTransaction.id,
      externalTransferId: withdrawalResponse.data?.id,
      status: "COMPLETED", // ✅ TOUJOURS COMPLETED car le retrait a réussi
      method: "card",
      provider: providerName,
      balanceBefore: isMapleradCard ? balanceBefore : "N/A",
      balanceAfter: isMapleradCard
        ? Number(card.balance_usd) - feeAmountUsd
        : "N/A",
    });

    // Envoyer notification (considérer le retrait comme réussi)
    await sendPaymentNotifications(context, feeAmountUsd, "card");

    return {
      success: true,
      method: "card",
      feeAmount: feeAmountUsd,
      feeAmountXaf,
      cardTransactionId: feeTransaction.id,
    };
  } catch (error: any) {
    console.error(`❌ Erreur retrait ${providerName} pour frais`, {
      cardId: context.cardId,
      provider_card_id: card.provider_card_id,
      feeAmountUsd,
      cardBalance: isMapleradCard ? Number(card.balance_usd) : "N/A",
      error: error.message,
      provider: providerName,
    });
    throw error;
  }
};

/**
 * 💰 Collecte depuis le wallet
 */
const collectFromWallet = async (
  userId: string,
  feeAmountUsd: number,
  feeAmountXaf: number,
  context: DebtCreationContext
): Promise<FeeCollectionResult> => {
  // ✅ CORRECTION: Utiliser withdrawFromWallet qui crée LA transaction dans table 'transactions'
  // ✅ CORRECTION: Utiliser feeAmountXaf (FCFA) au lieu de feeAmountUsd (USD)
  const walletResult = await mapleradWalletService.withdrawFromWallet(
    userId,
    feeAmountXaf, // ✅ Correct: Montant en FCFA
    `Frais de paiement par carte - ${context.merchantName || "Transaction"}`,
    context.cardId,
    context.isFailedPayment
      ? TransactionType.PAYMENT_FAILURE_FEE
      : TransactionType.PAYMENT_SUCCESS_FEE // ✅ Type spécifique pour les frais de paiement
  );

  console.log(`✅ Frais collectés depuis le wallet`, {
    userId,
    cardId: context.cardId,
    feeAmountUsd,
    feeAmountXaf,
    walletTransactionId: walletResult.transactionId,
    previousBalance: walletResult.previousBalance,
    newBalance: walletResult.newBalance,
    method: "wallet",
  });

  // Notifications enrichies pour prélèvement réussi sur wallet
  const currency = CurrencyManager.getCurrencySymbol(
    walletResult.user.country_iso_code
  );

  await NotificationModel.createNotification({
    title: "💰 Frais prélevés sur solde",
    user_id: walletResult.user.id!,
    text: `Frais de ${feeAmountXaf} ${currency} prélevés de votre solde principal pour ${
      context.isFailedPayment ? "paiement échoué" : "paiement réussi"
    }. Nouveau solde: ${walletResult.newBalance} ${currency}.`,
    transaction_id: walletResult.transaction.id,
    transaction_category: walletResult.transaction.category,
    transaction_type: walletResult.transaction.type,
  });

  // Envoyer notification
  // await sendPaymentNotifications(
  //   context,
  //   feeAmountUsd,
  //   'wallet',
  //   walletResult.transaction
  // );

  return {
    success: true,
    method: "wallet",
    feeAmount: feeAmountUsd,
    feeAmountXaf,
    walletTransactionId: walletResult.transactionId,
  };
};

/**
 * 📝 Crée une dette si impossible de collecter
 */
const createDebt = async (
  user: IUser,
  card: ICard,
  localFeeAmount: number,
  // transactionDescription: string,
  // originalTransactionId: string,
  localCurrency: string,
  feeAmountUsd: number,
  feeAmountXaf: number,
  context: DebtCreationContext
): Promise<any> => {
  console.log("Création de la dette avec tracking ::", localFeeAmount);

  // Déterminer le type de dette selon le contexte
  const debtType = context.isFailedPayment
    ? DebtType.FAILURE_FEE
    : DebtType.SUCCESS_FEE;

  // Utiliser le nouveau système de gestion des dettes
  await SimplifiedDebtManager.addDebtWithTracking(
    user,
    card,
    localFeeAmount,
    debtType,
    `MPLD | ${context.transactionMetadata?.description}`,
    context.localTransaction?.id ||
      context.transactionMetadata?.mapleradReference
  );
  return false;
};

/**
 * 📱 Notifications de paiement et frais
 */
const sendPaymentNotifications = async (
  context: DebtCreationContext,
  feeAmount: number,
  feeSource: string,
  transaction?: ITransaction
): Promise<void> => {
  try {
    // const card = await this.cardRepository.findOne({
    //   where: { id: context.cardId },
    // });
    const cardResult = await CardModel.getOne({
      provider_card_id: context.cardId,
    });
    const card: ICard = cardResult.output;

    if (!card) return;

    // Notification du paiement réussi
    const paymentTitle = "✅ Paiement réussi";
    const paymentMessage = `Votre paiement de ${context.amount} ${
      context.currency
    } chez ${
      context.merchantName || "un marchand"
    } a été effectué avec succès.`;

    notificationQueueService.addNotification({
      userId: String(context.userId ?? ""),
      title: paymentTitle,
      message: paymentMessage,
    });
    await NotificationModel.createNotification({
      title: paymentTitle,
      user_id: String(context.userId) ?? "",
      text: paymentMessage,
      transaction_id: transaction?.id,
      transaction_category: transaction?.category,
      transaction_type: transaction?.type,
    });
    // await this.notificationService.sendNotification(
    //   context.userId,
    //   paymentTitle,
    //   paymentMessage,
    //   NotificationType.INFO,
    //   {
    //     type: 'payment',
    //     cardId: context.cardId,
    //     amount: context.amount,
    //     currency: context.currency,
    //     success: 'true', // ✅ CORRECTION: String au lieu de boolean
    //   }
    // );

    // Notification des frais appliqués
    const feeTitle = "💰 Frais de paiement appliqués";

    // ✅ AMÉLIORATION : Message plus détaillé selon la source
    let feeMessage: string;
    if (feeSource === "card") {
      feeMessage = `Des frais de ${feeAmount} USD ont été déduits de votre carte pour le traitement de votre paiement.`;
    } else if (feeSource === "wallet") {
      // Pour le wallet, on utilise le montant en XAF
      const feeAmountXaf = Math.round(feeAmount * 640); // Taux de change approximatif
      feeMessage = `Des frais de ${feeAmountXaf} XAF ont été déduits de votre wallet pour le traitement de votre paiement.`;
    } else {
      feeMessage = `Des frais de ${feeAmount} USD ont été déduits pour le traitement de votre paiement.`;
    }

    notificationQueueService.addNotification({
      userId: String(context.userId ?? ""),
      title: feeTitle,
      message: feeMessage,
    });
    await NotificationModel.createNotification({
      title: feeTitle,
      user_id: String(context.userId) ?? "",
      text: feeMessage,
      transaction_id: transaction?.id,
      transaction_category: transaction?.category,
      transaction_type: transaction?.type,
    });

    // await this.notificationService.sendNotification(
    //   context.userId,
    //   feeTitle,
    //   feeMessage,
    //   NotificationType.INFO,
    //   {
    //     type: 'fee',
    //     cardId: context.cardId,
    //     feeAmount,
    //     feeSource, // Source des frais (card/wallet)
    //     originalAmount: context.amount,
    //     // ✅ CORRECTION : Données correctes pour l'email
    //     amount: feeAmount, // ✅ MONTANT DES FRAIS (pas du paiement)
    //     currency: 'USD', // ✅ Toujours USD pour les frais de carte
    //     paymentAmount: context.amount, // ✅ MONTANT DU PAIEMENT ORIGINAL
    //     paymentCurrency: context.currency, // ✅ Devise du paiement original
    //     paymentSuccess: 'true', // Indique que c'est un frais de paiement réussi
    //     merchantName: context.merchantName, // Nom du marchand pour l'email
    //     transactionId: context.sudoTransactionId, // ID de la transaction originale
    //   }
    // );

    console.debug(
      `📱 Notifications envoyées pour paiement ${context.sudoTransactionId}`
    );
  } catch (error: any) {
    console.warn(`⚠️ Erreur envoi notifications: ${error.message}`);
  }
};

/**
 * 📱 Notification de dette créée
 */
// const sendDebtCreatedNotification = async (
//   context: DebtCreationContext,
//   feeAmount: number,
//   debtId: string
// ): Promise<void> => {
//   try {
//     const title = '⚠️ Dette créée pour frais de paiement';
//     const message = `Votre paiement de ${context.amount} ${context.currency} a été effectué, mais les frais de ${feeAmount} USD n'ont pas pu être prélevés. Une dette a été créée et sera récupérée lors de votre prochaine recharge.`;

//     await this.notificationService.sendNotification(
//       context.userId,
//       title,
//       message,
//       NotificationType.ALERT,
//       {
//         type: 'fee',
//         cardId: context.cardId,
//         debtId,
//         feeAmount,
//         originalAmount: context.amount,
//         paymentMethod: 'debt', // Indique que le frais sera récupéré via dette
//       }
//     );
//   } catch (error) {
//     console.warn(`⚠️ Erreur envoi notification dette: ${error.message}`);
//   }
// };

const paymentDebtManagerService = {
  collectPaymentFee,
};

export default paymentDebtManagerService;
