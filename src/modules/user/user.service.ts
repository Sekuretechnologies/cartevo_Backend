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
import {
  ValidateInvitationResponseDto,
  ValidateInvitationTokenDto,
} from "../auth/dto/auth.dto";

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
    // return await UserModel.operation(async (prisma) => {
    // Verify the acting user is an owner and get their company
    const ownerUser = await this.validateOwnerAndGetCompany(ownerUserId);

    // Check if user with email already exists globally
    const existingUser = await this.findExistingUser(createUserDto.email);

    if (existingUser) {
      return await this.handleExistingUser(
        existingUser,
        createUserDto,
        ownerUser
      );
    }

    return await this.handleNewUser(createUserDto, ownerUser);
    // });
  }

  private async validateOwnerAndGetCompany(ownerUserId: string) {
    const ownerUserResult = await UserModel.getOne(
      { id: ownerUserId },
      {
        userCompanyRoles: {
          include: {
            role: true,
            company: true,
          },
        },
      }
    );

    if (ownerUserResult.error) {
      throw new UnauthorizedException(ownerUserResult.error.message);
    }

    const ownerUser = ownerUserResult.output;
    if (!ownerUser) {
      throw new UnauthorizedException("Owner user not found");
    }

    const isOwner = ownerUser.userCompanyRoles.some(
      (ucr) => ucr.role.name === "owner"
    );

    if (!isOwner) {
      throw new ForbiddenException("Only owners can create users");
    }

    const ownerCompanyId = ownerUser.userCompanyRoles[0]?.company_id;
    if (!ownerCompanyId) {
      throw new BadRequestException(
        "Owner user does not belong to any company"
      );
    }

    return { ownerUser, ownerCompanyId };
  }

  private async findExistingUser(email: string) {
    const existingUserResult = await UserModel.getOne(
      { email },
      {
        userCompanyRoles: {
          include: {
            role: true,
            company: true,
          },
        },
      }
    );

    return existingUserResult.output;
  }

  private async handleExistingUser(
    existingUser: any,
    createUserDto: CreateUserDto,
    ownerData: { ownerUser: any; ownerCompanyId: string }
  ) {
    const { ownerUser, ownerCompanyId } = ownerData;

    // Check if the existing user is already in this company
    const isInCompany = existingUser.userCompanyRoles.some(
      (ucr: any) => ucr.company_id === ownerCompanyId
    );

    if (isInCompany) {
      throw new BadRequestException("User already belongs to this company");
    }

    // User exists but not in this company - add them to this company
    const role = await this.getOrCreateRole(createUserDto.role);

    // Create user-company-role association
    const userCompanyRoleResult = await UserCompanyRoleModel.create({
      user_id: existingUser.id,
      company_id: ownerCompanyId,
      role_id: role.id,
    });

    if (userCompanyRoleResult.error) {
      throw new BadRequestException(userCompanyRoleResult.error.message);
    }

    // Generate invitation token
    const invitationToken = this.generateInvitationToken({
      invitation_id: existingUser.id,
      email: createUserDto.email,
      company_id: ownerCompanyId,
      role: createUserDto.role,
    });

    // Send invitation email
    await this.sendInvitationEmail(
      createUserDto.email,
      invitationToken,
      ownerUser,
      true
    );

    return {
      success: true,
      message: "User invitation sent successfully",
      user: await this.mapToResponseDto(existingUser, createUserDto.role),
      invitation_token: invitationToken, // For demo purposes only
    };
  }

  private async handleNewUser(
    createUserDto: CreateUserDto,
    ownerData: { ownerUser: any; ownerCompanyId: string }
  ) {
    const { ownerUser, ownerCompanyId } = ownerData;

    // Create pending user
    const newUserResult = await UserModel.create({
      email: createUserDto.email,
      status: UserStatus.PENDING,
    });

    if (newUserResult.error) {
      throw new BadRequestException(newUserResult.error.message);
    }

    const newUser = newUserResult.output;
    const role = await this.getOrCreateRole(createUserDto.role);

    // Create user-company-role association
    const userCompanyRoleResult = await UserCompanyRoleModel.create({
      user_id: newUser.id,
      company_id: ownerCompanyId,
      role_id: role.id,
    });

    if (userCompanyRoleResult.error) {
      throw new BadRequestException(userCompanyRoleResult.error.message);
    }

    // Generate invitation token
    const invitationToken = this.generateInvitationToken({
      invitation_id: newUser.id,
      email: createUserDto.email,
      company_id: ownerCompanyId,
      role: createUserDto.role,
    });

    // Send invitation email
    await this.sendInvitationEmail(
      createUserDto.email,
      invitationToken,
      ownerUser,
      false
    );

    return {
      success: true,
      message: "User invitation sent successfully",
      user: await this.mapToResponseDto(newUser, createUserDto.role),
      invitation_token: invitationToken, // For demo purposes only
    };
  }

  private async getOrCreateRole(roleName: string) {
    let roleResult = await RoleModel.getOne({ name: roleName });
    let role = roleResult.output;

    if (!role) {
      const roleCreateResult = await RoleModel.create({
        name: roleName,
      });
      if (roleCreateResult.error) {
        throw new BadRequestException(roleCreateResult.error.message);
      }
      role = roleCreateResult.output;
    }

    return role;
  }

  private async sendInvitationEmail(
    email: string,
    invitationToken: string,
    ownerUser: any,
    isExistingUser: boolean
  ) {
    try {
      await this.emailService.sendInvitationEmailWithToken(
        email,
        invitationToken,
        ownerUser.company?.name || "Your Company",
        ownerUser.first_name || ownerUser.full_name || "Company Owner",
        isExistingUser
      );
    } catch (error) {
      // Log the error but don't fail the entire operation
      console.error("Failed to send invitation email:", error);
      // In production, you might want to use a proper logger here
    }
  }

  async registerUser(
    registerDto: RegisterUserDto
  ): Promise<{ success: boolean; message: string }> {
    // Find user by email and invitation code
    // const userResult = await UserModel.getOne({
    //   email: registerDto.email,
    //   invitation_code: registerDto.invitation_code,
    //   status: UserStatus.PENDING,
    // });
    // if (userResult.error) {
    //   throw new BadRequestException(userResult.error.message);
    // }
    // const user = userResult.output;

    // if (!user) {
    //   throw new BadRequestException("Invalid invitation code or email");
    // }

    // Validate invitation token
    const validation = await this.validateInvitationToken({
      token: registerDto.token,
    });

    if (!validation.valid) {
      throw new BadRequestException("Invalid or expired invitation");
    }

    const { invitation_id, user_id, email, company, role, user_exists } =
      validation;

    if (!user_exists) {
      throw new BadRequestException("Invalid invitation code or email");
    }
    // Hash password
    // const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Update user to active status
    const updateResult = await UserModel.update(user_id, {
      first_name: registerDto.first_name,
      last_name: registerDto.last_name,
      password: registerDto.password,
      status: UserStatus.ACTIVE,
      invitation_code: null, // Clear invitation code after use
    });
    if (updateResult.error) {
      throw new BadRequestException(updateResult.error.message);
    }

    await UserCompanyRoleModel.update(
      {
        user_id,
        company_id: company.id,
      },
      {
        status: UserStatus.ACTIVE,
      }
    );

    return {
      success: true,
      message: "User account activated successfully. You can now log in.",
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

    // Find target user and check if they belong to the same company
    const targetUserResult = await UserModel.getOne(
      { id: userId },
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
      throw new NotFoundException("User not found");
    }

    // Check if target user belongs to the same company as the owner
    const ownerCompanyId = ownerUser.userCompanyRoles[0]?.company_id;
    if (!ownerCompanyId) {
      throw new BadRequestException(
        "Owner user does not belong to any company"
      );
    }

    const isInSameCompany = targetUser.userCompanyRoles.some(
      (ucr: any) => ucr.company_id === ownerCompanyId
    );

    if (!isInSameCompany) {
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
          company_id: ownerCompanyId,
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
          company_id: ownerCompanyId,
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

    // Find target user and check if they belong to the same company
    const targetUserResult = await UserModel.getOne(
      { id: userId },
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
      throw new NotFoundException("User not found");
    }

    // Check if target user belongs to the same company as the owner
    const ownerCompanyId = ownerUser.userCompanyRoles[0]?.company_id;
    if (!ownerCompanyId) {
      throw new BadRequestException(
        "Owner user does not belong to any company"
      );
    }

    const isInSameCompany = targetUser.userCompanyRoles.some(
      (ucr: any) => ucr.company_id === ownerCompanyId
    );

    if (!isInSameCompany) {
      throw new NotFoundException("User not found in your company");
    }

    // Prevent deleting the last owner
    const isTargetOwner = targetUser.userCompanyRoles.some(
      (ucr) => ucr.role.name === "owner"
    );
    if (isTargetOwner) {
      const ownerCount = await UserCompanyRoleModel.count({
        company_id: ownerCompanyId,
        role_name: "owner",
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          "Cannot delete the last owner of the company"
        );
      }
    }

    // Deactivate the user-company-role association instead of the user
    const deactivateResult = await UserCompanyRoleModel.update(
      {
        user_id: userId,
        company_id: ownerCompanyId,
      },
      {
        is_active: false,
      }
    );

    if (deactivateResult.error) {
      throw new BadRequestException(deactivateResult.error.message);
    }

    return {
      success: true,
      message: "User removed from company successfully",
    };
  }

  async getCompanyUsers(companyId: string): Promise<UserResponseDto[]> {
    // Get all active users in the same company
    const companyUsersResult = await UserCompanyRoleModel.get({
      company_id: companyId,
      is_active: true,
    });

    if (companyUsersResult.error) {
      throw new BadRequestException(companyUsersResult.error.message);
    }

    const companyUsers = companyUsersResult.output || [];

    // Get user details for each user-company-role association
    const usersWithDetails = await Promise.all(
      companyUsers.map(async (ucr: any) => {
        const userResult = await UserModel.getOne(
          { id: ucr.user_id },
          {
            userCompanyRoles: {
              include: { role: true },
            },
          }
        );

        if (userResult.error || !userResult.output) {
          return null;
        }

        const user = userResult.output;
        const userRole = user.userCompanyRoles.find(
          (ucrDetail: any) => ucrDetail.company_id === companyId
        );

        return {
          user,
          role: userRole?.role?.name || "member",
          company_status: userRole?.status,
        };
      })
    );

    // Filter out inactive users and null results
    const activeUsers = usersWithDetails.filter(
      (item) => item !== null && item.user.status !== UserStatus.INACTIVE
    );

    return Promise.all(
      activeUsers.map((item: any) =>
        this.mapToResponseDto(item.user, item.role, item.company_status)
      )
    );
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

  private generateInvitationToken(invitationData: {
    invitation_id: string;
    email: string;
    company_id: string;
    role: string;
  }): string {
    const payload = {
      invitation_id: invitationData.invitation_id,
      email: invitationData.email,
      company_id: invitationData.company_id,
      role: invitationData.role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: "7d", // 7 days expiry
    });
  }

  private generateInvitationCode(): string {
    return "INV_" + uuidv4().replace(/-/g, "").substring(0, 16);
  }

  private async mapToResponseDto(
    user: any,
    role?: string,
    company_status?: string
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
      status: company_status || user.status,
      step: user.step,
      role: userRole,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  async validateInvitationToken(
    dto: ValidateInvitationTokenDto
  ): Promise<ValidateInvitationResponseDto> {
    try {
      // Verify JWT token
      const decoded = this.jwtService.verify(dto.token) as {
        invitation_id: string;
        email: string;
        company_id: string;
        role: string;
      };

      // Check if invitation still exists and is pending
      const invitation = await UserModel.getOne({
        id: decoded.invitation_id,
        status: UserStatus.PENDING,
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
}
