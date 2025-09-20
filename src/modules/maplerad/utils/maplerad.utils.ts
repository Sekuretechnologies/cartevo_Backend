import env from "@/env";
import { makeMapleradRequest } from "@/utils/cards/maplerad/card";
import axios from "axios";

export interface MapleradApiResponse<T = any> {
  output?: T;
  error?: {
    message: string;
    details?: any;
    payload?: any;
  };
}

export interface MapleradCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface MapleradEnrollCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  country: string; // Code pays (NG, CM, US, etc.)
  identification_number: string; // BVN pour Nigeria, etc.
  dob: string; // Format: 20-10-1988

  phone: {
    phone_country_code: string; // Ex: +234
    phone_number: string; // Ex: 8123456789
  };

  identity: {
    type: string; // Ex: NIN, CNI, etc.
    image: string; // URL du document uploadé
    number: string; // Numéro du document
    country: string; // Code pays du document
  };

  address: {
    street: string;
    street2?: string; // Optionnel
    city: string;
    state: string;
    country: string; // Code pays
    postal_code: string;
  };

  photo?: string; // URL selfie (optionnel)
}

export interface MapleradCardData {
  customer_id: string;
  currency: string;
  type: string;
  brand: string;
  amount: number;
}

export interface MapleradCreateCardData {
  customer_id: string; // ID du customer (requis)
  currency: string; // Devise (requis) - USD pour cartes virtuelles
  type: string; // Type de carte (requis) - VIRTUAL
  auto_approve: boolean; // Auto-approve (requis) - doit être true
  brand?: string; // Brand optionnel - VISA ou MASTERCARD (défaut: VISA)
  amount?: number; // Montant de pré-financement en centimes (défaut: 200 = $2.00)
}

export class MapleradUtils {
  private static axiosInstance: any;

  private static getAxiosInstance(): any {
    if (!this.axiosInstance) {
      const baseURL = env.MAPLERAD_BASE_URL;
      const secretKey = env.MAPLERAD_SECRET_KEY;

      if (!secretKey) {
        throw new Error("MAPLERAD_SECRET_KEY environment variable is required");
      }

      console.log("getAxiosInstance :: ", {
        baseURL,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      this.axiosInstance = axios.create({
        baseURL,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000, // 30 seconds
      });

      // Add response interceptor for error handling
      this.axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
          console.error("Maplerad API Error:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method,
          });

          return Promise.reject(error);
        }
      );
    }

