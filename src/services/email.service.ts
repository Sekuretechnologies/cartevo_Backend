import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // const apiKey = this.configService.get("MAILTRAP_API_TOKEN");
      this.transporter = nodemailer.createTransport({
        host:
          this.configService.get("MAILTRAP_HOST") || "live.smtp.mailtrap.io",
        port: parseInt(this.configService.get("MAILTRAP_PORT") || "25"),
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.configService.get("MAILTRAP_USERNAME"),
          pass: this.configService.get("MAILTRAP_PASSWORD"),
        },
      });
    } catch (error) {
      console.error("Email service initialization error:", error);
      throw new BadRequestException("Email service configuration error");
    }
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    userName?: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: email,
        subject: "Code de vérification CARTEVO",
        html: this.getOtpEmailTemplate(otp, userName),
        text: `Votre code de vérification CARTEVO est: ${otp}. Ce code expire dans 10 minutes.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("OTP email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending OTP email:", error);
      throw new BadRequestException("Failed to send OTP email");
    }
  }

  async sendInvitationEmail(
    email: string,
    invitationCode: string,
    companyName: string,
    inviterName?: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: email,
        subject: `Invitation à rejoindre ${companyName} sur CARTEVO`,
        html: this.getInvitationEmailTemplate(
          invitationCode,
          companyName,
          inviterName
        ),
        text: `Vous avez été invité à rejoindre ${companyName} sur CARTEVO. Votre code d'invitation est: ${invitationCode}`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Invitation email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending invitation email:", error);
      throw new BadRequestException("Failed to send invitation email");
    }
  }

  async sendInvitationEmailWithToken(
    email: string,
    invitationToken: string,
    companyName: string,
    inviterName?: string
  ): Promise<boolean> {
    try {
      // Generate invitation URLs
      const frontendUrl =
        this.configService.get("FRONTEND_URL") || "http://localhost:3000";
      const acceptInvitationUrl = `${frontendUrl}/invitation/accept?token=${invitationToken}`;
      const registerUrl = `${frontendUrl}/invitation/accept?token=${invitationToken}`;

      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: email,
        subject: `Invitation to join ${companyName} on CARTEVO`,
        html: this.getInvitationEmailTemplateWithToken(
          acceptInvitationUrl,
          registerUrl,
          invitationToken,
          companyName,
          inviterName
        ),
        text: `You've been invited to join ${companyName} on CARTEVO. Click here to accept: ${acceptInvitationUrl}`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Invitation email with token sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error("Error sending invitation email with token:", error);
      throw new BadRequestException("Failed to send invitation email");
    }
  }

  async sendWelcomeEmail(
    email: string,
    userName: string,
    companyName: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: email,
        subject: `Bienvenue sur CARTEVO, ${userName}!`,
        html: this.getWelcomeEmailTemplate(userName, companyName),
        text: `Bienvenue sur CARTEVO, ${userName}! Votre compte pour ${companyName} a été créé avec succès.`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Welcome email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw new BadRequestException("Failed to send welcome email");
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || "",
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new BadRequestException("Failed to send email");
    }
  }

  async rejectKycEmail(
    email: string,
    userName: string,
    rejectionMessage: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: email,
        subject: `KYC Rejected - CARTEVO`,
        html: `
        <p>Bonjour ${userName},</p>
        <p>Nous vous informons que votre demande de vérification KYC a été <strong>rejetée</strong>.</p>
        <p><strong>Raison :</strong> ${rejectionMessage}</p>
        <p>Veuillez vérifier vos informations et soumettre à nouveau votre KYC.</p>
        <p>Cordialement,<br>L'équipe CARTEVO</p>
      `,
        text: `Bonjour ${userName},\n\nVotre demande de vérification KYC a été rejetée.\n\nRaison : ${rejectionMessage}\n\nVeuillez vérifier vos informations et soumettre à nouveau votre KYC.\n\nCordialement,\nL'équipe CARTEVO`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("KYC rejection email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending KYC rejection email:", error);
      throw new BadRequestException("Failed to send KYC rejection email");
    }
  }

  async approveKycEmail(email: string, userName: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: email,
        subject: `KYC Approved - CARTEVO`,
        html: `
        <p>Bonjour ${userName},</p>
        <p>Félicitations ! Votre demande de vérification KYC a été <strong>approuvée</strong>.</p>
        <p>Vous pouvez désormais profiter de toutes les fonctionnalités de votre compte CARTEVO.</p>
        <p>Cordialement,<br>L'équipe CARTEVO</p>
      `,
        text: `Bonjour ${userName},\n\nFélicitations ! Votre demande de vérification KYC a été approuvée.\n\nVous pouvez désormais profiter de toutes les fonctionnalités de votre compte CARTEVO.\n\nCordialement,\nL'équipe CARTEVO`,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("KYC approval email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending KYC approval email:", error);
      throw new BadRequestException("Failed to send email");
    }
  }

  private getOtpEmailTemplate(otp: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code de vérification CARTEVO</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; padding: 20px; background-color: white; border: 2px dashed #007bff; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CARTEVO</h1>
          </div>
          <div class="content">
            ${userName ? `<p>Bonjour ${userName},</p>` : "<p>Bonjour,</p>"}
            <p>Voici votre code de vérification pour vous connecter à CARTEVO:</p>
            <div class="otp-code">${otp}</div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>Ce code expire dans <strong>10 minutes</strong></li>
              <li>Ne partagez jamais ce code avec personne</li>
              <li>Si vous n'avez pas demandé ce code, ignorez cet email</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2025 CARTEVO. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getInvitationEmailTemplate(
    invitationCode: string,
    companyName: string,
    inviterName?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation CARTEVO</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .invitation-code { font-size: 24px; font-weight: bold; color: #007bff; text-align: center; padding: 15px; background-color: white; border: 2px solid #007bff; margin: 20px 0; }
          .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CARTEVO</h1>
          </div>
          <div class="content">
            <h2>Vous êtes invité à rejoindre ${companyName}</h2>
            ${
              inviterName
                ? `<p>${inviterName} vous a invité à rejoindre ${companyName} sur CARTEVO.</p>`
                : `<p>Vous avez été invité à rejoindre ${companyName} sur CARTEVO.</p>`
            }
            <p>Utilisez le code d'invitation ci-dessous pour créer votre compte:</p>
            <div class="invitation-code">${invitationCode}</div>
            <p>Pour compléter votre inscription, rendez-vous sur la plateforme CARTEVO et utilisez ce code d'invitation.</p>
            <a href="#" class="cta-button">Créer mon compte</a>
          </div>
          <div class="footer">
            <p>© 2025 CARTEVO. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getInvitationEmailTemplateWithToken(
    acceptInvitationUrl: string,
    registerUrl: string,
    invitationToken: string,
    companyName: string,
    inviterName?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to join ${companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .invitation-link { display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; text-align: center; }
          .invitation-link:hover { background-color: #0056b3; }
          .secondary-text { color: #666; font-size: 14px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CARTEVO</h1>
          </div>
          <div class="content">
            <h2>You're invited to join ${companyName}!</h2>

            <p>Hi there,</p>

            <p>
              <strong>${
                inviterName || "A team member"
              }</strong> has invited you to join
              <strong>${companyName}</strong> on CARTEVO.
            </p>

            <p>Click the button below to accept the invitation and get access to ${companyName}:</p>
            <a href="${acceptInvitationUrl}" class="invitation-link">
              Accept Invitation & Sign In
            </a>
            <p class="secondary-text">
              You'll be asked to sign in with your existing account to confirm.
            </p>

            <p><strong>What happens next?</strong></p>
            <ul>
              <li>You'll be redirected to CARTEVO</li>
              <li>Sign in with your existing credentials</li>
              <li>Get immediate access to ${companyName}</li>
            </ul>

            <p>This invitation link expires in 7 days for security reasons.</p>

            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><small>${acceptInvitationUrl}</small></p>
          </div>
          <div class="footer">
            <p>© 2025 CARTEVO. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(
    userName: string,
    companyName: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue sur CARTEVO</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bienvenue sur CARTEVO!</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>Félicitations! Votre compte CARTEVO pour <strong>${companyName}</strong> a été créé avec succès.</p>
            <p>Vous pouvez maintenant:</p>
            <ul>
              <li>Gérer vos cartes virtuelles</li>
              <li>Suivre vos transactions en temps réel</li>
              <li>Accéder à tous les outils de gestion financière</li>
            </ul>
            <a href="#" class="cta-button">Accéder à mon compte</a>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          </div>
          <div class="footer">
            <p>© 2025 CARTEVO. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async resetPasswordEmail(
    email: string,
    resetLink: string,
    userName?: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: email,
        subject: "Réinitialisation de votre mot de passe",
        html: `
        <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">
          <p>Bonjour ${userName || ""},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte CARTEVO.</p>
          <p>Pour définir un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}"
              style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #1F66FF;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
              ">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Si le bouton ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :</p>
          <p><a href="${resetLink}" style="color:#1F66FF;">${resetLink}</a></p>
          <p><strong>Important :</strong> ce lien est valable pendant 15 minutes.</p>
          <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
          <br>
          <p style="font-size: 12px; color: #999;">© 2025 CARTEVO – Tous droits réservés.</p>
        </div>
      `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Reset password email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending reset password email:", error);
      throw new BadRequestException("Failed to send password reset email");
    }
  }

  async sendWalletFundingSuccessEmail(
    customerEmail: string,
    customerName: string,
    companyName: string,
    transactionAmount: number,
    transactionCurrency: string,
    newBalance: number,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: customerEmail,
        subject: `Wallet Funding Successful - ${companyName}`,
        html: this.getWalletFundingSuccessTemplate(
          customerName,
          companyName,
          transactionAmount,
          transactionCurrency,
          newBalance,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet funding success email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error("Error sending wallet funding success email:", error);
      throw new BadRequestException(
        "Failed to send wallet funding success email"
      );
    }
  }

  async sendWalletFundingFailureEmail(
    customerEmail: string,
    customerName: string,
    companyName: string,
    transactionAmount: number,
    transactionCurrency: string,
    status: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: customerEmail,
        subject: `Wallet Funding Failed - ${companyName}`,
        html: this.getWalletFundingFailureTemplate(
          customerName,
          companyName,
          transactionAmount,
          transactionCurrency,
          status,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet funding failure email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error("Error sending wallet funding failure email:", error);
      throw new BadRequestException(
        "Failed to send wallet funding failure email"
      );
    }
  }

  async sendWalletWithdrawalSuccessEmail(
    customerEmail: string,
    customerName: string,
    companyName: string,
    transactionAmount: number,
    transactionCurrency: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: customerEmail,
        subject: `Wallet Withdrawal Successful - ${companyName}`,
        html: this.getWalletWithdrawalSuccessTemplate(
          customerName,
          companyName,
          transactionAmount,
          transactionCurrency,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet withdrawal success email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error("Error sending wallet withdrawal success email:", error);
      throw new BadRequestException(
        "Failed to send wallet withdrawal success email"
      );
    }
  }

  async sendWalletWithdrawalFailureEmail(
    customerEmail: string,
    customerName: string,
    companyName: string,
    transactionAmount: number,
    transactionCurrency: string,
    status: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: customerEmail,
        subject: `Wallet Withdrawal Failed - ${companyName}`,
        html: this.getWalletWithdrawalFailureTemplate(
          customerName,
          companyName,
          transactionAmount,
          transactionCurrency,
          status,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet withdrawal failure email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error("Error sending wallet withdrawal failure email:", error);
      throw new BadRequestException(
        "Failed to send wallet withdrawal failure email"
      );
    }
  }

  async sendWalletFundingSuccessToCompanyEmail(
    companyEmail: string,
    companyName: string,
    customerName: string,
    customerEmail: string,
    transactionAmount: number,
    transactionCurrency: string,
    newBalance: number,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: companyEmail,
        subject: `Customer Wallet Funded - ${customerName}`,
        html: this.getWalletFundingSuccessToCompanyTemplate(
          companyName,
          customerName,
          customerEmail,
          transactionAmount,
          transactionCurrency,
          newBalance,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet funding success to company email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error(
        "Error sending wallet funding success to company email:",
        error
      );
      throw new BadRequestException(
        "Failed to send wallet funding success to company email"
      );
    }
  }

  async sendWalletFundingFailureToCompanyEmail(
    companyEmail: string,
    companyName: string,
    customerName: string,
    customerEmail: string,
    transactionAmount: number,
    transactionCurrency: string,
    status: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: companyEmail,
        subject: `Customer Wallet Funding Failed - ${customerName}`,
        html: this.getWalletFundingFailureToCompanyTemplate(
          companyName,
          customerName,
          customerEmail,
          transactionAmount,
          transactionCurrency,
          status,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet funding failure to company email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error(
        "Error sending wallet funding failure to company email:",
        error
      );
      throw new BadRequestException(
        "Failed to send wallet funding failure to company email"
      );
    }
  }

  async sendWalletWithdrawalSuccessToCompanyEmail(
    companyEmail: string,
    companyName: string,
    customerName: string,
    customerEmail: string,
    transactionAmount: number,
    transactionCurrency: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: companyEmail,
        subject: `Customer Wallet Withdrawal - ${customerName}`,
        html: this.getWalletWithdrawalSuccessToCompanyTemplate(
          companyName,
          customerName,
          customerEmail,
          transactionAmount,
          transactionCurrency,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet withdrawal success to company email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error(
        "Error sending wallet withdrawal success to company email:",
        error
      );
      throw new BadRequestException(
        "Failed to send wallet withdrawal success to company email"
      );
    }
  }

  async sendWalletWithdrawalFailureToCompanyEmail(
    companyEmail: string,
    companyName: string,
    customerName: string,
    customerEmail: string,
    transactionAmount: number,
    transactionCurrency: string,
    status: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "noreply@cartevo.co",
        to: companyEmail,
        subject: `Customer Wallet Withdrawal Failed - ${customerName}`,
        html: this.getWalletWithdrawalFailureToCompanyTemplate(
          companyName,
          customerName,
          customerEmail,
          transactionAmount,
          transactionCurrency,
          status,
          transactionId
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(
        "Wallet withdrawal failure to company email sent successfully:",
        result.messageId
      );
      return true;
    } catch (error) {
      console.error(
        "Error sending wallet withdrawal failure to company email:",
        error
      );
      throw new BadRequestException(
        "Failed to send wallet withdrawal failure to company email"
      );
    }
  }

  private getWalletFundingSuccessTemplate(
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

  private getWalletFundingFailureTemplate(
    customerName: string,
    companyName: string,
    amount: number,
    currency: string,
    status: string,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Wallet Funding Failed</h2>
        <p>Dear ${customerName},</p>
        <p>We regret to inform you that your wallet funding attempt was unsuccessful.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>Status:</strong> ${status}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
            <li><strong>Company:</strong> ${companyName}</li>
          </ul>
        </div>
        <p>Please try again or contact our support team for assistance.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The ${companyName} Team</p>
      </div>
    `;
  }

  private getWalletWithdrawalSuccessTemplate(
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

  private getWalletWithdrawalFailureTemplate(
    customerName: string,
    companyName: string,
    amount: number,
    currency: string,
    status: string,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Wallet Withdrawal Failed</h2>
        <p>Dear ${customerName},</p>
        <p>We regret to inform you that your withdrawal attempt was unsuccessful.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>Status:</strong> ${status}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
            <li><strong>Company:</strong> ${companyName}</li>
          </ul>
        </div>
        <p>The amount has been refunded back to your wallet. Please try again or contact our support team for assistance.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The ${companyName} Team</p>
      </div>
    `;
  }

  private getWalletFundingSuccessToCompanyTemplate(
    companyName: string,
    customerName: string,
    customerEmail: string,
    amount: number,
    currency: string,
    newBalance: number,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Customer Wallet Funding Notification</h2>
        <p>Dear ${companyName} Team,</p>
        <p>A customer has successfully funded their wallet.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Customer Email:</strong> ${customerEmail}</li>
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>New Balance:</strong> ${newBalance} ${currency}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
          </ul>
        </div>
        <p>The transaction has been processed successfully and the customer's wallet has been updated.</p>
        <p>Best regards,<br>The System</p>
      </div>
    `;
  }

  private getWalletFundingFailureToCompanyTemplate(
    companyName: string,
    customerName: string,
    customerEmail: string,
    amount: number,
    currency: string,
    status: string,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Customer Wallet Funding Failed</h2>
        <p>Dear ${companyName} Team,</p>
        <p>A customer's wallet funding attempt has failed.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Customer Email:</strong> ${customerEmail}</li>
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>Status:</strong> ${status}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
          </ul>
        </div>
        <p>The transaction has failed. Please check the transaction details and assist the customer if needed.</p>
        <p>Best regards,<br>The System</p>
      </div>
    `;
  }

  private getWalletWithdrawalSuccessToCompanyTemplate(
    companyName: string,
    customerName: string,
    customerEmail: string,
    amount: number,
    currency: string,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Customer Wallet Withdrawal Notification</h2>
        <p>Dear ${companyName} Team,</p>
        <p>A customer has successfully withdrawn from their wallet.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Customer Email:</strong> ${customerEmail}</li>
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
          </ul>
        </div>
        <p>The withdrawal has been processed successfully.</p>
        <p>Best regards,<br>The System</p>
      </div>
    `;
  }

  private getWalletWithdrawalFailureToCompanyTemplate(
    companyName: string,
    customerName: string,
    customerEmail: string,
    amount: number,
    currency: string,
    status: string,
    transactionId: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Customer Wallet Withdrawal Failed</h2>
        <p>Dear ${companyName} Team,</p>
        <p>A customer's withdrawal attempt has failed. The amount has been refunded to their wallet.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Transaction Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Customer:</strong> ${customerName}</li>
            <li><strong>Customer Email:</strong> ${customerEmail}</li>
            <li><strong>Amount:</strong> ${amount} ${currency}</li>
            <li><strong>Status:</strong> ${status}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
          </ul>
        </div>
        <p>The transaction has failed and the amount has been refunded to the customer's wallet.</p>
        <p>Best regards,<br>The System</p>
      </div>
    `;
  }
}
