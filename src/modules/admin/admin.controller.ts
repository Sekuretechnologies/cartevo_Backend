import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiResponse,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { KybDto, KycDto, ToggleUserStatusDto } from "./dto/admin.dto";
import { ResponseInterceptor } from "../common/interceptors/response.interceptop";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("get-all-companies")
  @ApiOperation({
    summary: "Retrieve all companies",
    description:
      "Fetch a list of companies filtered by their status. Possible statuses: pending, approved, rejected, none.",
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
  async getAllCompanies(
    @Query("status") status?: "pending" | "approved" | "none"
  ) {
    return this.adminService.getAllCompanies(status);
  }

  @Put("handle-kyc")
  @ApiOperation({
    summary: "Handle KYC verification",
    description:
      "Approve or reject the KYC (Know Your Customer) process for a company.",
  })
  @ApiBody({ type: KycDto, description: "KYC request payload" })
  @ApiResponse({ status: 200, description: "KYC handled successfully." })
  async handleKyc(@Body() dto: KycDto) {
    return this.adminService.handleKyc(dto);
  }

  @Put("handle-kyb")
  @ApiOperation({
    summary: "Handle KYB verification",
    description:
      "Approve or reject the KYB (Know Your Business) process for a company.",
  })
  @ApiBody({ type: KybDto, description: "KYB request payload" })
  @ApiResponse({ status: 200, description: "KYB handled successfully." })
  async handleKyb(@Body() dto: KybDto) {
    return this.adminService.handleKyb(dto);
  }

  @UseInterceptors(ResponseInterceptor)
  @Get("get-all-users")
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
  async updateCompany(@Param("id") id: string, @Body() data: any) {
    return this.adminService.updateCompany(id, data);
  }

  /**
   * Activer / Désactiver une company
   * PUT /admin/toggle-company/:id
   * Body: { isActive: true | false }
   */
  @Put("toggle-company/:id")
  async toggleCompanyStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean
  ) {
    return this.adminService.toggleCompanySTatus(id, isActive);
  }
}
