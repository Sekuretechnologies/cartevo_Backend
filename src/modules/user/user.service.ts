import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { Prisma, UserStatus } from "@prisma/client";
import {
  CreateUserDto,
  RegisterUserDto,
  LoginDto,
  VerifyOtpDto,
  UpdateUserDto,
  UserResponseDto,
  CreateUserResponseDto,
  AuthResponseDto,
  LoginSuccessResponseDto,
  UpdateKycStatusDto,
  UpdateKycStatusResponseDto,
} from "./dto/user.dto";
import {
  UserModel,
  RoleModel,
  UserCompanyRoleModel,
  CompanyModel,
} from "@/models";
import { EmailService } from "../../services/email.service";
import { TokenBlacklistService } from "../../services/token-blacklist.service";
import { OnboardingStepModel } from "@/models/prisma";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private tokenBlacklistService: TokenBlacklistService
  ) {}

  async createUser(
    ownerUserId: string,
    createUserDto: CreateUserDto
  ): Promise<CreateUserResponseDto> {
    // Verify the acting user is an owner
    const ownerUserResult = await UserModel.getOne(
      { id: ownerUserId },
      {
        company: true,
        userCompanyRoles: {
          include: { role: true },
        },
      }
    );
    if (ownerUserResult.error) {
      throw new UnauthorizedException(ownerUserResult.error.message);
    }
    const ownerUser = ownerUserResult.output;

    if (!ownerUser) {
      throw new UnauthorizedException("User not found");
    }

    const isOwner = ownerUser.userCompanyRoles.some(
      (ucr) => ucr.role.name === "owner"
    );
    if (!isOwner) {
      throw new ForbiddenException("Only owners can create users");
    }

    // Check if user with email already exists in this company
    const existingUserResult = await UserModel.getOne(
      { email: createUserDto.email, company_id: ownerUser.company_id },
      {
        userCompanyRoles: {
          include: { role: true },
        },
      }
    );
    if (existingUserResult.error) {
      throw new UnauthorizedException(existingUserResult.error.message);
    }
    const existingUser = existingUserResult.output;

    if (existingUser) {
      throw new BadRequestException(
        "User with this email already exists in the company"
      );
    }

    // Generate invitation code
    const invitationCode = this.generateInvitationCode();

    return await UserModel.operation(async (prisma) => {
      // Create pending user
      const newUserResult = await UserModel.create({
        email: createUserDto.email,
        company_id: ownerUser.company_id,
        status: UserStatus.PENDING,
        invitation_code: invitationCode,
      });
      if (newUserResult.error) {
        throw new BadRequestException(newUserResult.error.message);
      }
      const newUser = newUserResult.output;

      // Get the role
      let roleResult = await RoleModel.getOne({ name: createUserDto.role });
      if (roleResult.error) {
        throw new BadRequestException(roleResult.error.message);
      }
      let role = roleResult.output;

      if (!role) {
        const roleCreateResult = await RoleModel.create({
          name: createUserDto.role,
        });
        if (roleCreateResult.error) {
          throw new BadRequestException(roleCreateResult.error.message);
        }
        role = roleCreateResult.output;
      }

      // Create user-company-role association
      const userCompanyRoleResult = await UserCompanyRoleModel.create({
        user_id: newUser.id,
        company_id: ownerUser.company_id,
        role_id: role.id,
      });
      if (userCompanyRoleResult.error) {
        throw new BadRequestException(userCompanyRoleResult.error.message);
      }

      // Send invitation email
      await this.emailService.sendInvitationEmail(
        createUserDto.email,
        invitationCode,
        ownerUser.company?.name || "Your Company"
      );

      return {
        success: true,
        message: "User invitation sent successfully",
        user: await this.mapToResponseDto(newUser, createUserDto.role),
        invitation_code: invitationCode, // For demo purposes, normally only sent via email
      };
    });
  }

  async registerUser(
    registerDto: RegisterUserDto
  ): Promise<{ success: boolean; message: string }> {
    // Find user by email and invitation code
    const userResult = await UserModel.getOne({
      email: registerDto.email,
      invitation_code: registerDto.invitation_code,
      status: UserStatus.PENDING,
    });
    if (userResult.error) {
      throw new BadRequestException(userResult.error.message);
    }
    const user = userResult.output;

    if (!user) {
      throw new BadRequestException("Invalid invitation code or email");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Update user to active status
    const updateResult = await UserModel.update(user.id, {
      full_name: registerDto.full_name,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      invitation_code: null, // Clear invitation code after use
    });
    if (updateResult.error) {
      throw new BadRequestException(updateResult.error.message);
    }

    return {
      success: true,
      message: "User account activated successfully. You can now log in.",
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // AuthResponseDto
    // LoginSuccessResponseDto

    // Find active user
    const userResult = await UserModel.getOne(
      {
        email: loginDto.email,
        status: UserStatus.ACTIVE,
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
    const user = userResult.output;

    if (!user || !user.password) {
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

    // Generate JWT token with expiry
    const payload = {
      sub: user.id,
      email: user.email,
      company_id: user.company.id,
      roles: user.userCompanyRoles?.map((ucr: any) => ucr.role.name),
    };

    // Set token expiry to 24 hours (86400 seconds)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "1h", // You can also use '1d', '7d', '30d', or specific seconds like '86400'
    });
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

    // return {
    //   success: true,
    //   message: redirectMessage,
    //   access_token: accessToken,
    //   user: await this.mapToResponseDto(user),
    //   company: {
    //     id: user.company.id,
    //     name: user.company.name,
    //     country: user.company.country,
    //     is_onboarding_completed: totalCount === completedCount,
    //   },
    //   redirect_to: redirectTo,
    // };

    // -------------------------------------------------

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
    await this.emailService.sendOtpEmail(user.email, otp, user.full_name);

    return {
      success: true,
      message: `OTP sent to ${user.email}. Please verify to complete login.`,
      requires_otp: true,
    };
    // -------------------------------------------------
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

  async updateUser(
    ownerUserId: string,
    userId: string,
    updateDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    // Verify the acting user is an owner
    const ownerUserResult = await UserModel.getOne(
      { id: ownerUserId },
      {
        userCompanyRoles: {
          include: { role: true },
        },
      }
    );
    if (ownerUserResult.error) {
      throw new UnauthorizedException(ownerUserResult.error.message);
    }
    const ownerUser = ownerUserResult.output;

    if (!ownerUser) {
      throw new UnauthorizedException("User not found");
    }

    const isOwner = ownerUser.userCompanyRoles.some(
      (ucr) => ucr.role.name === "owner"
    );
    if (!isOwner) {
      throw new ForbiddenException("Only owners can update users");
    }

    // Find target user in the same company
    const targetUserResult = await UserModel.getOne({
      id: userId,
      company_id: ownerUser.company_id,
    });
    if (targetUserResult.error) {
      throw new NotFoundException(targetUserResult.error.message);
    }
    const targetUser = targetUserResult.output;

    if (!targetUser) {
      throw new NotFoundException("User not found in your company");
    }

    return await UserModel.operation(async (prisma) => {
      // Update user basic info
      const updatedUserResult = await UserModel.update(userId, {
        full_name: updateDto.full_name || targetUser.full_name,
      });
      if (updatedUserResult.error) {
        throw new BadRequestException(updatedUserResult.error.message);
      }
      const updatedUser = updatedUserResult.output;

      // Update role if provided
      if (updateDto.role) {
        // Remove existing role
        const deleteResult = await UserCompanyRoleModel.delete({
          user_id: userId,
          company_id: ownerUser.company_id,
        });
        if (deleteResult.error) {
          throw new BadRequestException(deleteResult.error.message);
        }

        // Get or create new role
        let roleResult = await RoleModel.getOne({ name: updateDto.role });
        if (roleResult.error) {
          throw new BadRequestException(roleResult.error.message);
        }
        let role = roleResult.output;

        if (!role) {
          const roleCreateResult = await RoleModel.create({
            name: updateDto.role,
          });
          if (roleCreateResult.error) {
            throw new BadRequestException(roleCreateResult.error.message);
          }
          role = roleCreateResult.output;
        }

        // Create new role association
        const userCompanyRoleResult = await UserCompanyRoleModel.create({
          user_id: userId,
          company_id: ownerUser.company_id,
          role_id: role.id,
        });
        if (userCompanyRoleResult.error) {
          throw new BadRequestException(userCompanyRoleResult.error.message);
        }
      }

      return this.mapToResponseDto(updatedUser, updateDto.role);
    });
  }

  async deleteUser(
    ownerUserId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    // Verify the acting user is an owner
    const ownerUserResult = await UserModel.getOne(
      { id: ownerUserId },
      {
        userCompanyRoles: {
          include: { role: true },
        },
      }
    );
    if (ownerUserResult.error) {
      throw new UnauthorizedException(ownerUserResult.error.message);
    }
    const ownerUser = ownerUserResult.output;

    if (!ownerUser) {
      throw new UnauthorizedException("User not found");
    }

    const isOwner = ownerUser.userCompanyRoles.some(
      (ucr) => ucr.role.name === "owner"
    );
    if (!isOwner) {
      throw new ForbiddenException("Only owners can delete users");
    }

    // Find target user in the same company
    const targetUserResult = await UserModel.getOne(
      {
        id: userId,
        company_id: ownerUser.company_id,
      },
      {
        userCompanyRoles: {
          include: { role: true },
        },
      }
    );
    if (targetUserResult.error) {
      throw new NotFoundException(targetUserResult.error.message);
    }
    const targetUser = targetUserResult.output;

    if (!targetUser) {
      throw new NotFoundException("User not found in your company");
    }

    // Prevent deleting the last owner
    const isTargetOwner = targetUser.userCompanyRoles.some(
      (ucr) => ucr.role.name === "owner"
    );
    if (isTargetOwner) {
      const ownerCount = await UserCompanyRoleModel.count({
        company_id: ownerUser.company_id,
        role_name: "owner",
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          "Cannot delete the last owner of the company"
        );
      }
    }

    // Soft delete by setting status to inactive
    const deleteResult = await UserModel.update(userId, {
      status: UserStatus.INACTIVE,
    });
    if (deleteResult.error) {
      throw new BadRequestException(deleteResult.error.message);
    }

    return {
      success: true,
      message: "User deleted successfully",
    };
  }

  async getCompanyUsers(userId: string): Promise<UserResponseDto[]> {
    // Get user's company
    const userResult = await UserModel.getOne({ id: userId });
    if (userResult.error) {
      throw new UnauthorizedException(userResult.error.message);
    }
    const user = userResult.output;

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Get all active users in the company
    const usersResult = await UserModel.get({
      company_id: user.company_id,
      status: { not: UserStatus.INACTIVE },
    });
    if (usersResult.error) {
      throw new BadRequestException(usersResult.error.message);
    }
    const users = usersResult.output;

    return Promise.all(users.map((u: any) => this.mapToResponseDto(u)));
  }

  async getAllUsers(): Promise<{ users: any[] }> {
    const targetUserResult = await UserModel.get();
    if (targetUserResult.error) {
      throw new NotFoundException(targetUserResult.error.message);
    }
    const users = targetUserResult.output || [];

    return {
      users,
    };
  }
  async getUserById(userId: string): Promise<{ user: any }> {
    const targetUserResult = await UserModel.getOne(
      {
        id: userId,
      },
      {
        userCompanyRoles: {
          include: { role: true, company: true },
        },
      }
    );
    if (targetUserResult.error) {
      throw new NotFoundException(targetUserResult.error.message);
    }
    const targetUser = targetUserResult.output;

    if (!targetUser) {
      throw new NotFoundException("User not found in your company");
    }

    return {
      user: targetUser,
    };
  }

  async updateKycStatus(
    userId: string,
    updateKycStatusDto: UpdateKycStatusDto
  ): Promise<UpdateKycStatusResponseDto> {
    try {
      // Find the user
      const userResult = await UserModel.getOne({ id: userId });
      if (userResult.error || !userResult.output) {
        throw new NotFoundException("User not found");
      }

      // Update the KYC status
      const updatedUserResult = await UserModel.update(userId, {
        kyc_status: updateKycStatusDto.kyc_status as any,
      });
      if (updatedUserResult.error) {
        throw new BadRequestException(updatedUserResult.error.message);
      }

      const updatedUser = updatedUserResult.output;

      return {
        success: true,
        message: `KYC status updated to ${updateKycStatusDto.kyc_status} successfully`,
        user_id: updatedUser.id,
        kyc_status: updateKycStatusDto.kyc_status,
        updated_at: updatedUser.updated_at,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException({
        success: false,
        message: "An error occurred while updating KYC status",
        error: error.message,
      });
    }
  }

  private generateInvitationCode(): string {
    return "INV_" + uuidv4().replace(/-/g, "").substring(0, 16);
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
}
