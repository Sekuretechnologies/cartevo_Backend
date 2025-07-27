import env from "@/env";
import { SyncmetadataModel } from "@/models";
import fnOutput from "@/utils/shared/fnOutputHandler";
import axios from "axios";

interface ISudoConfig {
  method: string;
  url: string;
  data?: any;
}

interface ILogError {
  error: any;
  requestData: any;
  requestHeaders: any;
  requestUrl: any;
  requestMethod: any;
}

interface ISudoBillingAddress {
  country: string;
  state: string;
  city: string;
  line1: string;
  postalCode?: string;
}

interface ISudoCustomerIdentity {
  type: "BVN" | "NIN" | "CAC" | "TIN";
  number: string;
}

interface ISudoCustomerDocuments {
  idFrontUrl?: string;
  idBackUrl?: string;
}

interface ISudoCustomerIndividual {
  firstName: string;
  lastName: string;
  date_of_birth: string; // YYYY/MM/DD format
  otherNames?: string;
  identity?: ISudoCustomerIdentity;
  documents?: ISudoCustomerDocuments;
}

interface ISudoCustomerData {
  type: "individual" | "company";
  name: string;
  phoneNumber: string;
  status: "active" | "inactive";
  billingAddress: ISudoBillingAddress;
  emailAddress?: string;
  individual?: ISudoCustomerIndividual;
}

interface ISudoFundingSourceData {
  type: "default" | "account" | "gateway";
  status: "active" | "inactive";
}

interface ISudoFundingSourceResponse {
  _id: string;
  business: string;
  type: "default" | "account" | "gateway";
  status: "active" | "inactive";
  jitGateway: string | null;
  isDefault: boolean;
}

interface ISudoCardData {
  customerId: string;
  type: "physical" | "virtual";
  currency: "NGN" | "USD";
  status: "active" | "inactive";
  fundingSourceId?: string;
  brand?: "Verve" | "MasterCard" | "Visa";
  debitAccountId?: string;
  amount?: number;
  issuerCountry?: string;
}

interface ISudoCardResponse {
  _id: string;
  customerId: string;
  type: "physical" | "virtual";
  currency: "NGN" | "USD";
  status: "active" | "inactive";
  fundingSourceId: string;
  brand: "Verve" | "MasterCard" | "Visa";
  createdAt: string;
  updatedAt: string;
  // D'autres champs selon la réponse réelle de Sudo
}

interface ISudoAccountBalanceResponse {
  accountId: string;
  availableBalance: number;
  currency: string;
  ledgerBalance: number;
  accountStatus: string;
  lastUpdated: string;
}

export const logError = ({
  error,
  requestData,
  requestHeaders,
  requestUrl,
  requestMethod,
}: ILogError) => {
  console.log("--- Sudo API Error Information ---");
  console.log("URL:", requestUrl);
  console.log("METHOD:", requestMethod);
  console.log("Payload:", JSON.stringify(requestData, null, 2));
  console.log("Request Headers:", requestHeaders);
  if (error.response) {
    console.log("Response Status:", error.response.status);
    console.log("Response Message:", error.response.statusText);
    console.log(
      "Response Data (full):",
      JSON.stringify(error.response.data, null, 2)
    );

    // Log spécial pour les erreurs de validation
    if (
      error.response.data?.message &&
      Array.isArray(error.response.data.message)
    ) {
      console.log("--- Validation Errors Details ---");
      error.response.data.message.forEach(
        (validationError: any, index: number) => {
          console.log(`Validation Error ${index + 1}:`);
          console.log("  Property:", validationError.property);
          console.log(
            "  Value:",
            JSON.stringify(validationError.value, null, 4)
          );
          console.log(
            "  Target:",
            JSON.stringify(validationError.target, null, 4)
          );
          if (
            validationError.children &&
            Array.isArray(validationError.children)
          ) {
            console.log("  Children errors:");
            validationError.children.forEach(
              (child: any, childIndex: number) => {
                console.log(
                  `    Child ${childIndex + 1}:`,
                  JSON.stringify(child, null, 6)
                );
              }
            );
          }
          console.log("  ---");
        }
      );
      console.log("--- End Validation Errors Details ---");
    }
  } else {
    console.log("Error:", error.message);
  }
  console.log("--- End of Sudo API Error Information ---");
};

/**
 * Create authenticated request configuration for Sudo API
 */
