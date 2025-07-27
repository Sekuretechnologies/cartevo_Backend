import {
  CardModel,
  CustomerModel,
  NotificationModel,
  TransactionModel,
  UserModel,
  WalletModel,
} from "@/models";
import sudoUtils from "@/utils/cards/sudo";
import { unixToISOString, utcToLocalTime } from "@/utils/date";
import {
  extractUsdAmountFromSentence,
  wordsInSentence,
} from "@/utils/shared/common";
import { encodeText } from "@/utils/shared/encryption";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class WebhookServiceSudo {
  async processSudoWebhook(body: any, headers: any, req: any) {
    // Implement your webhook event processing logic here
    console.log("------------ SUDO WEBHOOK RECEIVED -------------");
    console.log("🔍 Headers:", JSON.stringify(req.headers, null, 2));
    console.log("🔍 Raw body:", req.body);
    console.log("🔍 Content-Type:", req.headers["content-type"]);
    console.log("🔍 User-Agent:", req.headers["user-agent"]);

    const payload = req.body;

    // const { cardId, eventTime, Type, data } = payload;
    const cardId =
      payload.type === "card.updated" || payload.type === "card.terminated"
        ? payload.data.object._id
        : payload.data.object.card;
    const eventTime = unixToISOString(payload.createdAt);
    const eventType = payload.type;
    const data = payload.data.object;

    console.log("Sudo Webhook data: ", { cardId, eventTime, eventType, data });

    if (!cardId || !data) {
      throw new NotFoundException("Invalid payload: Missing cardId or data.");
      // return fnOutput.error({
      //   message: "Invalid payload: Missing cardId or data.",
      //   error: { message: "Invalid payload: Missing cardId or data." },
      // });
    }

    // Récupérer la carte depuis la base de données
    const cardResult = await CardModel.getOne({ provider_card_id: cardId });

    const card = cardResult.output;

    const userResult = await CustomerModel.getOne({ id: card.customer_id });
    const user = userResult.output;

    if (!card) {
      console.log(`Card with ID ${cardId} not found.`);
      throw new NotFoundException(`Card with ID ${cardId} not found.`);
      // return fnOutput.error({`
      //   message: `Card with ID ${cardId} not found.`,
      //   error: { message: `Card with ID ${cardId} not found.` },
      // });`
    }

    switch (eventType) {
      case "transaction.created":
        await handleTransactionCreated(card, data, eventTime);
        break;

      case "authorization.declined":
        await handleAuthorizationDeclined(card, data, eventTime);
        break;

      case "authorization.code":
        await handleAuthorizationCode(card, data, eventTime);
        break;

      case "transaction.refund":
        await handleTransactionRefund(card, data, eventTime);
        break;

      case "card.updated":
        await handleCardUpdated(card, data, eventTime);
        break;

      case "card.terminated":
        await handleCardTerminated(card, data, eventTime);
        break;

      default:
        console.log(`Unhandled eventType: ${eventType}`);
        throw new NotFoundException(
          `Unhandled eventType: ${eventType}. Please check the event type and implement the handler.`
        );
      // return fnOutput.error({
      //   message: `Unhandled eventType: ${eventType}`,
      //   error: { message: `Unhandled eventType: ${eventType}` },
      // });
    }

    console.log(
      `Event ${eventType} processed successfully for card ${cardId}.`
    );
    return fnOutput.success({
      message: `Event ${eventType} handled successfully.`,
      output: {
        message: `Event ${eventType} handled successfully.`,
      },
    });
  }
}

