import env from "@/env";
import fnOutput, { OutputProps } from "@/utils/shared/fnOutputHandler";
import axios from "axios";
import {
  convertFromSmallestUnit,
  convertToSmallestUnit,
  handleMapleradError,
  validateCreateCardData,
  validateEnrollCustomerData,
} from "./tools";
import {
  MapleradEnrollCustomerData,
  MapleradCreateCardData,
  IMapleradConfig,
  MapleradCard,
} from "./types";

/**
 * Create authenticated request configuration for Maplerad API
 */
const createMapleradRequest = ({ method, url, data }: IMapleradConfig) => {
  const config = {
    method,
    url: `${env.MAPLERAD_BASE_URL}${url}`,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MAPLERAD_SECRET_KEY}`,
    },
    ...(data && { data }),
  };
  console.log("createMapleradRequest : config : ", config);

  return config;
};

/**
 * Make authenticated request to Maplerad API
 */
export const makeMapleradRequest = async ({
  method,
  url,
  data,
}: IMapleradConfig) => {
  try {
    const config = createMapleradRequest({ method, url, data });
    const response = await axios(config);

    // Check if response contains error even with HTTP 200
    if (
      response.data &&
      response.data.statusCode &&
      response.data.statusCode >= 400
    ) {
      console.log("--- Maplerad API Error (HTTP 200 but error content) ---");
      console.log("URL:", `${env.MAPLERAD_BASE_URL}${url}`);
      console.log("Response Status Code:", response.data.statusCode);
      console.log("Response Message:", response.data.message);
      console.log("--- End of Maplerad API Error ---");

      return fnOutput.error({
        error: {
          message: response.data.message || "Erreur de l'API Maplerad",
          statusCode: response.data.statusCode,
          details: response.data,
        },
      });
    }

    return fnOutput.success({
      output: response.data,
    });
  } catch (error: any) {
    console.error("Maplerad API Error:", error.message);
    console.error("Request details:", { method, url, data });

    return fnOutput.error({
      error: {
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
        details: error.response?.data || null,
      },
    });
  }
};

/**
 * Create a new customer in Maplerad
 */
const createCustomer = async (customerData: MapleradEnrollCustomerData) => {
  try {
    console.log("🏦 ENROLLMENT CUSTOMER MAPLERAD - START", {
      email: customerData?.email,
      firstName: customerData?.first_name,
      lastName: customerData?.last_name,
      country: customerData?.country,
      identityType: customerData?.identity?.type,
      hasIdentityImage: !!customerData?.identity?.image,
      hasPhoto: !!customerData?.photo,
      operation: "enrollCustomerFull",
    });

    // Validation des champs requis
    validateEnrollCustomerData(customerData);

    const result = await makeMapleradRequest({
      method: "POST",
      url: "/customers/enroll",
      data: customerData,
    });

    console.log("🏦 ENROLLMENT CUSTOMER MAPLERAD - SUCCESS", {
      hasResult: !!result?.output,
      resultStructure: {
        hasId: !!result?.output?.id,
        hasCustomerId: !!result?.output?.customer_id,
        hasDataId: !!result?.output?.data?.id,
        hasDataCustomerId: !!result?.output?.data?.customer_id,
        resultKeys: result?.output ? Object.keys(result?.output) : [],
      },
      operation: "enrollCustomerFull",
    });

    return result;
  } catch (error: any) {
    console.error("Error creating Maplerad customer:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la création du customer Maplerad",
        details: error,
      },
    });
  }
};

/**
 * Create a new card in Maplerad
 */
const createCard = async (
  cardData: MapleradCreateCardData
): Promise<OutputProps> => {
  console.log("💳 CREATE CARD MAPLERAD - START", {
    customerId: cardData.customer_id,
    currency: cardData.currency,
    type: cardData.type,
    brand: cardData.brand,
    amount: cardData.amount,
    autoApprove: cardData.auto_approve,
    operation: "createCard",
  });

  try {
    // Validation des données selon la doc Maplerad
    validateCreateCardData(cardData);

    const result = await makeMapleradRequest({
      method: "POST",
      url: "/issuing",
      data: cardData,
    });

    console.log("💳 CREATE CARD MAPLERAD - SUCCESS", {
      hasResult: !!result?.output,
      resultStructure: {
        hasId: !!result?.output?.id,
        hasCardId: !!result?.output?.card_id,
        hasDataId: !!result?.output?.data?.id,
        hasDataCardId: !!result?.output?.data?.card_id,
        resultKeys: result?.output ? Object.keys(result?.output) : [],
      },
      operation: "createCard",
    });

    return result;
  } catch (error: any) {
    console.error("Error creating Maplerad card:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la création de la carte Maplerad",
        details: error,
      },
    });
  }
};

/**
 * Create a simple card (wrapper around createCard)
 */
const createCardSimple = async (
  customerId: string,
  brand: string = "VISA",
  amount: number = 2
): Promise<OutputProps> => {
  const cardData: MapleradCreateCardData = {
    customer_id: customerId,
    currency: "USD",
    type: "VIRTUAL",
    auto_approve: true,
    brand: brand,
    amount: convertToSmallestUnit(amount),
  };

  return createCard(cardData);
};

/**
 * Get card details by ID
 */
const getCard = async (
  cardId: string,
  reveal?: boolean
): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "GET",
      url: `/issuing/${cardId}${reveal ? "?reveal=true" : ""}`,
    });

    return result;
  } catch (error: any) {
    console.error("Error getting Maplerad card:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération de la carte Maplerad",
        details: error,
      },
    });
  }
};

/**
 * Get card details from Maplerad API
 */
const getCardDetailsFromMaplerad = async (
  cardId: string
): Promise<OutputProps> => {
  return getCard(cardId, true);
};

/**
 * Get real card balance
 */
const getRealCardBalance = async (cardId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "GET",
      url: `/issuing/${cardId}/balance`,
    });

    if (result.output) {
      // Convert balance from cents to dollars
      const balanceInCents =
        result.output.balance || result.output.available_balance || 0;
      result.output.balance = convertFromSmallestUnit(balanceInCents);
    }

    return result;
  } catch (error: any) {
    console.error("Error getting card balance:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération du solde de la carte",
        details: error,
      },
    });
  }
};

/**
 * Get card status
 */
const getCardStatus = async (cardId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "GET",
      url: `/issuing/${cardId}/status`,
    });

    return result;
  } catch (error: any) {
    console.error("Error getting card status:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération du statut de la carte",
        details: error,
      },
    });
  }
};

/**
 * Terminate a card
 */
const terminateCard = async (cardId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "PUT",
      url: `/issuing/${cardId}/terminate`,
      data: {},
    });

    return result;
  } catch (error: any) {
    console.error("Error terminating card:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la terminaison de la carte",
        details: error,
      },
    });
  }
};

/**
 * Disable a card
 */
const disableCard = async (cardId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "PUT",
      url: `/issuing/${cardId}/disable`,
      data: {},
    });

    return result;
  } catch (error: any) {
    console.error("Error disabling card:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la désactivation de la carte",
        details: error,
      },
    });
  }
};

/**
 * Enable a card
 */
const enableCard = async (cardId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "PUT",
      url: `/issuing/${cardId}/enable`,
      data: {},
    });

    return result;
  } catch (error: any) {
    console.error("Error enabling card:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de l'activation de la carte",
        details: error,
      },
    });
  }
};

/**
 * Freeze a card
 */
const freezeCard = async (cardId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "PATCH",
      url: `/issuing/${cardId}/freeze`,
      data: {},
    });

    return result;
  } catch (error: any) {
    console.error("Error freezing card:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors du gel de la carte",
        details: error,
      },
    });
  }
};

/**
 * Unfreeze a card
 */
const unfreezeCard = async (cardId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "PATCH",
      url: `/issuing/${cardId}/unfreeze`,
      data: {},
    });

    return result;
  } catch (error: any) {
    console.error("Error unfreezing card:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors du dégel de la carte",
        details: error,
      },
    });
  }
};

/**
 * Get customer cards
 */
const getCustomerCards = async (customerId: string): Promise<OutputProps> => {
  try {
    const result = await makeMapleradRequest({
      method: "GET",
      url: `/customers/${customerId}/cards`,
    });

    return result;
  } catch (error: any) {
    console.error("Error getting customer cards:", error);
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des cartes du customer",
        details: error,
      },
    });
  }
};

/**
 * Get user cards from Maplerad
 */
const getUserCardsFromMaplerad = async (customerId: string): Promise<any[]> => {
  try {
    const result = await getCustomerCards(customerId);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const cards = result.output?.data || result.output?.cards || [];
    return cards;
  } catch (error: any) {
    console.error(`Erreur récupération cartes Maplerad ${customerId}`, {
      error: error.message,
    });
    throw new Error(
      `Erreur récupération cartes Maplerad ${customerId}: ${error?.message}`
    );
  }
};

/**
 * Get card decline charges
 */
const getCardDeclineCharges = async (
  cardId: string,
  filters?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }
): Promise<any> => {
  try {
    let queryParams = "";
    if (filters) {
      const params = new URLSearchParams();
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.page_size)
        params.append("page_size", filters.page_size.toString());
      queryParams = `?${params.toString()}`;
    }

    const result = await makeMapleradRequest({
      method: "GET",
      url: `/issuing/${cardId}/decline-charges${queryParams}`,
    });

    if (result.error) {
      return {
        status: false,
        message: result.error.message,
        data: [],
        meta: { page: 1, page_size: 10, total: 0 },
        totalAmount: 0,
      };
    }

    const response = result.output;
    let totalAmount = 0;

    // Calculer le montant total des frais de déclin
    if (response.data && Array.isArray(response.data)) {
      totalAmount = response.data.reduce((sum: any, charge: any) => {
        // Maplerad retourne les montants en centimes, donc diviser par 100
        return sum + charge.fee / 100;
      }, 0);
    }

    console.log("💰 TOTAL DECLINE CHARGES CALCULATED", {
      totalCharges: response.data?.length || 0,
      totalAmountInSmallestUnit:
        response.data?.reduce((sum: any, charge: any) => sum + charge.fee, 0) ||
        0,
      totalAmountInMainCurrency: totalAmount,
    });

    return {
      status: response.status || true,
      message: response.message || "Successful",
      data: response.data || [],
      meta: response.meta || {
        page: filters?.page || 1,
        page_size: filters?.page_size || 10,
        total: 0,
      },
      totalAmount,
    };
  } catch (error: any) {
    console.error("Error getting card decline charges:", error);
    return {
      status: false,
      message: "Error retrieving decline charges",
      data: [],
      meta: { page: 1, page_size: 10, total: 0 },
      totalAmount: 0,
    };
  }
};

/**
 * Map Maplerad card details to response format
 */
const mapMapleradCardDetailsToResponse = (cardData: any): any => {
  if (!cardData) return null;

  return {
    id: cardData.id || cardData.card_id,
    cardId: cardData.id || cardData.card_id,
    status: cardData.status || "active",
    balance: convertFromSmallestUnit(cardData.balance || 0),
    currency: cardData.currency || "USD",
    brand: cardData.brand || "VISA",
    type: cardData.type || "VIRTUAL",
    maskedNumber:
      cardData.masked_pan || `****-****-****-${cardData.last4 || "****"}`,
    last4: cardData.last4,
    expiryMonth: cardData.expiry_month || cardData.expiryMonth,
    expiryYear: cardData.expiry_year || cardData.expiryYear,
    createdAt: cardData.created_at || cardData.createdAt,
    updatedAt: cardData.updated_at || cardData.updatedAt,
  };
};

const mapleradCardUtils = {
  createCustomer,
  createCard,
  createCardSimple,
  getCard,
  getCardDetailsFromMaplerad,
  getRealCardBalance,
  getCardStatus,
  terminateCard,
  disableCard,
  enableCard,
  freezeCard,
  unfreezeCard,
  getCustomerCards,
  getUserCardsFromMaplerad,
  getCardDeclineCharges,
  mapMapleradCardDetailsToResponse,
};

export default mapleradCardUtils;
