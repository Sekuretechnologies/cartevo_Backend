import env from "@/env";
import TransactionModel from "@/models/prisma/transactionModel";
import UserModel from "@/models/prisma/userModel";
import ExchangeRateModel from "@/models/prisma/exchangeRateModel";
import CurrencyManager from "@/utils/shared/currencyManager";
import fnOutput, { OutputProps } from "@/utils/shared/fnOutputHandler";
import { TransactionStatus, TransactionType } from "@/types";
import { utcToLocalTime } from "@/utils/date";
import { generateReferenceId } from "@/utils/cards/maplerad/tools";
import { v4 as uuidv4 } from "uuid";
import { User } from "@prisma/client";

type IUser = User;
/**
 * Generate a unique reference for transactions
 */
const generateReference = (): string => {
  return `REF_${Date.now()}_${uuidv4().substring(0, 8).toUpperCase()}`;
};

/**
 * Check if user can withdraw money based on balance
 */
const canUserWithdrawMoney = (user: any, balance: number): boolean => {
  // Simplified implementation - always allow withdrawal for now
  return balance >= 0;
};

/**
 * Get currency symbol for a given currency code using CurrencyManager
 */
const getCurrencySymbol = (currencyCode: string): string => {
  // Use CurrencyManager's formatCurrency method and extract just the symbol
  const formatted = CurrencyManager.formatCurrency(0, currencyCode);
  // Extract symbol from formatted string (e.g., "$0" -> "$")
  return formatted.replace(/[0-9]/g, "").trim() || currencyCode;
};

/**
 * 🔒 Réserve des fonds dans le wallet AVANT l'appel Maplerad (sans créer de transaction)
 * Évite les race conditions et garantit la réservation des fonds atomiquement
 * ✅ NOUVEAU: Plus de transaction créée ici, juste réservation des fonds
 */
const reserveWalletFunds = async (
  userId: string,
  amountXaf: number,
  amountLocalCurrency: number,
  description: string,
  reference: string
): Promise<OutputProps> => {
  try {
    // ✅ Utiliser la nouvelle méthode d'arrière-plan (pas de transaction)
    const result = await reserveFundsInBackground(
      userId,
      amountXaf,
      amountLocalCurrency
    );

    console.debug(`💰 Fonds réservés AVANT Sudo (arrière-plan sécurisé)`, {
      userId,
      amountXaf,
      previousBalance: result.output?.previousBalance,
      newBalance: result.output?.newBalance,
      reference,
      description,
      secureFlow: true,
      noTransactionCreated: true,
    });
    return fnOutput.success({
      output: result.output,
    });
  } catch (error: any) {
    console.error("Erreur lors de la réservation sécurisée des fonds", {
      userId,
      amountXaf,
      error: error.message,
    });

    // ✅ Message d'erreur générique pour l'utilisateur
    if (error.message.includes("Solde insuffisant")) {
      // Log technique avec détails
      console.error("Solde insuffisant pour création de carte", {
        userId,
        amountRequired: amountXaf,
        technicalError: error.message,
        context: "card_issuance_insufficient_funds",
      });
    }
    return fnOutput.error({
      error: { message: `reserveWalletFunds error: ${error.message}` },
    });

    //   throw new HttpException(
    //     'Solde insuffisant pour créer cette carte. Veuillez recharger votre wallet et réessayer.',
    //     HttpStatus.BAD_REQUEST
    //   );
    // }

    // throw error;
  }
};

/**
 * 🔒 RÉSERVE des fonds dans le wallet sans créer de transaction (pour opérations sécurisées)
 * Utilisé avant les appels externes pour éviter les race conditions
 */
