import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthTokenRequestDto, AuthTokenResponseDto } from "./dto/auth.dto";
import { CompanyModel } from "@/models";
import { EmailService } from "@/services/email.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService
  ) {}

  async generateToken(
    authDto: AuthTokenRequestDto
  ): Promise<AuthTokenResponseDto> {
    const companyResult = await CompanyModel.getOne({
      id: authDto.client_id,
      is_active: true,
    });
    const company = companyResult.output;

    if (!company) {
      throw new UnauthorizedException("Invalid client credentials");
    }

    // Verify client key
    const isValidKey = await bcrypt.compare(
      authDto.client_key,
      company.client_key
    );
    if (!isValidKey) {
      throw new UnauthorizedException("Invalid client credentials");
    }

    const payload = {
      sub: company.id,
      businessId: company.id,
      clientId: company.client_id,
    };

    const expiresIn = this.configService.get<string>("JWT_EXPIRES_IN") || "24h";
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: this.parseExpiresIn(expiresIn),
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    // Convert JWT expiration format to seconds
    if (expiresIn.endsWith("h")) {
      return parseInt(expiresIn.slice(0, -1)) * 3600;
    } else if (expiresIn.endsWith("d")) {
      return parseInt(expiresIn.slice(0, -1)) * 86400;
    } else if (expiresIn.endsWith("m")) {
      return parseInt(expiresIn.slice(0, -1)) * 60;
    } else {
      return parseInt(expiresIn) || 86400;
    }
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // generate JWt token
      const payload = {
        email: user.email,
      };

      // set expiration time to 15 minutes
      const token = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: "15m",
      });

      const frontUrl = process.env.FRONTEND_URL || "localhost:3000";

      const resetLink = `${frontUrl}/reset-password?token=${token}`;

      console.log("resetLink", resetLink);

      const linkExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      envoie du mail contenant le lien de reinitialisation
      await this.emailService.resetPasswordEmail(
        email,
        resetLink,
        user.first_name
      );

      // mise a jour du token et de sa duree de validitee dans la base de donnee
      await this.prisma.user.update({
        where: { email },
        data: {
          otp: token,
          otp_expires: linkExpiresAt,
        },
      });

      return {
        success: true,
        message: "OTP sent successfully",
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: "An error occurred while sending otp",
        error: error.message,
      });
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      let decoded: { email: string };
      try {
        decoded = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        }) as any;
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          throw new UnauthorizedException("Token has expired");
        }
        throw new UnauthorizedException("Invalid token");
      }

      const user = await this.prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      if (user.otp_expires < new Date()) {
        throw new UnauthorizedException("Token has expired");
      }

      // verification du token
      if (user.otp !== token) {
        throw new UnauthorizedException("Invalid token");
      }

      // hashage du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // mise a jour du mot de passe dans la base de donnee
      await this.prisma.user.update({
        where: { email: decoded.email },
        data: {
          password: hashedPassword,
          otp: null,
          otp_expires: null,
        },
      });

      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: "An error occurred while resetting password",
        error: error.message,
      });
    }
  }
}