const createSudoRequest = ({ method, url, data }: ISudoConfig) => {
  const config = {
    method,
    url: `${env.SUDO_BASE_URL}${url}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SUDO_API_KEY}`,
    },
    // Configuration SSL spécifique pour les requêtes vers Sudo
    httpsAgent: new (require("https").Agent)({
      rejectUnauthorized: env.NODE_ENV === "production", // Désactiver en dev seulement
    }),
    timeout: 30000, // 30 secondes de timeout
    ...(data && { data }),
  };

  return config;
};

/**
 * Make authenticated request to Sudo API
 */
const makeSudoRequest = async ({ method, url, data }: ISudoConfig) => {
  try {
    const config = createSudoRequest({ method, url, data });
    const response = await axios(config);

    // Check if response contains error even with HTTP 200
    if (
      response.data &&
      response.data.statusCode &&
      response.data.statusCode >= 400
    ) {
      console.log("--- Sudo API Error (HTTP 200 but error content) ---");
      console.log("URL:", `${env.SUDO_BASE_URL}${url}`);
      console.log("Response Status Code:", response.data.statusCode);
      console.log("Response Message:", response.data.message);
      console.log("--- End of Sudo API Error ---");

      return fnOutput.error({
        error: {
          message: response.data.message || "Erreur de l'API Sudo",
          statusCode: response.data.statusCode,
          details: response.data,
          payload: data,
        },
      });
    }

    return fnOutput.success({
      output: response.data,
    });
  } catch (error: any) {
    logError({
      error,
      requestData: data,
      requestHeaders: { Authorization: `Bearer ${env.SUDO_API_KEY}` },
      requestUrl: `${env.SUDO_BASE_URL}${url}`,
      requestMethod: method,
    });

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
 * Create a new customer in Sudo
 */
const createCustomer = async (customerData: ISudoCustomerData) => {
  try {
    console.log(
      "Creating Sudo customer with data:",
      JSON.stringify(customerData, null, 2)
    );

    const result = await makeSudoRequest({
      method: "POST",
      url: "/customers",
      data: customerData,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la création du customer Sudo",
        details: error,
      },
    });
  }
};

/**
 * Get customer details by ID
 */
const getCustomer = async (customerId: string) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/customers/${customerId}`, // À ajuster selon la documentation Sudo
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération du customer Sudo",
        details: error,
      },
    });
  }
};

/**
 * Get customers list with pagination
 * @param page - Page number (default: 0)
 * @param limit - Number of customers per page (default: 100)
 */
const getCustomers = async (page: number = 0, limit: number = 100) => {
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
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message:
          "Erreur lors de la récupération de la liste des customers Sudo",
        details: error,
      },
    });
  }
};

/**
 * Update customer by ID
 * @param customerId - Customer ID to update
 * @param customerData - Updated customer data
 */
const updateCustomer = async (
  customerId: string,
  customerData: ISudoCustomerData
) => {
  try {
    console.log(
      "Updating Sudo customer:",
      customerId,
      "with data:",
      JSON.stringify(customerData, null, 2)
    );

    const result = await makeSudoRequest({
      method: "PUT",
      url: `/customers/${customerId}`,
      data: customerData,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la mise à jour du customer Sudo",
        details: error,
      },
    });
  }
};

/**
 * Check if user has a Sudo customer ID
 */
const hasCustomer = (user: any): boolean => {
  return !!user?.sudo_customer_id;
};

/**
 * Get currency conversion rate based on country
 */
const getDollarRate = (countryCode: string) => {
  // switch (countryCode) {
  //   case "CM":
  //     return env.CM_SUDO_DOLLARS_FEES || env.CM_MIDEN_DOLLARS_FEES;
  //   case "GA":
  //     return env.GA_SUDO_DOLLARS_FEES || env.GA_MIDEN_DOLLARS_FEES;
  //   case "BJ":
  //     return env.BJ_SUDO_DOLLARS_FEES || env.BJ_MIDEN_DOLLARS_FEES;
  //   case "BF":
  //     return env.BJ_SUDO_DOLLARS_FEES || env.BJ_MIDEN_DOLLARS_FEES;
  //   case "CD":
  //     return env.CD_SUDO_DOLLARS_FEES || env.CD_MIDEN_DOLLARS_FEES;
  //   default:
  //     return env.CM_SUDO_DOLLARS_FEES || env.CM_MIDEN_DOLLARS_FEES;
  // }
  return 0;
};

/**
 * Convert local currency to USD based on country
 */
const convertToUsd = (amount: number, countryCode: string) => {
  const rate = getDollarRate(countryCode);
  return Math.trunc((amount / rate) * 100) / 100;
};

/**
 * Convert USD to local currency based on country
 */
const convertFromUsd = (usdAmount: number, countryCode: string) => {
  const rate = getDollarRate(countryCode);
  return Math.trunc(usdAmount * rate * 100) / 100;
};

/**
 * Map user ID document type to Sudo identity type
 * SUDO REQUIREMENT: Utiliser BVN pour tous les utilisateurs
 */
const mapIdTypeToSudoIdentity = (
  idType: string,
  country: string
): "BVN" | "NIN" | "CAC" | "TIN" => {
  // Sudo demande d'utiliser BVN pour tous nos utilisateurs
  return "BVN";
};

/**
 * Format date to YYYY/MM/DD format required by Sudo
 */
const formatDateForSudo = (date: Date | string | undefined): string => {
  if (!date) return "1990/01/01"; // Date par défaut

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "1990/01/01";

  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const day = dateObj.getDate().toString().padStart(2, "0");

  return `${year}/${month}/${day}`;
};

/**
 * Prepare customer data from user object for Sudo API format
 */
const prepareCustomerData = (user: any): ISudoCustomerData => {
  const firstName = String(user?.first_name || "").trim();
  const lastName = String(user?.last_name || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const country = user?.country_iso_code || "CM";

  const billingAddress: ISudoBillingAddress = {
    country: country,
    state: String(user?.state || "Unknown").trim(),
    city: String(user?.city || "Unknown").trim(),
    line1: String(user?.address || "Address not provided").trim(),
    postalCode: "5734", // Code postal par défaut
  };

  const customerData: ISudoCustomerData = {
    type: "individual",
    name: fullName,
    phoneNumber: `+${user?.country_phone_code || "237"}${
      user?.phone_number || ""
    }`,
    status: "active",
    billingAddress,
    emailAddress: user?.email || "",
    individual: {
      firstName,
      lastName,
      date_of_birth: formatDateForSudo(user?.date_of_birth),
      otherNames: "", // Peut être étendu si nécessaire
    },
  };

  // Ajouter les documents si les URLs sont disponibles
  if (user?.id_document_front || user?.id_document_back) {
    customerData.individual!.documents = {
      idFrontUrl: user?.id_document_front || "",
      idBackUrl: user?.id_document_back || user?.id_document_front,
    };
  }

  return customerData;
};

// ========================= FUNDING SOURCES =========================

/**
 * Create a new funding source in Sudo
 */
const createFundingSource = async (
  fundingSourceData: ISudoFundingSourceData
) => {
  try {
    console.log(
      "Creating Sudo funding source with data:",
      JSON.stringify(fundingSourceData, null, 2)
    );

    const result = await makeSudoRequest({
      method: "POST",
      url: "/fundingsources",
      data: fundingSourceData,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la création de la funding source Sudo",
        details: error,
      },
    });
  }
};

/**
 * Get funding source details by ID
 */
const getFundingSource = async (fundingSourceId: string) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/fundingsources/${fundingSourceId}`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération de la funding source Sudo",
        details: error,
      },
    });
  }
};