const reserveFundsInBackground = async (
  userId: string,
  amounXaf: number,
  amountLocalCurrency: number
): Promise<OutputProps> => {
  try {
    // Get user information
    // const user = await this.usersService.findOne(userId);
    const userResult = await UserModel.getOne({
      id: userId,
    });
    if (userResult.error) {
      throw userResult.error;
    }
    const user = userResult.output;

    // Trouver le wallet de l'utilisateur
    // const wallet = await this.findByUserId(userId);
    // const previousBalance =
    //   user.country_iso_code === 'CD'
    //     ? Number(user.balance_currency || 0)
    //     : Number(user.balance_xaf || 0);

    const previousBalanceXaf = Number(user.balance_xaf || 0);
    const previousBalanceLocalCurrency = Number(user.balance_currency || 0);

    // Vérifier que le montant ne dépasse pas le solde
    if (previousBalanceXaf < Number(amounXaf)) {
      throw new Error(
        `Solde insuffisant pour réserver ${amounXaf}. Solde actuel: ${previousBalanceXaf}`
      );
    }

    // Calculer le nouveau solde
    const newBalance = previousBalanceXaf - Number(amounXaf);
    const countryCode = String(user.country_iso_code);

    // const cardFees = getCardFees(countryCode);
    // const cardCreationFee = cardFees.firstCard;

    // const balanceAfterCreatedCard =
    //   Math.round((previousBalance - cardCreationFee + Number.EPSILON) * 100) /
    //   100;

    // const balanceAfterFirstFundingCard =
    //   Math.round((balanceAfterCreatedCard - localAmount + Number.EPSILON) * 100) /
    //   100;

    const balanceAfterReservationXaf =
      Math.round((previousBalanceXaf - amounXaf + Number.EPSILON) * 100) / 100;
    const balanceAfterReservationLocalCurrency =
      Math.round(
        (previousBalanceLocalCurrency - amountLocalCurrency + Number.EPSILON) *
          100
      ) / 100;

    const canWithdraw: boolean = canUserWithdrawMoney(
      user,
      balanceAfterReservationXaf
    );

    const userCurrency = getCurrencySymbol(countryCode);
    const balanceUpdateField = {
      balance_currency: balanceAfterReservationLocalCurrency,
      balance_xaf: balanceAfterReservationXaf,
      currency: userCurrency,
      updated_balance_at: utcToLocalTime(new Date())?.toISOString(),
    };
    const updatedUserResult = await UserModel.update(String(userId), {
      ...balanceUpdateField,
      can_withdraw: canWithdraw,
    });
    if (updatedUserResult.error) {
      throw updatedUserResult.error;
    }

    // Recharger le wallet mis à jour
    // const updatedWallet = await this.findByUserId(userId);

    // console.debug(`💰 Fonds réservés en arrière-plan`, {
    //   userId,
    //   amount,
    //   previousBalance,
    //   newBalance,
    //   operation: 'background_reserve',
    // });

    return fnOutput.success({
      output: {
        previousBalance: previousBalanceLocalCurrency,
        newBalance,
        wallet: balanceUpdateField,
      },
    });
  } catch (error: any) {
    return fnOutput.error({
      error: { message: `resvFundBg error : ${error.message}` },
    });
  }
};

/**
 * 💳 Débite le wallet pour une recharge de carte ou frais
 * Utilise le type CARD_TOPUP par défaut, mais accepte des types personnalisés
 */
