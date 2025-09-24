import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import TransactionModel from "@/models/prisma/transactionModel";
import { updateTransactionStatus } from "@/services/wallet/updateTransactionStatus";

@Injectable()
export class WebhookServiceAfribapay {
  async handleAfribapayWebhook(body: any) {
    console.log("------------ AFRIBAPAY WEBHOOK --------------");
    try {
      const { transaction_id, status } = body;

      console.log(
        "WEBHOOK AFRIBAPAY ::: updateAfribapayTransactionStatus ::",
        body
      );

      // Prefer lookup by provider reference (provider transaction_id)
      let trxResult = await TransactionModel.getOne({
        reference: transaction_id,
      });

      // Fallback to order_id if not found and payload carries an order id
      if ((!trxResult || trxResult.error || !trxResult.output) && (body?.order_id || body?.orderId)) {
        const incomingOrderId = String(body.order_id || body.orderId);
        trxResult = await TransactionModel.getOne({
          order_id: incomingOrderId,
        });
      }

      if (trxResult.error) {
        throw new HttpException("Transaction not found", HttpStatus.NOT_FOUND);
      }

      const trx = trxResult.output;

      if (!trx) {
        throw new HttpException(
          "Aucune transaction n'a été trouvé avec cet identifiant",
          HttpStatus.NOT_FOUND
        );
      }

      // Only update if transaction is PENDING or FAILED
      if (trx.status === "PENDING" || trx.status === "FAILED") {
        console.log(
          "WEBHOOK AFRIBAPAY ::: updateAfribapayTransactionStatus trx.status ::",
          trx.status
        );

        // Update transaction status using our service
        const result = await updateTransactionStatus(String(trx.type), {
          reference: String(transaction_id),
          status: String(status)?.toUpperCase(),
          external_reference: String(trx?.id),
        });

        if (result.error) {
          console.log("updateAfribapayTransactionStatus ERROR::", result.error);
          throw new HttpException(
            "Failed to update transaction status",
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }

      return {
        status: "success",
        message: "Webhook processed successfully",
      };
    } catch (error: any) {
      console.log(`updateAfribapayTransactionStatus error : ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Webhook processing error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
