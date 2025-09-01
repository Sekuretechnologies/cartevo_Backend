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
  if (reference) trxUpdates.order_id = reference;
  if (provider_id) trxUpdates.reference = provider_id;
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

  // Get customer information
  const customerResult = await CustomerModel.getOne({
    id: transaction.customer_id,
  });
  if (customerResult.error) {
    throw customerResult.error;
  }
  const customer = customerResult.output;

  if (!customer) {
    return fnOutput.error({
      code: 404,
      error: { message: "Customer not found" },
    });
  }

  // Get company information
  const companyResult = await CompanyModel.getOne({
    id: customer.company_id,
  });
  if (companyResult.error) {
    throw companyResult.error;
  }
  const company = companyResult.output;

  if (!company) {
    return fnOutput.error({
      code: 404,
      error: { message: "Company not found" },
    });
  }

  // Handle wallet funding transactions
  if (type === "FUND" || type === "fund") {
    if (newStatus === "SUCCESS" && initTrans.status !== "SUCCESS") {
      // Get wallet information
      const walletResult = await WalletModel.getOne({
        id: transaction.wallet_id,
      });
      if (walletResult.error) {
        throw walletResult.error;
      }
      const wallet = walletResult.output;

      // Update wallet balance
      const oldBalance = wallet.balance;
      const newBalance = wallet.balance + transaction.amount;

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
      if (!withoutNotifications) {
        await NotificationModel.create({
          customer_id: customer.id,
          transaction_id: transaction.id,
          title: "Wallet Funding Successful",
          text: `Your wallet has been funded with ${transaction.amount} ${transaction.currency}. New balance: ${newBalance} ${transaction.currency}.`,
          category: "WALLET",
        });

        // Send email notifications to customer and company
        const configService = new ConfigService();
        const emailService = new EmailService(configService);

        try {
          // Email to customer
          await emailService.sendEmail({
            to: customer.email,
            subject: `Wallet Funding Successful - ${company.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Wallet Funding Successful! 🎉</h2>
                <p>Dear ${customer.first_name} ${customer.last_name},</p>
                <p>Great news! Your wallet has been successfully funded.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3>Transaction Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                    <li><strong>New Balance:</strong> ${newBalance} ${transaction.currency}</li>
                    <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    <li><strong>Company:</strong> ${company.name}</li>
                  </ul>
                </div>
                <p>Your funds are now available for use. Thank you for choosing ${company.name}!</p>
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The ${company.name} Team</p>
              </div>
            `,
          });

          // Email to company
          if (company.email) {
            await emailService.sendEmail({
              to: company.email,
              subject: `Customer Wallet Funded - ${customer.first_name} ${customer.last_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #28a745;">Customer Wallet Funding Notification</h2>
                  <p>Dear ${company.name} Team,</p>
                  <p>A customer has successfully funded their wallet.</p>
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3>Transaction Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                      <li><strong>Customer:</strong> ${customer.first_name} ${customer.last_name}</li>
                      <li><strong>Customer Email:</strong> ${customer.email}</li>
                      <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                      <li><strong>New Balance:</strong> ${newBalance} ${transaction.currency}</li>
                      <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    </ul>
                  </div>
                  <p>The transaction has been processed successfully and the customer's wallet has been updated.</p>
                  <p>Best regards,<br>The System</p>
                </div>
              `,
            });
          }
        } catch (emailError) {
          console.log("Email notification failed:", emailError);
        }
      }
    } else if (newStatus === "FAILED" || newStatus === "EXPIRED") {
      // Create failure notification
      if (!withoutNotifications) {
        await NotificationModel.create({
          customer_id: customer.id,
          transaction_id: transaction.id,
          title: "Wallet Funding Failed",
          text: `Your wallet funding of ${transaction.amount} ${transaction.currency} failed. Please try again or contact support.`,
          category: "WALLET",
        });

        // Send email notifications to customer and company for failed transaction
        const configService = new ConfigService();
        const emailService = new EmailService(configService);

        try {
          // Email to customer
          await emailService.sendEmail({
            to: customer.email,
            subject: `Wallet Funding Failed - ${company.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc3545;">Wallet Funding Failed</h2>
                <p>Dear ${customer.first_name} ${customer.last_name},</p>
                <p>We regret to inform you that your wallet funding attempt was unsuccessful.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3>Transaction Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                    <li><strong>Status:</strong> ${newStatus}</li>
                    <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    <li><strong>Company:</strong> ${company.name}</li>
                  </ul>
                </div>
                <p>Please try again or contact our support team for assistance.</p>
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The ${company.name} Team</p>
              </div>
            `,
          });

          // Email to company
          if (company.email) {
            await emailService.sendEmail({
              to: company.email,
              subject: `Customer Wallet Funding Failed - ${customer.first_name} ${customer.last_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc3545;">Customer Wallet Funding Failed</h2>
                  <p>Dear ${company.name} Team,</p>
                  <p>A customer's wallet funding attempt has failed.</p>
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3>Transaction Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                      <li><strong>Customer:</strong> ${customer.first_name} ${customer.last_name}</li>
                      <li><strong>Customer Email:</strong> ${customer.email}</li>
                      <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                      <li><strong>Status:</strong> ${newStatus}</li>
                      <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    </ul>
                  </div>
                  <p>The transaction has failed. Please check the transaction details and assist the customer if needed.</p>
                  <p>Best regards,<br>The System</p>
                </div>
              `,
            });
          }
        } catch (emailError) {
          console.log("Email notification failed:", emailError);
        }
      }
    }
  }

  // Handle wallet withdrawal transactions
  if (type === "WITHDRAW" || type === "withdraw") {
    if (newStatus === "SUCCESS" && initTrans.status !== "SUCCESS") {
      // For successful withdrawals, the balance was already decreased
      // Create success notification
      if (!withoutNotifications) {
        await NotificationModel.create({
          customer_id: customer.id,
          transaction_id: transaction.id,
          title: "Wallet Withdrawal Successful",
          text: `Your withdrawal of ${transaction.amount} ${transaction.currency} has been processed successfully.`,
          category: "WALLET",
        });

        // Send email notifications to customer and company
        const configService = new ConfigService();
        const emailService = new EmailService(configService);

        try {
          // Email to customer
          await emailService.sendEmail({
            to: customer.email,
            subject: `Wallet Withdrawal Successful - ${company.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Wallet Withdrawal Successful! 🎉</h2>
                <p>Dear ${customer.first_name} ${customer.last_name},</p>
                <p>Great news! Your withdrawal has been processed successfully.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3>Transaction Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                    <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    <li><strong>Company:</strong> ${company.name}</li>
                  </ul>
                </div>
                <p>Your withdrawal request has been completed. Thank you for using ${company.name}!</p>
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The ${company.name} Team</p>
              </div>
            `,
          });

          // Email to company
          if (company.email) {
            await emailService.sendEmail({
              to: company.email,
              subject: `Customer Wallet Withdrawal - ${customer.first_name} ${customer.last_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #28a745;">Customer Wallet Withdrawal Notification</h2>
                  <p>Dear ${company.name} Team,</p>
                  <p>A customer has successfully withdrawn from their wallet.</p>
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3>Transaction Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                      <li><strong>Customer:</strong> ${customer.first_name} ${customer.last_name}</li>
                      <li><strong>Customer Email:</strong> ${customer.email}</li>
                      <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                      <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    </ul>
                  </div>
                  <p>The withdrawal has been processed successfully.</p>
                  <p>Best regards,<br>The System</p>
                </div>
              `,
            });
          }
        } catch (emailError) {
          console.log("Email notification failed:", emailError);
        }
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
      const feeAmount = transaction.fee_amount || 0;
      const totalRefund = transaction.amount + feeAmount;

      const oldBalance = wallet.balance;
      const newBalance = wallet.balance + totalRefund;

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
      if (!withoutNotifications) {
        await NotificationModel.create({
          customer_id: customer.id,
          transaction_id: transaction.id,
          title: "Wallet Withdrawal Failed",
          text: `Your withdrawal of ${transaction.amount} ${transaction.currency} failed. The amount has been refunded to your wallet.`,
          category: "WALLET",
        });

        // Send email notifications to customer and company for failed transaction
        const configService = new ConfigService();
        const emailService = new EmailService(configService);

        try {
          // Email to customer
          await emailService.sendEmail({
            to: customer.email,
            subject: `Wallet Withdrawal Failed - ${company.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc3545;">Wallet Withdrawal Failed</h2>
                <p>Dear ${customer.first_name} ${customer.last_name},</p>
                <p>We regret to inform you that your withdrawal attempt was unsuccessful.</p>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3>Transaction Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                    <li><strong>Status:</strong> ${newStatus}</li>
                    <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    <li><strong>Company:</strong> ${company.name}</li>
                  </ul>
                </div>
                <p>The amount has been refunded back to your wallet. Please try again or contact our support team for assistance.</p>
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The ${company.name} Team</p>
              </div>
            `,
          });

          // Email to company
          if (company.email) {
            await emailService.sendEmail({
              to: company.email,
              subject: `Customer Wallet Withdrawal Failed - ${customer.first_name} ${customer.last_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc3545;">Customer Wallet Withdrawal Failed</h2>
                  <p>Dear ${company.name} Team,</p>
                  <p>A customer's withdrawal attempt has failed. The amount has been refunded to their wallet.</p>
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3>Transaction Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                      <li><strong>Customer:</strong> ${customer.first_name} ${customer.last_name}</li>
                      <li><strong>Customer Email:</strong> ${customer.email}</li>
                      <li><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</li>
                      <li><strong>Status:</strong> ${newStatus}</li>
                      <li><strong>Transaction ID:</strong> ${transaction.id}</li>
                    </ul>
                  </div>
                  <p>The transaction has failed and the amount has been refunded to the customer's wallet.</p>
                  <p>Best regards,<br>The System</p>
                </div>
              `,
            });
          }
        } catch (emailError) {
          console.log("Email notification failed:", emailError);
        }
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
