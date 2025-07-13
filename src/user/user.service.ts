import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '@prisma/client';
import {
  CreateUserDto,
  RegisterUserDto,
  LoginDto,
  VerifyOtpDto,
  UpdateUserDto,
  UserResponseDto,
  CreateUserResponseDto,
  AuthResponseDto,
  LoginSuccessResponseDto
} from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async createUser(ownerUserId: string, createUserDto: CreateUserDto): Promise<CreateUserResponseDto> {
    // Verify the acting user is an owner
    const ownerUser = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      include: {
        userCompanyRoles: {
          include: { role: true },
        },
      },
    });

    if (!ownerUser) {
      throw new UnauthorizedException('User not found');
    }

    const isOwner = ownerUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
    if (!isOwner) {
      throw new ForbiddenException('Only owners can create users');
    }

    // Check if user with email already exists in this company
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: createUserDto.email,
        companyId: ownerUser.companyId,
      },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists in the company');
    }

    // Generate invitation code
    const invitationCode = this.generateInvitationCode();

    return this.prisma.$transaction(async (prisma) => {
      // Create pending user
      const newUser = await prisma.user.create({
        data: {
          email: createUserDto.email,
          companyId: ownerUser.companyId,
          status: UserStatus.PENDING,
          invitationCode,
        },
      });

      // Get the role
      let role = await prisma.role.findUnique({
        where: { name: createUserDto.role },
      });

      if (!role) {
        role = await prisma.role.create({
          data: { name: createUserDto.role },
        });
      }

      // Create user-company-role association
      await prisma.userCompanyRole.create({
        data: {
          userId: newUser.id,
          companyId: ownerUser.companyId,
          roleId: role.id,
        },
      });

      // TODO: Send invitation email here
      // await this.sendInvitationEmail(createUserDto.email, invitationCode);

      return {
        success: true,
        message: 'User invitation sent successfully',
        user: await this.mapToResponseDto(newUser, createUserDto.role),
        invitation_code: invitationCode, // For demo purposes, normally only sent via email
      };
    });
  }

  async registerUser(registerDto: RegisterUserDto): Promise<{ success: boolean; message: string }> {
    // Find user by email and invitation code
    const user = await this.prisma.user.findFirst({
      where: {
        email: registerDto.email,
        invitationCode: registerDto.invitation_code,
        status: UserStatus.PENDING,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid invitation code or email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Update user to active status
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: registerDto.full_name,
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        invitationCode: null, // Clear invitation code after use
      },
    });

    return {
      success: true,
      message: 'User account activated successfully. You can now log in.',
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find active user
    const user = await this.prisma.user.findFirst({
      where: {
        email: loginDto.email,
        status: UserStatus.ACTIVE,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate and store OTP
    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires,
      },
    });

    // TODO: Send OTP email here
    // await this.sendOtpEmail(user.email, otp);

    return {
      success: true,
      message: `OTP sent to ${user.email}. Please verify to complete login.`,
      requires_otp: true,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<LoginSuccessResponseDto> {
    // Find user with valid OTP
    const user = await this.prisma.user.findFirst({
      where: {
        email: verifyOtpDto.email,
        otp: verifyOtpDto.otp,
        otpExpires: {
          gt: new Date(),
        },
        status: UserStatus.ACTIVE,
      },
      include: {
        company: true,
        userCompanyRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Clear OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpires: null,
      },
    });

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      roles: user.userCompanyRoles.map(ucr => ucr.role.name),
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Login successful',
      access_token: accessToken,
      user: await this.mapToResponseDto(user),
      company: {
        id: user.company.id,
        name: user.company.name,
        country: user.company.country,
      },
    };
  }

  async updateUser(ownerUserId: string, userId: string, updateDto: UpdateUserDto): Promise<UserResponseDto> {
    // Verify the acting user is an owner
    const ownerUser = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      include: {
        userCompanyRoles: {
          include: { role: true },
        },
      },
    });

    if (!ownerUser) {
      throw new UnauthorizedException('User not found');
    }

    const isOwner = ownerUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
    if (!isOwner) {
      throw new ForbiddenException('Only owners can update users');
    }

    // Find target user in the same company
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId: ownerUser.companyId,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found in your company');
    }

    return this.prisma.$transaction(async (prisma) => {
      // Update user basic info
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: updateDto.full_name || targetUser.fullName,
        },
      });

      // Update role if provided
      if (updateDto.role) {
        // Remove existing role
        await prisma.userCompanyRole.deleteMany({
          where: {
            userId,
            companyId: ownerUser.companyId,
          },
        });

        // Get or create new role
        let role = await prisma.role.findUnique({
          where: { name: updateDto.role },
        });

        if (!role) {
          role = await prisma.role.create({
            data: { name: updateDto.role },
          });
        }

        // Create new role association
        await prisma.userCompanyRole.create({
          data: {
            userId,
            companyId: ownerUser.companyId,
            roleId: role.id,
          },
        });
      }

      return this.mapToResponseDto(updatedUser, updateDto.role);
    });
  }

  async deleteUser(ownerUserId: string, userId: string): Promise<{ success: boolean; message: string }> {
    // Verify the acting user is an owner
    const ownerUser = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      include: {
        userCompanyRoles: {
          include: { role: true },
        },
      },
    });

    if (!ownerUser) {
      throw new UnauthorizedException('User not found');
    }

    const isOwner = ownerUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
    if (!isOwner) {
      throw new ForbiddenException('Only owners can delete users');
    }

    // Find target user in the same company
    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId: ownerUser.companyId,
      },
      include: {
        userCompanyRoles: {
          include: { role: true },
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found in your company');
    }

    // Prevent deleting the last owner
    const isTargetOwner = targetUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
    if (isTargetOwner) {
      const ownerCount = await this.prisma.userCompanyRole.count({
        where: {
          companyId: ownerUser.companyId,
          role: { name: 'owner' },
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot delete the last owner of the company');
      }
    }

    // Soft delete by setting status to inactive
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.INACTIVE },
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  async getCompanyUsers(userId: string): Promise<UserResponseDto[]> {
    // Get user's company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get all active users in the company
    const users = await this.prisma.user.findMany({
      where: {
        companyId: user.companyId,
        status: { not: UserStatus.INACTIVE },
      },
      include: {
        userCompanyRoles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(users.map(u => this.mapToResponseDto(u)));
  }

  private generateInvitationCode(): string {
    return 'INV_' + uuidv4().replace(/-/g, '').substring(0, 16);
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async mapToResponseDto(user: any, role?: string): Promise<UserResponseDto> {
    let userRole = role;

    if (!userRole && user.userCompanyRoles) {
      userRole = user.userCompanyRoles[0]?.role?.name || 'user';
    }

    if (!userRole) {
      // Fetch role if not provided
      const userWithRole = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userCompanyRoles: {
            include: { role: true },
          },
        },
      });
      userRole = userWithRole?.userCompanyRoles[0]?.role?.name || 'user';
    }

    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      company_id: user.companyId,
      status: user.status,
      step: user.step,
      role: userRole,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  // TODO: Implement email sending service
  // private async sendInvitationEmail(email: string, invitationCode: string): Promise<void> {
  //   // Implementation for sending invitation emails
  // }

  // private async sendOtpEmail(email: string, otp: string): Promise<void> {
  //   // Implementation for sending OTP emails
  // }
}
