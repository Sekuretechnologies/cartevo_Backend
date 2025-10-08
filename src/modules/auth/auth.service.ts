import {
  BadRequestException,
  Injectable,
  Logger,
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
  SelectCompanyRequestDto,
  SelectCompanyResponseDto,
  ValidateInvitationTokenDto,
  ValidateInvitationResponseDto,
  AcceptInvitationDto,
  AcceptInvitationResponseDto,
  RegisterWithInvitationDto,
  ResendOtpDto,
  SwitchCompanyRequestDto,
  SwitchCompanyResponseDto,
} from "./dto/auth.dto";
import {
  LoginDto,
  VerifyOtpDto,
  UserResponseDto,
  AuthResponseDto,
  LoginSuccessResponseDto,
  VerifyOtpMultiCompanyResponseDto,
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
import env from "@/env";
import { email } from "envalid";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

    const accessToken = this.jwtService.sign(payload, {
      secret: env.JWT_SECRET,
      expiresIn,
    });

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
          // Get user's active companies through UserCompanyRole
          const userCompanyRolesResult = await UserCompanyRoleModel.get({
            user_id: user.id,
            is_active: true,
          });

          if (userCompanyRolesResult.error || !userCompanyRolesResult.output) {
            return null;
          }

          const userCompanyRoles = userCompanyRolesResult.output;
          if (!userCompanyRoles || userCompanyRoles.length === 0) return null;

          // Get company details for the first role
          const companyResult = await CompanyModel.getOne({
            id: userCompanyRoles[0].company_id,
          });

          if (companyResult.error || !companyResult.output) {
            return null;
          }

          const company = companyResult.output;
          return {
            id: company.id,
            name: company.name,
            country: company.country,
          };
        })
      );

      const validCompanies = companies.filter((company) => company !== null);

      return {
        success: true,
        message: "Multiple companies found. Please specify a company to login.",
        requires_otp: false,
        companies: validCompanies,
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

  async resendOtp(body: ResendOtpDto) {
    // Récupérer tous les utilisateurs actifs avec cet email
    const usersResult = await UserModel.getOne({
      email: body.email,
    });

    if (usersResult.error) {
      throw new UnauthorizedException(usersResult.error.message);
    }

    const user = usersResult.output;

    // Générer et stocker un nouvel OTP
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const otpUpdateResult = await UserModel.update(user.id, {
      otp,
      otp_expires: otpExpires,
    });

    if (otpUpdateResult.error) {
      throw new BadRequestException(otpUpdateResult.error.message);
    }

    // Envoyer OTP par email
    await this.emailService.sendOtpEmail(user.email, otp, user.first_name);

    return {
      success: true,
      message: `OTP resent to ${user.email}. Please verify to complete login.`,
      requires_otp: true,
    };
  }

  async verifyOtp(
    verifyOtpDto: VerifyOtpDto
  ): Promise<LoginSuccessResponseDto | VerifyOtpMultiCompanyResponseDto> {
    this.logger.log(
      `Starting OTP verification for email: ${verifyOtpDto.email}`
    );

    // Find user with valid OTP
    const userResult = await UserModel.getOne(
      {
        email: verifyOtpDto.email,
        otp: verifyOtpDto.otp,
        // status: UserStatus.ACTIVE,
      },
      {
        userCompanyRoles: {
          where: {
            is_active: true,
          },
          include: {
            role: true,
            company: true,
          },
        },
      }
    );

    if (userResult.error) {
      this.logger.error(
        `Failed to find user with OTP: ${userResult.error.message}`
      );
      throw new UnauthorizedException(userResult.error.message);
    }

    const user: any = userResult.output;
    this.logger.log(
      `User found: ${user ? user.id : "null"}, OTP expires: ${
        user?.otp_expires
      }`
    );

    if (!user || !user.otp_expires || user.otp_expires < new Date()) {
      this.logger.warn(
        `Invalid or expired OTP for user: ${user?.id || "unknown"}`
      );
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Check if user belongs to multiple companies
    const userCompanies = user.userCompanyRoles || [];
    const hasMultipleCompanies = userCompanies.length > 1;
    this.logger.log(
      `User has ${userCompanies.length} active company roles, multiple companies: ${hasMultipleCompanies}`
    );

    // Clear OTP
    const clearOtpResult = await UserModel.update(user.id, {
      otp: null,
      otp_expires: null,
    });

    if (clearOtpResult.error) {
      this.logger.error(
        `Failed to clear OTP for user ${user.id}: ${clearOtpResult.error.message}`
      );
    } else {
      this.logger.log(`OTP cleared successfully for user: ${user.id}`);
    }

    if (hasMultipleCompanies) {
      this.logger.log(
        `Generating temporary token for multi-company user: ${user.id}`
      );

      // Generate temporary token with userId and email only
      const tempPayload = {
        sub: user.id,
        email: user.email,
        temp: true, // Mark as temporary token
      };

      this.logger.debug(
        `Signing temporary token with payload: ${JSON.stringify(
          tempPayload
        )} using primary JWT secret`
      );

      const tempToken = this.jwtService.sign(tempPayload, {
        secret: env.JWT_SECRET,
        expiresIn: "15m", // Shorter expiry for temp token
      });

      this.logger.debug(
        `Temporary token generated: ${tempToken.substring(0, 20)}...`
      );

      // Get list of companies for user to choose from
      const companies = userCompanies.map((ucr: any) => ({
        id: ucr.company.id,
        name: ucr.company.name,
        country: ucr.company.country,
      }));

      this.logger.log(
        `Temporary token generated for user ${user.id}, companies available: ${companies.length}`
      );

      return {
        success: true,
        message: "OTP verified. Please select a company to continue.",
        temp_token: tempToken,
        requires_company_selection: true,
        companies: companies,
      } as VerifyOtpMultiCompanyResponseDto;
    } else {
      // Single company - proceed with full token
      const userCompany = userCompanies[0];
      if (!userCompany) {
        this.logger.error(`User ${user.id} does not belong to any company`);
        throw new UnauthorizedException("User does not belong to any company");
      }

      this.logger.log(
        `Generating full JWT token for user ${user.id} in company ${userCompany.company.id}`
      );

      // mode production ou preProd
      const mode =
        userCompany.company.kyb_status === "APPROVED" &&
        user.kyc_status === "APPROVED"
          ? "prod"
          : "preprod";

      // Generate JWT token with expiry
      const payload = {
        sub: user.id,
        email: user.email,
        companyId: userCompany.company.id,
        mode: mode,
      };

      this.logger.debug(
        `Signing full JWT token with payload: ${JSON.stringify(
          payload
        )} using primary JWT secret`
      );

      const accessToken = this.jwtService.sign(payload, {
        secret: env.JWT_SECRET,
        expiresIn: "1h",
      });

      this.logger.debug(
        `Full JWT token generated: ${accessToken.substring(0, 20)}...`
      );

      this.logger.log(
        `Full JWT token generated for user ${user.id}, payload: sub=${payload.sub}, companyId=${payload.companyId}`
      );

      // Determine redirect based on user and company completion status
      let redirectTo = "dashboard";
      let redirectMessage = "Login successful";

      const result = await OnboardingStepModel.get({
        company_id: userCompany.company.id,
      });
      if (result.error) {
        this.logger.error(
          `Failed to get onboarding steps for company ${userCompany.company.id}: ${result.error.message}`
        );
        throw new BadRequestException(result.error.message);
      }
      const steps = result.output;
      const totalCount: number = steps.length;
      const completedCount: number = steps.filter(
        (step: any) => step.status === "COMPLETED"
      ).length;

      this.logger.log(
        `Login successful for user ${user.id} in company ${userCompany.company.name}, onboarding completed: ${completedCount}/${totalCount}`
      );

      return {
        success: true,
        message: redirectMessage,
        access_token: accessToken,
        user: await this.mapToResponseDto(user),
        company: {
          id: userCompany.company.id,
          name: userCompany.company.name,
          country: userCompany.company.country,
          onboarding_is_completed: completedCount === totalCount,
          kybStatus: userCompany.company.kyb_status,
          clearance:
            userCompany.company.access_level === "omniscient"
              ? "admin"
              : "default",
        },
        redirect_to: redirectTo,
      };
    }
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
      company_id: user.userCompanyRoles?.[0]?.company?.id || null,
      status: user.status,
      kycStatus: user.kyc_status,
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
        secret: env.JWT_SECRET,
        expiresIn: "15m",
      });

      const frontUrl = process.env.FRONTEND_URL;

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
        // Try to verify with multiple secrets
        const secrets = [process.env.JWT_SECRET];
        if (process.env.CROSS_ENV_JWT_SECRET) {
          secrets.push(process.env.CROSS_ENV_JWT_SECRET);
        }

        let verified = false;
        for (const secret of secrets) {
          try {
            decoded = this.jwtService.verify(token, { secret }) as any;
            verified = true;
            break;
          } catch (verifyErr) {
            // Try next secret
          }
        }

        if (!verified) {
          throw new Error("Invalid token");
        }
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
        // Get company details for each user
        companies = await Promise.all(
          users.map(async (user) => {
            const userCompanyRolesResult = await UserCompanyRoleModel.get({
              user_id: user.id,
            });

            if (
              userCompanyRolesResult.error ||
              !userCompanyRolesResult.output ||
              userCompanyRolesResult.output.length === 0
            ) {
              return {
                id: "",
                name: "",
                country: "",
              };
            }

            const companyResult = await CompanyModel.getOne({
              id: userCompanyRolesResult.output[0].company_id,
            });

            if (companyResult.error || !companyResult.output) {
              return {
                id: "",
                name: "",
                country: "",
              };
            }

            const company = companyResult.output;
            return {
              id: company.id,
              name: company.name,
              country: company.country,
            };
          })
        );
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
        // User specified a company, check if user belongs to that company
        const userCompanyRoleResult = await UserCompanyRoleModel.getOne({
          user_id: users[0].id, // Assuming single user for now, but this needs to be updated for multi-user scenario
          company_id: loginDto.company_id,
          is_active: true,
        });

        if (userCompanyRoleResult.error || !userCompanyRoleResult.output) {
          throw new UnauthorizedException(
            "User not found in specified company"
          );
        }

        targetUser = users[0]; // Use the first user since we're checking company membership
      } else if (users.length === 1) {
        // Only one user, use that user
        targetUser = users[0];
      } else {
        // Multiple users but no company specified
        throw new BadRequestException(
          "Multiple users found. Please specify a company_id."
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

  async selectCompany(
    selectCompanyDto: SelectCompanyRequestDto
  ): Promise<SelectCompanyResponseDto> {
    try {
      this.logger.log(
        `Starting company selection for company: ${selectCompanyDto.company_id}`
      );

      // Verify the temporary token
      let decoded: { sub: string; email: string; temp: boolean };
      try {
        // Try to verify with multiple secrets
        const secrets = [process.env.JWT_SECRET];
        if (process.env.CROSS_ENV_JWT_SECRET) {
          secrets.push(process.env.CROSS_ENV_JWT_SECRET);
        }

        this.logger.log(
          `Attempting to verify temporary token with ${secrets.length} secrets`
        );

        let verified = false;
        for (const secret of secrets) {
          try {
            decoded = this.jwtService.verify(selectCompanyDto.temp_token, {
              secret,
            }) as any;
            if (!decoded.temp) {
              this.logger.warn(
                `Token verified but not marked as temporary for user: ${decoded.sub}`
              );
              throw new UnauthorizedException("Invalid token type");
            }
            verified = true;
            this.logger.log(
              `Temporary token verified successfully for user: ${decoded.sub}`
            );
            break;
          } catch (verifyErr) {
            this.logger.debug(
              `Token verification failed with one secret, trying next`
            );
          }
        }

        if (!verified) {
          this.logger.warn(`All token verification attempts failed`);
          throw new Error("Invalid token");
        }
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          this.logger.warn(`Temporary token has expired`);
          throw new UnauthorizedException("Temporary token has expired");
        }
        this.logger.error(`Invalid temporary token: ${err.message}`);
        throw new UnauthorizedException("Invalid temporary token");
      }

      const userId = decoded.sub;
      const email = decoded.email;
      this.logger.log(
        `Token decoded successfully: userId=${userId}, email=${email}, selecting company=${selectCompanyDto.company_id}`
      );

      // Check if user belongs to the specified company
      const userCompanyRoleResult = await UserCompanyRoleModel.getOne({
        user_id: userId,
        company_id: selectCompanyDto.company_id,
        is_active: true,
      });

      if (userCompanyRoleResult.error || !userCompanyRoleResult.output) {
        this.logger.warn(
          `User ${userId} not found in company ${
            selectCompanyDto.company_id
          }: ${userCompanyRoleResult.error?.message || "No role found"}`
        );
        throw new BadRequestException("User not found in specified company");
      }

      this.logger.log(
        `User ${userId} confirmed to belong to company ${selectCompanyDto.company_id}`
      );

      // Get user with company and role information
      const userResult = await UserModel.getOne(
        {
          id: userId,
          status: UserStatus.ACTIVE,
        },
        {
          userCompanyRoles: {
            where: {
              is_active: true,
            },
            include: {
              role: true,
              company: true,
            },
          },
        }
      );
      if (userResult.error) {
        this.logger.error(
          `Failed to get user details for ${userId}: ${userResult.error.message}`
        );
        throw new BadRequestException("User not found");
      }
      const user: any = userResult.output;

      // Find the specific company-role combination
      const selectedCompanyRole = user.userCompanyRoles.find(
        (ucr: any) => ucr.company_id === selectCompanyDto.company_id
      );

      if (!selectedCompanyRole) {
        this.logger.error(
          `User ${userId} has no active role in company ${selectCompanyDto.company_id}`
        );
        throw new BadRequestException("User not found in specified company");
      }

      this.logger.log(
        `Generating full JWT token for user ${userId} in company ${selectedCompanyRole.company.name} (${selectedCompanyRole.company.id})`
      );

      // mode prod ou preprod
      const mode =
        selectedCompanyRole.company.kyb_status === "APPROVED" &&
        user.kyc_status === "APPROVED"
          ? "prod"
          : "preprod";

      // Generate full JWT token with company information
      const payload = {
        sub: user.id,
        email: user.email,
        companyId: selectedCompanyRole.company.id,
        mode,
      };

      this.logger.debug(
        `Signing full JWT token with payload: ${JSON.stringify(
          payload
        )} using primary JWT secret`
      );

      const accessToken = this.jwtService.sign(payload, {
        secret: env.JWT_SECRET,
        expiresIn: "1h",
      });

      this.logger.debug(
        `Full JWT token generated: ${accessToken.substring(0, 20)}...`
      );

      this.logger.log(
        `Full JWT token generated for user ${user.id}, payload: sub=${payload.sub}, companyId=${payload.companyId}`
      );

      // Determine redirect based on user and company completion status
      let redirectTo = "dashboard";
      let redirectMessage = "Login successful";

      // Get onboarding steps
      const result = await OnboardingStepModel.get({
        company_id: selectedCompanyRole.company.id,
      });
      if (result.error) {
        this.logger.error(
          `Failed to get onboarding steps for company ${selectedCompanyRole.company.id}: ${result.error.message}`
        );
        throw new BadRequestException(result.error.message);
      }
      const steps = result.output;
      const totalCount: number = steps.length;
      const completedCount: number = steps.filter(
        (step: any) => step.status === "COMPLETED"
      ).length;

      this.logger.log(
        `Company selection successful for user ${user.id} in company ${selectedCompanyRole.company.name}, onboarding completed: ${completedCount}/${totalCount}`
      );

      return {
        success: true,
        message: redirectMessage,
        access_token: accessToken,
        user: await this.mapToResponseDto(user, selectedCompanyRole.role.name),
        company: {
          id: selectedCompanyRole.company.id,
          name: selectedCompanyRole.company.name,
          country: selectedCompanyRole.company.country,
          onboarding_is_completed: completedCount === totalCount,
          kybStatus: selectedCompanyRole.company.kyb_status,
          clearance:
            selectedCompanyRole.company.access_level === "omniscient"
              ? "admin"
              : "default",
        },
        redirect_to: redirectTo,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Unexpected error during company selection: ${error.message}`,
        error.stack
      );
      throw new BadRequestException({
        success: false,
        message: "An error occurred during company selection",
        error: error.message,
      });
    }
  }

  async validateInvitationToken(
    dto: ValidateInvitationTokenDto
  ): Promise<ValidateInvitationResponseDto> {
    try {
      // Verify JWT token with multiple secrets
      let decoded: {
        invitation_id: string;
        email: string;
        company_id: string;
        role: string;
      };

      const secrets = [process.env.JWT_SECRET];
      if (process.env.CROSS_ENV_JWT_SECRET) {
        secrets.push(process.env.CROSS_ENV_JWT_SECRET);
      }

      let verified = false;
      for (const secret of secrets) {
        try {
          decoded = this.jwtService.verify(dto.token, { secret }) as any;
          verified = true;
          break;
        } catch (verifyErr) {
          // Try next secret
        }
      }

      if (!verified) {
        return { valid: false };
      }

      // Check if invitation still exists and is pending
      const invitation = await UserModel.getOne({
        id: decoded.invitation_id,
        // status: UserStatus.PENDING,
      });

      if (!invitation.output) {
        return { valid: false };
      }

      // Check if user already exists
      const existingUsers = await UserModel.get({
        email: decoded.email,
        // status: UserStatus.ACTIVE,
      });

      const userExists = existingUsers.output.length > 0;

      // Get company details
      const company = await CompanyModel.getOne({
        id: decoded.company_id,
      });

      return {
        valid: true,
        invitation_id: decoded.invitation_id,
        user_id: existingUsers.output?.[0],
        email: decoded.email,
        company: {
          id: company.output.id,
          name: company.output.name,
          country: company.output.country,
        },
        role: decoded.role,
        user_exists: userExists,
        existing_companies: userExists ? existingUsers.output.length : 0,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async acceptInvitation(
    dto: AcceptInvitationDto
  ): Promise<AcceptInvitationResponseDto> {
    // Validate invitation token
    const validation = await this.validateInvitationToken({ token: dto.token });

    if (!validation.valid) {
      throw new BadRequestException("Invalid or expired invitation");
    }

    const { invitation_id, email, company, role, user_exists } = validation;

    if (user_exists) {
      // Case 2: Existing user - require authentication
      if (!dto.password) {
        throw new BadRequestException("Password required for existing users");
      }

      const user = await UserModel.getOne({
        email: email,
        // status: UserStatus.ACTIVE,
      });

      if (!user.output) {
        throw new BadRequestException("User account not found");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        dto.password,
        user.output.password
      );

      if (!isValidPassword) {
        throw new BadRequestException("Invalid password");
      }

      // Check if user already belongs to this company
      const existingMembership = await UserCompanyRoleModel.getOne({
        user_id: user.output.id,
        company_id: company.id,
        status: UserStatus.ACTIVE,
      });

      if (existingMembership.output) {
        throw new BadRequestException("User already belongs to this company");
      }

      // Add user to new company
      const roleRecord = await RoleModel.getOne({ name: role });
      await UserCompanyRoleModel.update(
        {
          user_id: user.output.id,
          company_id: company.id,
          // role_id: roleRecord.output.id,
        },
        {
          status: UserStatus.ACTIVE,
        }
      );

      // Mark invitation as used
      // await UserModel.update(invitation_id, {
      //   status: UserStatus.INACTIVE,
      // });

      // Generate access token for the new company
      const payload = {
        sub: user.output.id,
        email: user.output.email,
        companyId: company.id,
        roles: [role],
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: env.JWT_SECRET,
        expiresIn: "1h",
      });

      return {
        success: true,
        message: `Successfully joined ${company.name}`,
        access_token: accessToken,
        user: await this.mapToResponseDto(user.output),
        company: company,
        redirect_to: "dashboard",
      };
    } else {
      // Case 1: New user - redirect to registration
      return {
        success: true,
        message: "Please complete your registration",
        company: company,
        redirect_to: "register",
      };
    }
  }

  async registerWithInvitation(
    dto: RegisterWithInvitationDto
  ): Promise<LoginSuccessResponseDto> {
    // Validate invitation token
    const validation = await this.validateInvitationToken({
      token: dto.invitation_token,
    });

    if (!validation.valid || validation.user_exists) {
      throw new BadRequestException("Invalid invitation");
    }

    // Create new user account
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const newUser = await UserModel.create({
      email: validation.email,
      full_name: dto.full_name,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
    });

    // Assign role to company
    const roleRecord = await RoleModel.getOne({ name: validation.role });
    await UserCompanyRoleModel.create({
      user_id: newUser.output.id,
      company_id: validation.company.id,
      role_id: roleRecord.output.id,
    });

    // Mark invitation as used
    await UserModel.update(validation.invitation_id, {
      status: UserStatus.INACTIVE,
    });

    // Generate access token
    const payload = {
      sub: newUser.output.id,
      email: newUser.output.email,
      companyId: validation.company.id,
      roles: [validation.role],
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: env.JWT_SECRET,
      expiresIn: "1h",
    });

    // Get onboarding steps
    const result = await OnboardingStepModel.get({
      company_id: validation.company.id,
    });
    const steps = result.output || [];
    const totalCount: number = steps.length;
    const completedCount: number = steps.filter(
      (step: any) => step.status === "COMPLETED"
    ).length;

    return {
      success: true,
      message: "Account created successfully",
      access_token: accessToken,
      user: await this.mapToResponseDto(newUser.output),
      company: {
        id: validation.company.id,
        name: validation.company.name,
        country: validation.company.country,
        onboarding_is_completed: completedCount === totalCount,
      },
      redirect_to: "dashboard",
    };
  }

  async switchCompany(
    currentUserId: string,
    currentCompanyId: string,
    switchCompanyDto: SwitchCompanyRequestDto
  ): Promise<SwitchCompanyResponseDto> {
    try {
      this.logger.log(
        `Starting company for user: ${currentUserId} from company:${currentCompanyId} to company: ${switchCompanyDto.company_id} `
      );

      console.log("current user id", currentUserId);
      console.log("current company id", currentCompanyId);
      console.log("dto", switchCompanyDto);

      // Verifier que l'utilisateur ne sitch pas vers la meme company
      if (currentCompanyId === switchCompanyDto.company_id) {
        throw new BadRequestException("Already in this company");
      }

      // verifier que l'utilisateur appartient a la company ciblee
      const userCompanyRoleResult = await UserCompanyRoleModel.getOne({
        user_id: currentUserId,
        company_id: switchCompanyDto.company_id,
        is_active: true,
      });

      if (userCompanyRoleResult.error || !userCompanyRoleResult) {
        throw new BadRequestException("User not found in specified company");
      }

      // recuperer les infos du users avec la nouvelle company
      const userResult = await UserModel.getOne(
        {
          id: currentUserId,
          status: UserStatus.ACTIVE,
        },
        {
          userCompanyRoles: {
            where: {
              is_active: true,
            },
            include: {
              role: true,
              company: true,
            },
          },
        }
      );

      if (userResult.error) {
        throw new NotFoundException("User not found");
      }

      const user: any = userResult.output;
      console.log("user companie role", user);

      // chercher le role du user pour la company ciblee
      const targetCompanyRole = user.userCompanyRoles.find(
        (ucr: any) => ucr.company_id === switchCompanyDto.company_id
      );

      if (!targetCompanyRole) {
        throw new BadRequestException(
          "user role not found in specified company"
        );
      }

      // det le mode (prod ou preprod) pour la nouvelle company
      const mode =
        targetCompanyRole.company.kyb_status === "APPROVED" &&
        user.kyc_status === "APPROVED"
          ? "prod"
          : "preprod";

      console.log("mode pour cette company", mode);
      // Generer un nouveau JWT avec les infos de la nouvelle company
      const payload = {
        sub: user.id,
        email: user.email,
        companyId: targetCompanyRole.company.id,
        mode,
      };

      this.logger.debug(
        `Signing new JWT token with payload: ${JSON.stringify(
          payload
        )} using primary JWT secret`
      );

      const accessToken = this.jwtService.sign(payload, {
        secret: env.JWT_SECRET,
        expiresIn: "1h",
      });

      // recuperer les etapes d'onboarding pour la nouvelle company
      const result = await OnboardingStepModel.get({
        company_id: targetCompanyRole.company.id,
      });

      if (result.error) {
        throw new BadRequestException(result.error.message);
      }

      const steps = result.output;
      const totalCount: number = steps.length;
      const completedCount: number = steps.filter(
        (step: any) => step.status === "COMPLETED"
      ).length;

      let redirectTo = "dashboard";
      let redirectMessage = "Company switch successful";

      if (completedCount < totalCount) {
        redirectTo = "onBoarding";
      }
      return {
        success: true,
        message: redirectMessage,
        access_token: accessToken,
        mode,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: targetCompanyRole.role.name,
          kycStatus: user.kyc_status,
        },
        company: {
          id: targetCompanyRole.company.id,
          name: targetCompanyRole.company.name,
          country: targetCompanyRole.company.country,
          onboarding_is_completed: completedCount === totalCount,
          kybStatus: targetCompanyRole.company.kyb_status,
          clearance:
            targetCompanyRole.company.access_level === "omniscient"
              ? "admin"
              : "default",
        },
        redirect_to: redirectTo,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Unexpected error during company switch: ${error.message}`,
        error.stack
      );
      throw new BadRequestException({
        success: false,
        message: "An error occurred during company switch",
        error: error.message,
      });
    }
  }
}
