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
      // this.transporter = nodemailer.createTransport({
      //   host: this.configService.get("POSTMARK_HOST") || "smtp.postmarkapp.com",
      //   port: parseInt(this.configService.get("POSTMARK_PORT") || "25"),
      //   secure: false, // true for 465, false for other ports
      //   auth: {
      //     // user: this.configService.get("POSTMARK_USERNAME"),
      //     // pass: this.configService.get("POSTMARK_PASSWORD"),
      //   },
      // });
      const apiKey = this.configService.get("POSTMARK_API_TOKEN");
      // Use a specialized transport method for Postmark
      this.transporter = nodemailer.createTransport({
        host: this.configService.get("POSTMARK_HOST") || "smtp.postmarkapp.com", // remains for compatibility
        port: parseInt(this.configService.get("POSTMARK_PORT") || "25"),
        secure: false, // true for 465, false for other ports
        auth: {
          type: "OAuth2", // Pointing to use OAuth2 for API key
          // user: "postmark-api", // This can be a placeholder
          accessToken: apiKey, // Use the API token as the access token
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
        from: this.configService.get("FROM_EMAIL") || "contact@getsekure.com",
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
        from: this.configService.get("FROM_EMAIL") || "contact@getsekure.com",
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

  async sendWelcomeEmail(
    email: string,
    userName: string,
    companyName: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get("FROM_EMAIL") || "contact@getsekure.com",
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
}
