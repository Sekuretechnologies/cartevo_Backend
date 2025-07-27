import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import {
  CreateCompanyUserDto,
  CreateCompanyUserResponseDto,
  ErrorResponseDto,
  WalletResponseDto
} from './dto/company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentBusiness, CurrentBusinessData } from '../common/decorators/current-business.decorator';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register new company and owner user',
    description: 'Register a new company and its first user (assigned the "owner" role), generate client credentials, and create default wallets.',
  })
  @ApiResponse({
    status: 201,
    description: 'Company and owner user created successfully',
    type: CreateCompanyUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or registration failed',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User or company email already exists',
    type: ErrorResponseDto,
  })
  async registerCompanyUser(@Body() createDto: CreateCompanyUserDto): Promise<CreateCompanyUserResponseDto> {
    return this.companyService.createCompanyUser(createDto);
  }

  @Get('wallets')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get company wallets',
    description: 'Get all active wallets for the authenticated company',
  })
  @ApiResponse({
    status: 200,
    description: 'Company wallets retrieved successfully',
    type: [WalletResponseDto],
  })
  async getCompanyWallets(
    @CurrentBusiness() business: CurrentBusinessData,
  ): Promise<{ wallets: WalletResponseDto[] }> {
    return this.companyService.getCompanyBalance(business.businessId);
  }
}
