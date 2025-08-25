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
const models_1 = require("../../models");
const email_service_1 = require("../../services/email.service");
let UserService = class UserService {
    constructor(prisma, jwtService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async createUser(ownerUserId, createUserDto) {
        const ownerUserResult = await models_1.UserModel.getOne({ id: ownerUserId }, {
            company: true,
            userCompanyRoles: {
                include: { role: true },
            },
        });
        if (ownerUserResult.error) {
            throw new common_1.UnauthorizedException(ownerUserResult.error.message);
        }
        const ownerUser = ownerUserResult.output;
        if (!ownerUser) {
            throw new common_1.UnauthorizedException("User not found");
        }
        const isOwner = ownerUser.userCompanyRoles.some((ucr) => ucr.role.name === "owner");
        if (!isOwner) {
            throw new common_1.ForbiddenException("Only owners can create users");
        }
        const existingUserResult = await models_1.UserModel.getOne({ email: createUserDto.email, company_id: ownerUser.company_id }, {
            userCompanyRoles: {
                include: { role: true },
            },
        });
        if (existingUserResult.error) {
            throw new common_1.UnauthorizedException(existingUserResult.error.message);
        }
        const existingUser = existingUserResult.output;
        if (existingUser) {
            throw new common_1.BadRequestException("User with this email already exists in the company");
        }
        const invitationCode = this.generateInvitationCode();
        return await models_1.UserModel.operation(async (prisma) => {
            const newUserResult = await models_1.UserModel.create({
                email: createUserDto.email,
                company_id: ownerUser.company_id,
                status: client_1.UserStatus.PENDING,
                invitation_code: invitationCode,
            });
            if (newUserResult.error) {
                throw new common_1.BadRequestException(newUserResult.error.message);
            }
            const newUser = newUserResult.output;
            let roleResult = await models_1.RoleModel.getOne({ name: createUserDto.role });
            if (roleResult.error) {
                throw new common_1.BadRequestException(roleResult.error.message);
            }
            let role = roleResult.output;
            if (!role) {
                const roleCreateResult = await models_1.RoleModel.create({
                    name: createUserDto.role,
                });
                if (roleCreateResult.error) {
                    throw new common_1.BadRequestException(roleCreateResult.error.message);
                }
                role = roleCreateResult.output;
            }
            const userCompanyRoleResult = await models_1.UserCompanyRoleModel.create({
                user_id: newUser.id,
                company_id: ownerUser.company_id,
                role_id: role.id,
            });
            if (userCompanyRoleResult.error) {
                throw new common_1.BadRequestException(userCompanyRoleResult.error.message);
            }
            await this.emailService.sendInvitationEmail(createUserDto.email, invitationCode, ownerUser.company?.name || "Your Company");
            return {
                success: true,
                message: "User invitation sent successfully",
                user: await this.mapToResponseDto(newUser, createUserDto.role),
                invitation_code: invitationCode,
            };
        });
    }
    async registerUser(registerDto) {
        const userResult = await models_1.UserModel.getOne({
            email: registerDto.email,
            invitation_code: registerDto.invitation_code,
            status: client_1.UserStatus.PENDING,
        });
        if (userResult.error) {
            throw new common_1.BadRequestException(userResult.error.message);
        }
        const user = userResult.output;
        if (!user) {
            throw new common_1.BadRequestException("Invalid invitation code or email");
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 12);
        const updateResult = await models_1.UserModel.update(user.id, {
            full_name: registerDto.full_name,
            password: hashedPassword,
            status: client_1.UserStatus.ACTIVE,
            invitation_code: null,
        });
        if (updateResult.error) {
            throw new common_1.BadRequestException(updateResult.error.message);
        }
        return {
            success: true,
            message: "User account activated successfully. You can now log in.",
        };
    }
    async login(loginDto) {
        const userResult = await models_1.UserModel.getOne({
            email: loginDto.email,
            status: client_1.UserStatus.ACTIVE,
        });
        if (userResult.error) {
            throw new common_1.UnauthorizedException(userResult.error.message);
        }
        const user = userResult.output;
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        const otp = this.generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        const otpUpdateResult = await models_1.UserModel.update(user.id, {
            otp,
            otp_expires: otpExpires,
        });
        if (otpUpdateResult.error) {
            throw new common_1.BadRequestException(otpUpdateResult.error.message);
        }
        await this.emailService.sendOtpEmail(user.email, otp, user.full_name);
        return {
            success: true,
            message: `OTP sent to ${user.email}. Please verify to complete login.`,
            requires_otp: true,
        };
    }
    async verifyOtp(verifyOtpDto) {
        console.log("verifyOtpDto :: ", verifyOtpDto);
        const userResult = await models_1.UserModel.getOne({
            email: verifyOtpDto.email,
            otp: verifyOtpDto.otp,
            status: client_1.UserStatus.ACTIVE,
        }, {
            company: true,
            userCompanyRoles: {
                include: { role: true },
            },
        });
        if (userResult.error) {
            throw new common_1.UnauthorizedException(userResult.error.message);
        }
        const user = userResult.output;
        console.log("user.otpExpires :: ", user.otp_expires);
        console.log("new Date() :: ", new Date());
        console.log("user.otpExpires < new Date() :: ", user.otp_expires < new Date());
        console.log("user :: ", user);
        if (!user || !user.otp_expires || user.otp_expires < new Date()) {
            throw new common_1.UnauthorizedException("Invalid or expired OTP");
        }
        await models_1.UserModel.update(user.id, {
            otp: null,
            otp_expires: null,
        });
        const payload = {
            sub: user.id,
            email: user.email,
            company_id: user.company.id,
            roles: user.userCompanyRoles?.map((ucr) => ucr.role.name),
        };
        const accessToken = this.jwtService.sign(payload);
        console.log("payload :: ", payload);
        console.log("accessToken :: ", accessToken);
        let redirectTo = "dashboard";
        let redirectMessage = "Login successful";
        if (user.step === 1) {
            redirectTo = "step2";
            redirectMessage = "Please complete your company registration (Step 2)";
        }
        else if (user.step === 2) {
            const hasUserDocuments = user.id_document_front &&
                user.id_document_back &&
                user.proof_of_address;
            const hasCompanyDocuments = user.company.share_holding_document &&
                user.company.incorporation_certificate &&
                user.company.business_proof_of_address;
            if (user.kyc_status !== "APPROVED" &&
                user.company.kyb_status !== "APPROVED") {
                redirectTo = "waiting";
                redirectMessage =
                    "Your account is under review. Please wait for KYC/KYB completion.";
            }
        }
        return {
            success: true,
            message: redirectMessage,
            access_token: accessToken,
            user: await this.mapToResponseDto(user),
            company: {
                id: user.company.id,
                name: user.company.name,
                country: user.company.country,
            },
            redirect_to: redirectTo,
        };
    }
    async updateUser(ownerUserId, userId, updateDto) {
        const ownerUserResult = await models_1.UserModel.getOne({ id: ownerUserId }, {
            userCompanyRoles: {
                include: { role: true },
            },
        });
        if (ownerUserResult.error) {
            throw new common_1.UnauthorizedException(ownerUserResult.error.message);
        }
        const ownerUser = ownerUserResult.output;
        if (!ownerUser) {
            throw new common_1.UnauthorizedException("User not found");
        }
        const isOwner = ownerUser.userCompanyRoles.some((ucr) => ucr.role.name === "owner");
        if (!isOwner) {
            throw new common_1.ForbiddenException("Only owners can update users");
        }
        const targetUserResult = await models_1.UserModel.getOne({
            id: userId,
            company_id: ownerUser.company_id,
        });
        if (targetUserResult.error) {
            throw new common_1.NotFoundException(targetUserResult.error.message);
        }
        const targetUser = targetUserResult.output;
        if (!targetUser) {
            throw new common_1.NotFoundException("User not found in your company");
        }
        return await models_1.UserModel.operation(async (prisma) => {
            const updatedUserResult = await models_1.UserModel.update(userId, {
                full_name: updateDto.full_name || targetUser.full_name,
            });
            if (updatedUserResult.error) {
                throw new common_1.BadRequestException(updatedUserResult.error.message);
            }
            const updatedUser = updatedUserResult.output;
            if (updateDto.role) {
                const deleteResult = await models_1.UserCompanyRoleModel.delete({
                    user_id: userId,
                    company_id: ownerUser.company_id,
                });
                if (deleteResult.error) {
                    throw new common_1.BadRequestException(deleteResult.error.message);
                }
                let roleResult = await models_1.RoleModel.getOne({ name: updateDto.role });
                if (roleResult.error) {
                    throw new common_1.BadRequestException(roleResult.error.message);
                }
                let role = roleResult.output;
                if (!role) {
                    const roleCreateResult = await models_1.RoleModel.create({
                        name: updateDto.role,
                    });
                    if (roleCreateResult.error) {
                        throw new common_1.BadRequestException(roleCreateResult.error.message);
                    }
                    role = roleCreateResult.output;
                }
                const userCompanyRoleResult = await models_1.UserCompanyRoleModel.create({
                    user_id: userId,
                    company_id: ownerUser.company_id,
                    role_id: role.id,
                });
                if (userCompanyRoleResult.error) {
                    throw new common_1.BadRequestException(userCompanyRoleResult.error.message);
                }
            }
            return this.mapToResponseDto(updatedUser, updateDto.role);
        });
    }
    async deleteUser(ownerUserId, userId) {
        const ownerUserResult = await models_1.UserModel.getOne({ id: ownerUserId }, {
            userCompanyRoles: {
                include: { role: true },
            },
        });
        if (ownerUserResult.error) {
            throw new common_1.UnauthorizedException(ownerUserResult.error.message);
        }
        const ownerUser = ownerUserResult.output;
        if (!ownerUser) {
            throw new common_1.UnauthorizedException("User not found");
        }
        const isOwner = ownerUser.userCompanyRoles.some((ucr) => ucr.role.name === "owner");
        if (!isOwner) {
            throw new common_1.ForbiddenException("Only owners can delete users");
        }
        const targetUserResult = await models_1.UserModel.getOne({
            id: userId,
            company_id: ownerUser.company_id,
        }, {
            userCompanyRoles: {
                include: { role: true },
            },
        });
        if (targetUserResult.error) {
            throw new common_1.NotFoundException(targetUserResult.error.message);
        }
        const targetUser = targetUserResult.output;
        if (!targetUser) {
            throw new common_1.NotFoundException("User not found in your company");
        }
        const isTargetOwner = targetUser.userCompanyRoles.some((ucr) => ucr.role.name === "owner");
        if (isTargetOwner) {
            const ownerCount = await models_1.UserCompanyRoleModel.count({
                company_id: ownerUser.company_id,
                role_name: "owner",
            });
            if (ownerCount <= 1) {
                throw new common_1.BadRequestException("Cannot delete the last owner of the company");
            }
        }
        const deleteResult = await models_1.UserModel.update(userId, {
            status: client_1.UserStatus.INACTIVE,
        });
        if (deleteResult.error) {
            throw new common_1.BadRequestException(deleteResult.error.message);
        }
        return {
            success: true,
            message: "User deleted successfully",
        };
    }
    async getCompanyUsers(userId) {
        const userResult = await models_1.UserModel.getOne({ id: userId });
        if (userResult.error) {
            throw new common_1.UnauthorizedException(userResult.error.message);
        }
        const user = userResult.output;
        if (!user) {
            throw new common_1.UnauthorizedException("User not found");
        }
        const usersResult = await models_1.UserModel.get({
            company_id: user.company_id,
            status: { not: client_1.UserStatus.INACTIVE },
        });
        if (usersResult.error) {
            throw new common_1.BadRequestException(usersResult.error.message);
        }
        const users = usersResult.output;
        return Promise.all(users.map((u) => this.mapToResponseDto(u)));
    }
    async getAllUsers() {
        const targetUserResult = await models_1.UserModel.get();
        if (targetUserResult.error) {
            throw new common_1.NotFoundException(targetUserResult.error.message);
        }
        const users = targetUserResult.output || [];
        return {
            users,
        };
    }
    async getUserById(userId) {
        const targetUserResult = await models_1.UserModel.getOne({
            id: userId,
        }, {
            userCompanyRoles: {
                include: { role: true, company: true },
            },
        });
        if (targetUserResult.error) {
            throw new common_1.NotFoundException(targetUserResult.error.message);
        }
        const targetUser = targetUserResult.output;
        if (!targetUser) {
            throw new common_1.NotFoundException("User not found in your company");
        }
        return {
            user: targetUser,
        };
    }
    async updateKycStatus(userId, updateKycStatusDto) {
        try {
            const userResult = await models_1.UserModel.getOne({ id: userId });
            if (userResult.error || !userResult.output) {
                throw new common_1.NotFoundException("User not found");
            }
            const updatedUserResult = await models_1.UserModel.update(userId, {
                kyc_status: updateKycStatusDto.kyc_status,
            });
            if (updatedUserResult.error) {
                throw new common_1.BadRequestException(updatedUserResult.error.message);
            }
            const updatedUser = updatedUserResult.output;
            return {
                success: true,
                message: `KYC status updated to ${updateKycStatusDto.kyc_status} successfully`,
                user_id: updatedUser.id,
                kyc_status: updateKycStatusDto.kyc_status,
                updated_at: updatedUser.updated_at,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException({
                success: false,
                message: "An error occurred while updating KYC status",
                error: error.message,
            });
        }
    }
    generateInvitationCode() {
        return "INV_" + (0, uuid_1.v4)().replace(/-/g, "").substring(0, 16);
    }
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async mapToResponseDto(user, role) {
        let userRole = role;
        if (!userRole && user.userCompanyRoles) {
            userRole = user.userCompanyRoles[0]?.role?.name || "user";
        }
        if (!userRole) {
            const userWithRoleResult = await models_1.UserModel.getOne({ id: user.id }, {
                userCompanyRoles: {
                    include: { role: true },
                },
            });
            if (userWithRoleResult.error) {
                throw new common_1.BadRequestException(userWithRoleResult.error.message);
            }
            const userWithRole = userWithRoleResult.output;
            userRole = userWithRole?.userCompanyRoles[0]?.role?.name || "user";
        }
        return {
            id: user.id,
            full_name: user.fullName,
            email: user.email,
            company_id: user.company_id,
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
        jwt_1.JwtService,
        email_service_1.EmailService])
], UserService);
//# sourceMappingURL=user.service.js.map