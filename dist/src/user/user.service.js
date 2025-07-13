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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
let UserService = class UserService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async createUser(ownerUserId, createUserDto) {
        const ownerUser = await this.prisma.user.findUnique({
            where: { id: ownerUserId },
            include: {
                userCompanyRoles: {
                    include: { role: true },
                },
            },
        });
        if (!ownerUser) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isOwner = ownerUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
        if (!isOwner) {
            throw new common_1.ForbiddenException('Only owners can create users');
        }
        const existingUser = await this.prisma.user.findFirst({
            where: {
                email: createUserDto.email,
                companyId: ownerUser.companyId,
            },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('User with this email already exists in the company');
        }
        const invitationCode = this.generateInvitationCode();
        return this.prisma.$transaction(async (prisma) => {
            const newUser = await prisma.user.create({
                data: {
                    email: createUserDto.email,
                    companyId: ownerUser.companyId,
                    status: client_1.UserStatus.PENDING,
                    invitationCode,
                },
            });
            let role = await prisma.role.findUnique({
                where: { name: createUserDto.role },
            });
            if (!role) {
                role = await prisma.role.create({
                    data: { name: createUserDto.role },
                });
            }
            await prisma.userCompanyRole.create({
                data: {
                    userId: newUser.id,
                    companyId: ownerUser.companyId,
                    roleId: role.id,
                },
            });
            return {
                success: true,
                message: 'User invitation sent successfully',
                user: await this.mapToResponseDto(newUser, createUserDto.role),
                invitation_code: invitationCode,
            };
        });
    }
    async registerUser(registerDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                email: registerDto.email,
                invitationCode: registerDto.invitation_code,
                status: client_1.UserStatus.PENDING,
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid invitation code or email');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 12);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                fullName: registerDto.full_name,
                password: hashedPassword,
                status: client_1.UserStatus.ACTIVE,
                invitationCode: null,
            },
        });
        return {
            success: true,
            message: 'User account activated successfully. You can now log in.',
        };
    }
    async login(loginDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                email: loginDto.email,
                status: client_1.UserStatus.ACTIVE,
            },
        });
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const otp = this.generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                otp,
                otpExpires,
            },
        });
        return {
            success: true,
            message: `OTP sent to ${user.email}. Please verify to complete login.`,
            requires_otp: true,
        };
    }
    async verifyOtp(verifyOtpDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                email: verifyOtpDto.email,
                otp: verifyOtpDto.otp,
                otpExpires: {
                    gt: new Date(),
                },
                status: client_1.UserStatus.ACTIVE,
            },
            include: {
                company: true,
                userCompanyRoles: {
                    include: { role: true },
                },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid or expired OTP');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                otp: null,
                otpExpires: null,
            },
        });
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
    async updateUser(ownerUserId, userId, updateDto) {
        const ownerUser = await this.prisma.user.findUnique({
            where: { id: ownerUserId },
            include: {
                userCompanyRoles: {
                    include: { role: true },
                },
            },
        });
        if (!ownerUser) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isOwner = ownerUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
        if (!isOwner) {
            throw new common_1.ForbiddenException('Only owners can update users');
        }
        const targetUser = await this.prisma.user.findFirst({
            where: {
                id: userId,
                companyId: ownerUser.companyId,
            },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('User not found in your company');
        }
        return this.prisma.$transaction(async (prisma) => {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    fullName: updateDto.full_name || targetUser.fullName,
                },
            });
            if (updateDto.role) {
                await prisma.userCompanyRole.deleteMany({
                    where: {
                        userId,
                        companyId: ownerUser.companyId,
                    },
                });
                let role = await prisma.role.findUnique({
                    where: { name: updateDto.role },
                });
                if (!role) {
                    role = await prisma.role.create({
                        data: { name: updateDto.role },
                    });
                }
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
    async deleteUser(ownerUserId, userId) {
        const ownerUser = await this.prisma.user.findUnique({
            where: { id: ownerUserId },
            include: {
                userCompanyRoles: {
                    include: { role: true },
                },
            },
        });
        if (!ownerUser) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isOwner = ownerUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
        if (!isOwner) {
            throw new common_1.ForbiddenException('Only owners can delete users');
        }
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
            throw new common_1.NotFoundException('User not found in your company');
        }
        const isTargetOwner = targetUser.userCompanyRoles.some(ucr => ucr.role.name === 'owner');
        if (isTargetOwner) {
            const ownerCount = await this.prisma.userCompanyRole.count({
                where: {
                    companyId: ownerUser.companyId,
                    role: { name: 'owner' },
                },
            });
            if (ownerCount <= 1) {
                throw new common_1.BadRequestException('Cannot delete the last owner of the company');
            }
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { status: client_1.UserStatus.INACTIVE },
        });
        return {
            success: true,
            message: 'User deleted successfully',
        };
    }
    async getCompanyUsers(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const users = await this.prisma.user.findMany({
            where: {
                companyId: user.companyId,
                status: { not: client_1.UserStatus.INACTIVE },
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
    generateInvitationCode() {
        return 'INV_' + (0, uuid_1.v4)().replace(/-/g, '').substring(0, 16);
    }
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async mapToResponseDto(user, role) {
        let userRole = role;
        if (!userRole && user.userCompanyRoles) {
            userRole = user.userCompanyRoles[0]?.role?.name || 'user';
        }
        if (!userRole) {
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
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserService);
//# sourceMappingURL=user.service.js.map