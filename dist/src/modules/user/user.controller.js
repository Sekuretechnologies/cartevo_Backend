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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_service_1 = require("./user.service");
const user_dto_1 = require("./dto/user.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const owner_guard_1 = require("../common/guards/owner.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const response_dto_1 = require("../common/dto/response.dto");
let UserController = class UserController {
    constructor(userService) {
        this.userService = userService;
    }
    async createUser(currentUser, createUserDto) {
        return this.userService.createUser(currentUser.userId, createUserDto);
    }
    async registerUser(registerDto) {
        const result = await this.userService.registerUser(registerDto);
        return {
            success: result.success,
            message: result.message,
        };
    }
    async getCompanyUsers(currentUser) {
        return this.userService.getCompanyUsers(currentUser.userId);
    }
    async updateUser(currentUser, userId, updateDto) {
        return this.userService.updateUser(currentUser.userId, userId, updateDto);
    }
    async deleteUser(currentUser, userId) {
        const result = await this.userService.deleteUser(currentUser.userId, userId);
        return {
            success: result.success,
            message: result.message,
        };
    }
    async updateKycStatus(userId, updateKycStatusDto) {
        return this.userService.updateKycStatus(userId, updateKycStatusDto);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, owner_guard_1.OwnerGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Create user (Owner only)",
        description: "Create a new user and send invitation email. Only company owners can create users.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: "User invitation sent successfully",
        type: user_dto_1.CreateUserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: "Only owners can create users",
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "User with this email already exists in the company",
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "createUser", null);
__decorate([
    (0, common_1.Post)("register"),
    (0, swagger_1.ApiOperation)({
        summary: "Complete user registration",
        description: "Complete user registration using invitation code and set password.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "User account activated successfully",
        type: response_dto_1.SuccessResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Invalid invitation code or email",
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.RegisterUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "registerUser", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Get company users",
        description: "Get all users in the authenticated user's company.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Users retrieved successfully",
        type: [user_dto_1.UserResponseDto],
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getCompanyUsers", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, owner_guard_1.OwnerGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Update user (Owner only)",
        description: "Update user details and role. Only company owners can update users.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "User updated successfully",
        type: user_dto_1.UserResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: "Only owners can update users",
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "User not found in your company",
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, owner_guard_1.OwnerGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Delete user (Owner only)",
        description: "Delete a user from the company. Only company owners can delete users.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "User deleted successfully",
        type: response_dto_1.SuccessResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: "Only owners can delete users",
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "User not found in your company",
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Cannot delete the last owner of the company",
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Patch)(":userId/kyc-status"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({
        summary: "Update user KYC status",
        description: "Update the KYC (Know Your Customer) status for a user",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "KYC status updated successfully",
        type: user_dto_1.UpdateKycStatusResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: "Validation error",
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: "User not found",
    }),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateKycStatusDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateKycStatus", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)("User Management"),
    (0, common_1.Controller)("users"),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
let AuthController = class AuthController {
    constructor(userService) {
        this.userService = userService;
    }
    async login(loginDto) {
        return this.userService.login(loginDto);
    }
    async verifyOtp(verifyOtpDto) {
        return this.userService.verifyOtp(verifyOtpDto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("login"),
    (0, swagger_1.ApiOperation)({
        summary: "User login",
        description: "Authenticate user with email and password, then send OTP for verification.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "OTP sent to user email",
        type: user_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: "Invalid credentials",
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)("verify-otp"),
    (0, swagger_1.ApiOperation)({
        summary: "Verify OTP",
        description: "Verify OTP and complete login process.",
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Login successful",
        type: user_dto_1.LoginSuccessResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: "Invalid or expired OTP",
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)("Authentication"),
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [user_service_1.UserService])
], AuthController);
//# sourceMappingURL=user.controller.js.map