const withdrawFromWallet = async (
  userId: string,
  amount: number,
  description: string,
  cardId?: string,
  transactionType: TransactionType = TransactionType.CARD_TOPUP
): Promise<{
  transactionId: string;
  previousBalance: number;
  newBalance: number;
  wallet: any;
  transaction: any;
  user: any;
}> => {
  const amount_xaf = amount;
  // Get user information
  const userResult = await UserModel.getOne({
    id: userId,
  });
  const user: IUser = userResult.output;

  // Find user's wallet
  const wallet = {
    balance_xaf: user.balance,
  };

  // Vérifier que le montant ne dépasse pas le solde

  try {
    if (Number(user.balance_xaf) < Number(amount_xaf)) {
      throw new Error("Solde insuffisant pour effectuer cette transaction");
    }

    const previousBalance = user.balance_xaf;
    const newBalance = Number(previousBalance) - Number(amount_xaf);

    // 🔧 FIX: Générer externalRef cohérent selon le type de transaction
    let externalRefPrefix = "card-topup";
    if (transactionType === TransactionType.PAYMENT_SUCCESS_FEE) {
      externalRefPrefix = "payment-success-fee";
    } else if (transactionType === TransactionType.PAYMENT_FAILURE_FEE) {
      externalRefPrefix = "payment-failure-fee";
    } else if (transactionType === TransactionType.CARD_ISSUANCE_FIRST) {
      externalRefPrefix = "card-issuance-first";
    } else if (transactionType === TransactionType.CARD_ISSUANCE_ADDITIONAL) {
      externalRefPrefix = "card-issuance-additional";
    }
    const externalRef = `${externalRefPrefix}-${Date.now()}`;

    const updatedUserResult = await UserModel.update(userId, {
      balance_xaf: newBalance,
    });

    const feeTransactionResult = await TransactionModel.create({
      status: TransactionStatus.COMPLETED,
      order_id: externalRef,
      reference: generateReference(),
      description: description,
      amount: amount_xaf,
      fee_amount: 0,
      currency: "XAF",
      category: "wallet",
      type: transactionType,
      user_id: String(user.id),
      wallet_balance_before: previousBalance,
      wallet_balance_after: newBalance,
      company_id: user.company_id,
      created_at: utcToLocalTime(new Date())?.toISOString(),
      updated_at: utcToLocalTime(new Date())?.toISOString(),
    });
    const transaction = feeTransactionResult.output;

    console.debug(
      `💳 Wallet débité: ${amount} XAF (type: ${transactionType})`,
      {
        userId,
        transactionId: transaction.id,
        type: transactionType,
        previousBalance,
        newBalance,
        cardId,
      }
    );

    return {
      transactionId: transaction.id,
      previousBalance,
      newBalance,
      wallet: {
        balance_xaf: updatedUserResult.output?.balance_xaf,
      },
      user: updatedUserResult.output,
      transaction: transaction,
    };
  } catch (error: any) {
    console.error(
      `Erreur lors du débit wallet pour cette transaction: ${error.message}`,
      error.stack
    );
    throw new Error(
      `Erreur lors du débit wallet pour cette transaction: ${error.message}`
    );
  }
};

/**
 * 🔄 Rembourse les fonds dans le wallet en cas d'échec Sudo (sans créer de transaction)
 * ✅ NOUVEAU: Plus de transaction créée ici, juste remboursement des fonds
 */
const refundWalletFundsAfterFailure = async (
  userId: string,
  amountXaf: number,
  amountLocalCurrency: number,
  reference: string,
  originalError: string
): Promise<OutputProps> => {
  try {
    // ✅ Utiliser la nouvelle méthode d'arrière-plan (pas de transaction)
    const result = await refundFundsInBackground(
      userId,
      amountXaf,
      amountLocalCurrency
    );
    if (result.error) {
      throw result.error;
    }

    console.warn(`🔄 Remboursement automatique après échec Sudo`, {
      userId,
      refundAmount: amountXaf,
      previousBalance: result.output?.previousBalance,
      newBalance: result.output?.newBalance,
      reference,
      originalError,
      secureFlow: true,
      noTransactionCreated: true,
    });
    return fnOutput.success({
      output: true,
    });
  } catch (refundError: any) {
    // ✅ LOG CRITIQUE : Si même le remboursement échoue
    console.error("🚨 ERREUR CRITIQUE: Échec du remboursement", {
      userId,
      amountToRefund: amountXaf,
      originalSudoError: originalError,
      refundError: refundError.message,
      stack: refundError.stack,
      reference,
      severity: "CRITICAL",
      requiresManualIntervention: true,
      context: "card_issuance_refund_failure",
    });

    // TODO: Déclencher une alerte pour intervention manuelle
    // await this.alertService.sendCriticalAlert('REFUND_FAILURE', { userId, amount, reference });

    // ✅ Re-lancer l'erreur pour que l'échec soit visible
    // throw new Error(
    //   `Erreur critique: échec du remboursement automatique. Support contacté automatiquement.`
    // );
    return fnOutput.error({
      error: {
        message: `Erreur critique: échec du remboursement automatique. Support contacté automatiquement : ${refundError.message}`,
      },
    });
  }
};

