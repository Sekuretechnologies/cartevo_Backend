import { ConfigService } from "@nestjs/config";
export declare class EmailService {
    private configService;
    private transporter;
    constructor(configService: ConfigService);
    private initializeTransporter;
    sendOtpEmail(email: string, otp: string, userName?: string): Promise<boolean>;
    sendInvitationEmail(email: string, invitationCode: string, companyName: string, inviterName?: string): Promise<boolean>;
    sendWelcomeEmail(email: string, userName: string, companyName: string): Promise<boolean>;
    private getOtpEmailTemplate;
    private getInvitationEmailTemplate;
    private getWelcomeEmailTemplate;
}
