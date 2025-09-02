import env from "@/env";
import fnOutput from "@/utils/shared/fnOutputHandler";
import WalletModel from "@/models/prisma/walletModel";
import TransactionModel from "@/models/prisma/transactionModel";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import { initiateAfribapayCollect } from "@/utils/wallet/afribapay";
import { v4 as uuidv4 } from "uuid";

/** ================================================================ */
export interface IWalletFunding {
  walletId: string;
  amount: number;
  currency: string;
  provider: string;
  operator: string;
  phone?: string;
  email?: string;
  orderId?: string;
  companyId: string;
  userId: string;
}

/** ================================================================ */
const validateFundingRequest = (data: IWalletFunding) => {
  const { walletId, amount, currency, provider, operator, companyId, userId } =
    data;

  if (!walletId) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Wallet ID is required" },
    });
  }

  if (!amount || amount <= 0) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Valid amount is required" },
    });
  }

  if (amount > 500000) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Maximum funding amount is 500,000" },
    });
  }

  if (!currency) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Currency is required" },
    });
  }

  if (!operator) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Operator is required" },
    });
  }

  if (!provider) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Payment provider is required" },
    });
  }

  if (!companyId) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Company ID is required" },
    });
  }

  if (!userId) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "User ID is required" },
    });
  }

  return fnOutput.success({ output: true });
};

/** ================================================================ */
const calculateTransactionFee = async (
  companyId: string,
  amount: number,
  transactionType: string,
  transactionCategory: string,
  countryIsoCode: string,
  currency: string
) => {
  try {
    const feeResult = await TransactionFeeModel.calculateFee(
      companyId,
      amount,
      transactionType,
      transactionCategory,
      countryIsoCode,
      currency
    );

    if (feeResult.error) {
      // If no fee is configured, return 0 fee
      return fnOutput.success({
        output: {
          feeAmount: 0,
          feeType: "NONE",
          feeValue: 0,
          feeFixed: 0,
          feePercentage: 0,
          feeId: null,
          description: "No fee configured",
        },
      });
    }

    return feeResult;
  } catch (error: any) {
    return fnOutput.error({
      error: { message: "Fee calculation error: " + error.message },
    });
  }
};

/** ================================================================ */
const getWalletDetails = async (walletId: string) => {
  const walletResult = await WalletModel.getOne({ id: walletId });
  if (walletResult.error) {
    return fnOutput.error({
      code: "NOT_FOUND",
      error: { message: "Wallet not found" },
    });
  }

  const wallet = walletResult.output;
  return fnOutput.success({ output: wallet });
};

/** ================================================================ */
const createFundingTransaction = async (
  data: IWalletFunding,
  wallet: any,
  orderId?: string,
  feeInfo?: any
) => {
  const {
    amount,
    currency,
    operator,
    provider,
    phone,
    companyId,
    userId,
    walletId,
  } = data;

  // Calculate net amount after fee deduction
  const feeAmount = feeInfo?.feeAmount || 0;
  const netAmount = amount - feeAmount;

  const transactionData = {
    category: "WALLET",
    type: "FUND",
    amount: amount,
    currency: currency,
    wallet_id: walletId,
    user_id: userId,
    company_id: companyId,
    order_id: orderId || uuidv4(),
    operator: operator,
    provider: provider,
    phone_number: phone,
    status: "PENDING",
    description: `Wallet funding of ${amount} ${currency} via ${operator}. Phone: ${phone}`,
    wallet_balance_before: wallet.balance,
    wallet_balance_after: wallet.balance, // Will be updated after successful payment
    fee_amount: feeAmount,
    fee_id: feeInfo?.feeId || null,
    net_amount: netAmount,
  };

  const transactionResult = await TransactionModel.create(transactionData);
  if (transactionResult.error) {
    return fnOutput.error({
      error: { message: "Failed to create transaction record" },
    });
  }

  return fnOutput.success({ output: transactionResult.output });
};

