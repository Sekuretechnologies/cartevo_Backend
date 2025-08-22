import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  Patch,
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
      { name: "memart", maxCount: 1 },
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
    @Body() createDto: CreateCompanyUserDto
  ): Promise<CreateCompanyUserResponseDto> {
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
  ): Promise<{ wallets: WalletResponseDto[] }> {
    return this.companyService.getCompanyBalance(business.businessId);
  }

  @Patch(":companyId/kyb-status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
}
