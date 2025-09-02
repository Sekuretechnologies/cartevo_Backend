import { Controller, Post, Body, HttpCode, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthTokenRequestDto, AuthTokenResponseDto } from "./dto/auth.dto";

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
}