    return this.axiosInstance;
  }

  /**
   * Create a customer in Maplerad
   */
  static async createCustomer(
    customerData: MapleradEnrollCustomerData
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Creating Maplerad customer:", {
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        email: customerData.email,
      });

      // const payload = {
      //   first_name: customerData.firstName,
      //   last_name: customerData.lastName,
      //   email: customerData.email,
      //   phone: customerData.phone,
      //   date_of_birth: customerData.dateOfBirth,
      //   address: {
      //     street: customerData.address.street,
      //     city: customerData.address.city,
      //     state: customerData.address.state,
      //     country: customerData.address.country,
      //     postal_code: customerData.address.postalCode,
      //   },
      // };

      // const result = await makeMapleradRequest({
      //   method: "POST",
      //   url: "/customers/enroll",
      //   data: customerData,
      // });
      const response: any = await this.getAxiosInstance().post(
        "/customers/enroll",
        customerData
      );

      console.log("✅ Maplerad customer created:");

      // return result;

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad customer creation error:", {
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create customer",
        details: error.response?.data,
        payload: error.config?.data,
      });

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to create customer",
          details: error.response?.data,
          payload: error.config?.data,
        },
      };
    }
  }

  /**
   * Get customers
   */
  static async getCustomers(
    includeSensitive: boolean = false
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Getting Maplerad card:", { includeSensitive });

      const params = includeSensitive ? { include_sensitive: "true" } : {};

      const response: any = await this.getAxiosInstance().get(`/customers`, {
        params,
      });

      console.log("✅ Maplerad customers retrieved:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad customers retrieval error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to get customers",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Get one customer
   */
  static async getOneCustomer(
    customerId: string,
    includeSensitive: boolean = false
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Getting Maplerad customer:", {
        customerId,
        includeSensitive,
      });

      const params = includeSensitive ? { include_sensitive: "true" } : {};

      const response: any = await this.getAxiosInstance().get(
        `/customers/${customerId}`,
        { params }
      );

      console.log("✅ Maplerad customer retrieved:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad customer retrieval error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to get customer",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Create a virtual card in Maplerad
   */
  static async createCard(
    cardData: MapleradCreateCardData
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Creating Maplerad card:", cardData);

      const response: any = await this.getAxiosInstance().post(
        "/issuing",
        cardData
      );

      console.log("✅ Maplerad card created:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card creation error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to create card",
          details: error.response?.data,
          payload: error.config?.data,
        },
      };
    }
  }

  /**
   * Fund a card
   */
  static async fundCard(
    cardId: string,
    amount: number
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Funding Maplerad card:", { cardId, amount });

      const payload = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: "USD",
      };

      const response: any = await this.getAxiosInstance().post(
        `/issuing/${cardId}/fund`,
        payload
      );

      console.log("✅ Maplerad card funded:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card funding error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to fund card",
          details: error.response?.data,
          payload: error.config?.data,
        },
      };
    }
  }

  /**
   * Withdraw from a card
   */
  static async withdrawFromCard(
    cardId: string,
    amount: number
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Withdrawing from Maplerad card:", { cardId, amount });

      const payload = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: "USD",
      };

      const response: any = await this.getAxiosInstance().post(
        `/issuing/${cardId}/withdraw`,
        payload
      );

      console.log("✅ Maplerad card withdrawal:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card withdrawal error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to withdraw from card",
          details: error.response?.data,
          payload: error.config?.data,
        },
      };
    }
  }

  /**
   * Get card details
   */
  static async getCard(
    cardId: string,
    includeSensitive: boolean = false
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Getting Maplerad card:", { cardId, includeSensitive });

      const params = includeSensitive ? { include_sensitive: "true" } : {};

      const response: any = await this.getAxiosInstance().get(
        `/issuing/${cardId}`,
        { params }
      );

      console.log("✅ Maplerad card retrieved:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card retrieval error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to get card",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Freeze a card
   */
  static async freezeCard(cardId: string): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Freezing Maplerad card:", { cardId });

      const response: any = await this.getAxiosInstance().patch(
        `/issuing/${cardId}/freeze`
      );

      console.log("✅ Maplerad card frozen:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card freeze error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to freeze card",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Unfreeze a card
   */
  static async unfreezeCard(cardId: string): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Unfreezing Maplerad card:", { cardId });

      const response: any = await this.getAxiosInstance().patch(
        `/issuing/${cardId}/unfreeze`
      );

      console.log("✅ Maplerad card unfrozen:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card unfreeze error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to unfreeze card",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Terminate a card
   */
  static async terminateCard(cardId: string): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Terminating Maplerad card:", { cardId });

      const response: any = await this.getAxiosInstance().post(
        `/issuing/${cardId}/terminate`
      );

      console.log("✅ Maplerad card terminated:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card termination error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to terminate card",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Get card transactions
   */
  static async getCardTransactions(
    cardId: string,
    params?: any
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Getting Maplerad card transactions:", { cardId, params });

      const response: any = await this.getAxiosInstance().get(
        `/issuing/${cardId}/transactions`,
        { params }
      );

      console.log("✅ Maplerad card transactions retrieved:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card transactions error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to get card transactions",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Process a transaction (for transaction processing flow)
   */
  static async processTransaction(
    transactionData: any
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Processing Maplerad transaction:", transactionData);

      const payload = {
        card_id: transactionData.cardId,
        amount: Math.round(transactionData.amount * 100),
        currency: transactionData.currency || "USD",
        merchant: transactionData.merchant,
        description: transactionData.description,
      };

      const response: any = await this.getAxiosInstance().post(
        "/transactions/process",
        payload
      );

      console.log("✅ Maplerad transaction processed:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad transaction processing error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to process transaction",
          details: error.response?.data,
          payload: error.config?.data,
        },
      };
    }
  }

  /**
   * Get all cards from Maplerad (with optional filtering)
   */
  static async getAllCards(options?: {
    customerId?: string;
    createdAt?: string;
    brand?: "VISA" | "MASTERCARD";
    status?: "ACTIVE" | "DISABLED";
    page?: number;
    pageSize?: number;
  }): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Getting all Maplerad cards:", options);

      const params: any = {};

      if (options?.customerId) {
        params.customer_id = options.customerId;
      }

      if (options?.createdAt) {
        params.created_at = options.createdAt;
      }

      if (options?.brand) {
        params.brand = options.brand;
      }

      if (options?.status) {
        params.status = options.status;
      }

      if (options?.page) {
        params.page = options.page;
      }

      if (options?.pageSize) {
        params.page_size = options.pageSize;
      }

      const response: any = await this.getAxiosInstance().get(`/issuing`, {
        params,
      });

      console.log("✅ Maplerad cards retrieved:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad cards retrieval error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to get cards",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Get real-time card balance
   */
  static async getRealCardBalance(
    cardId: string
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Getting Maplerad card balance:", { cardId });

      const response: any = await this.getAxiosInstance().get(
        `/issuing/${cardId}/balance`
      );

      console.log("✅ Maplerad card balance retrieved:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad card balance error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to get card balance",
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Credit test wallet
   */
  static async creditTestWallet(
    amount: number,
    currency: string = "USD"
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Crediting Maplerad test wallet:", { amount, currency });

      const payload = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toUpperCase(),
      };

      const response: any = await this.getAxiosInstance().post(
        "/test/wallet/credit",
        payload
      );

      console.log("✅ Maplerad test wallet credited:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad test wallet credit error:", error);

      return {
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Failed to credit test wallet",
          details: error.response?.data,
          payload: error.config?.data,
        },
      };
    }
  }
}
