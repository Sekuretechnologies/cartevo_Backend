"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = void 0;
const env_1 = require("../../env");
const models_1 = require("../../models");
const fnOutputHandler_1 = require("../shared/fnOutputHandler");
const axios_1 = require("axios");
const logError = ({ error, requestData, requestHeaders, requestUrl, requestMethod, }) => {
    console.log("--- Sudo API Error Information ---");
    console.log("URL:", requestUrl);
    console.log("METHOD:", requestMethod);
    console.log("Payload:", JSON.stringify(requestData, null, 2));
    console.log("Request Headers:", requestHeaders);
    if (error.response) {
        console.log("Response Status:", error.response.status);
        console.log("Response Message:", error.response.statusText);
        console.log("Response Data (full):", JSON.stringify(error.response.data, null, 2));
        if (error.response.data?.message &&
            Array.isArray(error.response.data.message)) {
            console.log("--- Validation Errors Details ---");
            error.response.data.message.forEach((validationError, index) => {
                console.log(`Validation Error ${index + 1}:`);
                console.log("  Property:", validationError.property);
                console.log("  Value:", JSON.stringify(validationError.value, null, 4));
                console.log("  Target:", JSON.stringify(validationError.target, null, 4));
                if (validationError.children &&
                    Array.isArray(validationError.children)) {
                    console.log("  Children errors:");
                    validationError.children.forEach((child, childIndex) => {
                        console.log(`    Child ${childIndex + 1}:`, JSON.stringify(child, null, 6));
                    });
                }
                console.log("  ---");
            });
            console.log("--- End Validation Errors Details ---");
        }
    }
    else {
        console.log("Error:", error.message);
    }
    console.log("--- End of Sudo API Error Information ---");
};
exports.logError = logError;
const createSudoRequest = ({ method, url, data }) => {
    const config = {
        method,
        url: `${env_1.default.SUDO_BASE_URL}${url}`,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env_1.default.SUDO_API_KEY}`,
        },
        httpsAgent: new (require("https").Agent)({
            rejectUnauthorized: env_1.default.NODE_ENV === "production",
        }),
        timeout: 30000,
        ...(data && { data }),
    };
    return config;
};
const makeSudoRequest = async ({ method, url, data }) => {
    try {
        const config = createSudoRequest({ method, url, data });
        const response = await (0, axios_1.default)(config);
        if (response.data &&
            response.data.statusCode &&
            response.data.statusCode >= 400) {
            console.log("--- Sudo API Error (HTTP 200 but error content) ---");
            console.log("URL:", `${env_1.default.SUDO_BASE_URL}${url}`);
            console.log("Response Status Code:", response.data.statusCode);
            console.log("Response Message:", response.data.message);
            console.log("--- End of Sudo API Error ---");
            return fnOutputHandler_1.default.error({
                error: {
                    message: response.data.message || "Erreur de l'API Sudo",
                    statusCode: response.data.statusCode,
                    details: response.data,
                    payload: data,
                },
            });
        }
        return fnOutputHandler_1.default.success({
            output: response.data,
        });
    }
    catch (error) {
        (0, exports.logError)({
            error,
            requestData: data,
            requestHeaders: { Authorization: `Bearer ${env_1.default.SUDO_API_KEY}` },
            requestUrl: `${env_1.default.SUDO_BASE_URL}${url}`,
            requestMethod: method,
        });
        return fnOutputHandler_1.default.error({
            error: {
                message: error.response?.data?.message || error.message,
                statusCode: error.response?.status || 500,
                details: error.response?.data || null,
            },
        });
    }
};
const createCustomer = async (customerData) => {
    try {
        console.log("Creating Sudo customer with data:", JSON.stringify(customerData, null, 2));
        const result = await makeSudoRequest({
            method: "POST",
            url: "/customers",
            data: customerData,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la création du customer Sudo",
                details: error,
            },
        });
    }
};
const getCustomer = async (customerId) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/customers/${customerId}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération du customer Sudo",
                details: error,
            },
        });
    }
};
const getCustomers = async (page = 0, limit = 100) => {
    try {
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        const result = await makeSudoRequest({
            method: "GET",
            url: `/customers?${queryParams.toString()}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération de la liste des customers Sudo",
                details: error,
            },
        });
    }
};
const updateCustomer = async (customerId, customerData) => {
    try {
        console.log("Updating Sudo customer:", customerId, "with data:", JSON.stringify(customerData, null, 2));
        const result = await makeSudoRequest({
            method: "PUT",
            url: `/customers/${customerId}`,
            data: customerData,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la mise à jour du customer Sudo",
                details: error,
            },
        });
    }
};
const hasCustomer = (user) => {
    return !!user?.sudo_customer_id;
};
const getDollarRate = (countryCode) => {
    return 0;
};
const convertToUsd = (amount, countryCode) => {
    const rate = getDollarRate(countryCode);
    return Math.trunc((amount / rate) * 100) / 100;
};
const convertFromUsd = (usdAmount, countryCode) => {
    const rate = getDollarRate(countryCode);
    return Math.trunc(usdAmount * rate * 100) / 100;
};
const mapIdTypeToSudoIdentity = (idType, country) => {
    return "BVN";
};
const formatDateForSudo = (date) => {
    if (!date)
        return "1990/01/01";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime()))
        return "1990/01/01";
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    return `${year}/${month}/${day}`;
};
const prepareCustomerData = (user) => {
    const firstName = String(user?.first_name || "").trim();
    const lastName = String(user?.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const country = user?.country_iso_code || "CM";
    const billingAddress = {
        country: country,
        state: String(user?.state || "Unknown").trim(),
        city: String(user?.city || "Unknown").trim(),
        line1: String(user?.address || "Address not provided").trim(),
        postalCode: "5734",
    };
    const customerData = {
        type: "individual",
        name: fullName,
        phoneNumber: `+${user?.country_phone_code || "237"}${user?.phone_number || ""}`,
        status: "active",
        billingAddress,
        emailAddress: user?.email || "",
        individual: {
            firstName,
            lastName,
            date_of_birth: formatDateForSudo(user?.date_of_birth),
            otherNames: "",
        },
    };
    if (user?.id_document_front || user?.id_document_back) {
        customerData.individual.documents = {
            idFrontUrl: user?.id_document_front || "",
            idBackUrl: user?.id_document_back || user?.id_document_front,
        };
    }
    return customerData;
};
const createFundingSource = async (fundingSourceData) => {
    try {
        console.log("Creating Sudo funding source with data:", JSON.stringify(fundingSourceData, null, 2));
        const result = await makeSudoRequest({
            method: "POST",
            url: "/fundingsources",
            data: fundingSourceData,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la création de la funding source Sudo",
                details: error,
            },
        });
    }
};
const getFundingSource = async (fundingSourceId) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/fundingsources/${fundingSourceId}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération de la funding source Sudo",
                details: error,
            },
        });
    }
};
const getFundingSources = async () => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: "/fundingsources",
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des funding sources Sudo",
                details: error,
            },
        });
    }
};
const updateFundingSource = async (fundingSourceId, fundingSourceData) => {
    try {
        console.log("Updating Sudo funding source:", fundingSourceId, "with data:", JSON.stringify(fundingSourceData, null, 2));
        const result = await makeSudoRequest({
            method: "PUT",
            url: `/fundingsources/${fundingSourceId}`,
            data: fundingSourceData,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la mise à jour de la funding source Sudo",
                details: error,
            },
        });
    }
};
const getActiveFundingSource = async () => {
    try {
        const fundingSourcesResult = await getFundingSources();
        if (fundingSourcesResult.error) {
            return fnOutputHandler_1.default.error({
                error: {
                    message: "Erreur lors de la récupération des funding sources",
                    details: fundingSourcesResult.error,
                },
            });
        }
        const fundingSources = fundingSourcesResult.output?.data || fundingSourcesResult.output;
        if (!Array.isArray(fundingSources)) {
            return fnOutputHandler_1.default.error({
                error: {
                    message: "Format de réponse funding sources invalide",
                    details: fundingSources,
                },
            });
        }
        const activeFundingSource = fundingSources.find((fs) => fs.type === "default" && fs.status === "active");
        if (!activeFundingSource) {
            return fnOutputHandler_1.default.error({
                error: {
                    message: 'Aucune funding source de type "default" active trouvée',
                    details: fundingSources,
                },
            });
        }
        return fnOutputHandler_1.default.success({
            output: activeFundingSource,
        });
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la recherche de funding source active",
                details: error,
            },
        });
    }
};
const chooseCardBrand = () => {
    const brands = ["Visa", "MasterCard"];
    const randomIndex = Math.floor(Math.random() * brands.length);
    return brands[randomIndex];
};
const getDebitAccountId = () => {
    const isProd = env_1.default.NODE_ENV === "production";
    return isProd
        ? env_1.default.DEBIT_ACCOUNT_ID_PRODUCTION
        : env_1.default.DEBIT_ACCOUNT_ID_SANDBOX;
};
const createCard = async (customerId, brand, amount = 3) => {
    try {
        const fundingSourceResult = await getActiveFundingSource();
        if (fundingSourceResult.error) {
            return fnOutputHandler_1.default.error({
                error: {
                    message: "Impossible de récupérer une funding source active: " +
                        fundingSourceResult.error.message,
                    details: fundingSourceResult.error,
                },
            });
        }
        const activeFundingSource = fundingSourceResult.output;
        const cardData = {
            customerId,
            type: "virtual",
            currency: "USD",
            status: "active",
            fundingSourceId: activeFundingSource._id,
            brand: brand,
            debitAccountId: getDebitAccountId(),
            amount: amount,
            issuerCountry: "USA",
        };
        console.log("Creating Sudo card with data:", JSON.stringify(cardData, null, 2));
        const result = await makeSudoRequest({
            method: "POST",
            url: "/cards",
            data: cardData,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la création de la carte ",
                details: error,
            },
        });
    }
};
const getCard = async (cardId, reveal) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/cards/${cardId}${reveal ? "?reveal=true" : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération de la carte",
                details: error,
            },
        });
    }
};
const getCardAuthorizations = async ({ cardId, page, limit = 100, fromDate, toDate, }) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/cards/${cardId}/authorizations?limit=${limit}${page ? "&page=" + page : ""}${fromDate ? "&fromDate=" + fromDate : ""}${toDate ? "&toDate=" + toDate : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des transactions de la carte",
                details: error,
            },
        });
    }
};
const getCardTransactions = async ({ cardId, page = 0, limit, fromDate, toDate, }) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/cards/${cardId}/transactions?page=${page}${limit ? "&limit=" + limit : ""}${fromDate ? "&fromDate=" + fromDate : ""}${toDate ? "&toDate=" + toDate : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des transactions de la carte",
                details: error,
            },
        });
    }
};
const getAllCardsAuthorizations = async ({ page, limit = 100, fromDate, toDate, }) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/cards/authorizations?limit=${limit}${page ? "&page=" + page : ""}${fromDate ? "&fromDate=" + fromDate : ""}${toDate ? "&toDate=" + toDate : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des transactions de la carte",
                details: error,
            },
        });
    }
};
const getAllCardsTransactions = async ({ page = 0, limit, fromDate, toDate, }) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/cards/transactions?page=${page}${limit ? "&limit=" + limit : ""}${fromDate ? "&fromDate=" + fromDate : ""}${toDate ? "&toDate=" + toDate : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des transactions de la carte",
                details: error,
            },
        });
    }
};
const getCards = async (page, limit) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/cards?page=${page}${limit ? "&limit=" + limit : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des cartes Sudo",
                details: error,
            },
        });
    }
};
const getCustomerCards = async (customerId, page, limit) => {
    try {
        const result = await makeSudoRequest({
            method: "GET",
            url: `/cards/customer/${customerId}?page=${page}${limit ? "&limit=" + limit : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des cartes Sudo",
                details: error,
            },
        });
    }
};
const updateCard = async (cardId, status) => {
    try {
        console.log("Updating Sudo card:", cardId, "to status:", status);
        const result = await makeSudoRequest({
            method: "PUT",
            url: `/cards/${cardId}`,
            data: {
                status: status,
            },
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la mise à jour de la carte Sudo",
                details: error,
            },
        });
    }
};
const getAccountBalance = async (accountId) => {
    try {
        console.log("Getting account balance for account:", accountId);
        const result = await makeSudoRequest({
            method: "GET",
            url: `/accounts/${accountId}/balance`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération du solde du compte",
                details: error,
            },
        });
    }
};
const getAccountTransactions = async ({ accountId, page = 0, limit, fromDate, toDate, }) => {
    try {
        console.log("Getting account balance for account:", accountId);
        const result = await makeSudoRequest({
            method: "GET",
            url: `/accounts/${accountId}/transactions?page=${page}${limit ? "&limit=" + limit : ""}${fromDate ? "&fromDate=" + fromDate : ""}${toDate ? "&toDate=" + toDate : ""}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération des transactions du compte",
                details: error,
            },
        });
    }
};
const transferFunds = async (transferData) => {
    try {
        console.log("Transferring funds:", JSON.stringify(transferData, null, 2));
        const result = await makeSudoRequest({
            method: "POST",
            url: "/accounts/transfer",
            data: transferData,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors du transfert de fonds",
                details: error,
            },
        });
    }
};
const getTransferStatus = async (transferId) => {
    try {
        console.log("Getting transfer status for ID:", transferId);
        const result = await makeSudoRequest({
            method: "GET",
            url: `/accounts/transfers/${transferId}`,
        });
        return result;
    }
    catch (error) {
        return fnOutputHandler_1.default.error({
            error: {
                message: "Erreur lors de la récupération du statut du transfert",
                details: error,
            },
        });
    }
};
async function getLastSyncDate(id) {
    try {
        const result = await models_1.SyncmetadataModel.getOne({
            key: "lastSyncDate",
            customerId: id,
        });
        if (!result.output) {
            return fnOutputHandler_1.default.success({
                output: new Date(0).toISOString().split("T")[0],
            });
        }
        return fnOutputHandler_1.default.success({
            output: new Date(result.output?.value).toISOString().split("T")[0],
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération de la dernière date de synchronisation:", error);
        return fnOutputHandler_1.default.error({
            error: {
                message: "getLastSyncDate error : Erreur lors de la récupération de la dernière date de synchronisation",
            },
        });
    }
}
const sudoUtils = {
    createSudoRequest,
    makeSudoRequest,
    createCustomer,
    getCustomer,
    getCustomers,
    updateCustomer,
    hasCustomer,
    getDollarRate,
    convertToUsd,
    convertFromUsd,
    mapIdTypeToSudoIdentity,
    formatDateForSudo,
    prepareCustomerData,
    logError: exports.logError,
    createFundingSource,
    getFundingSource,
    getFundingSources,
    updateFundingSource,
    getActiveFundingSource,
    chooseCardBrand,
    getDebitAccountId,
    createCard,
    getCard,
    getCardTransactions,
    getCardAuthorizations,
    getAllCardsTransactions,
    getAllCardsAuthorizations,
    getCards,
    getCustomerCards,
    updateCard,
    getAccountBalance,
    getAccountTransactions,
    transferFunds,
    getTransferStatus,
    getLastSyncDate,
};
exports.default = sudoUtils;
//# sourceMappingURL=sudo.js.map