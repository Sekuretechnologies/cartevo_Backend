import CustomerModel from "@/models/prisma/customerModel";
import TransactionModel from "@/models/prisma/transactionModel";
import WalletModel from "@/models/prisma/walletModel";
import CompanyModel from "@/models/prisma/companyModel";
import NotificationModel from "@/models/prisma/notificationModel";
import { EmailService } from "@/services/email.service";
import { ConfigService } from "@nestjs/config";
import fnOutput from "@/utils/shared/fnOutputHandler";

interface IUpdateTransactionStatus {
  reference?: string;
  provider_id?: string;
  error?: string;
  status: string;
  external_reference: string;
  withoutNotifications?: boolean;
}

export const updateTransactionStatus = async (
  type: string,
  inputData: IUpdateTransactionStatus
) => {
  const {
    reference,
    status,
    external_reference,
    provider_id,
    error,
    withoutNotifications,
  } = inputData;

  let newStatus;
  if (String(status).includes("FAILED")) {
    newStatus = "FAILED";
  } else if (
    String(status).includes("SUCCESS") ||
    String(status).includes("SUCCESSFUL") ||
    String(status).includes("COMPLETED")
  ) {
    newStatus = "SUCCESS";
  } else if (String(status).includes("EXPIRED")) {
    newStatus = "EXPIRED";
  }

  let trxUpdates: any = { status: newStatus };
  // Correct mapping: `reference` stores provider transaction_id (PIM...)
  if (reference) trxUpdates.reference = reference;
  // Keep provider_id optional mapping if provided by caller
  if (provider_id) trxUpdates.provider = provider_id as any;
  if (error) trxUpdates.reason = error;

  // Get the initial transaction
  const initTransResult = await TransactionModel.getOne({
    id: external_reference,
  });
  if (initTransResult.error) {
    throw initTransResult.error;
  }
  const initTrans = initTransResult.output;

  // Update the transaction
  const trxResult = await TransactionModel.update(
    external_reference,
    trxUpdates
  );
  if (trxResult.error) {
    throw trxResult.error;
  }
  const transaction = trxResult.output;

  if (!transaction) {
    return fnOutput.error({
      code: 404,
      error: {
        message: "Transaction not found",
      },
    });
  }

  // Optionally load customer/company only if notifications are required and a customer_id exists
  let customer: any = null;
  let company: any = null;
  if (!withoutNotifications && transaction.customer_id) {
    const customerResult = await CustomerModel.getOne({
      id: transaction.customer_id,
    });
    if (customerResult.error) {
      throw customerResult.error;
    }
    customer = customerResult.output;

    if (!customer) {
      return fnOutput.error({
        code: 404,
        error: { message: "Customer not found" },
      });
    }

    const companyResult = await CompanyModel.getOne({
      id: customer.company_id,
    });
    if (companyResult.error) {
      throw companyResult.error;
    }
    company = companyResult.output;

    if (!company) {
      return fnOutput.error({
        code: 404,
        error: { message: "Company not found" },
      });
    }
  }

  // Handle wallet funding transactions
  if (type === "FUND" || type === "fund") {
    const needsCatchUpBalanceUpdate =
      String(transaction.status).toUpperCase() === "SUCCESS" &&
      Number(transaction.wallet_balance_before ?? 0) ===
        Number(transaction.wallet_balance_after ?? 0);

    if ((newStatus === "SUCCESS" && initTrans.status !== "SUCCESS") || needsCatchUpBalanceUpdate) {
      // Get wallet information
      const walletResult = await WalletModel.getOne({
        id: transaction.wallet_id,
      });
      if (walletResult.error) {
        throw walletResult.error;
      }
      const wallet = walletResult.output;

      // Update wallet balance
      const oldBalance = Number(wallet.balance);
      const newBalance = Number(wallet.balance) + Number(transaction.amount);

      const walletUpdateResult = await WalletModel.update(wallet.id, {
        balance: newBalance,
      });

      if (walletUpdateResult.error) {
        throw walletUpdateResult.error;
      }

      // Update transaction with balance information
      await TransactionModel.update(external_reference, {
        wallet_balance_before: oldBalance,
        wallet_balance_after: newBalance,
      });

      // Create success notification
      // if (!withoutNotifications) {
      //   await NotificationModel.create({
      //     customer_id: customer.id,
      //     transaction_id: transaction.id,
      //     title: "Wallet Funding Successful",
      //     text: `Your wallet has been funded with ${transaction.amount} ${transaction.currency}. New balance: ${newBalance} ${transaction.currency}.`,
      //     category: "WALLET",
      //   });

      //   // Send email notifications to customer and company
      //   const configService = new ConfigService();
      //   const emailService = new EmailService(configService);

      //   try {
      //     // Email to customer
      //     await emailService.sendWalletFundingSuccessEmail(
      //       customer.email,
      //       `${customer.first_name} ${customer.last_name}`,
      //       company.name,
      //       transaction.amount,
      //       transaction.currency,
      //       newBalance,
      //       transaction.id
      //     );

      //     // Email to company
      //     if (company.email) {
      //       await emailService.sendWalletFundingSuccessToCompanyEmail(
      //         company.email,
      //         company.name,
      //         `${customer.first_name} ${customer.last_name}`,
      //         customer.email,
      //         transaction.amount,
      //         transaction.currency,
      //         newBalance,
      //         transaction.id
      //       );
      //     }
      //   } catch (emailError) {
      //     console.log("Email notification failed:", emailError);
      //   }
      // }
    } else if (newStatus === "FAILED" || newStatus === "EXPIRED") {
      // Create failure notification
      if (!withoutNotifications && customer) {
        await NotificationModel.create({
          customer_id: customer.id,
          transaction_id: transaction.id,
          title: "Wallet Funding Failed",
          text: `Your wallet funding of ${transaction.amount} ${transaction.currency} failed. Please try again or contact support.`,
          category: "WALLET",
        });

        // Send email notifications to customer and company for failed transaction
        // const configService = new ConfigService();
        // const emailService = new EmailService(configService);

        // try {
        //   // Email to customer
        //   await emailService.sendWalletFundingFailureEmail(
        //     customer.email,
        //     `${customer.first_name} ${customer.last_name}`,
        //     company.name,
        //     transaction.amount,
        //     transaction.currency,
        //     newStatus,
        //     transaction.id
        //   );

        //   // Email to company
        //   if (company.email) {
        //     await emailService.sendWalletFundingFailureToCompanyEmail(
        //       company.email,
        //       company.name,
        //       `${customer.first_name} ${customer.last_name}`,
        //       customer.email,
        //       transaction.amount,
        //       transaction.currency,
        //       newStatus,
        //       transaction.id
        //     );
        //   }
        // } catch (emailError) {
        //   console.log("Email notification failed:", emailError);
        // }
      }
    }
  }

  // Handle wallet withdrawal transactions
  if (type === "WITHDRAW" || type === "withdraw") {
    if (newStatus === "SUCCESS" && initTrans.status !== "SUCCESS") {
      // For successful withdrawals, the balance was already decreased
      // Create success notification
      if (!withoutNotifications && customer) {
        await NotificationModel.create({
          customer_id: customer.id,
          transaction_id: transaction.id,
          title: "Wallet Withdrawal Successful",
          text: `Your withdrawal of ${transaction.amount} ${transaction.currency} has been processed successfully.`,
          category: "WALLET",
        });

        // Send email notifications to customer and company
        // const configService = new ConfigService();
        // const emailService = new EmailService(configService);

        // try {
        //   // Email to customer
        //   await emailService.sendWalletWithdrawalSuccessEmail(
        //     customer.email,
        //     `${customer.first_name} ${customer.last_name}`,
        //     company.name,
        //     transaction.amount,
        //     transaction.currency,
        //     transaction.id
        //   );

        //   // Email to company
        //   if (company.email) {
        //     await emailService.sendWalletWithdrawalSuccessToCompanyEmail(
        //       company.email,
        //       company.name,
        //       `${customer.first_name} ${customer.last_name}`,
        //       customer.email,
        //       transaction.amount,
        //       transaction.currency,
        //       transaction.id
        //     );
        //   }
        // } catch (emailError) {
        //   console.log("Email notification failed:", emailError);
        // }
      }
    } else if (newStatus === "FAILED" || newStatus === "EXPIRED") {
      // For failed withdrawals, we need to refund the amount back to the wallet
      // Get wallet information
      const walletResult = await WalletModel.getOne({
        id: transaction.wallet_id,
      });
      if (walletResult.error) {
        throw walletResult.error;
      }
      const wallet = walletResult.output;

      // Refund both the amount and fee back to wallet
      const feeAmount = Number(transaction.fee_amount) || 0;
      const totalRefund = Number(transaction.amount) + feeAmount;

      const oldBalance = Number(wallet.balance);
      const newBalance = Number(wallet.balance) + Number(totalRefund);

      const walletUpdateResult = await WalletModel.update(wallet.id, {
        balance: newBalance,
      });

      if (walletUpdateResult.error) {
        throw walletUpdateResult.error;
      }

      // Update transaction with corrected balance information
      await TransactionModel.update(external_reference, {
        wallet_balance_before: oldBalance,
        wallet_balance_after: newBalance,
      });

      // Create failure notification
      if (!withoutNotifications && customer) {
        await NotificationModel.create({
          customer_id: customer.id,
          transaction_id: transaction.id,
          title: "Wallet Withdrawal Failed",
          text: `Your withdrawal of ${transaction.amount} ${transaction.currency} failed. The amount has been refunded to your wallet.`,
          category: "WALLET",
        });

        // Send email notifications to customer and company for failed transaction
        // const configService = new ConfigService();
        // const emailService = new EmailService(configService);

        // try {
        //   // Email to customer
        //   await emailService.sendWalletWithdrawalFailureEmail(
        //     customer.email,
        //     `${customer.first_name} ${customer.last_name}`,
        //     company.name,
        //     transaction.amount,
        //     transaction.currency,
        //     newStatus,
        //     transaction.id
        //   );

        //   // Email to company
        //   if (company.email) {
        //     await emailService.sendWalletWithdrawalFailureToCompanyEmail(
        //       company.email,
        //       company.name,
        //       `${customer.first_name} ${customer.last_name}`,
        //       customer.email,
        //       transaction.amount,
        //       transaction.currency,
        //       newStatus,
        //       transaction.id
        //     );
        //   }
        // } catch (emailError) {
        //   console.log("Email notification failed:", emailError);
        // }
      }
    }
  }

  return fnOutput.success({
    code: 200,
    output: {
      status: "success",
      id: transaction.id,
      newStatus: newStatus,
    },
  });
};