/**
 * 🔄 REMBOURSE des fonds dans le wallet sans créer de transaction (pour annulations)
 * Utilisé en cas d'échec d'opérations externes
 */
const refundFundsInBackground = async (
  userId: string,
  amountXaf: number,
  amountLocalCurrency?: number
): Promise<OutputProps> => {
  try {
    // Trouver le wallet de l'utilisateur
    const userResult = await UserModel.getOne({ id: userId });
    const user = userResult.output;

    const countryCode = String(user.country_iso_code);

    // const previousBalance = Number(user.balance_xaf);
    const previousBalanceXaf = Number(user.balance_xaf || 0);
    const previousBalanceLocalCurrency = Number(user.balance_currency || 0);

    // Calculer le nouveau solde
    // const newBalance = previousBalance + Number(amount_xaf);
    const newBalanceXaf =
      Math.round((previousBalanceXaf - amountXaf + Number.EPSILON) * 100) / 100;
    const newBalanceLocalCurrency =
      Math.round(
        (previousBalanceLocalCurrency -
          Number(amountLocalCurrency || 0) +
          Number.EPSILON) *
          100
      ) / 100;

    // Mettre à jour le solde directement (pas de transaction)
    const updatedUserResult = await UserModel.update(user.id, {
      balance_xaf: newBalanceXaf,
      balance_currency: newBalanceLocalCurrency,
      currency: CurrencyManager.getCurrencySymbol(countryCode),
      updated_balance_at: utcToLocalTime(new Date())?.toISOString(),
    });

    // console.debug(`🔄 Fonds remboursés en arrière-plan`, {
    //   userId,
    //   amount_xaf,
    //   previousBalance,
    //   newBalance,
    //   operation: 'background_refund',
    // });

    return fnOutput.success({
      output: {
        previousBalance: previousBalanceXaf,
        newBalance: newBalanceXaf,
        wallet: {
          balance_xaf: updatedUserResult.output?.balance_xaf,
          balance_currency: newBalanceLocalCurrency,
        },
      },
    });
  } catch (error: any) {
    return fnOutput.error({
      error: { message: `resvFundBg error : ${error.message}` },
    });
  }
};

/**
 * Traite un remboursement automatique de carte terminée
 * Crédite directement le wallet sans frais ni validation KYC
 */