/**
 * Get funding sources list
 */
const getFundingSources = async () => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: "/fundingsources",
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des funding sources Sudo",
        details: error,
      },
    });
  }
};

/**
 * Update funding source by ID
 * @param fundingSourceId - Funding source ID to update
 * @param fundingSourceData - Updated funding source data
 */
const updateFundingSource = async (
  fundingSourceId: string,
  fundingSourceData: ISudoFundingSourceData
) => {
  try {
    console.log(
      "Updating Sudo funding source:",
      fundingSourceId,
      "with data:",
      JSON.stringify(fundingSourceData, null, 2)
    );

    const result = await makeSudoRequest({
      method: "PUT",
      url: `/fundingsources/${fundingSourceId}`,
      data: fundingSourceData,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la mise à jour de la funding source Sudo",
        details: error,
      },
    });
  }
};

/**
 * Get active funding source of type 'default'
 * Returns the first active funding source of type 'default'
 */
const getActiveFundingSource = async () => {
  try {
    const fundingSourcesResult = await getFundingSources();

    if (fundingSourcesResult.error) {
      return fnOutput.error({
        error: {
          message: "Erreur lors de la récupération des funding sources",
          details: fundingSourcesResult.error,
        },
      });
    }

    const fundingSources =
      fundingSourcesResult.output?.data || fundingSourcesResult.output;

    if (!Array.isArray(fundingSources)) {
      return fnOutput.error({
        error: {
          message: "Format de réponse funding sources invalide",
          details: fundingSources,
        },
      });
    }

    // Chercher une funding source de type 'default' et active
    const activeFundingSource = fundingSources.find(
      (fs: any) => fs.type === "default" && fs.status === "active"
    );

    if (!activeFundingSource) {
      return fnOutput.error({
        error: {
          message: 'Aucune funding source de type "default" active trouvée',
          details: fundingSources,
        },
      });
    }

    return fnOutput.success({
      output: activeFundingSource,
    });
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la recherche de funding source active",
        details: error,
      },
    });
  }
};

