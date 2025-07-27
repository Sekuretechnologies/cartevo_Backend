"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const cardModel_1 = require("../../models/prisma/cardModel");
const companyModel_1 = require("../../models/prisma/companyModel");
const customerModel_1 = require("../../models/prisma/customerModel");
const transactionModel_1 = require("../../models/prisma/transactionModel");
const walletModel_1 = require("../../models/prisma/walletModel");
const sudo_1 = require("../../utils/cards/sudo");
const customerLogsModel_1 = require("../../models/prisma/customerLogsModel");
const common_2 = require("../../utils/shared/common");
const uuid_1 = require("uuid");
const encryption_1 = require("../../utils/shared/encryption");
const date_1 = require("../../utils/date");
let CardService = class CardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCard(createCardDto) {
        return cardModel_1.default.operation(async (prisma) => {
            const nameOnCard = createCardDto.name_on_card;
            const currencyAmount = Number(createCardDto.amount);
            if (!createCardDto.brand) {
                throw new common_1.BadRequestException("La marque de la carte est requise");
            }
            if (isNaN(currencyAmount) || currencyAmount < 2) {
                throw new common_1.BadRequestException("Le montant doit être au minimum 2 USD");
            }
            const brand = createCardDto.brand.toUpperCase();
            const validBrands = ["MASTERCARD", "VISA"];
            if (!validBrands.includes(brand)) {
                throw new common_1.BadRequestException("La marque doit être MASTERCARD ou VISA");
            }
            const customerResult = await customerModel_1.default.getOne({
                id: createCardDto.customer_id,
            });
            if (customerResult.error || !customerResult.output) {
                throw new common_1.NotFoundException("Customer not found");
            }
            const customer = customerResult.output;
            const companyId = customer.company_id;
            const actualDate = new Date(Date.now() + 3600 * 1000);
            const birthdate = customer.date_of_birth;
            const differenceEnMilliseconds = actualDate.getTime() - new Date(birthdate).getTime();
            const age = Math.floor(differenceEnMilliseconds / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 18) {
                throw new common_1.BadRequestException("Vous n'avez pas l'âge requis pour pouvoir effectuer cette opération.");
            }
            const cardSizeResult = await cardModel_1.default.count({
                customer_id: createCardDto.customer_id,
                status: { not: client_1.CardStatus.TERMINATED },
                company_id: companyId,
            });
            const cardSize = Number(cardSizeResult.output || 0);
            if (cardSize >= 5) {
                throw new common_1.BadRequestException("Vous ne pouvez pas créer plus de 5 cartes !");
            }
            const companyResult = await companyModel_1.default.getOne({ id: companyId });
            if (companyResult.error || !companyResult.output) {
                throw new common_1.NotFoundException("Company not found");
            }
            const company = companyResult.output;
            const usdWalletResult = await walletModel_1.default.getOne({
                company_id: companyId,
                currency: "USD",
                active: true,
            });
            if (usdWalletResult.error || !usdWalletResult.output) {
                throw new common_1.BadRequestException("USD wallet not found");
            }
            const usdWallet = usdWalletResult.output;
            const cardCreationFee = company.cardPrice.toNumber();
            const cardFundingAmount = Number(createCardDto.amount);
            const walletBalanceBefore = usdWallet.balance.toNumber();
            if (walletBalanceBefore < cardCreationFee + cardFundingAmount) {
                throw new common_1.BadRequestException("Insufficient wallet balance to create card");
            }
            let sudoCustomerId = customer.sudo_customer_id;
            let newCustomer;
            if (!sudo_1.default.hasCustomer(customer)) {
                const customerData = sudo_1.default.prepareCustomerData(customer);
                const customerResult = await sudo_1.default.createCustomer(customerData);
                if (customerResult.error) {
                    console.error("Error creating Sudo customer:", customerResult.error);
                    throw new common_1.BadRequestException("Error creating PVD customer: " + customerResult.error.message);
                }
                newCustomer = customerResult.output?.data || customerResult.output;
                sudoCustomerId = newCustomer?._id || newCustomer?.id;
                if (!sudoCustomerId) {
                    throw new Error("PVD Customer created but ID not returned");
                }
                await customerModel_1.default.update(String(customer.id), {
                    sudo_customer_id: sudoCustomerId,
                });
            }
            const sudoBrand = brand.toUpperCase() === "MASTERCARD" ? "MasterCard" : "Visa";
            console.log(`🚀 Creating Sudo card for user ${customer.phone_number}:`, {
                sudoCustomerId,
                sudoBrand,
                currencyAmount,
                cardCreationFee,
                walletBalanceBefore,
            });
            const cardSudoResult = await sudo_1.default.createCard(sudoCustomerId, sudoBrand, currencyAmount);
            console.log(`📥 Sudo API Response for user ${customer.phone_number}:`, {
                success: !cardSudoResult.error,
                error: cardSudoResult.error,
                output: cardSudoResult.output,
                fullResponse: JSON.stringify(cardSudoResult, null, 2),
            });
            if (cardSudoResult.error) {
                console.error("❌ Error creating Sudo card:", cardSudoResult.error);
                const customerData = sudo_1.default.prepareCustomerData(customer);
                const err = cardSudoResult.error;
                const CustomerLogsResult = await customerLogsModel_1.default.create({
                    customer_id: String(customer?.id),
                    customer_phone_number: String(customer?.phone_number),
                    action: "card-purchase",
                    status: "FAILED",
                    log_json: {
                        sudoCustomerId,
                        customer,
                        isUpdateCustomerDetailsError: (0, common_2.wordsInSentence)(cardSudoResult.error.message, ["update", "customer", "details"]),
                        customerDataForUpdate: customerData,
                        payload: err?.payload,
                        error_message: err?.message,
                        error_response_data: err?.details,
                        error_response_data_error: err?.details?.error,
                        error_response_data_errors: err?.details?.errors,
                    },
                    log_txt: `createCard : Error creating Sudo card : ${customer?.phone_number} :: ${err.details
                        ? JSON.stringify(err.details)
                        : JSON.stringify(err.message)}`,
                    created_at: new Date(),
                });
                if (cardSudoResult.error.message === "No sufficient funds") {
                    throw new common_1.BadRequestException("No sufficient funds.");
                }
                if ((0, common_2.wordsInSentence)(cardSudoResult.error.message, [
                    "update",
                    "customer",
                    "details",
                ])) {
                    const updateResult = await sudo_1.default.updateCustomer(customer.sudo_customer_id, customerData);
                    if (updateResult.error) {
                        const CustomerLogsResult = await customerLogsModel_1.default.create({
                            customer_id: String(customer?.id),
                            customer_phone_number: String(customer?.phone_number),
                            action: "card-purchase-updateCustomer",
                            status: "FAILED",
                            log_json: {
                                customerId: customer?.sudo_customer_id,
                                customerData,
                                payload: updateResult.error?.payload,
                                error_message: updateResult.error?.message,
                                error_response_data: updateResult.error?.details,
                                error_response_data_error: updateResult.error?.details?.error,
                                error_response_data_errors: updateResult.error?.details?.errors,
                            },
                            log_txt: `createCard : updateCustomer : Erreur lors de la mise à jour du customer : ${customer?.phone_number} :: ${updateResult.error?.details
                                ? JSON.stringify(updateResult.error.details)
                                : JSON.stringify(updateResult.error.message)}`,
                            created_at: new Date(),
                        });
                    }
                }
                throw new common_1.BadRequestException("Error creating card: " + cardSudoResult.error.message);
            }
            const cardData = cardSudoResult.output?.data || cardSudoResult.output;
            console.log(`💳 Extracted card data for user ${customer?.phone_number}:`, {
                cardData,
                hasCardData: !!cardData,
                cardId: cardData?._id || cardData?.id,
                brand: cardData?.brand,
                status: cardData?.status,
                cardNumber: cardData?.cardNumber ? "PRESENT" : "MISSING",
            });
            console.log("🔍 Card data validation:", {
                hasCardData: !!cardData,
                hasId: !!cardData?._id,
                statusCode: cardData?.statusCode,
                validCondition: cardData && cardData._id && !cardData.statusCode,
            });
            if (cardData && cardData._id && !cardData.statusCode) {
                const balanceAfterCreatedCard = Math.round((walletBalanceBefore - cardCreationFee + Number.EPSILON) * 100) / 100;
                const balanceAfterFirstFundingCard = Math.round((balanceAfterCreatedCard - cardFundingAmount + Number.EPSILON) * 100) / 100;
                const walletUpdateResult = await walletModel_1.default.update(usdWallet.id, {
                    balance: balanceAfterFirstFundingCard,
                });
                if (walletUpdateResult.error) {
                    console.error("❌ Erreur lors de la mise à jour du solde du wallet:", walletUpdateResult.error);
                    throw new common_1.BadRequestException("Error updating wallet balance: " + walletUpdateResult.error.message);
                }
                const cardId = (0, uuid_1.v4)();
                const transactionId = (0, uuid_1.v4)();
                const cardName = nameOnCard
                    ? nameOnCard
                    : `${customer.first_name} ${customer.last_name}`;
                const sudoBalance = cardData.balance ??
                    cardData.account?.availableBalance ??
                    cardData.account?.currentBalance ??
                    0;
                let tokenCardNumber = cardData.cardNumber || "***";
                let tokenCardCvv = cardData.cvv || "***";
                const cardSudoResult = await sudo_1.default.getCard(cardData?._id || cardData?.id, true);
                const cardSudo = cardSudoResult.output?.data || cardSudoResult.output;
                console.log("Created Card [cvv, number] :: Card Sudo details:", cardSudo);
                if (cardSudo?.cvv) {
                    tokenCardNumber = `tkSkr_${(0, encryption_1.signToken)(cardSudo?.number)}`;
                    tokenCardCvv = `tkSkr_${(0, encryption_1.signToken)(cardSudo?.cvv)}`;
                }
                const newCardResult = await cardModel_1.default.create({
                    id: cardId,
                    status: cardData.status?.toUpperCase() || "ACTIVE",
                    customer_id: customer.id,
                    company_id: customer.company_id,
                    country: customer.country_iso_code,
                    brand: (cardData.brand || sudoBrand).toUpperCase(),
                    provider: (0, encryption_1.encodeText)("sudo"),
                    currency: "USD",
                    name: cardName.toUpperCase(),
                    balance: sudoBalance,
                    reference: cardData.account?._id,
                    provider_card_id: cardData._id || cardData.id,
                    number: tokenCardNumber,
                    masked_number: cardData.maskedPan || `****-****-****-${cardData.last4 || "****"}`,
                    last4: cardData.last4,
                    cvv: tokenCardCvv,
                    expiry_month: cardData.expiryMonth || 12,
                    expiry_year: cardData.expiryYear || 99,
                    postal_code: "05734",
                    street: customer?.address || cardData.billingAddress?.line1 || "",
                    city: customer?.city || cardData.billingAddress?.city || "",
                    state_code: customer?.state || cardData.billingAddress?.state || "",
                    country_iso_code: customer?.country_iso_code ||
                        cardData.billingAddress?.country ||
                        "",
                    is_active: true,
                    is_virtual: true,
                });
                console.log("🔍 CardModel.createCard result:", {
                    success: !newCardResult.error,
                    error: newCardResult.error,
                    hasOutput: !!newCardResult.output,
                    outputKeys: newCardResult.output
                        ? Object.keys(newCardResult.output)
                        : null,
                });
                const newCard = newCardResult.output;
                if (newCardResult.error) {
                    console.error("❌ Erreur création carte locale:", newCardResult.error);
                    const err = newCardResult.error;
                    const userLogsResult = await customerLogsModel_1.default.create({
                        id: (0, uuid_1.v4)(),
                        customer_id: String(customer?.id),
                        customer_phone_number: String(customer?.phone_number),
                        action: "card-purchase",
                        status: "FAILED",
                        log_json: {
                            payload: err?.payload,
                            error_message: err?.message,
                            error_response_data: err?.response?.data,
                            error_response_data_error: err?.response?.data?.error,
                            error_response_data_errors: err?.response?.data?.errors,
                        },
                        log_txt: `createCard error: ${customer?.phone_number} :: ${err.response
                            ? JSON.stringify(err.response?.data)
                            : JSON.stringify(err.message)}`,
                        created_at: new Date(),
                    });
                    throw new common_1.BadRequestException("Error creating db card: " + err.message);
                }
                if (!newCard) {
                    console.error("❌ newCard est null/undefined après création");
                    throw new common_1.BadRequestException("Card not saved in local DB");
                }
                const transactionResult = await transactionModel_1.default.create({
                    id: transactionId,
                    status: "SUCCESS",
                    category: "card",
                    type: "purchase",
                    amount: cardCreationFee,
                    currency: "USD",
                    customer_id: String(customer.id),
                    company_id: String(customer.company_id),
                    card_id: String(cardId),
                    card_balance_before: 0,
                    card_balance_after: 0,
                    wallet_balance_before: walletBalanceBefore,
                    wallet_balance_after: balanceAfterCreatedCard,
                    provider: (0, encryption_1.encodeText)("sudo"),
                    created_at: (0, date_1.utcToLocalTime)(new Date())?.toISOString(),
                });
                console.log("🔍 TransactionModel.createTransaction result:", {
                    success: !transactionResult.error,
                    error: transactionResult.error,
                    hasOutput: !!transactionResult.output,
                });
                const transaction = transactionResult.output;
                const topupTransactionResult = await transactionModel_1.default.create({
                    id: (0, uuid_1.v4)(),
                    amount: currencyAmount,
                    currency: "USD",
                    category: "card",
                    type: "fund",
                    description: "Card first funding",
                    status: "SUCCESS",
                    customer_id: String(customer.id),
                    company_id: String(customer.company_id),
                    card_id: String(cardId),
                    card_balance_before: 0,
                    card_balance_after: currencyAmount,
                    wallet_balance_before: balanceAfterCreatedCard,
                    wallet_balance_after: balanceAfterFirstFundingCard,
                    provider: (0, encryption_1.encodeText)("sudo"),
                    created_at: (0, date_1.utcToLocalTime)(new Date())?.toISOString(),
                });
                const topupTransaction = topupTransactionResult.output;
                try {
                    await customerLogsModel_1.default.create({
                        id: (0, uuid_1.v4)(),
                        customer_id: customer.id,
                        customer_phone_number: String(customer.phone),
                        action: "card-purchase",
                        status: "SUCCESS",
                        log_json: {
                            card_data: cardData,
                            transaction_id: transactionId,
                            card_id: cardId,
                            customer_id: customer.id,
                            transaction_success: !!transaction,
                            topup_transaction_success: !!topupTransaction,
                            new_card_success: !!newCard,
                        },
                        log_txt: `createCard success: ${customer.phone} :: Sudo card created successfully`,
                        created_at: new Date(),
                    });
                }
                catch (logError) {
                    console.error("Error logging user action:", logError);
                }
                return {
                    status: "success",
                    message: "Card created successfully",
                    card: newCard,
                };
            }
            else {
                console.log(`${customer.id} created card - FAILED`);
                throw new common_1.BadRequestException("Something went wrong");
            }
        });
    }
    async fundCard(companyId, cardId, amount) {
        return cardModel_1.default.operation(async (prisma) => {
            const cardResult = await cardModel_1.default.getOne({
                id: cardId,
                company_id: companyId,
                status: { not: client_1.CardStatus.TERMINATED },
            });
            if (cardResult.error) {
                throw new common_1.NotFoundException(cardResult.error.message);
            }
            const card = cardResult.output;
            if (!card) {
                throw new common_1.NotFoundException("Card not found");
            }
            if ((0, encryption_1.decodeText)(card.provider) !== "sudo") {
                throw new common_1.BadRequestException("Incorrect card source");
            }
            if (card.status === client_1.CardStatus.FROZEN) {
                throw new common_1.BadRequestException("Cannot fund a frozen card");
            }
            if (amount < 1) {
                throw new common_1.BadRequestException("Minimum 1 USD required");
            }
            const companyResult = await companyModel_1.default.getOne({ id: companyId });
            if (companyResult.error || !companyResult.output) {
                throw new common_1.NotFoundException("Company not found");
            }
            const company = companyResult.output;
            const usdWalletResult = await walletModel_1.default.getOne({
                company_id: companyId,
                currency: "USD",
                active: true,
            });
            if (usdWalletResult.error || !usdWalletResult.output) {
                throw new common_1.BadRequestException("USD wallet not found");
            }
            const usdWallet = usdWalletResult.output;
            const customerResult = await cardModel_1.default.getOne({
                id: cardId,
                company_id: companyId,
                status: { not: client_1.CardStatus.TERMINATED },
            });
            if (customerResult.error) {
                throw new common_1.NotFoundException(customerResult.error.message);
            }
            const customer = customerResult.output;
            try {
                const creditAccountId = card.reference;
                if (!creditAccountId) {
                    throw new common_1.BadRequestException("Card account ID not found");
                }
                const debitAccountId = sudo_1.default.getDebitAccountId();
                console.log("🏦 Using debit account ID:", debitAccountId);
                const transactionId = (0, uuid_1.v4)();
                const payload = {
                    debitAccountId: debitAccountId,
                    creditAccountId: creditAccountId,
                    amount: amount,
                    narration: `Recharge carte ${card.masked_number || "XXXX"} - ${amount} USD`,
                    paymentReference: transactionId,
                };
                const transferResult = await sudo_1.default.transferFunds(payload);
                if (transferResult.error) {
                    const err = transferResult.error;
                    console.error("❌ Erreur transfert Sudo:", transferResult.error);
                    const userLogsResult = await customerLogsModel_1.default.create({
                        customer_id: String(customer?.id),
                        customer_phone_number: String(customer?.phone),
                        action: "fund-card-sudo",
                        status: "FAILED",
                        log_json: {
                            payload,
                            error_message: err?.message,
                            error_response_data: err?.response?.data,
                            error_response_data_details: err?.response?.details,
                            error_response_data_error: err?.response?.data?.error,
                            error_response_data_errors: err?.response?.data?.errors,
                            error_response_data_error_errors: err?.response?.data?.error?.errors,
                        },
                        log_txt: `fund-card-sudo error: ${customer?.phone} :: ${err.response
                            ? JSON.stringify(err.response.data)
                            : JSON.stringify(err.message)}`,
                    });
                    throw new common_1.BadRequestException("Error funding PVD Card: " + transferResult.error.message);
                }
                const transferData = transferResult.output?.data || transferResult.output;
                console.log("📋 Réponse transfert Sudo:", transferData);
                const transferStatus = transferData.status;
                const transferId = transferData.id || transferData._id;
                if (transferStatus !== "completed") {
                    console.error("❌ Transfert Sudo échoué:", {
                        status: transferStatus,
                        responseCode: transferData.responseCode,
                        responseMessage: transferData.responseMessage,
                        transferData,
                    });
                    throw new common_1.BadRequestException(`Card funding failed: ${transferData.responseMessage || "Status not completed"}`);
                }
                if (!transferId) {
                    console.error("❌ ID du transfert manquant:", transferData);
                    throw new common_1.BadRequestException(`No transfer ID found in response: operation aborted.`);
                }
                console.log("✅ Transfert Sudo réussi et complété avec ID:", transferId);
                const totalCost = amount;
                const walletBalanceBefore = usdWallet.balance.toNumber();
                const cardBalanceBefore = card.balance.toNumber();
                if (walletBalanceBefore < totalCost) {
                    throw new common_1.BadRequestException("Insufficient wallet balance for funding");
                }
                const cardBalanceAfter = cardBalanceBefore + amount;
                const walletBalanceAfter = walletBalanceBefore - totalCost;
                const updateResult = await cardModel_1.default.update(cardId, {
                    balance: cardBalanceAfter,
                });
                if (updateResult.error) {
                    throw new common_1.BadRequestException(updateResult.error.message);
                }
                const walletUpdateResult = await walletModel_1.default.update(usdWallet.id, {
                    balance: walletBalanceAfter,
                });
                if (walletUpdateResult.error) {
                    throw new common_1.BadRequestException(walletUpdateResult.error.message);
                }
                const transactionResult = await transactionModel_1.default.create({
                    category: "card",
                    type: "fund",
                    card_id: cardId,
                    customer_id: customer.id,
                    company_id: company.id,
                    status: "SUCCESS",
                    provider: (0, encryption_1.encodeText)("sudo"),
                    id: transactionId,
                    card_balance_before: cardBalanceBefore,
                    card_balance_after: cardBalanceAfter,
                    wallet_balance_before: walletBalanceBefore,
                    wallet_balance_after: walletBalanceAfter,
                    amount: amount,
                    currency: "USD",
                    order_id: transferData.id || transferData._id || transactionId,
                    description: `Card funding: ${card.masked_number || "XXXX"} | Amount: ${amount} USD`,
                    created_at: (0, date_1.utcToLocalTime)(new Date())?.toISOString(),
                });
                if (transactionResult.error) {
                    throw new common_1.BadRequestException(transactionResult.error.message);
                }
                return {
                    status: "success",
                    message: `Card funded successfully with $${amount} (Cost: $${totalCost.toFixed(2)})`,
                };
            }
            catch (err) {
                console.error("Sudo fundCard error:", err);
                try {
                    await customerLogsModel_1.default.create({
                        id: (0, uuid_1.v4)(),
                        customer_id: String(customer?.id),
                        customer_phone_number: String(customer?.phone_number),
                        action: "sudo_card_funding",
                        status: "FAILED",
                        log_json: {
                            card_id: cardId,
                            amount: amount,
                            error_message: err.message,
                            error_details: err,
                        },
                        log_txt: `Sudo card funding failed: ${err.message}`,
                        created_at: new Date(),
                    });
                }
                catch (logError) {
                    console.error("Error logging card funding failure:", logError);
                }
                throw new common_1.BadRequestException("An error occured while funding the card. Please try again later.");
            }
        });
    }
    async withdrawFromCard(companyId, cardId, amount) {
        return cardModel_1.default.operation(async (prisma) => {
            const cardResult = await cardModel_1.default.getOne({
                id: cardId,
                company_id: companyId,
                status: { not: client_1.CardStatus.TERMINATED },
            });
            if (cardResult.error) {
                throw new common_1.NotFoundException(cardResult.error.message);
            }
            const card = cardResult.output;
            if (!card) {
                throw new common_1.NotFoundException("Card not found");
            }
            if ((0, encryption_1.decodeText)(card.provider) !== "sudo") {
                throw new common_1.BadRequestException("Incorrect card source");
            }
            if (card.status === client_1.CardStatus.FROZEN) {
                throw new common_1.BadRequestException("Cannot withdraw from a frozen card");
            }
            if (amount < 1) {
                throw new common_1.BadRequestException("Minimum 1 USD required");
            }
            const cardBalanceBefore = card.balance.toNumber();
            if (cardBalanceBefore < amount) {
                throw new common_1.BadRequestException("Insufficient card balance");
            }
            const companyResult = await companyModel_1.default.getOne({ id: companyId });
            if (companyResult.error || !companyResult.output) {
                throw new common_1.NotFoundException("Company not found");
            }
            const company = companyResult.output;
            const usdWalletResult = await walletModel_1.default.getOne({
                company_id: companyId,
                currency: "USD",
                active: true,
            });
            if (usdWalletResult.error || !usdWalletResult.output) {
                throw new common_1.BadRequestException("USD wallet not found");
            }
            const usdWallet = usdWalletResult.output;
            const customerResult = await cardModel_1.default.getOne({
                id: cardId,
                company_id: companyId,
                status: { not: client_1.CardStatus.TERMINATED },
            });
            if (customerResult.error) {
                throw new common_1.NotFoundException(customerResult.error.message);
            }
            const customer = customerResult.output;
            const transactionId = (0, uuid_1.v4)();
            try {
                const debitAccountId = card.reference;
                const creditAccountId = sudo_1.default.getDebitAccountId();
                if (!debitAccountId) {
                    throw new common_1.BadRequestException("card account ID not found");
                }
                console.log("🏦 Retrait - Compte carte (débit):", debitAccountId);
                console.log("🏦 Retrait - Compte principal (crédit):", creditAccountId);
                const transferResult = await sudo_1.default.transferFunds({
                    debitAccountId: debitAccountId,
                    creditAccountId: creditAccountId,
                    amount: amount,
                    narration: `Retrait carte ${card.masked_number || "XXXX"} - ${amount} USD`,
                    paymentReference: transactionId,
                });
                if (transferResult.error) {
                    console.error("❌ Erreur transfert retrait Sudo:", transferResult.error);
                    throw new common_1.BadRequestException("Withdrawal error: " + transferResult.error.message);
                }
                const transferData = transferResult.output?.data || transferResult.output;
                console.log("📋 Réponse transfert retrait Sudo:", transferData);
                const transferStatus = transferData.status;
                const transferId = transferData.id || transferData._id;
                if (transferStatus !== "completed" && transferStatus !== "pending") {
                    console.error("❌ Transfert retrait Sudo échoué:", {
                        status: transferStatus,
                        responseCode: transferData.responseCode,
                        responseMessage: transferData.responseMessage,
                        transferData,
                    });
                    throw new common_1.BadRequestException(`Withdrawal failed: ${transferData.responseMessage || "Status not completed"}`);
                }
                if (!transferId) {
                    console.error("❌ ID du transfert retrait manquant:", transferData);
                    throw new common_1.BadRequestException("transfer ID not found in response: operation aborted.");
                }
                console.log("✅ Transfert retrait Sudo réussi avec ID:", transferId);
                const walletBalanceBefore = usdWallet.balance.toNumber();
                const cardBalanceAfter = cardBalanceBefore - amount;
                const walletBalanceAfter = walletBalanceBefore + amount;
                const updateResult = await cardModel_1.default.update(cardId, {
                    balance: cardBalanceAfter,
                });
                if (updateResult.error) {
                    throw new common_1.BadRequestException(updateResult.error.message);
                }
                const walletUpdateResult = await walletModel_1.default.update(usdWallet.id, {
                    balance: walletBalanceAfter,
                });
                if (walletUpdateResult.error) {
                    throw new common_1.BadRequestException(walletUpdateResult.error.message);
                }
                const transactionResult = await transactionModel_1.default.create({
                    category: "card",
                    type: "withdraw",
                    card_id: cardId,
                    customer_id: customer.id,
                    company_id: company.id,
                    status: "SUCCESS",
                    provider: (0, encryption_1.encodeText)("sudo"),
                    id: transactionId,
                    card_balance_before: cardBalanceBefore,
                    card_balance_after: cardBalanceAfter,
                    wallet_balance_before: walletBalanceBefore,
                    wallet_balance_after: walletBalanceAfter,
                    amount: amount,
                    currency: "USD",
                    order_id: transferData._id,
                    description: `Withdraw from Card : ${card.masked_number || "XXXX"} | Amount: ${amount} USD`,
                    created_at: (0, date_1.utcToLocalTime)(new Date())?.toISOString(),
                });
                if (transactionResult.error) {
                    throw new common_1.BadRequestException(transactionResult.error.message);
                }
                return {
                    status: "success",
                    message: `Successfully withdrawn $${amount} from card`,
                };
            }
            catch (err) {
                console.error("Error during withdrawal:", err);
                try {
                    await customerLogsModel_1.default.create({
                        id: (0, uuid_1.v4)(),
                        customer_id: String(customer?.id),
                        customer_phone_number: String(customer?.phone_number),
                        action: "card_withdrawal",
                        status: "FAILED",
                        log_json: {
                            card_id: cardId,
                            amount: amount,
                            error_message: err.message,
                            error_details: err,
                        },
                        log_txt: `Sudo card withdrawal failed: ${err.message}`,
                        created_at: new Date(),
                    });
                }
                catch (logError) {
                    console.error("Error logging card withdrawal failure:", logError);
                }
                throw new common_1.BadRequestException("An error occurred while processing the withdrawal");
            }
        });
    }
    async freezeCard(companyId, cardId) {
        const cardResult = await cardModel_1.default.getOne({
            id: cardId,
            company_id: companyId,
            status: { not: client_1.CardStatus.TERMINATED },
        });
        if (cardResult.error) {
            throw new common_1.NotFoundException(cardResult.error.message);
        }
        const card = cardResult.output;
        if (card.status === client_1.CardStatus.FROZEN) {
            throw new common_1.BadRequestException("Card is already frozen");
        }
        const updateResult = await cardModel_1.default.update(cardId, {
            status: client_1.CardStatus.FROZEN,
        });
        if (updateResult.error) {
            throw new common_1.BadRequestException(updateResult.error.message);
        }
        return {
            success: true,
            message: "Card frozen successfully",
        };
    }
    async unfreezeCard(companyId, cardId) {
        const cardResult = await cardModel_1.default.getOne({
            id: cardId,
            company_id: companyId,
            status: { not: client_1.CardStatus.TERMINATED },
        });
        if (cardResult.error) {
            throw new common_1.NotFoundException(cardResult.error.message);
        }
        const card = cardResult.output;
        if (card.status !== client_1.CardStatus.FROZEN) {
            throw new common_1.BadRequestException("Card is not frozen");
        }
        const updateResult = await cardModel_1.default.update(cardId, {
            status: client_1.CardStatus.ACTIVE,
        });
        if (updateResult.error) {
            throw new common_1.BadRequestException(updateResult.error.message);
        }
        return {
            success: true,
            message: "Card unfrozen successfully",
        };
    }
    async findAllByCompany(companyId) {
        const cardsResult = await cardModel_1.default.get({ company_id: companyId });
        if (cardsResult.error) {
            throw new common_1.BadRequestException(cardsResult.error.message);
        }
        const cards = cardsResult.output;
        return cards.map((card) => this.mapToResponseDto(card));
    }
    async findOne(companyId, cardId, reveal) {
        const cardResult = await cardModel_1.default.getOne({
            id: cardId,
            company_id: companyId,
        });
        if (cardResult.error) {
            throw new common_1.NotFoundException(cardResult.error.message);
        }
        const card = cardResult.output;
        let cardSudoData;
        let cardData = card;
        if (String(reveal) === "true") {
            if (card.cvv?.startsWith("***")) {
                const cardSudoResult = await sudo_1.default.getCard(card.provider_card_id, String(reveal) === "true" ? true : false);
                if (cardSudoResult.error) {
                    console.error("❌ Erreur récupération carte Sudo:", cardSudoResult.error);
                }
                cardSudoData = cardSudoResult.output?.data || cardSudoResult.output;
                cardData = {
                    ...cardData,
                    number: cardSudoData?.number,
                    cvv: cardSudoData?.cvv,
                };
                if (cardData?.cvv) {
                    const tokenCardNumber = `tkSkr_${(0, encryption_1.signToken)(cardData?.number)}`;
                    const tokenCardCvv = `tkSkr_${(0, encryption_1.signToken)(cardData?.cvv)}`;
                    const updatedCardResult = await cardModel_1.default.update(card.id, {
                        number: tokenCardNumber,
                        cvv: tokenCardCvv,
                    });
                }
            }
            else if (card.cvv?.startsWith("tkSkr_")) {
                const decodedTokenCardNumber = (0, encryption_1.decodeToken)(card.number.replace(/^tkSkr_/, ""))?.value;
                const decodedTokenCardCvv = (0, encryption_1.decodeToken)(card.cvv.replace(/^tkSkr_/, ""))?.value;
                cardData = {
                    ...cardData,
                    number: decodedTokenCardNumber,
                    cvv: decodedTokenCardCvv,
                };
            }
        }
        return this.mapToResponseDto(cardData);
    }
    async getTransactions(companyId, cardId) {
        const cardResult = await cardModel_1.default.getOne({
            id: cardId,
            company_id: companyId,
        });
        if (cardResult.error) {
            throw new common_1.NotFoundException(cardResult.error.message);
        }
        const card = cardResult.output;
        const transactionsResult = await transactionModel_1.default.get({ card_id: cardId });
        if (transactionsResult.error) {
            throw new common_1.BadRequestException(transactionsResult.error.message);
        }
        const transactions = transactionsResult.output;
        return transactions.map((transaction) => ({
            id: transaction.id,
            category: transaction.category,
            type: transaction.type,
            card_id: transaction.card_id,
            card_balance_before: transaction.card_balance_before.toNumber(),
            card_balance_after: transaction.card_balance_after.toNumber(),
            wallet_balance_before: transaction.wallet_balance_before.toNumber(),
            wallet_balance_after: transaction.wallet_balance_after.toNumber(),
            amount: transaction.amount.toNumber(),
            currency: transaction.currency,
            status: transaction.status,
            created_at: transaction.createdAt,
        }));
    }
    generateCardNumber() {
        const prefix = "4";
        const randomDigits = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join("");
        return prefix + randomDigits;
    }
    mapToResponseDto(card) {
        return {
            id: card.id,
            customer_id: card.customer_id,
            status: card.status,
            balance: parseFloat(card.balance.toString()),
            number: this.maskCardNumber(card.number),
            created_at: card.created_at,
            customer: card.customer
                ? {
                    id: card.customer.id,
                    first_name: card.customer.first_name,
                    last_name: card.customer.last_name,
                    email: card.customer.email,
                }
                : undefined,
        };
    }
    maskCardNumber(cardNumber) {
        return (cardNumber.substring(0, 4) + "*".repeat(8) + cardNumber.substring(12));
    }
};
exports.CardService = CardService;
exports.CardService = CardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CardService);
//# sourceMappingURL=card.service.js.map