import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
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
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { OwnerGuard } from "@/modules/common/guards/owner.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "@/modules/common/decorators/current-user.decorator";
import { SuccessResponseDto } from "@/modules/common/dto/response.dto";

@ApiTags("User Management")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Create user (Owner only)",
    description:
      "Create a new user and send invitation email. Only company owners can create users.",
  })
  @ApiResponse({
    status: 201,
    description: "User invitation sent successfully",
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Only owners can create users",
  })
  @ApiResponse({
    status: 400,
    description: "User with this email already exists in the company",
  })
  async createUser(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() createUserDto: CreateUserDto
  ): Promise<CreateUserResponseDto> {
    return this.userService.createUser(currentUser.userId, createUserDto);
  }

  @Post("register")
  @ApiOperation({
    summary: "Complete user registration",
    description:
      "Complete user registration using invitation code and set password.",
  })
  @ApiResponse({
    status: 200,
    description: "User account activated successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid invitation code or email",
  })
  async registerUser(
    @Body() registerDto: RegisterUserDto
  ): Promise<SuccessResponseDto> {
    const result = await this.userService.registerUser(registerDto);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get company users",
    description: "Get all users in the authenticated user's company.",
  })
  @ApiResponse({
    status: 200,
    description: "Users retrieved successfully",
    type: [UserResponseDto],
  })
  async getCompanyUsers(
    @CurrentUser() currentUser: CurrentUserData
  ): Promise<UserResponseDto[]> {
    return this.userService.getCompanyUsers(currentUser.userId);
  }

  @Put(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Update user (Owner only)",
    description:
      "Update user details and role. Only company owners can update users.",
  })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Only owners can update users",
  })
  @ApiResponse({
    status: 404,
    description: "User not found in your company",
  })
  async updateUser(
    @CurrentUser() currentUser: CurrentUserData,
    @Param("id") userId: string,
    @Body() updateDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    return this.userService.updateUser(currentUser.userId, userId, updateDto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Delete user (Owner only)",
    description:
      "Delete a user from the company. Only company owners can delete users.",
  })
  @ApiResponse({
    status: 200,
    description: "User deleted successfully",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Only owners can delete users",
  })
  @ApiResponse({
    status: 404,
    description: "User not found in your company",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot delete the last owner of the company",
  })
  async deleteUser(
    @CurrentUser() currentUser: CurrentUserData,
    @Param("id") userId: string
  ): Promise<SuccessResponseDto> {
    const result = await this.userService.deleteUser(
      currentUser.userId,
      userId
    );
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Get("admin")
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Get all users",
    description: "Get all users",
  })
  async getAllUsers(): Promise<{ users: any[] }> {
    return this.userService.getAllUsers();
  }

  @Get("admin/:id")
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Get user by Id",
    description: "Get user by Id",
  })
  async getCompanyById(@Param("id") id: string): Promise<{ user: any }> {
    return this.userService.getUserById(id);
  }

  @Patch(":userId/kyc-status")
  // @ApiBearerAuth()
  //  @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Update user KYC status",
    description: "Update the KYC (Know Your Customer) status for a user",
  })
  @ApiResponse({
    status: 200,
    description: "KYC status updated successfully",
    type: UpdateKycStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  async updateKycStatus(
    @Param("userId") userId: string,
    @Body() updateKycStatusDto: UpdateKycStatusDto
  ): Promise<UpdateKycStatusResponseDto> {
    return this.userService.updateKycStatus(userId, updateKycStatusDto);
  }
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post("login")
  @ApiOperation({
    summary: "User login",
    description:
      "Authenticate user with email and password, then send OTP for verification.",
  })
  @ApiResponse({
    status: 200,
    description: "OTP sent to user email",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginSuccessResponseDto> {
    // AuthResponseDto
    return this.userService.login(loginDto);
  }

  @Post("verify-otp")
  @ApiOperation({
    summary: "Verify OTP",
    description: "Verify OTP and complete login process.",
  })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: LoginSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid or expired OTP",
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto
  ): Promise<LoginSuccessResponseDto> {
    return this.userService.verifyOtp(verifyOtpDto);
  }
}