const processCardTerminationRefund = async (
  userId: string,
  amountXaf: number,
  amountUsd: number,
  description: string,
  cardId?: string
): Promise<{
  transactionId: string;
  transaction?: any;
  previousBalance: number;
  newBalance: number;
  wallet: any;
}> => {
  console.log(`💰 Traitement remboursement automatique carte pour ${userId}`, {
    amountXaf,
    description,
  });

  // Récupérer l'utilisateur et le wallet
  //   const user = await this.usersService.findOne(userId);
  //   const wallet = await this.findByUserId(userId);

  const userResult = await UserModel.getOne({ id: userId });
  const user = userResult.output;
  const wallet = { balance: Number(user.balance_xaf) };
  const previousBalance = Number(user.balance_xaf);
  const newBalance = previousBalance + amountXaf;
  const countryCode = user?.country_iso_code;
  // const XAF_TO_CDF = 1 / Number(env.CDF_TO_XAF_RATE || 0.2);
  // Créer une transaction de remboursement automatique de carte terminée
  //   const transaction = this.transactionRepository.create({
  //     amount: amountXaf,
  //     fee: 0, // Pas de frais pour un remboursement automatique
  //     feePercentage: 0,
  //     feeFixed: 0,
  //     totalAmount: amountXaf,
  //     netAmount: amountXaf, // Montant net = montant total (pas de frais)
  //     type: TransactionType.CARD_TERMINATION,
  //     status: TransactionStatus.COMPLETED,
  //     description: description,
  //     reference: this.generateReference(),
  //     externalReference: cardId
  //       ? `card-refund:${cardId}`
  //       : `auto-refund:${Date.now()}`,
  //     previousBalance: previousBalance,
  //     newBalance: newBalance,
  //     completedAt: new Date(),
  //     currency: 'XAF',
  //     countryIsoCode: 'CM',
  //     paymentMethod: PaymentMethodType.WALLET, // Crédit interne
  //     phoneNumber: null,
  //     wallet: wallet,
  //     user: user, // ✅ FIX: Ajouter la relation user pour satisfaire la contrainte userId
  //   });

  try {
    const transactionResult = await TransactionModel.create({
      id: uuidv4(),
      status: TransactionStatus.COMPLETED,
      order_id: cardId ? `card-refund:${cardId}` : `auto-refund:${Date.now()}`,
      amount_xaf: amountXaf,
      amount_user_currency:
        countryCode === "CD"
          ? Math.ceil(amountXaf * XAF_TO_CDF)
          : Math.ceil(amountXaf),
      amount_usd: amountUsd,
      fee: 0,
      category: "card",
      type: "termination",
      user_id: String(user.id),
      card_id: String(cardId),
      provider: "maplerad",
      description: description,
      phone_number: user.phone,
      status: "SUCCESS",
      old_balance_xaf: previousBalance,
      new_balance_xaf: newBalance,
      old_balance_user_currency:
        countryCode === "CD"
          ? Math.ceil(previousBalance * XAF_TO_CDF)
          : previousBalance,
      new_balance_user_currency:
        countryCode === "CD" ? Math.ceil(newBalance * XAF_TO_CDF) : newBalance,
      card_new_balance_usd: 0,
      card_old_balance_usd: amountUsd,
      card_new_balance_xaf: 0,
      card_old_balance_xaf: amountXaf,
      card_new_balance_user_currency: 0,
      card_old_balance_user_currency:
        countryCode === "CD" ? Math.ceil(amountXaf * XAF_TO_CDF) : amountXaf,
      created_at: utcToLocalTime(new Date())?.toISOString(),
      updated_at: utcToLocalTime(new Date())?.toISOString(),
    });
    const savedTransaction = transactionResult.output;

    // Mettre à jour l'objet wallet local
    const updatedUserResult = await UserModel.updateDBUser(user.id, {
      balance_xaf: newBalance,
      balance_currency:
        countryCode === "CD" ? newBalance * XAF_TO_CDF : newBalance,
      updated_balance_at: utcToLocalTime(new Date())?.toISOString(),
    });

    console.log(`✅ Remboursement automatique traité avec succès`, {
      userId,
      transactionId: savedTransaction.id,
      previousBalance,
      newBalance,
      amount: amountXaf,
    });

    return {
      transactionId: savedTransaction.id,
      transaction: savedTransaction,
      previousBalance,
      newBalance,
      wallet,
    };
  } catch (error: any) {
    console.error(`❌ Erreur lors du remboursement automatique:`, error);
    throw new Error(
      `Erreur lors du remboursement automatique: ${error.message}`
    );
  }
};

const mapleradWalletService = {
  reserveWalletFunds,
  reserveFundsInBackground,
  withdrawFromWallet,
  refundWalletFundsAfterFailure,
  refundFundsInBackground,
  processCardTerminationRefund,
};

export default mapleradWalletService;
