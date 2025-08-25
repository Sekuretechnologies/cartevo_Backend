"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.initializeTransporter();
    }
    initializeTransporter() {
        try {
            const apiKey = this.configService.get("POSTMARK_API_TOKEN");
            this.transporter = nodemailer.createTransport({
                host: this.configService.get("POSTMARK_HOST") || "smtp.postmarkapp.com",
                port: parseInt(this.configService.get("POSTMARK_PORT") || "25"),
                secure: false,
                auth: {
                    user: apiKey,
                    pass: apiKey,
                },
            });
        }
        catch (error) {
            console.error("Email service initialization error:", error);
            throw new common_1.BadRequestException("Email service configuration error");
        }
    }
    async sendOtpEmail(email, otp, userName) {
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
        }
        catch (error) {
            console.error("Error sending OTP email:", error);
            throw new common_1.BadRequestException("Failed to send OTP email");
        }
    }
    async sendInvitationEmail(email, invitationCode, companyName, inviterName) {
        try {
            const mailOptions = {
                from: this.configService.get("FROM_EMAIL") || "contact@getsekure.com",
                to: email,
                subject: `Invitation à rejoindre ${companyName} sur CARTEVO`,
                html: this.getInvitationEmailTemplate(invitationCode, companyName, inviterName),
                text: `Vous avez été invité à rejoindre ${companyName} sur CARTEVO. Votre code d'invitation est: ${invitationCode}`,
            };
            const result = await this.transporter.sendMail(mailOptions);
            console.log("Invitation email sent successfully:", result.messageId);
            return true;
        }
        catch (error) {
            console.error("Error sending invitation email:", error);
            throw new common_1.BadRequestException("Failed to send invitation email");
        }
    }
    async sendWelcomeEmail(email, userName, companyName) {
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
        }
        catch (error) {
            console.error("Error sending welcome email:", error);
            throw new common_1.BadRequestException("Failed to send welcome email");
        }
    }
    getOtpEmailTemplate(otp, userName) {
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
    getInvitationEmailTemplate(invitationCode, companyName, inviterName) {
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
            ${inviterName
            ? `<p>${inviterName} vous a invité à rejoindre ${companyName} sur CARTEVO.</p>`
            : `<p>Vous avez été invité à rejoindre ${companyName} sur CARTEVO.</p>`}
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
    getWelcomeEmailTemplate(userName, companyName) {
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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map