const handleTransactionCreated = async (
  card: any,
  data: any,
  eventTime: string
) => {
  let type: string;
  let status: string;
  const userResult = await CustomerModel.getOne({ id: card.customer_id });
  const user = userResult.output;
  const countryCode = user?.country_iso_code?.substring(0, 2);

  if (!user) {
    console.log(`Customer with ID ${card.customer_id} not found.`);
    throw new NotFoundException(
      `Customer with ID ${card.customer_id} not found.`
    );
    // return fnOutput.error({
    //   error: { message: `Customer with ID ${card.customer_id} not found.` },
    // });
  }

  // ❌ SUPPRIMÉ: availableBalance n'existe pas dans les webhooks Sudo
  // Les soldes seront synchronisés périodiquement via l'API Sudo getCard()
  console.log(
    "ℹ️ Sudo webhook ne contient pas availableBalance - synchronisation ultérieure nécessaire"
  );

  // Vérification défensive des champs merchant (peut être vide dans les webhooks Sudo)
  const merchantName = data.merchant?.name || "";

  // Détecter les différents types de frais automatiques de Sudo
  const isFailedTransactionCharge = wordsInSentence(String(merchantName), [
    "Failed",
    "Transaction",
    "Charge",
  ]);

  const isCrossBorderCharge = wordsInSentence(String(merchantName), [
    "Cross",
    "Border",
    "Auth",
    "Charge",
  ]);

  if (isFailedTransactionCharge) {
    type = "failed_transaction_charge";
  } else if (isCrossBorderCharge) {
    type = "cross_border_charge";
  } else if (wordsInSentence(String(merchantName), ["refund"])) {
    type = "refund";
  } else {
    type = "settlement";
  }
  // type = transaction.transactionMetadata?.type;
  status = "SUCCESS";

  const existingTransaction = await TransactionModel.getOne({
    order_id: String(data._id),
  });

  if (!existingTransaction.output) {
    const usdAmount = Math.abs(Number(data.amount));

    const transactionSkr = await TransactionModel.create({
      amount: usdAmount,
      currency: "USD",
      // card_balance_before: card.balance,
      category: "card",
      type,
      mcc: data.merchant?.category,
      mid: data.merchant?.merchantId,
      merchant: {
        city: data.merchant?.city || "",
        country: data.merchant?.country || "",
        name: merchantName || "Marchand inconnu",
      },
      company_id: card.company_id,
      customer_id: card.customer_id,
      card_id: card.id,
      order_id: data._id,
      provider: encodeText("sudo"),
      status,
      description:
        type === "settlement"
          ? `Paiement réussi depuis ${merchantName || "Marchand inconnu"}`
          : type === "failed_transaction_charge"
          ? `Frais pour transaction échouée - Montant: ${usdAmount} USD`
          : type === "cross_border_charge"
          ? `Frais de paiement international - Montant: ${usdAmount} USD`
          : merchantName || "Transaction",
      created_at: utcToLocalTime(eventTime)?.toISOString(),
    });
    console.log(
      `✅ Transaction created: ${transactionSkr.output.id} for card ${card.id}`
    );
  }
  // ❌ SUPPRIMÉ: Nouveaux soldes non disponibles dans webhook Sudo
  // Les soldes seront mis à jour lors de la synchronisation périodique
  console.log(
    "ℹ️ Nouveaux soldes carte non inclus - seront synchronisés via API Sudo"
  );
};

const handleAuthorizationCode = async (
  card: any,
  data: any,
  eventTime: string
) => {
  const customerResult = await CustomerModel.getOne({ id: card.customer_id });
  const customer = customerResult.output;

  if (!customer) {
    console.log(`Customer with ID ${card.customer_id} not found.`);
    throw new NotFoundException(
      `Customer with ID ${card.customer_id} not found.`
    );
  }

  // Extraire le code d'autorisation
  const authCode = data.code;

  if (!authCode) {
    console.log("Code d'autorisation manquant dans le webhook");
    return;
  }

  console.log(
    `Code d'autorisation 3DS généré pour l'utilisateur ${customer.phone}: ${authCode}`
  );

  // Notification en base de données
  await NotificationModel.create({
    title: "Code d'autorisation 3D Secure",
    customer_id: customer.id,
    text: `Un code d'autorisation 3D Secure a été généré pour votre paiement.
    Code: ${authCode}
Veuillez saisir ce code sur la plateforme de paiement pour confirmer votre transaction. Ce code est valable pour une durée limitée.`,
    category: "3ds_auth_code",
  });

  // Note: Email non envoyé pour les codes 3DS car ils expirent rapidement
  // Les notifications push et DB sont suffisantes pour ce cas d'usage
  console.log(
    "Code 3DS envoyé via notifications push et DB uniquement (pas d'email car expiration rapide)"
  );

  console.log(
    `✅ Code d'autorisation 3DS envoyé à l'utilisateur ${customer.phone}: ${authCode}`
  );
};

