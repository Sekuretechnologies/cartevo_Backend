import TransactionModel from "@/models/prisma/transactionModel";
import fnOutput from "@/utils/shared/fnOutputHandler";
import mapleradUtils from "@/utils/cards/maplerad";
import { TransactionStatus } from "@/types";
import { mapMapleradTxStatusToLocal } from "@/utils/cards/maplerad/tools";
import { Transaction } from "@prisma/client";

export const checkAndUpdatePendingCardTransactionStatus = async (
  trx: Transaction,
  withoutNotifications?: boolean,
  testMode?: boolean
) => {
  try {
    const reference = trx.order_id;

    const statusResult: any = await mapleradUtils.getOneTransaction(reference);
    if (statusResult.error) {
      throw statusResult.error;
    }

    const responseData = statusResult.output?.data;

    let newStatus = mapMapleradTxStatusToLocal(responseData.status); //'PENDING';

    console.log("updateCardTransactionStatus newStatus::", newStatus);

    if (newStatus !== TransactionStatus.PENDING) {
      const trxResult = await TransactionModel.update(trx.id, {
        status: newStatus,
      });
      if (trxResult.error) {
        throw trxResult.error;
      }
      trx = trxResult.output;
    }

    return fnOutput.success({
      output: trx,
    });
  } catch (error: any) {
    console.log("getDespositStatus error ::", error.message);
    return fnOutput.error({
      error: {
        message: `checkAndUpdatePendingCardTransactionStatus error :: ${error.message}`,
      },
    });
    // console.log(depositId, error.response ? error.response.data : error.message);
  }
};

const mapleradCardTransactionStatusService = {
  checkAndUpdatePendingCardTransactionStatus,
};
export default mapleradCardTransactionStatusService;