/** ================================================================ */
const processAfribapayFunding = async (data: IWalletFunding, wallet: any) => {
  const { amount, phone, operator, orderId } = data;

  if (!phone) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Phone number is required for Afribapay funding" },
    });
  }

  if (!operator) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Operator is required for Afribapay funding" },
    });
  }

  try {
    // Get the country phone code from wallet or use default
    const countryPhoneCode = wallet.country_phone_code || "237";

    const afribapayData = {
      amount: amount,
      phone: phone,
      orderId: orderId || uuidv4(),
      operator: operator,
      countryPhoneCode: countryPhoneCode,
    };

    const afribapayResult = await initiateAfribapayCollect(afribapayData);

    if (afribapayResult.status !== 200) {
      return fnOutput.error({
        error: {
          message:
            "Afribapay funding failed: " +
            ((afribapayResult.data as any)?.message || "Unknown error"),
        },
      });
    }

    return fnOutput.success({
      output: {
        providerResponse: afribapayResult.data,
        orderId: afribapayData.orderId,
      },
    });
  } catch (error: any) {
    return fnOutput.error({
      error: { message: "Afribapay funding error: " + error.message },
    });
  }
};

/** ================================================================ */
export const fundWallet = async (data: IWalletFunding) => {
  try {
    // Validate input
    const validation = validateFundingRequest(data);
    if (validation.error) {
      return validation;
    }

    const { walletId, amount, currency, provider, companyId, userId } = data;

    // Get wallet details
    const walletResult = await getWalletDetails(walletId);
    if (walletResult.error) {
      return walletResult;
    }

    const wallet = walletResult.output;

    // Verify wallet belongs to company
    if (wallet.company_id !== companyId) {
      return fnOutput.error({
        code: "FORBIDDEN",
        error: { message: "Wallet does not belong to this company" },
      });
    }

    // Verify currency matches
    if (wallet.currency !== currency) {
      return fnOutput.error({
        code: "BAD_ENTRY",
        error: { message: "Currency does not match wallet currency" },
      });
    }

    // Calculate transaction fee
    const feeResult = await calculateTransactionFee(
      companyId,
      amount,
      "FUND",
      "WALLET",
      wallet.country_iso_code || "CM",
      currency
    );

    if (feeResult.error) {
      return feeResult;
    }

    const feeInfo = feeResult.output;

    // Process payment based on provider first
    let paymentResult;

    switch (provider.toLowerCase()) {
      case "afribapay":
        paymentResult = await processAfribapayFunding(data, wallet);
        break;

      default:
        return fnOutput.error({
          code: "BAD_ENTRY",
          error: { message: "Unsupported payment provider" },
        });
    }

    if (paymentResult.error) {
      return paymentResult;
    }

    // Only create transaction record if payment initiation was successful
    const transactionResult = await createFundingTransaction(
      data,
      wallet,
      paymentResult.output.orderId,
      feeInfo
    );
    if (transactionResult.error) {
      return transactionResult;
    }

    const transaction = transactionResult.output;

    // Update transaction with provider reference
    await TransactionModel.update(transaction.id, {
      reference:
        (paymentResult.output.providerResponse as any)?.transaction_id ||
        (paymentResult.output.providerResponse as any)?.id,
      status: "PENDING", // Keep as pending until webhook confirms
    });

    return fnOutput.success({
      output: {
        transaction: transaction,
        paymentResult: paymentResult.output,
        feeInfo: feeInfo,
      },
    });
  } catch (error: any) {
    return fnOutput.error({
      error: { message: "Wallet funding failed: " + error.message },
    });
  }
};

/** ================================================================ */
export const getWalletBalance = async (walletId: string) => {
  try {
    const walletResult = await WalletModel.getOne({ id: walletId });
    if (walletResult.error) {
      return walletResult;
    }

    const wallet = walletResult.output;

    return fnOutput.success({
      output: {
        walletId: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        country: wallet.country,
      },
    });
  } catch (error: any) {
    return fnOutput.error({
      error: { message: "Failed to get wallet balance: " + error.message },
    });
  }
};

/** ================================================================ */
const walletFundingService = {
  fundWallet,
  getWalletBalance,
};

export default walletFundingService;
