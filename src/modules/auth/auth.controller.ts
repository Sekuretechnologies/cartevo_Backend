import {
  Controller,
  Post,
  Body,
  HttpCode,
  Param,
  Headers,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
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
  AuthResponseDto,
  LoginSuccessResponseDto,
  LogoutResponseDto,
} from "../user/dto/user.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("token")
  @HttpCode(200)
  @ApiOperation({
    summary: "Generate access token",
    description: "Generate a Bearer token using business client credentials",
  })
  @ApiResponse({
    status: 200,
    description: "Token generated successfully",
    type: AuthTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid client credentials",
  })
  async generateToken(
    @Body() authDto: AuthTokenRequestDto
  ): Promise<AuthTokenResponseDto> {
    return this.authService.generateToken(authDto);
  }

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
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
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
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post("logout")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "User logout",
    description: "Logout user by invalidating their access token",
  })
  @ApiResponse({
    status: 200,
    description: "Logout successful",
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing token",
  })
  async logout(@Headers() headers: any): Promise<LogoutResponseDto> {
    // Extract token from Authorization header
    const authHeader = headers.authorization || headers.Authorization;
    if (!authHeader) {
      throw new BadRequestException("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token === authHeader) {
      throw new BadRequestException("Invalid authorization header format");
    }

    const result = await this.authService.logout(token);
    return {
      success: result.success,
      message: result.message,
      logged_out_at: result.logged_out_at,
    };
  }

  @Post("forgot-password")
  @HttpCode(200)
  @ApiOperation({
    summary: "Forgot password",
    description:
      "Allows a user to request a password reset. " +
      "An email containing a reset link will be sent to the provided address.",
  })
  @ApiResponse({
    status: 200,
    description: "Password reset email sent successfully.",
  })
  @ApiResponse({ status: 404, description: "User not found." })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post("reset-password")
  @HttpCode(200)
  @ApiOperation({
    summary: "Reset password",
    description: "Reset a user's password using a valid token.",
  })
  async resetPassword(@Body() datas: { token: string; newPassword: string }) {
    return this.authService.resetPassword(datas.token, datas.newPassword);
  }

  @Post("check-email")
  @HttpCode(200)
  @ApiOperation({
    summary: "Check email existence across companies",
    description:
      "Check if an email exists in the system and how many companies it's associated with.",
  })
  @ApiResponse({
    status: 200,
    description: "Email check completed successfully",
    type: CheckEmailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
  })
  async checkEmail(
    @Body() checkEmailDto: CheckEmailRequestDto
  ): Promise<CheckEmailResponseDto> {
    return this.authService.checkEmailExistence(checkEmailDto);
  }

  @Post("login-with-company")
  @HttpCode(200)
  @ApiOperation({
    summary: "Login with company selection",
    description:
      "Authenticate user with email and password, with optional company selection for multi-company users.",
  })
  @ApiResponse({
    status: 200,
    description: "Login successful, OTP sent",
    type: LoginWithCompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Multiple companies found but no company specified",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
  })
  async loginWithCompany(
    @Body() loginDto: LoginWithCompanyRequestDto
  ): Promise<LoginWithCompanyResponseDto> {
    return this.authService.loginWithCompany(loginDto);
  }
}