const handleAuthorizationDeclined = async (
  card: any,
  data: any,
  eventTime: string
) => {
  const userResult = await CustomerModel.getOne({ id: card.customer_id });
  const user = userResult.output;

  // Vérification défensive des champs merchant (peut être vide dans les webhooks Sudo)
  const merchantName = data.merchant?.name || "";

  /** -------------------------------------------- */
  let type = "authorization";
  let status: any;
  if (data.status === "pending" && data.approved === false) {
    status = "FAILED";
  } else if (data.status === "pending" && data.approved === true) {
    status = "SUCCESS";
  } else {
    status = data.status?.toUpperCase();
  }

  const existingTransaction = await TransactionModel.getOne({
    order_id: String(data._id),
    card_id: card.id,
  });

  if (!existingTransaction.output) {
    console.log("Nouvelle transaction à enregistrer");
    const usdAmount = Math.abs(Number(data.amount));

    const transactionResult = await TransactionModel.create({
      amount: usdAmount,
      currency: "USD",
      // card_balance_before: card.balance,
      category: "card",
      type,
      mcc: data.merchant?.category,
      mid: data.merchant?.merchantId,
      merchant: {
        city: data.merchant?.city || "",
        country: data.merchant?.country || "",
        name: merchantName || "Marchand inconnu",
      },
      company_id: card.company_id,
      customer_id: card.customer_id,
      card_id: card.id,
      order_id: String(data._id),
      provider: encodeText("sudo"),
      status: status,
      reason: data.requestHistory?.[0]?.narration || "",
      description: `Paiement échoué depuis :: ${
        merchantName || "Marchand inconnu"
      } :: ${data.requestHistory?.[0]?.reason} - ${
        data.requestHistory?.[0]?.narration
      }`,
      created_at:
        utcToLocalTime(eventTime)?.toISOString() || utcToLocalTime(eventTime),
    });
    const transaction = transactionResult.output;

    if (!user) {
      console.log(`Customer with ID ${card.customer_id} not found.`);
      throw new NotFoundException(
        `Customer with ID ${card.customer_id} not found.`
      );
    }

    if (!transaction) {
      console.log(`Transaction with ID ${data._id} not found.`);
      throw new NotFoundException(`Transaction with ID ${data._id} not found.`);
    }

    // Gérer les différents cas d'échec
    if (
      wordsInSentence(String(data.requestHistory?.[0]?.narration), [
        "No",
        "sufficient",
        "funds",
      ])
    ) {
      const remaining_amount: number = Number(
        extractUsdAmountFromSentence(data.requestHistory?.[0]?.narration) || 0
      );
      // Cas où il n'y a pas assez de fonds
      if (remaining_amount > 0) {
        await NotificationModel.create({
          title: "Echec de paiement - Fonds insuffisants",
          customer_id: user.id,
          text: `Votre paiement de ${usdAmount} USD sur ${
            merchantName || "un marchand"
          } a échoué ! Veuillez ajouter ${remaining_amount} USD pour valider votre paiement.`,
          transaction_id: transaction.id,
          category: "payment_failed",
        });
      }
    }

    // NOTE: Les frais d'échec ne sont plus nécessaires chez Sudo
    // Sudo gère les frais directement, pas besoin de les prélever séparément
    console.log(
      "Sudo gère les frais d'échec automatiquement - Pas de prélèvement manuel nécessaire"
    );
  }
};

const handleTransactionRefund = async (
  card: any,
  data: any,
  eventTime: string
) => {
  const userResult = await CustomerModel.getOne({ id: card.customer_id });
  const user = userResult.output;

  // Vérification défensive des champs merchant (peut être vide dans les webhooks Sudo)
  const merchantName = data.merchant?.name || "";

  /** -------------------------------------------- */
  let type = "refund";
  let status: any;
  if (data.status === "pending" && data.approved === false) {
    status = "FAILED";
  } else if (data.status === "pending" && data.approved === true) {
    status = "SUCCESS";
  } else {
    status = data.status?.toUpperCase();
  }

  const existingTransaction = await TransactionModel.getOne({
    order_id: String(data._id),
    card_id: card.id,
  });

  if (!existingTransaction.output) {
    console.log("Nouvelle transaction à enregistrer");
    // const xafAmount = Math.trunc(
    const usdAmount = Math.abs(Number(data.amount));

    const transactionResult = await TransactionModel.create({
      amount: usdAmount,
      currency: "USD",
      // card_balance_before: card.balance,
      category: "card",
      type,
      mcc: data.merchant?.category,
      mid: data.merchant?.merchantId,
      merchant: {
        city: data.merchant?.city || "",
        country: data.merchant?.country || "",
        name: merchantName || "Marchand inconnu",
      },
      company_id: card.company_id,
      customer_id: card.user_id,
      card_id: card.id,
      order_id: String(data._id),
      provider: encodeText("sudo"),
      status: status,
      reason: data.requestHistory?.[0]?.narration || "",
      description: `Remboursement depuis :: ${
        merchantName || "Marchand inconnu"
      } :: ${data.requestHistory?.[0]?.reason} - ${
        data.requestHistory?.[0]?.narration
      }`,
      created_at:
        utcToLocalTime(eventTime)?.toISOString() || utcToLocalTime(eventTime),
    });
    const transaction = transactionResult.output;

    if (!user) {
      console.log(`User with ID ${card.user_id} not found.`);
      throw new NotFoundException(`User with ID ${card.user_id} not found.`);
    }

    if (!transaction) {
      console.log(`Transaction with ID ${data._id} not found.`);
      throw new NotFoundException(`Transaction with ID ${data._id} not found.`);
    }

    // Gérer les différents cas d'échec
    if (
      wordsInSentence(String(data.requestHistory?.[0]?.narration), [
        "No",
        "sufficient",
        "funds",
      ])
    ) {
      const remaining_amount: number = Number(
        extractUsdAmountFromSentence(data.requestHistory?.[0]?.narration) || 0
      );
      // Cas où il n'y a pas assez de fonds
      if (remaining_amount > 0) {
        await NotificationModel.create({
          title: "Echec de remboursement - Fonds insuffisants",
          customer_id: user.id,
          text: `Votre remboursement de ${usdAmount} USD sur ${
            merchantName || "un marchand"
          } a échoué ! Veuillez ajouter ${remaining_amount} USD pour valider votre remboursement.`,
          transaction_id: transaction.id,
          category: "refund_failed",
        });
      }
    }

    // NOTE: Les frais d'échec ne sont plus nécessaires chez Sudo
    // Sudo gère les frais directement, pas besoin de les prélever séparément
    console.log(
      "Sudo gère les frais d'échec automatiquement - Pas de prélèvement manuel nécessaire"
    );
  }
};

