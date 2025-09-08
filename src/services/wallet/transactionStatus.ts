import CustomerModel from "@/models/prisma/customerModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import fnOutput from "@/utils/shared/fnOutputHandler";
import { checkAfribapayTransactionStatus } from "@/utils/wallet/afribapay";
import { updateTransactionStatus } from "./updateTransactionStatus";

export const checkAndUpdatePendingWalletTransactionStatus = async (
  trx: any,
  withoutNotifications?: boolean,
  testMode?: boolean
) => {
  try {
    console.log("checkAndUpdatePendingWalletTransactionStatus :: ", trx.id);

    // // Get customer information
    // const customerResult = await CustomerModel.getOne({ id: trx.customer_id });
    // if (customerResult.error) {
    //   throw customerResult.error;
    // }
    // const customer = customerResult.output;

    // // Get wallet information to determine country
    // const walletResult = await WalletModel.getOne({ id: trx.wallet_id });
    // if (walletResult.error) {
    //   throw walletResult.error;
    // }
    // const wallet = walletResult.output;

    // - Using Afribapay
    const reference = trx.reference;

    console.log("checkTransactionStatus trx.order_id", trx.reference);

    let newStatus = "PENDING";

    if (reference) {
      const statusResult: any = await checkAfribapayTransactionStatus(
        reference
      );
      if (statusResult.error) {
        throw statusResult.error;
      }
      const responseData = statusResult.output?.data;

      if (responseData?.status && responseData?.status !== "PENDING") {
        newStatus = responseData?.status;
      } else if (responseData?.status === "NOTFOUND") {
        newStatus = "FAILED";
      }
    }

    console.log("updateTransactionStatus newStatus::", newStatus);

    if (newStatus !== "PENDING") {
      const updateResult = await updateTransactionStatus("FUND", {
        reference: reference,
        status: newStatus,
        external_reference: trx.id,
        withoutNotifications,
      });

      if (updateResult.error) {
        console.log("updateTransactionStatus ERROR::", updateResult.error);
        return fnOutput.error({
          code: 500,
          error: {
            message: "Failed to update transaction status",
          },
        });
      }

      return fnOutput.success({
        output: updateResult.output,
      });
    }

    return fnOutput.success({
      output: trx,
    });
  } catch (error: any) {
    console.log(
      "checkAndUpdatePendingWalletTransactionStatus error ::",
      error.message
    );
    return fnOutput.error({
      error: {
        message: `checkAndUpdatePendingWalletTransactionStatus error :: ${error.message}`,
      },
    });
  }
};

export const checkAndUpdateFailedWalletTransactionStatus = async (trx: any) => {
  // For now, this is a placeholder for handling failed transactions
  // In the future, this could include retry logic or different handling based on failure reasons
  console.log("checkAndUpdateFailedWalletTransactionStatus :: ", trx.id);

  return fnOutput.success({
    output: trx,
  });
};
