import fnOutput, { OutputProps } from "@/utils/shared/fnOutputHandler";
import { makeMapleradRequest } from "./card";
import {
  convertFromSmallestUnit,
  convertToSmallestUnit,
  mapMapleradTxStatusToLocal,
} from "./tools";
import { MapleradTransaction, CardTransactionFilters } from "./types";
import env from "@/env";

/**
 * 💰 Fund a Maplerad card
 */
const fundCard = async (cardId: string, amount: number): Promise<any> => {
  try {
    console.log("💰 FUND CARD - START", {
      cardId,
      amount,
      operation: "fundCard",
    });

    // Convert amount to smallest unit (cents for USD)
    const amountInSmallestUnit = convertToSmallestUnit(amount, "USD");

    const payload = {
      amount: amountInSmallestUnit,
    };

    console.log("💰 FUND CARD - PAYLOAD", {
      cardId,
      originalAmount: amount,
      amountInSmallestUnit,
      currency: "USD",
    });

    const result = await makeMapleradRequest({
      method: "POST",
      url: `/issuing/${cardId}/fund`,
      data: payload,
    });

    console.log("💰 FUND CARD - SUCCESS", {
      cardId,
      originalAmount: amount,
      amountInSmallestUnit,
      status: result?.output?.status,
      message: result?.output?.message,
      responseId: result?.output?.data?.id,
    });

    return result;
  } catch (error: any) {
    console.error("🚨 FUND CARD ERROR", {
      cardId,
      amount,
      error: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
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
 * 🏧 Withdraw funds from a Maplerad card
 */
const withdrawFromCard = async (
  cardId: string,
  amount: number
): Promise<OutputProps> => {
  try {
    console.log("🏧 WITHDRAW CARD - START", {
      cardId,
      amount,
      operation: "withdrawFromCard",
    });

    // Convert amount to smallest unit (cents for USD)
    const amountInSmallestUnit = convertToSmallestUnit(amount, "USD");

    console.log("🏧 WITHDRAW CARD - PAYLOAD", {
      cardId,
      originalAmount: amount,
      amountInSmallestUnit,
      currency: "USD",
    });

    const payload = {
      amount: amountInSmallestUnit,
    };

    console.log("📤 MAPLERAD REQUEST", {
      method: "POST",
      endpoint: `/issuing/${cardId}/withdraw`,
      url: `${env.MAPLERAD_BASE_URL}/issuing/${cardId}/withdraw`,
      environment: env.NODE_ENV === "production" ? "production" : "sandbox",
      payload,
      payloadSize: JSON.stringify(payload).length,
      hasAuth: true,
    });

    const result = await makeMapleradRequest({
      method: "POST",
      url: `/issuing/${cardId}/withdraw`,
      data: payload,
    });

    const response = result.output;

    console.log("📥 MAPLERAD RESPONSE", {
      method: "POST",
      endpoint: `/issuing/${cardId}/withdraw`,
      status: 200,
      statusText: "OK",
      responseData: response.data,
      responseSize: JSON.stringify(response.data).length,
      success: true,
    });

    console.log("🏧 WITHDRAW CARD - SUCCESS", {
      cardId,
      originalAmount: amount,
      amountInSmallestUnit,
      status: response.data?.status,
      message: response.data?.message,
      responseId: response.data?.data?.id,
    });

    return fnOutput.success({
      output: {
        status: response.data?.status,
        message: response.data?.message || "Card withdrawal processed",
        data: response.data?.data || response.data?.responseData?.data,
      },
    });
  } catch (error: any) {
    console.error("🚨 WITHDRAW CARD ERROR", {
      cardId,
      amount,
      error: error.message,
      status: error.response?.status,
    });

    return fnOutput.error({
      error: {
        message: error.message || "Card withdrawal failed",
        details: error.response?.data,
      },
    });
  }
};

/**
 * 📊 Get card transactions
 */
const getCardTransactions = async (
  cardId: string,
  filters?: {
    from?: string; // ISO date
    to?: string; // ISO date
    type?:
      | "AUTHORIZATION"
      | "SETTLEMENT"
      | "FUNDING"
      | "WITHDRAWAL"
      | "TERMINATION"
      | "DECLINE"
      | "REVERSAL"
      | "REFUND"
      | "CROSS-BORDER";
    mode?: "CREDIT" | "DEBIT";
    limit?: number;
    offset?: number;
  }
): Promise<any> => {
  const params = filters ? new URLSearchParams(filters as any).toString() : "";

  const endpoint = `/issuing/${cardId}/transactions${
    params ? `?${params}` : ""
  }`;

  console.log(`🔍 Getting transactions for card ${cardId}`, {
    endpoint,
    filters,
  });

  return await makeMapleradRequest({
    method: "GET",
    url: endpoint,
  });
};

/**
 * 🔍 Get a specific transaction
 */
const getOneTransaction = async (transactionId: string): Promise<any> => {
  const endpoint = `/issuing/transactions/${transactionId}`;

  console.log(`🔍 Getting transaction ${transactionId}`, {
    endpoint,
  });

  return await makeMapleradRequest({
    method: "GET",
    url: endpoint,
  });
};

/**
 * 📊 Get card transactions from Maplerad
 */
const getCardTransactionsFromMaplerad = async (
  cardId: string,
  fromDate: Date
): Promise<MapleradTransaction[]> => {
  try {
    const filters = {
      from: fromDate.toISOString(),
      to: new Date().toISOString(),
      limit: 100,
    };

    const result = await getCardTransactions(cardId, filters);
    if (result.error) {
      throw new Error(result.error.message);
    }

    const response = result.output;
    const transactions = response?.data || response?.transactions || [];

    // Filter out FUNDING and WITHDRAWAL (handled locally)
    const filteredTransactions = transactions.filter((tx: any) => {
      const type = tx.type?.toUpperCase();
      return type !== "FUNDING" && type !== "WITHDRAWAL";
    });

    // Map Maplerad transactions to our interface
    return filteredTransactions.map((tx: any) => ({
      transactionId: tx.id || tx.reference,
      cardId: tx.card_id || cardId,
      amount: convertFromSmallestUnit(tx.amount || 0, tx.currency || "USD"),
      type: tx.mode === "DEBIT" ? "debit" : "credit",
      status: mapMapleradTxStatusToLocal(tx.status),
      description: tx.description || tx.merchant?.name || "Transaction",
      merchantName: tx.merchant?.name,
      merchantCity: tx.merchant?.city,
      merchantCountry: tx.merchant?.country,
      merchantCategory: tx.card_acceptor_mcc,
      location: tx.merchant
        ? `${tx.merchant.city}, ${tx.merchant.country}`
        : undefined,
      createdAt: tx.created_at || new Date().toISOString(),
      completedAt: tx.settled ? tx.updated_at : undefined,
      reference: tx.reference || tx.id,
      mapleradType: tx.type,
      mode: tx.mode,
    }));
  } catch (error: any) {
    console.error(`Error getting Maplerad transactions for card ${cardId}`, {
      error: error.message,
      fromDate: fromDate.toISOString(),
    });
    throw new Error(
      `Error getting Maplerad transactions for card ${cardId}: ${error?.message}`
    );
  }
};

const mapleradCardTransactionUtils = {
  fundCard,
  withdrawFromCard,
  getCardTransactions,
  getOneTransaction,
  getCardTransactionsFromMaplerad,
};

export default mapleradCardTransactionUtils;
