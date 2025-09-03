import env from "@/env";
import fnOutput from "@/utils/shared/fnOutputHandler";
import WalletModel from "@/models/prisma/walletModel";
import TransactionModel from "@/models/prisma/transactionModel";
import TransactionFeeModel from "@/models/prisma/transactionFeeModel";
import { initiateAfribapayPayout } from "@/utils/wallet/afribapay";
import { v4 as uuidv4 } from "uuid";

/** ================================================================ */
export interface IWalletWithdrawal {
  walletId: string;
  amount: number;
  currency: string;
  provider: string;
  operator: string;
  phone?: string;
  email?: string;
  orderId?: string;
  companyId: string;
  customerId: string;
}

/** ================================================================ */
const validateWithdrawalRequest = (data: IWalletWithdrawal) => {
  const {
    walletId,
    amount,
    currency,
    provider,
    operator,
    companyId,
    customerId,
  } = data;

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
      error: { message: "Maximum withdrawal amount is 500,000" },
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

  if (!customerId) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Customer ID is required" },
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
const checkWalletBalance = async (
  wallet: any,
  amount: number,
  feeAmount: number = 0
) => {
  const totalDeduction = amount + feeAmount;

  if (wallet.balance < totalDeduction) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: {
        message: `Insufficient wallet balance. Required: ${totalDeduction} ${wallet.currency}, Available: ${wallet.balance} ${wallet.currency}`,
      },
    });
  }

  return fnOutput.success({ output: true });
};

/** ================================================================ */
const updateWalletBalance = async (walletId: string, newBalance: number) => {
  const updateResult = await WalletModel.update(walletId, {
    balance: newBalance,
  });

  if (updateResult.error) {
    return fnOutput.error({
      error: { message: "Failed to update wallet balance" },
    });
  }

  return fnOutput.success({ output: updateResult.output });
};

/** ================================================================ */
const createWithdrawalTransaction = async (
  data: IWalletWithdrawal,
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
    customerId,
    walletId,
  } = data;

  // Calculate fee and total deduction (amount + fee)
  const feeAmount = feeInfo?.feeAmount || 0;
  const totalDeduction = amount + feeAmount;

  // Calculate new balance (decrease immediately for withdrawal)
  const newBalance = wallet.balance - totalDeduction;

  const transactionData = {
    category: "WALLET",
    type: "WITHDRAW",
    amount: amount,
    currency: currency,
    wallet_id: walletId,
    customer_id: customerId,
    company_id: companyId,
    order_id: orderId || uuidv4(),
    operator: operator,
    provider: provider,
    phone_number: phone,
    status: "PENDING",
    description: `Wallet withdrawal via ${provider}`,
    wallet_balance_before: wallet.balance,
    wallet_balance_after: newBalance, // Balance decreased immediately
    fee_amount: feeAmount,
    fee_id: feeInfo?.feeId || null,
    net_amount: amount, // The amount user receives (excluding fee)
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
const processAfribapayWithdrawal = async (
  data: IWalletWithdrawal,
  wallet: any
) => {
  const { amount, phone, operator, orderId } = data;

  if (!phone) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Phone number is required for Afribapay withdrawal" },
    });
  }

  if (!operator) {
    return fnOutput.error({
      code: "BAD_ENTRY",
      error: { message: "Operator is required for Afribapay withdrawal" },
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

    const afribapayResult = await initiateAfribapayPayout(afribapayData);

    if (afribapayResult.status !== 200) {
      return fnOutput.error({
        error: {
          message:
            "Afribapay withdrawal failed: " +
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
      error: { message: "Afribapay withdrawal error: " + error.message },
    });
  }
};

/** ================================================================ */
export const withdrawFromWallet = async (
  companyId: string,
  data: IWalletWithdrawal
) => {
  try {
    // Validate input
    const validation = validateWithdrawalRequest(data);
    if (validation.error) {
      return validation;
    }

    const { walletId, amount, currency, provider, companyId, customerId } =
      data;

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
      "WITHDRAW",
      "WALLET",
      wallet.country_iso_code || "CM",
      currency
    );

    if (feeResult.error) {
      return feeResult;
    }

    const feeInfo = feeResult.output;

    // Check sufficient balance (including fees)
    const balanceCheck = await checkWalletBalance(
      wallet,
      amount,
      feeInfo.feeAmount
    );
    if (balanceCheck.error) {
      return balanceCheck;
    }

    // Process payment based on provider first
    let paymentResult;

    switch (provider.toLowerCase()) {
      case "afribapay":
        paymentResult = await processAfribapayWithdrawal(data, wallet);
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

    // Calculate new balance (decrease immediately for withdrawal including fees)
    const totalDeduction = amount + feeInfo.feeAmount;
    const newBalance = wallet.balance - totalDeduction;

    // Update wallet balance immediately on successful Afribapay response
    const balanceUpdate = await updateWalletBalance(walletId, newBalance);
    if (balanceUpdate.error) {
      return balanceUpdate;
    }

    // Create transaction record with decreased balance
    const transactionResult = await createWithdrawalTransaction(
      data,
      { ...wallet, balance: newBalance }, // Use updated balance
      paymentResult.output.orderId,
      feeInfo
    );
    if (transactionResult.error) {
      // If transaction creation fails, we should refund the balance
      await updateWalletBalance(walletId, wallet.balance);
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
        newBalance: newBalance,
        totalDeducted: totalDeduction,
      },
    });
  } catch (error: any) {
    return fnOutput.error({
      error: { message: "Wallet withdrawal failed: " + error.message },
    });
  }
};

/** ================================================================ */
const walletWithdrawalService = {
  withdrawFromWallet,
};

export default walletWithdrawalService;
