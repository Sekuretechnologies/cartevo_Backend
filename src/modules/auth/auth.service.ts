import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { Prisma, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  AuthTokenRequestDto,
  AuthTokenResponseDto,
  CheckEmailRequestDto,
  CheckEmailResponseDto,
  LoginWithCompanyRequestDto,
  LoginWithCompanyResponseDto,
} from "./dto/auth.dto";
import {
  LoginDto,
  VerifyOtpDto,
  UserResponseDto,
  AuthResponseDto,
  LoginSuccessResponseDto,
} from "../user/dto/user.dto";
import {
  UserModel,
  RoleModel,
  UserCompanyRoleModel,
  CompanyModel,
} from "@/models";
import { OnboardingStepModel } from "@/models/prisma";
import { EmailService } from "@/services/email.service";
import { TokenBlacklistService } from "@/services/token-blacklist.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private tokenBlacklistService: TokenBlacklistService
  ) {}

  async generateToken(
    authDto: AuthTokenRequestDto
  ): Promise<AuthTokenResponseDto> {
    const companyResult = await CompanyModel.getOne({
      client_id: authDto.client_id,
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
      companyId: company.id,
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

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find all active users with this email
    const usersResult = await UserModel.get({
      email: loginDto.email,
      status: UserStatus.ACTIVE,
    });
    if (usersResult.error) {
      throw new UnauthorizedException(usersResult.error.message);
    }
    const users = usersResult.output;

    if (!users || users.length === 0) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if user has multiple companies
    if (users.length > 1) {
      // Multiple companies found - return list of companies for user to choose
      const companies = await Promise.all(
        users.map(async (user) => {
          const companyResult = await CompanyModel.getOne({
            id: user.company_id,
          });
          if (companyResult.error) {
            throw new BadRequestException(companyResult.error.message);
          }
          const company = companyResult.output;
          return {
            id: company.id,
            name: company.name,
            country: company.country,
          };
        })
      );

      return {
        success: true,
        message: "Multiple companies found. Please specify a company to login.",
        requires_otp: false,
        companies: companies,
      };
    }

    // Single company - proceed with login
    const user = users[0];

    if (!user.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Generate and store OTP
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otpUpdateResult = await UserModel.update(user.id, {
      otp,
      otp_expires: otpExpires,
    });
    if (otpUpdateResult.error) {
      throw new BadRequestException(otpUpdateResult.error.message);
    }

    // Send OTP email
    await this.emailService.sendOtpEmail(
      user.email,
      otp,
      user.first_name || user.full_name || "User"
    );

    return {
      success: true,
      message: `OTP sent to ${user.email}. Please verify to complete login.`,
      requires_otp: true,
    };
  }

  async verifyOtp(
    verifyOtpDto: VerifyOtpDto
  ): Promise<LoginSuccessResponseDto> {
    // Find user with valid OTP
    console.log("verifyOtpDto :: ", verifyOtpDto);
    const userResult = await UserModel.getOne(
      {
        email: verifyOtpDto.email,
        otp: verifyOtpDto.otp,
        // status: UserStatus.ACTIVE,
      },
      {
        company: true,
        userCompanyRoles: {
          include: { role: true },
        },
      }
    );
    if (userResult.error) {
      throw new UnauthorizedException(userResult.error.message);
    }
    const user: any = userResult.output;
    console.log("user.otpExpires :: ", user.otp_expires);
    console.log("new Date() :: ", new Date());
    console.log(
      "user.otpExpires < new Date() :: ",
      user.otp_expires < new Date()
    );
    console.log("user :: ", user);

    if (!user || !user.otp_expires || user.otp_expires < new Date()) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Clear OTP
    await UserModel.update(user.id, {
      otp: null,
      otp_expires: null,
    });

    // Generate JWT token with expiry
    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.company.id,
      roles: user.userCompanyRoles?.map((ucr: any) => ucr.role.name),
    };

    // Set token expiry to 24 hours (86400 seconds)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "1h", // You can also use '1d', '7d', '30d', or specific seconds like '86400'
    });

    console.log("payload :: ", payload);
    console.log("accessToken :: ", accessToken);
    // Determine redirect based on user and company completion status
    let redirectTo = "dashboard";
    let redirectMessage = "Login successful";

    // -------------------------------------------------
    const result = await OnboardingStepModel.get({
      company_id: user.company.id,
    });
    if (result.error) {
      throw new BadRequestException(result.error.message);
    }
    const steps = result.output;
    const totalCount: number = steps.length;
    // Count by status
    const completedCount: number = steps.filter(
      (step: any) => step.status === "COMPLETED"
    ).length;
    // -------------------------------------------------

    // // Check if user needs to complete step 2
    // if (user.step === 1) {
    //   redirectTo = "step2";
    //   redirectMessage = "Please complete your company registration (Step 2)";
    // }
    // Check if KYC (user documents) and KYB (company documents) are completed
    // else if (user.step === 2) {
    //   // Check if user has completed KYC (personal documents)
    //   const hasUserDocuments =
    //     user.id_document_front &&
    //     user.id_document_back &&
    //     user.proof_of_address;

    //   // Check if company has completed KYB (business documents)
    //   const hasCompanyDocuments =
    //     user.company.share_holding_document &&
    //     user.company.incorporation_certificate &&
    //     user.company.business_proof_of_address;
    //   // && user.company.memart;

    //   // if (!hasUserDocuments || !hasCompanyDocuments) {
    //   //   redirectTo = "waiting";
    //   //   redirectMessage =
    //   //     "Your account is under review. Please wait for KYC/KYB completion.";
    //   // }

    //   if (
    //     user.kyc_status !== "APPROVED" &&
    //     user.company.kyb_status !== "APPROVED"
    //   ) {
    //     redirectTo = "waiting";
    //     redirectMessage =
    //       "Your account is under review. Please wait for KYC/KYB completion.";
    //   }
    // }

    // if (
    //   user.kyc_status !== "APPROVED" &&
    //   user.company.kyb_status !== "APPROVED"
    // ) {
    //   redirectTo = "waiting";
    //   redirectMessage =
    //     "Your account is under review. Please wait for KYC/KYB completion.";
    // }

    // -------------------------------------------------

    return {
      success: true,
      message: redirectMessage,
      access_token: accessToken,
      user: await this.mapToResponseDto(user),
      company: {
        id: user.company.id,
        name: user.company.name,
        country: user.company.country,
        onboarding_is_completed: completedCount === totalCount,
      },
      redirect_to: redirectTo,
    };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async mapToResponseDto(
    user: any,
    role?: string
  ): Promise<UserResponseDto> {
    let userRole = role;

    if (!userRole && user.userCompanyRoles) {
      userRole = user.userCompanyRoles[0]?.role?.name || "user";
    }

    if (!userRole) {
      // Fetch role if not provided
      const userWithRoleResult = await UserModel.getOne(
        { id: user.id },
        {
          userCompanyRoles: {
            include: { role: true },
          },
        }
      );
      if (userWithRoleResult.error) {
        throw new BadRequestException(userWithRoleResult.error.message);
      }
      const userWithRole = userWithRoleResult.output;
      userRole = userWithRole?.userCompanyRoles[0]?.role?.name || "user";
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      company_id: user.company?.id,
      status: user.status,
      step: user.step,
      role: userRole,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  /**
   * Logout user by blacklisting their token
   * @param token - JWT token to blacklist
   * @returns LogoutResponseDto
   */
  async logout(
    token: string
  ): Promise<{ success: boolean; message: string; logged_out_at: Date }> {
    try {
      // Decode token to get expiry information for auto-cleanup
      let expiryTime: Date | undefined;
      try {
        const decoded = this.jwtService.decode(token) as any;
        if (decoded && decoded.exp) {
          expiryTime = new Date(decoded.exp * 1000); // Convert from seconds to milliseconds
        }
      } catch (decodeError) {
        // If we can't decode the token, we'll still blacklist it but without auto-cleanup
        console.warn(
          "Could not decode token for expiry time:",
          decodeError.message
        );
      }

      // Add token to blacklist
      this.tokenBlacklistService.addToBlacklist(token, expiryTime);

      return {
        success: true,
        message: "Successfully logged out",
        logged_out_at: new Date(),
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: "Error during logout",
        error: error.message,
      });
    }
  }

  async forgotPassword(email: string) {
    try {
      // Find all users with this email across companies
      const usersResult = await UserModel.get({ email });
      if (usersResult.status !== "success") {
        throw new NotFoundException("User not found");
      }
      const users = usersResult.output;

      if (!users || users.length === 0) {
        throw new NotFoundException("User not found");
      }

      // For forgot password, we'll use the first active user
      // In a production system, you might want to send emails to all companies
      const user = users.find((u) => u.status === "ACTIVE");

      if (!user) {
        throw new NotFoundException("No active user found with this email");
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

      // envoie du mail contenant le lien de reinitialisation
      await this.emailService.resetPasswordEmail(
        email,
        resetLink,
        user.first_name
      );

      // mise a jour du token et de sa duree de validitee dans la base de donnee
      const updateResult = await UserModel.update(user.id, {
        otp: token,
        otp_expires: linkExpiresAt,
      });
      if (updateResult.status !== "success") {
        throw new BadRequestException("Failed to update user OTP");
      }

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

      // Find all users with this email and get the one with matching OTP
      const usersResult = await UserModel.get({ email: decoded.email });
      if (usersResult.status !== "success") {
        throw new NotFoundException("User not found");
      }
      const users = usersResult.output;

      if (!users || users.length === 0) {
        throw new NotFoundException("User not found");
      }

      // Find the user with matching OTP
      const user = users.find((u) => u.otp === token);

      if (!user) {
        throw new UnauthorizedException("Invalid token");
      }

      if (user.otp_expires < new Date()) {
        throw new UnauthorizedException("Token has expired");
      }

      // hashage du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // mise a jour du mot de passe dans la base de donnee
      const updateResult = await UserModel.update(user.id, {
        password: hashedPassword,
        otp: null,
        otp_expires: null,
      });
      if (updateResult.status !== "success") {
        throw new BadRequestException("Failed to reset password");
      }

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

  async checkEmailExistence(
    checkEmailDto: CheckEmailRequestDto
  ): Promise<CheckEmailResponseDto> {
    try {
      // Find all active users with this email across all companies
      const usersResult = await UserModel.get({
        email: checkEmailDto.email,
        status: "ACTIVE",
      });
      if (usersResult.status !== "success") {
        return {
          exists: false,
          company_count: 0,
          companies: undefined,
        };
      }
      const users = usersResult.output;

      const exists = users.length > 0;
      const company_count = users.length;

      let companies:
        | Array<{
            id: string;
            name: string;
            country: string;
          }>
        | undefined;

      if (company_count > 1) {
        // Since UserModel.get doesn't include company data, we'll need to fetch it separately
        // For now, return basic info without company details
        companies = users.map((user) => ({
          id: user.company_id,
          name: "", // Would need separate query to get company name
          country: "",
        }));
      }

      return {
        exists,
        company_count,
        companies,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: "An error occurred while checking email existence",
        error: error.message,
      });
    }
  }

  async loginWithCompany(
    loginDto: LoginWithCompanyRequestDto
  ): Promise<LoginWithCompanyResponseDto> {
    try {
      // Find users with this email
      const usersResult = await UserModel.get({
        email: loginDto.email,
        status: "ACTIVE",
      });
      if (usersResult.status !== "success") {
        throw new UnauthorizedException("Invalid credentials");
      }
      const users = usersResult.output;

      if (!users || users.length === 0) {
        throw new UnauthorizedException("Invalid credentials");
      }

      let targetUser: any;

      if (loginDto.company_id) {
        // User specified a company, find the user in that company
        targetUser = users.find(
          (user) => user.company_id === loginDto.company_id
        );
        if (!targetUser) {
          throw new UnauthorizedException(
            "User not found in specified company"
          );
        }
      } else if (users.length === 1) {
        // Only one company, use that user
        targetUser = users[0];
      } else {
        // Multiple companies but no company specified
        throw new BadRequestException(
          "Multiple companies found. Please specify a company_id."
        );
      }

      const companyResult = await CompanyModel.getOne({
        id: loginDto.company_id,
      });
      if (companyResult.error) {
        throw new BadRequestException(companyResult.error.message);
      }
      const company = companyResult.output;

      // Verify password
      if (!targetUser.password) {
        throw new UnauthorizedException("Invalid credentials");
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        targetUser.password
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      // Generate OTP and send email
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const updateResult = await UserModel.update(targetUser.id, {
        otp,
        otp_expires: otpExpires,
      });
      if (updateResult.status !== "success") {
        throw new BadRequestException("Failed to update user OTP");
      }

      // Send OTP email
      await this.emailService.sendOtpEmail(
        targetUser.email,
        otp,
        targetUser.first_name || targetUser.full_name || "User"
      );

      // Since UserModel.get doesn't include company data, we'll use basic company info
      return {
        success: true,
        message: `OTP sent to ${targetUser.email}. Please verify to complete login.`,
        requires_otp: true,
        company: {
          id: company.company_id,
          name: company.name, // Would need separate query to get company name
          country: company.country,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: "An error occurred during login",
        error: error.message,
      });
    }
  }
}
