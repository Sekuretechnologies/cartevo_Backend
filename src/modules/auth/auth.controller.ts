import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  AuthResponseDto,
  LoginDto,
  LoginSuccessResponseDto,
  LogoutResponseDto,
  VerifyOtpDto,
  VerifyOtpMultiCompanyResponseDto,
} from "../user/dto/user.dto";
import { AuthService } from "./auth.service";
import {
  AcceptInvitationDto,
  AcceptInvitationResponseDto,
  AuthTokenRequestDto,
  AuthTokenResponseDto,
  CheckEmailRequestDto,
  CheckEmailResponseDto,
  LoginWithCompanyRequestDto,
  LoginWithCompanyResponseDto,
  RegisterWithInvitationDto,
  ResendOtpDto,
  SelectCompanyRequestDto,
  SelectCompanyResponseDto,
  SwitchCompanyRequestDto,
  ValidateInvitationResponseDto,
  ValidateInvitationTokenDto,
} from "./dto/auth.dto";
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
    description:
      "Verify OTP and complete login process. For multi-company users, returns temporary token for company selection.",
  })
  @ApiResponse({
    status: 200,
    description: "Login successful or company selection required",
    type: LoginSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid or expired OTP",
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto
  ): Promise<LoginSuccessResponseDto | VerifyOtpMultiCompanyResponseDto> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  // Resend otp
  @Put("resend-otp")
  @HttpCode(200)
  @ApiOperation({
    summary: "Resend OTP",
    description: "Resend OTP to user's email",
  })
  async resendOtp(@Body() email: ResendOtpDto) {
    return this.authService.resendOtp(email);
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

  @Post("select-company")
  @HttpCode(200)
  @ApiOperation({
    summary: "Select company for multi-company login",
    description:
      "Complete login by selecting a company using the temporary token received from verify-otp.",
  })
  @ApiResponse({
    status: 200,
    description: "Company selected successfully",
    type: SelectCompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid temporary token or company selection",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or expired temporary token",
  })
  async selectCompany(
    @Body() selectCompanyDto: SelectCompanyRequestDto
  ): Promise<SelectCompanyResponseDto> {
    return this.authService.selectCompany(selectCompanyDto);
  }

  @Post("invitations/validate-token")
  @HttpCode(200)
  @ApiOperation({
    summary: "Validate invitation token",
    description: "Validate an invitation token and return invitation details",
  })
  @ApiResponse({
    status: 200,
    description: "Invitation validation completed",
    type: ValidateInvitationResponseDto,
  })
  async validateInvitationToken(
    @Body() dto: ValidateInvitationTokenDto
  ): Promise<ValidateInvitationResponseDto> {
    return this.authService.validateInvitationToken(dto);
  }

  @Post("invitations/accept")
  @HttpCode(200)
  @ApiOperation({
    summary: "Accept invitation",
    description:
      "Accept an invitation using the token. Handles both new and existing users.",
  })
  @ApiResponse({
    status: 200,
    description: "Invitation accepted successfully",
    type: AcceptInvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid invitation or user already member",
  })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto
  ): Promise<AcceptInvitationResponseDto> {
    return this.authService.acceptInvitation(dto);
  }

  @Post("register-with-invitation")
  @HttpCode(201)
  @ApiOperation({
    summary: "Register with invitation",
    description: "Complete user registration using an invitation token",
  })
  @ApiResponse({
    status: 201,
    description: "Account created successfully",
    type: LoginSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid invitation token or validation error",
  })
  async registerWithInvitation(
    @Body() dto: RegisterWithInvitationDto
  ): Promise<LoginSuccessResponseDto> {
    return this.authService.registerWithInvitation(dto);
  }

  @Post("switch-company")
  @UseGuards(JwtAuthGuard)
  async switchCompany(
    @CurrentUser() user: any,
    @Body() body: SwitchCompanyRequestDto
  ) {
    // console.log("user dans le switch", user);
    // console.log("companyId", body.company_id);
    // console.log("current companyId", user.companyId);
    return this.authService.switchCompany(user.userId, user.companyId, body);
  }
}