/**
 * Choose card brand (Visa or MasterCard) like Miden system
 * Returns alternating brands or a default
 */
const chooseCardBrand = (): "Visa" | "MasterCard" => {
  // Logique simple d'alternance comme avec Miden
  // Peut être améliorée selon la logique métier
  const brands: ("Visa" | "MasterCard")[] = ["Visa", "MasterCard"];
  const randomIndex = Math.floor(Math.random() * brands.length);
  return brands[randomIndex];
};

/**
 * Get debit account ID based on environment
 */
const getDebitAccountId = (): string => {
  const isProd = env.NODE_ENV === "production";
  return isProd
    ? env.DEBIT_ACCOUNT_ID_PRODUCTION
    : env.DEBIT_ACCOUNT_ID_SANDBOX;
};

/**
 * Create a new card in Sudo
 * Automatically handles funding source selection with user-specified brand
 */
const createCard = async (
  customerId: string,
  brand: "Visa" | "MasterCard",
  amount: number = 3
) => {
  try {
    // 1. Récupérer une funding source active de type 'default'
    const fundingSourceResult = await getActiveFundingSource();

    if (fundingSourceResult.error) {
      return fnOutput.error({
        error: {
          message:
            "Impossible de récupérer une funding source active: " +
            fundingSourceResult.error.message,
          details: fundingSourceResult.error,
        },
      });
    }

    const activeFundingSource = fundingSourceResult.output;

    // 2. Préparer les données de la carte selon les spécifications
    const cardData: ISudoCardData = {
      customerId,
      type: "virtual", // Toujours virtuel selon les spécifications
      currency: "USD", // Toujours USD selon les spécifications
      status: "active",
      fundingSourceId: activeFundingSource._id,
      brand: brand, // Brand fourni par l'utilisateur
      debitAccountId: getDebitAccountId(), // Récupéré selon l'environnement
      amount: amount, // Montant de la carte
      issuerCountry: "USA", // Pays émetteur par défaut
    };

    console.log(
      "Creating Sudo card with data:",
      JSON.stringify(cardData, null, 2)
    );

    const result = await makeSudoRequest({
      method: "POST",
      url: "/cards",
      data: cardData,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la création de la carte ",
        details: error,
      },
    });
  }
};

/**
 * Get card details by ID
 */
const getCard = async (cardId: string, reveal?: boolean) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/cards/${cardId}${reveal ? "?reveal=true" : ""}`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération de la carte",
        details: error,
      },
    });
  }
};

/**
 * Get card transactions by CardId
 */
const getCardAuthorizations = async ({
  cardId,
  page,
  limit = 100,
  fromDate,
  toDate,
}: {
  cardId: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/cards/${cardId}/authorizations?limit=${limit}${
        page ? "&page=" + page : ""
      }${fromDate ? "&fromDate=" + fromDate : ""}${
        toDate ? "&toDate=" + toDate : ""
      }`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des transactions de la carte",
        details: error,
      },
    });
  }
};

/**
 * Get card transactions by CardId
 */
const getCardTransactions = async ({
  cardId,
  page = 0,
  limit,
  fromDate,
  toDate,
}: {
  cardId: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/cards/${cardId}/transactions?page=${page}${
        limit ? "&limit=" + limit : ""
      }${fromDate ? "&fromDate=" + fromDate : ""}${
        toDate ? "&toDate=" + toDate : ""
      }`,
    });

    //?page=${page}${
    //   limit ? '&limit=' + limit : ''
    // }
    // ${fromDate ? '&fromDate=' + fromDate : ''}
    // ${toDate ? '&toDate=' + toDate : ''}
    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des transactions de la carte",
        details: error,
      },
    });
  }
};

/**
 * Get all cards Authorizations by CardId
 */
const getAllCardsAuthorizations = async ({
  page,
  limit = 100,
  fromDate,
  toDate,
}: {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/cards/authorizations?limit=${limit}${page ? "&page=" + page : ""}${
        fromDate ? "&fromDate=" + fromDate : ""
      }${toDate ? "&toDate=" + toDate : ""}`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des transactions de la carte",
        details: error,
      },
    });
  }
};

/**
 * Get all cards transactions by CardId
 */
