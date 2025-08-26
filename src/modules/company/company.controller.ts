import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { CompanyService } from "./company.service";
import {
  CreateCompanyUserDto,
  CreateCompanyUserResponseDto,
  ErrorResponseDto,
  WalletResponseDto,
  PersonalInfoDto,
  PersonalInfoResponseDto,
  BusinessInfoDto,
  BusinessInfoResponseDto,
  CheckExistingUserResponseDto,
  UpdateKybStatusDto,
  UpdateKybStatusResponseDto,
  TransactionResponseDto,
  CompanyUserDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateResponseDto,
  CurrencyConversionDto,
  CurrencyConversionResponseDto,
  CreateTransactionFeeDto,
  UpdateTransactionFeeDto,
  TransactionFeeResponseDto,
  CalculateTransactionFeeDto,
  CalculateTransactionFeeResponseDto,
} from "./dto/company.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CurrentBusiness,
  CurrentBusinessData,
} from "../common/decorators/current-business.decorator";

@ApiTags("Company")
@Controller("company")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post("register/step1")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "id_document_front", maxCount: 1 },
      { name: "id_document_back", maxCount: 1 },
      { name: "proof_of_address", maxCount: 1 },
    ])
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Step 1: Register personal information and create company",
    description:
      "Register personal information and create company with basic details. This is the first step of the 2-step registration process.",
  })
  @ApiResponse({
    status: 201,
    description: "Personal information registered successfully",
    type: PersonalInfoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or registration failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "User already exists",
    type: CheckExistingUserResponseDto,
  })
  async registerPersonalInfo(
    @Body() personalInfoDto: PersonalInfoDto,
    @UploadedFiles()
    files: {
      id_document_front?: any[];
      id_document_back?: any[];
      proof_of_address?: any[];
    }
  ): Promise<PersonalInfoResponseDto | CheckExistingUserResponseDto> {
    return this.companyService.registerPersonalInfo(personalInfoDto, files);
  }

  @Post("register/step2")
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "share_holding_document", maxCount: 1 },
      { name: "incorporation_certificate", maxCount: 1 },
      { name: "proof_of_address", maxCount: 1 },
      // { name: "memart", maxCount: 1 },
    ])
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Step 2: Complete business information",
    description:
      "Complete the company registration by providing business information. This is the second step of the 2-step registration process.",
  })
  @ApiResponse({
    status: 200,
    description: "Business information completed successfully",
    type: BusinessInfoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or company not found",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found or step 1 not completed",
    type: ErrorResponseDto,
  })
  async registerBusinessInfo(
    @Body() businessInfoDto: BusinessInfoDto,
    @UploadedFiles()
    files: {
      share_holding_document?: any[];
      incorporation_certificate?: any[];
      proof_of_address?: any[];
      memart?: any[];
    }
  ): Promise<BusinessInfoResponseDto> {
    return this.companyService.registerBusinessInfo(businessInfoDto, files);
  }

  @Post("register")
  @ApiOperation({
    summary: "Register new company and owner user (Legacy)",
    description:
      'Register a new company and its first user (assigned the "owner" role), generate client credentials, and create default wallets. This is the legacy single-step registration.',
  })
  @ApiResponse({
    status: 201,
    description: "Company and owner user created successfully",
    type: CreateCompanyUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or registration failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "User or company email already exists",
    type: ErrorResponseDto,
  })
  async registerCompanyUser(
    @Body() createDto: CompanyUserDto
  ): Promise<BusinessInfoResponseDto> {
    return this.companyService.createCompanyUser(createDto);
  }

  @Get("wallets")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get company wallets",
    description: "Get all active wallets for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Company wallets retrieved successfully",
    type: [WalletResponseDto],
  })
  async getCompanyWallets(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<{ data: WalletResponseDto[] }> {
    return this.companyService.getCompanyBalance(business.businessId);
  }

  @Get("transactions")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get company transactions",
    description: "Get all active transactions for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Company transactions retrieved successfully",
    type: [TransactionResponseDto],
  })
  async getCompanyTransactions(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<{ data: TransactionResponseDto[] }> {
    return this.companyService.getCompanyTransactions(business.businessId);
  }

  @Get("admin")
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Get all companies",
    description: "Get all companies",
  })
  async getAllCompanies(): Promise<{ companies: any[] }> {
    return this.companyService.getAllCompanies();
  }

  @Get("admin/:companyId")
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Get company by Id",
    description: "Get company by Id",
  })
  async getCompanyById(
    @Param("companyId") companyId: string
  ): Promise<{ company: any }> {
    return this.companyService.getCompanyById(companyId);
  }

  @Patch(":companyId/kyb-status")
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, OwnerGuard)
  @ApiOperation({
    summary: "Update company KYB status",
    description: "Update the KYB (Know Your Business) status for a company",
  })
  @ApiResponse({
    status: 200,
    description: "KYB status updated successfully",
    type: UpdateKybStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  async updateKybStatus(
    @Param("companyId") companyId: string,
    @Body() updateKybStatusDto: UpdateKybStatusDto
  ): Promise<UpdateKybStatusResponseDto> {
    return this.companyService.updateKybStatus(companyId, updateKybStatusDto);
  }

  // ==================== EXCHANGE RATE ROUTES ====================

  @Post("exchange-rates")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Create exchange rate",
    description: "Create a new exchange rate for the authenticated company",
  })
  @ApiResponse({
    status: 201,
    description: "Exchange rate created successfully",
    type: ExchangeRateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or creation failed",
    type: ErrorResponseDto,
  })
  async createExchangeRate(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() createExchangeRateDto: CreateExchangeRateDto
  ): Promise<any> {
    return this.companyService.createExchangeRate(
      business.businessId,
      createExchangeRateDto
    );
  }

  @Get("exchange-rates")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get company exchange rates",
    description: "Get all exchange rates for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Exchange rates retrieved successfully",
    type: [ExchangeRateResponseDto],
  })
  async getCompanyExchangeRates(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<any> {
    return this.companyService.getCompanyExchangeRates(business.businessId);
  }

  @Patch("exchange-rates/:exchangeRateId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Update exchange rate",
    description:
      "Update an existing exchange rate for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Exchange rate updated successfully",
    type: ExchangeRateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or update failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Exchange rate not found",
    type: ErrorResponseDto,
  })
  async updateExchangeRate(
    @Param("exchangeRateId") exchangeRateId: string,
    @Body() updateExchangeRateDto: UpdateExchangeRateDto
  ): Promise<any> {
    return this.companyService.updateExchangeRate(
      exchangeRateId,
      updateExchangeRateDto
    );
  }

  @Delete("exchange-rates/:exchangeRateId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Delete exchange rate",
    description: "Delete an exchange rate for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Exchange rate deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Exchange rate not found",
    type: ErrorResponseDto,
  })
  async deleteExchangeRate(
    @Param("exchangeRateId") exchangeRateId: string
  ): Promise<any> {
    return this.companyService.deleteExchangeRate(exchangeRateId);
  }

  @Post("exchange-rates/convert")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Convert currency",
    description:
      "Convert currency using the authenticated company's exchange rates",
  })
  @ApiResponse({
    status: 200,
    description: "Currency conversion successful",
    type: CurrencyConversionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or conversion failed",
    type: ErrorResponseDto,
  })
  async convertCurrency(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() currencyConversionDto: CurrencyConversionDto
  ): Promise<any> {
    return this.companyService.convertCurrency(
      business.businessId,
      currencyConversionDto.amount,
      currencyConversionDto.fromCurrency,
      currencyConversionDto.toCurrency
    );
  }

  // ==================== TRANSACTION FEE ROUTES ====================

  @Post("transaction-fees")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Create transaction fee",
    description: "Create a new transaction fee for the authenticated company",
  })
  @ApiResponse({
    status: 201,
    description: "Transaction fee created successfully",
    type: TransactionFeeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or creation failed",
    type: ErrorResponseDto,
  })
  async createTransactionFee(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() createTransactionFeeDto: CreateTransactionFeeDto
  ): Promise<any> {
    return this.companyService.createTransactionFee(
      business.businessId,
      createTransactionFeeDto
    );
  }

  @Get("transaction-fees")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get company transaction fees",
    description: "Get all transaction fees for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Transaction fees retrieved successfully",
    type: [TransactionFeeResponseDto],
  })
  async getCompanyTransactionFees(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<any> {
    return this.companyService.getCompanyTransactionFees(business.businessId);
  }

  @Patch("transaction-fees/:feeId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Update transaction fee",
    description:
      "Update an existing transaction fee for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Transaction fee updated successfully",
    type: TransactionFeeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or update failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Transaction fee not found",
    type: ErrorResponseDto,
  })
  async updateTransactionFee(
    @Param("feeId") feeId: string,
    @Body() updateTransactionFeeDto: UpdateTransactionFeeDto
  ): Promise<any> {
    return this.companyService.updateTransactionFee(
      feeId,
      updateTransactionFeeDto
    );
  }

  @Delete("transaction-fees/:feeId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Delete transaction fee",
    description: "Delete a transaction fee for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Transaction fee deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Transaction fee not found",
    type: ErrorResponseDto,
  })
  async deleteTransactionFee(@Param("feeId") feeId: string): Promise<any> {
    return this.companyService.deleteTransactionFee(feeId);
  }

  @Post("transaction-fees/calculate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Calculate transaction fee",
    description:
      "Calculate fee for a transaction using the authenticated company's fee structure",
  })
  @ApiResponse({
    status: 200,
    description: "Transaction fee calculated successfully",
    type: CalculateTransactionFeeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or calculation failed",
    type: ErrorResponseDto,
  })
  async calculateTransactionFee(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() calculateTransactionFeeDto: CalculateTransactionFeeDto
  ): Promise<any> {
    return this.companyService.calculateTransactionFee(
      business.businessId,
      calculateTransactionFeeDto.amount,
      calculateTransactionFeeDto.transactionType,
      calculateTransactionFeeDto.transactionCategory,
      calculateTransactionFeeDto.countryIsoCode,
      calculateTransactionFeeDto.currency
    );
  }
}