const handleCardUpdated = async (card: any, data: any, eventTime: string) => {
  /** -------------------------------------------- */
  let status: any;
  if (data.status === "active") {
    status = "ACTIVE";
  } else if (data.status === "inactive") {
    status = "FREEZE";
  } else if (data.status === "canceled") {
    status = "TERMINATED";
  } else {
    status = data.status?.toUpperCase();
  }

  const updatedCardResult = await CardModel.update(
    { id: card.id },
    {
      status,
    }
  );

  // if (
  //   data?.status === 'canceled' &&
  //   (card?.status === 'ACTIVE' || card?.status === 'FREEZE')
  // ) {
  //   const updatedCardResult = await CardModel.updateCard(
  //     { id: card.id },
  //     {
  //       status: 'TERMINATED',
  //       balance_usd: 0,
  //       balance_xaf: 0,
  //       balance_user_currency: 0,
  //       event: `Balance before Termination: Skr: [${card.balance_usd}] | Sudo: [${data.balance}]`,
  //     }
  //   );
  // }
};

const handleCardTerminated = async (
  card: any,
  data: any,
  eventTime: string
) => {
  /** -------------------------------------------- */
  let status: any;
  if (data.status === "active") {
    status = "ACTIVE";
  } else if (data.status === "inactive") {
    status = "FREEZE";
  } else if (data.status === "canceled") {
    status = "TERMINATED";
  } else {
    status = data.status?.toUpperCase();
  }

  const updatedCardResult = await CardModel.update(
    { id: card.id },
    {
      status: "TERMINATED",
      balance_usd: 0,
      balance_xaf: 0,
      balance_user_currency: 0,
      event: `Balance before Termination: ${data.balance} USD`,
    }
  );

  const customerResult = await CustomerModel.getOne({ id: card.customer_id });
  const customer = customerResult.output;
  if (!customer) {
    console.log(`Customer with ID ${card.customer_id} not found.`);
    throw new NotFoundException(
      `Customer with ID ${card.customer_id} not found.`
    );
  }

  const walletResult = await WalletModel.getOne({
    company_id: card.company_id,
    currency: "USD",
  });
  const wallet = walletResult.output;
  if (!wallet) {
    console.log(`Wallet with ID ${card.customer_id} not found.`);
    throw new NotFoundException(
      `Wallet with ID ${card.customer_id} not found.`
    );
  }

  if (data.balance) {
    //&& Number(data.balance) > 0.5

    const new_balance = wallet.balance + Number(data.balance);

    await WalletModel.update(
      {
        id: wallet.id,
      },
      {
        balance: new_balance,
      }
    );

    await TransactionModel.create({
      status: "SUCCESS",
      order_id: data._id,
      description: `Balance before Termination: ${data.balance} USD`,
      reason: `Balance before Termination: ${data.balance} USD`,
      amount: data.balance,
      currency: "USD",
      category: "card",
      type: "termination",
      company_id: card.company_id,
      customer_id: String(customer.id),
      card_id: String(card.id),
      card_balance_before: data.balance,
      card_balance_after: 0,
      created_at: utcToLocalTime(new Date())?.toISOString(),
    });
  }

  console.log(`Automatic termination processed for Card ID ${card.id}.`);
};