const getAllCardsTransactions = async ({
  page = 0,
  limit,
  fromDate,
  toDate,
}: {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/cards/transactions?page=${page}${limit ? "&limit=" + limit : ""}${
        fromDate ? "&fromDate=" + fromDate : ""
      }${toDate ? "&toDate=" + toDate : ""}`,
    });

    //?page=${page}${
    //   limit ? '&limit=' + limit : ''
    // }
    // ${fromDate ? '&fromDate=' + fromDate : ''}
    // ${toDate ? '&toDate=' + toDate : ''}
    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des transactions de la carte",
        details: error,
      },
    });
  }
};

/**
 * Get cards list
 */
const getCards = async (page?: number, limit?: number) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/cards?page=${page}${limit ? "&limit=" + limit : ""}`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des cartes Sudo",
        details: error,
      },
    });
  }
};

/**
 * Get customer cards list
 */
const getCustomerCards = async (
  customerId: string,
  page?: number,
  limit?: number
) => {
  try {
    const result = await makeSudoRequest({
      method: "GET",
      url: `/cards/customer/${customerId}?page=${page}${
        limit ? "&limit=" + limit : ""
      }`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des cartes Sudo",
        details: error,
      },
    });
  }
};

/**
 * Update card status
 * @param cardId - Sudo card ID to update
 * @param status - New status ('active' or 'inactive')
 */
const updateCard = async (cardId: string, status: "active" | "inactive") => {
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
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la mise à jour de la carte Sudo",
        details: error,
      },
    });
  }
};

/**
 * Get account balance by account ID
 * @param accountId - The account ID to get balance for
 */
const getAccountBalance = async (accountId: string) => {
  try {
    console.log("Getting account balance for account:", accountId);

    const result = await makeSudoRequest({
      method: "GET",
      url: `/accounts/${accountId}/balance`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération du solde du compte",
        details: error,
      },
    });
  }
};

/**
 * Get account transactions by account ID
 * @param accountId - The account ID to get balance for
 */
const getAccountTransactions = async ({
  accountId,
  page = 0,
  limit,
  fromDate,
  toDate,
}: {
  accountId: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    console.log("Getting account balance for account:", accountId);
    const result = await makeSudoRequest({
      method: "GET",
      url: `/accounts/${accountId}/transactions?page=${page}${
        limit ? "&limit=" + limit : ""
      }${fromDate ? "&fromDate=" + fromDate : ""}${
        toDate ? "&toDate=" + toDate : ""
      }`,
    });
    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération des transactions du compte",
        details: error,
      },
    });
  }
};

/**
 * Transfer funds between accounts
 * @param debitAccountId - The account to debit funds from
 * @param creditAccountId - The account to credit funds to (optional if using bank details)
 * @param amount - The amount to transfer
 * @param narration - Description of the transfer
 * @param paymentReference - Optional payment reference
 * @param beneficiaryBankCode - Bank code (if not using creditAccountId)
 * @param beneficiaryAccountNumber - Account number (if not using creditAccountId)
 */
const transferFunds = async (transferData: {
  debitAccountId: string;
  amount: number;
  creditAccountId?: string;
  beneficiaryBankCode?: string;
  beneficiaryAccountNumber?: string;
  narration?: string;
  paymentReference?: string;
}) => {
  try {
    console.log("Transferring funds:", JSON.stringify(transferData, null, 2));

    const result = await makeSudoRequest({
      method: "POST",
      url: "/accounts/transfer",
      data: transferData,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors du transfert de fonds",
        details: error,
      },
    });
  }
};

/**
 * Get account balance by account ID
 * @param accountId - The account ID to get balance for
 */
const getTransferStatus = async (transferId: string) => {
  try {
    console.log("Getting transfer status for ID:", transferId);

    const result = await makeSudoRequest({
      method: "GET",
      url: `/accounts/transfers/${transferId}`,
    });

    return result;
  } catch (error: any) {
    return fnOutput.error({
      error: {
        message: "Erreur lors de la récupération du statut du transfert",
        details: error,
      },
    });
  }
};

async function getLastSyncDate(id: any) {
  try {
    const result = await SyncmetadataModel.getOne({
      key: "lastSyncDate",
      customerId: id,
    });

    if (!result.output) {
      return fnOutput.success({
        output: new Date(0).toISOString().split("T")[0],
      });
    }
    return fnOutput.success({
      output: new Date(result.output?.value).toISOString().split("T")[0],
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la dernière date de synchronisation:",
      error
    );
    return fnOutput.error({
      error: {
        message:
          "getLastSyncDate error : Erreur lors de la récupération de la dernière date de synchronisation",
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
  logError,
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

export default sudoUtils;
