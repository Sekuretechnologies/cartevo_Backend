import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthTokenRequestDto, AuthTokenResponseDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generate access token',
    description: 'Generate a Bearer token using business client credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'Token generated successfully',
    type: AuthTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid client credentials',
  })
  async generateToken(@Body() authDto: AuthTokenRequestDto): Promise<AuthTokenResponseDto> {
    return this.authService.generateToken(authDto);
  }
}
