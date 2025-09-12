import { NotificationModel } from "@/models";
import { EmailService } from "@/services/email.service";
import { ConfigService } from "@nestjs/config";
import { NotificationContext, EmailContext } from "../types/cardIssuance.types";

/**
 * Unified Notification Service
 * Handles both database notifications and email sending
 */
export class NotificationService {
  private static emailService: EmailService;
  private static configService: ConfigService;

  /**
   * Initialize the notification service with required dependencies
   */
  static initialize(configService: ConfigService): void {
    this.configService = configService;
    this.emailService = new EmailService(configService);
  }

  /**
   * Send card issuance success notification
   */
  static async sendCardIssuanceSuccessNotification(
    context: NotificationContext
  ): Promise<void> {
    try {
      await NotificationModel.create({
        customer_id: context.customerId,
        title: "Card Issuance Successful",
        text: `A new card has been issued for customer. Card balance: $${context.amount} ${context.currency}. Reference: ${context.reference}`,
      });

      console.log("Card issuance success notification sent", {
        customerId: context.customerId,
        reference: context.reference,
      });
    } catch (error) {
      console.error(
        "Failed to send card issuance success notification:",
        error
      );
    }
  }

  /**
   * Send card issuance failure notification
   */
  static async sendCardIssuanceFailureNotification(
    context: NotificationContext,
    errorMessage: string
  ): Promise<void> {
    try {
      await NotificationModel.create({
        customer_id: context.customerId,
        title: "Card Issuance Failed",
        text: `Card issuance failed. Error: ${errorMessage}. Reference: ${context.reference}`,
      });

      console.log("Card issuance failure notification sent", {
        customerId: context.customerId,
        reference: context.reference,
        error: errorMessage,
      });
    } catch (error) {
      console.error(
        "Failed to send card issuance failure notification:",
        error
      );
    }
  }

  /**
   * Send card creation email to company
   */
  static async sendCardCreationEmail(context: EmailContext): Promise<void> {
    try {
      if (!context.company.email) {
        console.log("No company email provided, skipping email notification");
        return;
      }

      if (!this.emailService) {
        console.error("EmailService not initialized");
        return;
      }

      const emailHtml = this.generateCardCreationEmailTemplate(context);

      await this.emailService.sendEmail({
        to: context.company.email,
        subject: "Card Issuance Successful",
        html: emailHtml,
      });

      console.log("Card creation email sent to company", {
        companyId: context.company.id,
        companyEmail: context.company.email,
        reference: context.reference,
      });
    } catch (error) {
      console.error("Failed to send card creation email:", error);
    }
  }

  /**
   * Send wallet funding success email
   */
  static async sendWalletFundingSuccessEmail(
    customerEmail: string,
    customerName: string,
    companyName: string,
    transactionAmount: number,
    transactionCurrency: string,
    newBalance: number,
    transactionId: string
  ): Promise<void> {
    try {
      if (!this.emailService) {
        console.error("EmailService not initialized");
        return;
      }

      const emailHtml = this.generateWalletFundingSuccessTemplate(
        customerName,
        companyName,
        transactionAmount,
        transactionCurrency,
        newBalance,
        transactionId
      );

      await this.emailService.sendEmail({
        to: customerEmail,
        subject: `Wallet Funding Successful - ${companyName}`,
        html: emailHtml,
      });

      console.log("Wallet funding success email sent", {
        customerEmail,
        transactionId,
        amount: transactionAmount,
        currency: transactionCurrency,
      });
    } catch (error) {
      console.error("Failed to send wallet funding success email:", error);
    }
  }

  /**
   * Send wallet withdrawal success email
   */
  static async sendWalletWithdrawalSuccessEmail(
    customerEmail: string,
    customerName: string,
    companyName: string,
    transactionAmount: number,
    transactionCurrency: string,
    transactionId: string
  ): Promise<void> {
    try {
      if (!this.emailService) {
        console.error("EmailService not initialized");
        return;
      }

      const emailHtml = this.generateWalletWithdrawalSuccessTemplate(
        customerName,
        companyName,
        transactionAmount,
        transactionCurrency,
        transactionId
      );

      await this.emailService.sendEmail({
        to: customerEmail,
        subject: `Wallet Withdrawal Successful - ${companyName}`,
        html: emailHtml,
      });

      console.log("Wallet withdrawal success email sent", {
        customerEmail,
        transactionId,
        amount: transactionAmount,
        currency: transactionCurrency,
      });
    } catch (error) {
      console.error("Failed to send wallet withdrawal success email:", error);
    }
  }

  /**
   * Generate card creation email template
   */
  private static generateCardCreationEmailTemplate(
    context: EmailContext
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Card Issuance Successful! 🎉</h2>
        <p>Dear ${context.company.name},</p>
        <p>A new card has been successfully issued for your customer.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Card Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Customer:</strong> ${context.customer.first_name} ${
      context.customer.last_name
    }</li>
            <li><strong>Card Balance:</strong> $${context.amount} ${
      context.currency
    }</li>
            <li><strong>Card ID:</strong> ${context.card?.id || "N/A"}</li>
            <li><strong>Reference:</strong> ${context.reference}</li>
          </ul>
        </div>
        <p>The card is now active and ready for use.</p>
        <p>Best regards,<br>The CARTEVO Team</p>
      </div>
    `;
  }

  /**
   * Generate wallet funding success email template
   */
  private static generateWalletFundingSuccessTemplate(
    customerName: string,
    companyName: string,
    amount: number,
    currency: string,
    newBalance: number,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Wallet Funding Successful! 🎉</h2>
        <p>Dear ${customerName},</p>
        <p>Great news! Your wallet has been successfully funded.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>New Balance:</strong> ${newBalance} ${currency}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
            <li><strong>Company:</strong> ${companyName}</li>
          </ul>
        </div>
        <p>Your funds are now available for use. Thank you for choosing ${companyName}!</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The ${companyName} Team</p>
      </div>
    `;
  }

  /**
   * Generate wallet withdrawal success email template
   */
  private static generateWalletWithdrawalSuccessTemplate(
    customerName: string,
    companyName: string,
    amount: number,
    currency: string,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Wallet Withdrawal Successful! 🎉</h2>
        <p>Dear ${customerName},</p>
        <p>Great news! Your withdrawal has been processed successfully.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
            <li><strong>Company:</strong> ${companyName}</li>
          </ul>
        </div>
        <p>Your withdrawal request has been completed. Thank you for using ${companyName}!</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The ${companyName} Team</p>
      </div>
    `;
  }
}
