// AlphaSpace Card Utilities
// WAVLET-specific AlphaSpace card operations and utilities
// Adapted from Maplerad patterns for consistent API structure

import env from "@/env";
import fnOutput, { OutputProps } from "@/utils/shared/fnOutputHandler";
import axios from "axios";
import {
  AlphaSpaceCreateCardData,
  AlphaSpaceFundCardData,
  AlphaSpaceWithdrawCardData,
  IAlphaSpaceConfig,
  AlphaSpaceCard,
  AlphaSpaceCustomer,
} from "./types";

/**
 * Create authenticated request configuration for AlphaSpace API
 */
const createAlphaSpaceRequest = ({
  method,
  url,
  data,
  accessToken,
}: IAlphaSpaceConfig) => {
  const baseUrl =
    env.ALPHASPACE_ENVIRONMENT === "sandbox"
      ? "https://api.alphaspace.com/sandbox"
      : "https://api.alphaspace.com/v1";

  const config = {
    method,
    url: `${baseUrl}${url}`,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken || env.ALPHASPACE_ACCESS_TOKEN}`,
      "X-API-Key": env.ALPHASPACE_API_KEY,
      "X-Request-ID": `req_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 15)}`,
    },
    ...(data && { data }),
    timeout: env.ALPHASPACE_TIMEOUT,
  };

  console.log("createAlphaSpaceRequest : config : ", {
    method: config.method,
    url: config.url,
    hasData: !!config.data,
    timeout: config.timeout,
  });

  return config;
};

/**
 * Make authenticated request to AlphaSpace API
 */
export const makeAlphaSpaceRequest = async ({
  method,
  url,
  data,
  accessToken,
}: IAlphaSpaceConfig): Promise<OutputProps> => {
  try {
    const config = createAlphaSpaceRequest({
      method,
      url,
      data,
      accessToken,
    });
    const response = await axios(config);

    // Check if response contains error even with HTTP 200
    if (
      response.data &&
      response.data.status &&
      response.data.status !== "success"
    ) {
      console.log("--- AlphaSpace API Error (HTTP 200 but error content) ---");
      console.log("URL:", config.url);
      console.log("Response Status:", response.data.status);
      console.log("Response Message:", response.data.message);
      console.log("--- End of AlphaSpace API Error ---");

      return fnOutput.error({
        error: {
          message: response.data.message || "AlphaSpace API error",
          statusCode: 400,
          details: response.data,
        },
      });
    }

    return fnOutput.success({
      output: response.data,
    });
  } catch (error: any) {
    console.error("AlphaSpace API Error:", error.message);
    console.error("Request details:", { method, url, data: !!data });

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
 * Create a new customer in AlphaSpace
 */
const createCustomer = async (
  customerData: AlphaSpaceCustomer,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    console.log("🏦 CREATE CUSTOMER ALPHASPACE - START", {
      email: customerData?.email,
      firstName: customerData?.first_name,
      lastName: customerData?.last_name,
      country: customerData?.country,
      hasIdentity: !!customerData?.identity,
      operation: "createCustomer",
    });

    // Validate required fields
    if (
      !customerData.email ||
      !customerData.first_name ||
      !customerData.last_name
    ) {
      return fnOutput.error({
        error: {
          message:
            "Missing required customer data: email, first_name, last_name",
          statusCode: 400,
        },
      });
    }

    const result = await makeAlphaSpaceRequest({
      method: "POST",
      url: "/customers",
      data: customerData,
      accessToken,
    });

    console.log("🏦 CREATE CUSTOMER ALPHASPACE - SUCCESS", {
      hasResult: !!result?.output,
      resultStructure: {
        hasId: !!result?.output?.data?.id,
        hasCustomerId: !!result?.output?.data?.customer_id,
        resultKeys: result?.output ? Object.keys(result?.output) : [],
      },
      operation: "createCustomer",
    });

    return result;
  } catch (error: any) {
    console.error("Error creating AlphaSpace customer:", error);
    return fnOutput.error({
      error: {
        message: "Failed to create AlphaSpace customer",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Create a new card in AlphaSpace
 */
const createCard = async (
  cardData: AlphaSpaceCreateCardData,
  accessToken?: string
): Promise<OutputProps> => {
  console.log("💳 CREATE CARD ALPHASPACE - START", {
    customerId: cardData.customer_id,
    brand: cardData.brand,
    type: cardData.type,
    amount: cardData.amount,
    currency: cardData.currency,
    nameOnCard: cardData.name_on_card,
    operation: "createCard",
  });

  try {
    // Validate required data
    if (!cardData.customer_id || !cardData.brand) {
      return fnOutput.error({
        error: {
          message: "Missing required card data: customer_id, brand",
          statusCode: 400,
        },
      });
    }

    const result = await makeAlphaSpaceRequest({
      method: "POST",
      url: "/cards",
      data: cardData,
      accessToken,
    });

    console.log("💳 CREATE CARD ALPHASPACE - SUCCESS", {
      hasResult: !!result?.output,
      resultStructure: {
        hasId: !!result?.output?.data?.id,
        hasCardId: !!result?.output?.data?.card_id,
        status: result?.output?.data?.status,
        resultKeys: result?.output ? Object.keys(result?.output) : [],
      },
      operation: "createCard",
    });

    return result;
  } catch (error: any) {
    console.error("Error creating AlphaSpace card:", error);
    return fnOutput.error({
      error: {
        message: "Failed to create AlphaSpace card",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Create a simple virtual card
 */
const createCardSimple = async (
  customerId: string,
  brand: "VISA" | "MASTERCARD" = "VISA",
  amount: number = 5,
  nameOnCard?: string,
  accessToken?: string
): Promise<OutputProps> => {
  const cardData: AlphaSpaceCreateCardData = {
    customer_id: customerId,
    brand,
    type: "VIRTUAL",
    amount,
    currency: "USD",
    name_on_card: nameOnCard || "Virtual Card",
    auto_approve: true,
  };

  return createCard(cardData, accessToken);
};

/**
 * Fund a card in AlphaSpace
 */
const fundCard = async (
  cardId: string,
  fundData: AlphaSpaceFundCardData,
  accessToken?: string
): Promise<OutputProps> => {
  console.log("💰 FUND CARD ALPHASPACE - START", {
    cardId,
    amount: fundData.amount,
    currency: fundData.currency,
    operation: "fundCard",
  });

  try {
    const result = await makeAlphaSpaceRequest({
      method: "POST",
      url: `/cards/${cardId}/fund`,
      data: fundData,
      accessToken,
    });

    console.log("💰 FUND CARD ALPHASPACE - SUCCESS", {
      cardId,
      fundedAmount: fundData.amount,
      hasResult: !!result?.output,
      operation: "fundCard",
    });

    return result;
  } catch (error: any) {
    console.error("Error funding AlphaSpace card:", error);
    return fnOutput.error({
      error: {
        message: "Failed to fund AlphaSpace card",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Withdraw from a card to wallet
 */
const withdrawFromCard = async (
  cardId: string,
  withdrawData: AlphaSpaceWithdrawCardData,
  accessToken?: string
): Promise<OutputProps> => {
  console.log("💸 WITHDRAW CARD ALPHASPACE - START", {
    cardId,
    amount: withdrawData.amount,
    currency: withdrawData.currency,
    operation: "withdrawFromCard",
  });

  try {
    const result = await makeAlphaSpaceRequest({
      method: "POST",
      url: `/cards/${cardId}/withdraw`,
      data: withdrawData,
      accessToken,
    });

    console.log("💸 WITHDRAW CARD ALPHASPACE - SUCCESS", {
      cardId,
      withdrawnAmount: withdrawData.amount,
      hasResult: !!result?.output,
      operation: "withdrawFromCard",
    });

    return result;
  } catch (error: any) {
    console.error("Error withdrawing from AlphaSpace card:", error);
    return fnOutput.error({
      error: {
        message: "Failed to withdraw from AlphaSpace card",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Get card details by ID
 */
const getCard = async (
  cardId: string,
  reveal: boolean = false,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    const result = await makeAlphaSpaceRequest({
      method: "GET",
      url: `/cards/${cardId}${reveal ? "?reveal=true" : ""}`,
      accessToken,
    });

    return result;
  } catch (error: any) {
    console.error("Error getting AlphaSpace card:", error);
    return fnOutput.error({
      error: {
        message: "Failed to get AlphaSpace card details",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Get card details with PAN revealed
 */
const getCardDetailsFromAlphaSpace = async (
  cardId: string,
  accessToken?: string
): Promise<OutputProps> => {
  return getCard(cardId, true, accessToken);
};

/**
 * Get real card balance
 */
const getRealCardBalance = async (
  cardId: string,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    const result = await makeAlphaSpaceRequest({
      method: "GET",
      url: `/cards/${cardId}/balance`,
      accessToken,
    });

    return result;
  } catch (error: any) {
    console.error("Error getting card balance:", error);
    return fnOutput.error({
      error: {
        message: "Failed to get AlphaSpace card balance",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Freeze a card
 */
const freezeCard = async (
  cardId: string,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    const result = await makeAlphaSpaceRequest({
      method: "PUT",
      url: `/cards/${cardId}/freeze`,
      data: {},
      accessToken,
    });

    return result;
  } catch (error: any) {
    console.error("Error freezing AlphaSpace card:", error);
    return fnOutput.error({
      error: {
        message: "Failed to freeze AlphaSpace card",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Unfreeze a card
 */
const unfreezeCard = async (
  cardId: string,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    const result = await makeAlphaSpaceRequest({
      method: "PUT",
      url: `/cards/${cardId}/unfreeze`,
      data: {},
      accessToken,
    });

    return result;
  } catch (error: any) {
    console.error("Error unfreezing AlphaSpace card:", error);
    return fnOutput.error({
      error: {
        message: "Failed to unfreeze AlphaSpace card",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Terminate a card
 */
const terminateCard = async (
  cardId: string,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    const result = await makeAlphaSpaceRequest({
      method: "PUT",
      url: `/cards/${cardId}/terminate`,
      data: {},
      accessToken,
    });

    return result;
  } catch (error: any) {
    console.error("Error terminating AlphaSpace card:", error);
    return fnOutput.error({
      error: {
        message: "Failed to terminate AlphaSpace card",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Get customer cards
 */
const getCustomerCards = async (
  customerId: string,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    const result = await makeAlphaSpaceRequest({
      method: "GET",
      url: `/customers/${customerId}/cards`,
      accessToken,
    });

    return result;
  } catch (error: any) {
    console.error("Error getting customer cards:", error);
    return fnOutput.error({
      error: {
        message: "Failed to get AlphaSpace customer cards",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Get card transactions
 */
const getCardTransactions = async (
  cardId: string,
  filters?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  },
  accessToken?: string
): Promise<OutputProps> => {
  try {
    let queryParams = "";
    if (filters) {
      const params = new URLSearchParams();
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());
      queryParams = `?${params.toString()}`;
    }

    const result = await makeAlphaSpaceRequest({
      method: "GET",
      url: `/cards/${cardId}/transactions${queryParams}`,
      accessToken,
    });

    return result;
  } catch (error: any) {
    console.error("Error getting card transactions:", error);
    return fnOutput.error({
      error: {
        message: "Failed to get AlphaSpace card transactions",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Map AlphaSpace card details to response format
 */
const mapAlphaSpaceCardDetailsToResponse = (cardData: any): any => {
  if (!cardData) return null;

  return {
    id: cardData.id || cardData.card_id,
    cardId: cardData.id || cardData.card_id,
    status: cardData.status || "active",
    balance: cardData.balance || 0,
    currency: cardData.currency || "USD",
    brand: cardData.brand || "VISA",
    type: cardData.type || "VIRTUAL",
    maskedNumber:
      cardData.masked_pan || `****-****-****-${cardData.last4 || "****"}`,
    last4: cardData.last4,
    expiryMonth: cardData.expiry_month || cardData.expiryMonth,
    expiryYear: cardData.expiry_year || cardData.expiryYear,
    nameOnCard: cardData.name_on_card,
    createdAt: cardData.created_at || cardData.createdAt,
    updatedAt: cardData.updated_at || cardData.updatedAt,
  };
};

/**
 * Validate AlphaSpace API connectivity
 */
/**
 * Create cardholder in AlphaSpace with customer data
 */
const createCardholder = async (
  customerData: any,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    console.log("👤 CREATE CARDHOLDER ALPHASPACE - START", {
      email: customerData.email,
      name: customerData.first_name + " " + customerData.last_name,
      operation: "createCardholder",
    });

    // Clean data for AlphaSpace format
    const cardholderData = {
      name: `${customerData.first_name} ${customerData.last_name}`.substring(
        0,
        23
      ),
      first_name: customerData.first_name.substring(0, 12),
      last_name: customerData.last_name.substring(0, 12),
      gender: customerData.gender === "male" ? 0 : 1,
      date_of_birth: customerData.date_of_birth.toISOString().split("T")[0],
      email_address: customerData.email.trim().toLowerCase(),
      purpose: "visacard-1",
    };

    const result = await makeAlphaSpaceRequest({
      method: "POST",
      url: "/alpha/cards/holder",
      data: cardholderData,
      accessToken,
    });

    console.log("👤 CREATE CARDHOLDER ALPHASPACE - SUCCESS", {
      hasId: !!result?.output?.id,
      operation: "createCardholder",
    });

    return result;
  } catch (error: any) {
    console.error("Error creating cardholder:", error);
    return fnOutput.error({
      error: {
        message: "Failed to create AlphaSpace cardholder",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Wait for cardholder approval with polling
 */
const waitForCardholderApproval = async (
  cardholderId: string,
  maxAttempts: number = 10,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    console.log("⏳ WAIT FOR CARDHOLDER APPROVAL - START", {
      cardholderId,
      maxAttempts,
      operation: "waitForCardholderApproval",
    });

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await makeAlphaSpaceRequest({
          method: "GET",
          url: "/alpha/cards/holder",
          accessToken,
          data: { cardholder_id: cardholderId },
        });

        if (!result.error && result.output?.status === "approved") {
          console.log("⏳ WAIT FOR CARDHOLDER APPROVAL - APPROVED", {
            cardholderId,
            attempts: attempt + 1,
            operation: "waitForCardholderApproval",
          });
          return result;
        }

        // Wait 2 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn(
          `Cardholder approval check failed (attempt ${attempt + 1}):`,
          error
        );
      }
    }

    console.log("⏳ WAIT FOR CARDHOLDER APPROVAL - TIMEOUT", {
      cardholderId,
      maxAttempts,
      operation: "waitForCardholderApproval",
    });

    return fnOutput.error({
      error: {
        message: "Cardholder approval timeout",
        statusCode: 408,
      },
    });
  } catch (error: any) {
    console.error("Error waiting for cardholder approval:", error);
    return fnOutput.error({
      error: {
        message: "Failed to wait for cardholder approval",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Poll cardholder status (alias for waitForCardholderApproval)
 */
const pollCardholderStatus = waitForCardholderApproval;

/**
 * Create card with customer onboarding
 */
const createCardWithCustomer = async (
  customerData: any,
  cardData: AlphaSpaceCreateCardData,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    console.log("🎯 CREATE CARD WITH CUSTOMER - START", {
      customerEmail: customerData.email,
      cardBrand: cardData.brand,
      operation: "createCardWithCustomer",
    });

    // 1. Create cardholder
    const cardholderResult = await createCardholder(customerData, accessToken);
    if (cardholderResult.error) {
      return cardholderResult;
    }

    // 2. Wait for approval if needed
    if (cardholderResult.output?.status === "submitted") {
      const approvalResult = await waitForCardholderApproval(
        cardholderResult.output.id,
        10,
        accessToken
      );
      if (approvalResult.error) {
        return approvalResult;
      }
    }

    // 3. Create card with customer ID
    const fullCardData = {
      ...cardData,
      customer_id: cardholderResult.output.id,
    };

    const cardResult = await createCard(fullCardData, accessToken);

    console.log("🎯 CREATE CARD WITH CUSTOMER - SUCCESS", {
      cardholderId: cardholderResult.output?.id,
      cardId: cardResult.output?.data?.id,
      operation: "createCardWithCustomer",
    });

    return cardResult;
  } catch (error: any) {
    console.error("Error creating card with customer:", error);
    return fnOutput.error({
      error: {
        message: "Failed to create card with customer",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Check card balance via provider API
 */
const checkCardBalanceViaProvider = async (
  cardId: string,
  accessToken?: string
): Promise<OutputProps> => {
  try {
    console.log("💰 CHECK CARD BALANCE VIA PROVIDER - START", {
      cardId,
      operation: "checkCardBalanceViaProvider",
    });

    // Try to get balance directly from provider
    const result = await getRealCardBalance(cardId, accessToken);

    if (!result.error && result.output) {
      const balance =
        result.output.balance || result.output.available_balance || 0;
      console.log("💰 CHECK CARD BALANCE VIA PROVIDER - SUCCESS", {
        cardId,
        balance,
        operation: "checkCardBalanceViaProvider",
      });
    }

    return result;
  } catch (error: any) {
    console.error("Error checking card balance via provider:", error);
    return fnOutput.error({
      error: {
        message: "Failed to check card balance via provider",
        details: error,
        statusCode: 500,
      },
    });
  }
};

/**
 * Get card balance directly from provider (alias)
 */
const getCardBalanceDirect = checkCardBalanceViaProvider;

/**
 * Validate AlphaSpace API connectivity
 */
const validateConnectivity = async (accessToken?: string): Promise<boolean> => {
  try {
    const result = await makeAlphaSpaceRequest({
      method: "GET",
      url: "/health/ping",
      accessToken,
    });

    return !result.error;
  } catch (error) {
    console.error("AlphaSpace connectivity validation failed:", error);
    return false;
  }
};

const alphaSpaceCardUtils = {
  createCustomer,
  createCard,
  createCardSimple,
  fundCard,
  withdrawFromCard,
  getCard,
  getCardDetailsFromAlphaSpace,
  getRealCardBalance,
  freezeCard,
  unfreezeCard,
  terminateCard,
  getCustomerCards,
  getCardTransactions,
  mapAlphaSpaceCardDetailsToResponse,
  validateConnectivity,
  makeAlphaSpaceRequest,

  // Cardholder management
  createCardholder,
  waitForCardholderApproval,
  pollCardholderStatus,

  // Card creation and management
  createCardWithCustomer,

  // Balance and transaction operations
  checkCardBalanceViaProvider,
  getCardBalanceDirect,
};

export default alphaSpaceCardUtils;
