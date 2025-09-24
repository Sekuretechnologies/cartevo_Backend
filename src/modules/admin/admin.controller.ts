import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { KybDto, KycDto, ToggleUserStatusDto } from "./dto/admin.dto";
import { ResponseInterceptor } from "../common/interceptors/response.interceptop";
import { OmniGuard } from "../auth/guards/omni.guard";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("get-all-companies")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({
    summary: "Retrieve all companies (Admin Access)",
    description:
      "Fetch a list of companies filtered by their status. Requires admin access level. Possible statuses: pending, approved, rejected, none.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["pending", "approved", "none", "rejected"],
    description: "Filter companies by their verification status",
  })
  @ApiResponse({
    status: 200,
    description: "List of companies retrieved successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Access denied: admin access required",
  })
  async getAllCompanies(
    @Query("status") status?: "pending" | "approved" | "none"
  ) {
    return this.adminService.getAllCompanies(status);
  }

  @Put("handle-kyc")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({
    summary: "Handle KYC verification (Admin Access)",
    description:
      "Approve or reject the KYC (Know Your Customer) process for a company. Requires admin access level.",
  })
  @ApiBody({ type: KycDto, description: "KYC request payload" })
  @ApiResponse({ status: 200, description: "KYC handled successfully." })
  @ApiResponse({
    status: 401,
    description: "Access denied: admin access required",
  })
  async handleKyc(@Body() dto: KycDto) {
    return this.adminService.handleKyc(dto);
  }

  @Put("handle-kyb")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({
    summary: "Handle KYB verification (Admin Access)",
    description:
      "Approve or reject the KYB (Know Your Business) process for a company. Requires admin access level.",
  })
  @ApiBody({ type: KybDto, description: "KYB request payload" })
  @ApiResponse({ status: 200, description: "KYB handled successfully." })
  @ApiResponse({
    status: 401,
    description: "Access denied: admin access required",
  })
  async handleKyb(@Body() dto: KybDto) {
    return this.adminService.handleKyb(dto);
  }

  @UseInterceptors(ResponseInterceptor)
  @Get("get-all-users")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({
    summary: "Get all users across companies (Admin Access)",
    description:
      "Retrieve all users with pagination. Requires admin access level.",
  })
  @ApiResponse({
    status: 200,
    description: "Users retrieved successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Access denied: admin access required",
  })
  async getAllUsers(
    @Query("companyId") companyId?: string,
    @Query("page") page = "1",
    @Query("perPage") perPage = "100"
  ) {
    const pageNumber = parseInt(page, 10);
    const perPageNumber = parseInt(perPage, 10);

    return this.adminService.getUsers(
      companyId ? { companyId } : undefined,
      pageNumber,
      perPageNumber
    );
  }

  /**
   * Activer / Désactiver un utilisateur
   * PUT /admin/toggle-user/:id
   * Body: { status: true | false }
   */
  @Put("toggle-user/:id")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({
    summary: "Toggle user status (Admin Access)",
    description: "Activate or deactivate a user. Requires admin access level.",
  })
  @ApiResponse({
    status: 200,
    description: "User status updated successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Access denied: admin access required",
  })
  async toggleUserStatus(
    @Param("id") id: string,
    @Body("status") status: ToggleUserStatusDto
  ) {
    return this.adminService.toggleUserStatus(id, status);
  }

  /**
   * Mettre à jour une company
   * PUT /admin/update-company/:id
   * Body: { ...données à mettre à jour }
   */
  @Put("update-company/:id")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({
    summary: "Update company (Admin Access)",
    description: "Update company information. Requires admin access level.",
  })
  @ApiResponse({
    status: 200,
    description: "Company updated successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Access denied: admin access required",
  })
  async updateCompany(@Param("id") id: string, @Body() data: any) {
    return this.adminService.updateCompany(id, data);
  }

  /**
   * Activer / Désactiver une company
   * PUT /admin/toggle-company/:id
   * Body: { isActive: true | false }
   */
  @Put("toggle-company/:id")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({
    summary: "Toggle company status (Admin Access)",
    description:
      "Activate or deactivate a company. Requires admin access level.",
  })
  @ApiResponse({
    status: 200,
    description: "Company status updated successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Access denied: admin access required",
  })
  async toggleCompanyStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean
  ) {
    return this.adminService.toggleCompanySTatus(id, isActive);
  }
}
