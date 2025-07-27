"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookServiceSudo = void 0;
const models_1 = require("../../models");
const date_1 = require("../../utils/date");
const common_1 = require("../../utils/shared/common");
const encryption_1 = require("../../utils/shared/encryption");
const fnOutputHandler_1 = require("../../utils/shared/fnOutputHandler");
const common_2 = require("@nestjs/common");
let WebhookServiceSudo = class WebhookServiceSudo {
    async processSudoWebhook(body, headers, req) {
        console.log("------------ SUDO WEBHOOK RECEIVED -------------");
        console.log("🔍 Headers:", JSON.stringify(req.headers, null, 2));
        console.log("🔍 Raw body:", req.body);
        console.log("🔍 Content-Type:", req.headers["content-type"]);
        console.log("🔍 User-Agent:", req.headers["user-agent"]);
        const payload = req.body;
        const cardId = payload.type === "card.updated" || payload.type === "card.terminated"
            ? payload.data.object._id
            : payload.data.object.card;
        const eventTime = (0, date_1.unixToISOString)(payload.createdAt);
        const eventType = payload.type;
        const data = payload.data.object;
        console.log("Sudo Webhook data: ", { cardId, eventTime, eventType, data });
        if (!cardId || !data) {
            throw new common_2.NotFoundException("Invalid payload: Missing cardId or data.");
        }
        const cardResult = await models_1.CardModel.getOne({ provider_card_id: cardId });
        const card = cardResult.output;
        const userResult = await models_1.CustomerModel.getOne({ id: card.customer_id });
        const user = userResult.output;
        if (!card) {
            console.log(`Card with ID ${cardId} not found.`);
            throw new common_2.NotFoundException(`Card with ID ${cardId} not found.`);
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
                throw new common_2.NotFoundException(`Unhandled eventType: ${eventType}. Please check the event type and implement the handler.`);
        }
        console.log(`Event ${eventType} processed successfully for card ${cardId}.`);
        return fnOutputHandler_1.default.success({
            message: `Event ${eventType} handled successfully.`,
            output: {
                message: `Event ${eventType} handled successfully.`,
            },
        });
    }
};
exports.WebhookServiceSudo = WebhookServiceSudo;
exports.WebhookServiceSudo = WebhookServiceSudo = __decorate([
    (0, common_2.Injectable)()
], WebhookServiceSudo);
const handleTransactionCreated = async (card, data, eventTime) => {
    let type;
    let status;
    const userResult = await models_1.CustomerModel.getOne({ id: card.customer_id });
    const user = userResult.output;
    const countryCode = user?.country_iso_code?.substring(0, 2);
    if (!user) {
        console.log(`Customer with ID ${card.customer_id} not found.`);
        throw new common_2.NotFoundException(`Customer with ID ${card.customer_id} not found.`);
    }
    console.log("ℹ️ Sudo webhook ne contient pas availableBalance - synchronisation ultérieure nécessaire");
    const merchantName = data.merchant?.name || "";
    const isFailedTransactionCharge = (0, common_1.wordsInSentence)(String(merchantName), [
        "Failed",
        "Transaction",
        "Charge",
    ]);
    const isCrossBorderCharge = (0, common_1.wordsInSentence)(String(merchantName), [
        "Cross",
        "Border",
        "Auth",
        "Charge",
    ]);
    if (isFailedTransactionCharge) {
        type = "failed_transaction_charge";
    }
    else if (isCrossBorderCharge) {
        type = "cross_border_charge";
    }
    else if ((0, common_1.wordsInSentence)(String(merchantName), ["refund"])) {
        type = "refund";
    }
    else {
        type = "settlement";
    }
    status = "SUCCESS";
    const existingTransaction = await models_1.TransactionModel.getOne({
        order_id: String(data._id),
    });
    if (!existingTransaction.output) {
        const usdAmount = Math.abs(Number(data.amount));
        const transactionSkr = await models_1.TransactionModel.create({
            amount: usdAmount,
            currency: "USD",
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
            provider: (0, encryption_1.encodeText)("sudo"),
            status,
            description: type === "settlement"
                ? `Paiement réussi depuis ${merchantName || "Marchand inconnu"}`
                : type === "failed_transaction_charge"
                    ? `Frais pour transaction échouée - Montant: ${usdAmount} USD`
                    : type === "cross_border_charge"
                        ? `Frais de paiement international - Montant: ${usdAmount} USD`
                        : merchantName || "Transaction",
            created_at: (0, date_1.utcToLocalTime)(eventTime)?.toISOString(),
        });
        console.log(`✅ Transaction created: ${transactionSkr.output.id} for card ${card.id}`);
    }
    console.log("ℹ️ Nouveaux soldes carte non inclus - seront synchronisés via API Sudo");
};
const handleAuthorizationCode = async (card, data, eventTime) => {
    const customerResult = await models_1.CustomerModel.getOne({ id: card.customer_id });
    const customer = customerResult.output;
    if (!customer) {
        console.log(`Customer with ID ${card.customer_id} not found.`);
        throw new common_2.NotFoundException(`Customer with ID ${card.customer_id} not found.`);
    }
    const authCode = data.code;
    if (!authCode) {
        console.log("Code d'autorisation manquant dans le webhook");
        return;
    }
    console.log(`Code d'autorisation 3DS généré pour l'utilisateur ${customer.phone}: ${authCode}`);
    await models_1.NotificationModel.create({
        title: "Code d'autorisation 3D Secure",
        customer_id: customer.id,
        text: `Un code d'autorisation 3D Secure a été généré pour votre paiement.
    Code: ${authCode}
Veuillez saisir ce code sur la plateforme de paiement pour confirmer votre transaction. Ce code est valable pour une durée limitée.`,
        category: "3ds_auth_code",
    });
    console.log("Code 3DS envoyé via notifications push et DB uniquement (pas d'email car expiration rapide)");
    console.log(`✅ Code d'autorisation 3DS envoyé à l'utilisateur ${customer.phone}: ${authCode}`);
};
const handleAuthorizationDeclined = async (card, data, eventTime) => {
    const userResult = await models_1.CustomerModel.getOne({ id: card.customer_id });
    const user = userResult.output;
    const merchantName = data.merchant?.name || "";
    let type = "authorization";
    let status;
    if (data.status === "pending" && data.approved === false) {
        status = "FAILED";
    }
    else if (data.status === "pending" && data.approved === true) {
        status = "SUCCESS";
    }
    else {
        status = data.status?.toUpperCase();
    }
    const existingTransaction = await models_1.TransactionModel.getOne({
        order_id: String(data._id),
        card_id: card.id,
    });
    if (!existingTransaction.output) {
        console.log("Nouvelle transaction à enregistrer");
        const usdAmount = Math.abs(Number(data.amount));
        const transactionResult = await models_1.TransactionModel.create({
            amount: usdAmount,
            currency: "USD",
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
            provider: (0, encryption_1.encodeText)("sudo"),
            status: status,
            reason: data.requestHistory?.[0]?.narration || "",
            description: `Paiement échoué depuis :: ${merchantName || "Marchand inconnu"} :: ${data.requestHistory?.[0]?.reason} - ${data.requestHistory?.[0]?.narration}`,
            created_at: (0, date_1.utcToLocalTime)(eventTime)?.toISOString() || (0, date_1.utcToLocalTime)(eventTime),
        });
        const transaction = transactionResult.output;
        if (!user) {
            console.log(`Customer with ID ${card.customer_id} not found.`);
            throw new common_2.NotFoundException(`Customer with ID ${card.customer_id} not found.`);
        }
        if (!transaction) {
            console.log(`Transaction with ID ${data._id} not found.`);
            throw new common_2.NotFoundException(`Transaction with ID ${data._id} not found.`);
        }
        if ((0, common_1.wordsInSentence)(String(data.requestHistory?.[0]?.narration), [
            "No",
            "sufficient",
            "funds",
        ])) {
            const remaining_amount = Number((0, common_1.extractUsdAmountFromSentence)(data.requestHistory?.[0]?.narration) || 0);
            if (remaining_amount > 0) {
                await models_1.NotificationModel.create({
                    title: "Echec de paiement - Fonds insuffisants",
                    customer_id: user.id,
                    text: `Votre paiement de ${usdAmount} USD sur ${merchantName || "un marchand"} a échoué ! Veuillez ajouter ${remaining_amount} USD pour valider votre paiement.`,
                    transaction_id: transaction.id,
                    category: "payment_failed",
                });
            }
        }
        console.log("Sudo gère les frais d'échec automatiquement - Pas de prélèvement manuel nécessaire");
    }
};
const handleTransactionRefund = async (card, data, eventTime) => {
    const userResult = await models_1.CustomerModel.getOne({ id: card.customer_id });
    const user = userResult.output;
    const merchantName = data.merchant?.name || "";
    let type = "refund";
    let status;
    if (data.status === "pending" && data.approved === false) {
        status = "FAILED";
    }
    else if (data.status === "pending" && data.approved === true) {
        status = "SUCCESS";
    }
    else {
        status = data.status?.toUpperCase();
    }
    const existingTransaction = await models_1.TransactionModel.getOne({
        order_id: String(data._id),
        card_id: card.id,
    });
    if (!existingTransaction.output) {
        console.log("Nouvelle transaction à enregistrer");
        const usdAmount = Math.abs(Number(data.amount));
        const transactionResult = await models_1.TransactionModel.create({
            amount: usdAmount,
            currency: "USD",
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
            provider: (0, encryption_1.encodeText)("sudo"),
            status: status,
            reason: data.requestHistory?.[0]?.narration || "",
            description: `Remboursement depuis :: ${merchantName || "Marchand inconnu"} :: ${data.requestHistory?.[0]?.reason} - ${data.requestHistory?.[0]?.narration}`,
            created_at: (0, date_1.utcToLocalTime)(eventTime)?.toISOString() || (0, date_1.utcToLocalTime)(eventTime),
        });
        const transaction = transactionResult.output;
        if (!user) {
            console.log(`User with ID ${card.user_id} not found.`);
            throw new common_2.NotFoundException(`User with ID ${card.user_id} not found.`);
        }
        if (!transaction) {
            console.log(`Transaction with ID ${data._id} not found.`);
            throw new common_2.NotFoundException(`Transaction with ID ${data._id} not found.`);
        }
        if ((0, common_1.wordsInSentence)(String(data.requestHistory?.[0]?.narration), [
            "No",
            "sufficient",
            "funds",
        ])) {
            const remaining_amount = Number((0, common_1.extractUsdAmountFromSentence)(data.requestHistory?.[0]?.narration) || 0);
            if (remaining_amount > 0) {
                await models_1.NotificationModel.create({
                    title: "Echec de remboursement - Fonds insuffisants",
                    customer_id: user.id,
                    text: `Votre remboursement de ${usdAmount} USD sur ${merchantName || "un marchand"} a échoué ! Veuillez ajouter ${remaining_amount} USD pour valider votre remboursement.`,
                    transaction_id: transaction.id,
                    category: "refund_failed",
                });
            }
        }
        console.log("Sudo gère les frais d'échec automatiquement - Pas de prélèvement manuel nécessaire");
    }
};
const handleCardUpdated = async (card, data, eventTime) => {
    let status;
    if (data.status === "active") {
        status = "ACTIVE";
    }
    else if (data.status === "inactive") {
        status = "FREEZE";
    }
    else if (data.status === "canceled") {
        status = "TERMINATED";
    }
    else {
        status = data.status?.toUpperCase();
    }
    const updatedCardResult = await models_1.CardModel.update({ id: card.id }, {
        status,
    });
};
const handleCardTerminated = async (card, data, eventTime) => {
    let status;
    if (data.status === "active") {
        status = "ACTIVE";
    }
    else if (data.status === "inactive") {
        status = "FREEZE";
    }
    else if (data.status === "canceled") {
        status = "TERMINATED";
    }
    else {
        status = data.status?.toUpperCase();
    }
    const updatedCardResult = await models_1.CardModel.update({ id: card.id }, {
        status: "TERMINATED",
        balance_usd: 0,
        balance_xaf: 0,
        balance_user_currency: 0,
        event: `Balance before Termination: ${data.balance} USD`,
    });
    const customerResult = await models_1.CustomerModel.getOne({ id: card.customer_id });
    const customer = customerResult.output;
    if (!customer) {
        console.log(`Customer with ID ${card.customer_id} not found.`);
        throw new common_2.NotFoundException(`Customer with ID ${card.customer_id} not found.`);
    }
    const walletResult = await models_1.WalletModel.getOne({
        company_id: card.company_id,
        currency: "USD",
    });
    const wallet = walletResult.output;
    if (!wallet) {
        console.log(`Wallet with ID ${card.customer_id} not found.`);
        throw new common_2.NotFoundException(`Wallet with ID ${card.customer_id} not found.`);
    }
    if (data.balance) {
        const new_balance = wallet.balance + Number(data.balance);
        await models_1.WalletModel.update({
            id: wallet.id,
        }, {
            balance: new_balance,
        });
        await models_1.TransactionModel.create({
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
            created_at: (0, date_1.utcToLocalTime)(new Date())?.toISOString(),
        });
    }
    console.log(`Automatic termination processed for Card ID ${card.id}.`);
};
//# sourceMappingURL=webhook.service.sudo.js.map