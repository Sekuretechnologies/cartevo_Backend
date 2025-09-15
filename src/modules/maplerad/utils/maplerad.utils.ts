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

export interface MapleradCardData {
  customer_id: string;
  currency: string;
  type: string;
  brand: string;
  amount: number;
}

export class MapleradUtils {
  private static axiosInstance: any;

  private static getAxiosInstance(): any {
    if (!this.axiosInstance) {
      const baseURL =
        process.env.MAPLERAD_BASE_URL || "https://api.maplerad.com/v1";
      const secretKey = process.env.MAPLERAD_SECRET_KEY;

      if (!secretKey) {
        throw new Error("MAPLERAD_SECRET_KEY environment variable is required");
      }

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
    customerData: MapleradCustomerData
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Creating Maplerad customer:", {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
      });

      const payload = {
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        date_of_birth: customerData.dateOfBirth,
        address: {
          street: customerData.address.street,
          city: customerData.address.city,
          state: customerData.address.state,
          country: customerData.address.country,
          postal_code: customerData.address.postalCode,
        },
      };

      const response: any = await this.getAxiosInstance().post(
        "/customers",
        payload
      );

      console.log("✅ Maplerad customer created:", response.data);

      return {
        output: response.data,
      };
    } catch (error: any) {
      console.error("❌ Maplerad customer creation error:", error);

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
   * Create a virtual card in Maplerad
   */
  static async createCard(
    cardData: MapleradCardData
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Creating Maplerad card:", {
        customerId: cardData.customer_id,
        brand: cardData.brand,
        amount: cardData.amount,
      });

      const payload = {
        customer_id: cardData.customer_id,
        currency: cardData.currency,
        type: cardData.type,
        brand: cardData.brand,
        amount: cardData.amount,
      };

      const response: any = await this.getAxiosInstance().post(
        "/cards",
        payload
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
        `/cards/${cardId}/fund`,
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
        `/cards/${cardId}/withdraw`,
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
        `/cards/${cardId}`,
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

      const response: any = await this.getAxiosInstance().post(
        `/cards/${cardId}/freeze`
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

      const response: any = await this.getAxiosInstance().post(
        `/cards/${cardId}/unfreeze`
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
        `/cards/${cardId}/terminate`
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
        `/cards/${cardId}/transactions`,
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
   * Get real-time card balance
   */
  static async getRealCardBalance(
    cardId: string
  ): Promise<MapleradApiResponse> {
    try {
      console.log("📤 Getting Maplerad card balance:", { cardId });

      const response: any = await this.getAxiosInstance().get(
        `/cards/${cardId}/balance`
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
}
