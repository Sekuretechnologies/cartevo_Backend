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
  Query,
  NotFoundException,
  Put,
  BadRequestException,
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
import UserModel from "@/models/prisma/userModel";
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
  CompleteKycDto,
  CompleteKycResponseDto,
  CompleteKybDto,
  CompleteKybResponseDto,
  BankingInfoDto,
  BankingInfoResponseDto,
  CompleteProfileDto,
  CompleteProfileResponseDto,
  OnboardingStatusDto,
  CreateOnboardingStepDto,
  UpdateOnboardingStepDto,
  OnboardingStepResponseDto,
  OnboardingStepListResponseDto,
  InitializeOnboardingStepsDto,
  InitializeOnboardingStepsResponseDto,
  UpdateStepStatusDto,
  UpdateStepStatusResponseDto,
  GetOnboardingStepsDto,
  GetOnboardingStepsResponseDto,
  CompanyCredentialsResponseDto,
  UpdateWebhookUrlDto,
  UpdateWebhookUrlResponseDto,
  RegenerateClientKeyResponseDto,
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

  // ==================== ADDITIONAL ONBOARDING ROUTES ====================

  @Post("onboarding/kyc")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "id_document_front", maxCount: 1 },
      { name: "id_document_back", maxCount: 1 },
      { name: "proof_of_address", maxCount: 1 },
    ])
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Complete KYC information",
    description:
      "Complete Know Your Customer verification for the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "KYC information completed successfully",
    type: CompleteKycResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or KYC completion failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  async completeKyc(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() completeKycDto: CompleteKycDto,
    @UploadedFiles()
    files: {
      id_document_front?: any[];
      id_document_back?: any[];
      proof_of_address?: any[];
    }
  ): Promise<CompleteKycResponseDto> {
    return this.companyService.completeKyc(
      business.businessId, // We'll get the user ID from the company context
      completeKycDto,
      files
    );
  }

  @Post("onboarding/kyb")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "share_holding_document", maxCount: 1 },
      { name: "incorporation_certificate", maxCount: 1 },
      { name: "business_proof_of_address", maxCount: 1 },
    ])
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Complete KYB information",
    description:
      "Complete Know Your Business verification for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "KYB information completed successfully",
    type: CompleteKybResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or KYB completion failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  async completeKyb(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() completeKybDto: CompleteKybDto,
    @UploadedFiles()
    files: {
      share_holding_document?: any[];
      incorporation_certificate?: any[];
      business_proof_of_address?: any[];
    }
  ): Promise<CompleteKybResponseDto> {
    return this.companyService.completeKyb(
      business.businessId,
      completeKybDto,
      files
    );
  }

  @Post("onboarding/banking")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Add banking information",
    description: "Add banking details for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Banking information added successfully",
    type: BankingInfoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or banking info addition failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  async addBankingInfo(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() bankingInfoDto: BankingInfoDto
  ): Promise<BankingInfoResponseDto> {
    return this.companyService.addBankingInfo(
      business.businessId,
      bankingInfoDto
    );
  }

  @Post("onboarding/profile")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Complete user profile",
    description: "Complete additional user profile information",
  })
  @ApiResponse({
    status: 200,
    description: "Profile information completed successfully",
    type: CompleteProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or profile completion failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    type: ErrorResponseDto,
  })
  async completeProfile(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() completeProfileDto: CompleteProfileDto
  ): Promise<CompleteProfileResponseDto> {
    return this.companyService.completeProfile(
      business.businessId, // We'll get the user ID from the company context
      completeProfileDto
    );
  }

  @Get("onboarding/status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get onboarding status",
    description:
      "Get the current onboarding status for the authenticated company and user",
  })
  @ApiResponse({
    status: 200,
    description: "Onboarding status retrieved successfully",
    type: OnboardingStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company or user not found",
    type: ErrorResponseDto,
  })
  async getOnboardingStatus(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<OnboardingStatusDto> {
    // Find the user associated with this company
    const userResult = await UserModel.getOne({
      company_id: business.businessId,
    });
    if (userResult.error || !userResult.output) {
      throw new NotFoundException("User not found for this company");
    }

    const user = userResult.output;

    return this.companyService.getOnboardingStatus(
      business.businessId,
      user.id
    );
  }

  // ==================== ONBOARDING STEP CONTROLLERS ====================

  @Post("onboarding-steps/initialize")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Initialize default onboarding steps for a company",
    description: "Create default onboarding steps for a new company",
  })
  @ApiResponse({
    status: 200,
    description: "Onboarding steps initialized successfully",
    type: InitializeOnboardingStepsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDto,
  })
  async initializeOnboardingSteps(
    @Body() initData: InitializeOnboardingStepsDto,
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<InitializeOnboardingStepsResponseDto> {
    // Override company_id with authenticated company ID
    initData.company_id = business.businessId;
    return this.companyService.initializeOnboardingSteps(initData);
  }

  @Get("onboarding-steps")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get all onboarding steps for a company",
    description:
      "Retrieve all onboarding steps for the authenticated company, with optional status filtering",
  })
  @ApiResponse({
    status: 200,
    description: "Onboarding steps retrieved successfully",
    type: GetOnboardingStepsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDto,
  })
  async getOnboardingSteps(
    @CurrentBusiness() business: CurrentBusinessData,
    @Query("status") status?: string
  ): Promise<{ data: GetOnboardingStepsResponseDto }> {
    return this.companyService.getCompanyOnboardingSteps(
      business.businessId,
      status
    );
  }

  @Get("onboarding-steps/:stepId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get a specific onboarding step",
    description: "Retrieve a specific onboarding step by ID",
  })
  @ApiResponse({
    status: 200,
    description: "Onboarding step retrieved successfully",
    type: OnboardingStepResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Onboarding step not found",
    type: ErrorResponseDto,
  })
  async getOnboardingStep(
    @Param("stepId") stepId: string,
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<OnboardingStepResponseDto> {
    return this.companyService.getOnboardingStep(stepId);
  }

  @Patch("onboarding-steps/:stepId/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Update onboarding step status",
    description: "Update the status of a specific onboarding step",
  })
  @ApiResponse({
    status: 200,
    description: "Step status updated successfully",
    type: UpdateStepStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Onboarding step not found",
    type: ErrorResponseDto,
  })
  async updateStepStatus(
    @Param("stepId") stepId: string,
    @Body() statusData: UpdateStepStatusDto,
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<UpdateStepStatusResponseDto> {
    return this.companyService.updateStepStatus(stepId, statusData.status);
  }

  @Post("onboarding-steps/:stepId/start")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Start an onboarding step",
    description: "Mark a specific onboarding step as IN_PROGRESS",
  })
  @ApiResponse({
    status: 200,
    description: "Step started successfully",
    type: UpdateStepStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Onboarding step not found",
    type: ErrorResponseDto,
  })
  async startStep(
    @Param("stepId") stepId: string,
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<UpdateStepStatusResponseDto> {
    return this.companyService.startStep(stepId);
  }

  @Post("onboarding-steps/:stepId/complete")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Complete an onboarding step",
    description: "Mark a specific onboarding step as COMPLETED",
  })
  @ApiResponse({
    status: 200,
    description: "Step completed successfully",
    type: UpdateStepStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Onboarding step not found",
    type: ErrorResponseDto,
  })
  async completeStep(
    @Param("stepId") stepId: string,
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<UpdateStepStatusResponseDto> {
    return this.companyService.completeStep(stepId);
  }

  @Get("onboarding-steps/next-pending")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get next pending onboarding step",
    description: "Retrieve the next pending onboarding step for the company",
  })
  @ApiResponse({
    status: 200,
    description: "Next pending step retrieved successfully",
    type: OnboardingStepResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "No pending steps found",
    type: ErrorResponseDto,
  })
  async getNextPendingStep(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<OnboardingStepResponseDto | null> {
    return this.companyService.getNextPendingStep(business.businessId);
  }

  @Delete("onboarding-steps/:stepId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Delete an onboarding step",
    description: "Delete a specific onboarding step",
  })
  @ApiResponse({
    status: 200,
    description: "Onboarding step deleted successfully",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Onboarding step not found",
    type: ErrorResponseDto,
  })
  async deleteOnboardingStep(
    @Param("stepId") stepId: string,
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<{ success: boolean; message: string }> {
    return this.companyService.deleteOnboardingStep(stepId);
  }

  @Post("onboarding-steps/reset")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Reset all onboarding steps",
    description: "Reset all onboarding steps for a company to PENDING status",
  })
  @ApiResponse({
    status: 200,
    description: "Onboarding steps reset successfully",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
    type: ErrorResponseDto,
  })
  async resetOnboardingSteps(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<{ success: boolean; message: string }> {
    return this.companyService.resetCompanySteps(business.businessId);
  }

  // ==================== CLIENT CREDENTIALS AND WEBHOOK ROUTES ====================

  @Get("credentials")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get company credentials",
    description:
      "Get company webhook URL, client ID, and client key for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Company credentials retrieved successfully",
    type: CompanyCredentialsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  async getCompanyCredentials(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<CompanyCredentialsResponseDto> {
    return this.companyService.getCompanyCredentials(business.businessId);
  }

  @Put("webhook")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Update webhook URL",
    description: "Update the webhook URL for the authenticated company",
  })
  @ApiResponse({
    status: 200,
    description: "Webhook URL updated successfully",
    type: UpdateWebhookUrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error or update failed",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  async updateWebhookUrl(
    @CurrentBusiness() business: CurrentBusinessData,
    @Body() updateWebhookUrlDto: any
  ): Promise<UpdateWebhookUrlResponseDto> {
    // Validate that at least one field is provided
    if (!updateWebhookUrlDto.webhook_url) {
      throw new BadRequestException(
        "At least field webhook_url must be provided"
      );
    }
    console.log(
      "updateWebhookUrlDto.webhook_url : ",
      updateWebhookUrlDto.webhook_url
    );

    return this.companyService.updateWebhookUrl(
      business.businessId,
      updateWebhookUrlDto
    );
  }

  @Post("regenerate-client-key")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Regenerate client key",
    description:
      "Generate a new client key for the authenticated company. The old key will be invalidated.",
  })
  @ApiResponse({
    status: 200,
    description: "Client key regenerated successfully",
    type: RegenerateClientKeyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Company not found",
    type: ErrorResponseDto,
  })
  async regenerateClientKey(
    @CurrentBusiness() business: CurrentBusinessData
  ): Promise<RegenerateClientKeyResponseDto> {
    return this.companyService.regenerateClientKey(business.businessId);
  }
}
