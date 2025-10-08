import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { OmniGuard } from "../auth/guards/omni.guard";
import { ResponseInterceptor } from "../common/interceptors/response.interceptop";
import { WalletService } from "../wallet/wallet.service";
import { AdminService } from "./admin.service";
import { KybDto, KycDto, ToggleUserStatusDto } from "./dto/admin.dto";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly walletService: WalletService
  ) {}

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
    @Query("status") status?: "pending" | "approved" | "none",
    @Query("country") country?: string,
    @Query("business_type") business_type?: string,
    @Query("is_active") is_active?: boolean
  ) {
    const filters: any = {};
    if (country) filters.country = country;
    if (business_type) filters.business_type = business_type;
    if (typeof is_active === "boolean") filters.is_active = is_active;

    return this.adminService.getAllCompanies(filters, status);
  }

  /**
   * Admin-only: List all wallets across companies with optional scoping via companyId
   * GET /admin/wallets
   */
  @Get("wallets")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Retrieve wallets (Admin Access)" })
  @ApiQuery({ name: "companyId", required: false })
  @ApiQuery({ name: "currency", required: false })
  @ApiQuery({ name: "country", required: false })
  @ApiQuery({ name: "country_iso_code", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "sort_by", required: false })
  @ApiQuery({ name: "order", required: false, enum: ["asc", "desc"] })
  async getAllWalletsAdmin(
    @Query("companyId") companyId?: string,
    @Query("currency") currency?: string,
    @Query("country") country?: string,
    @Query("country_iso_code") country_iso_code?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sort_by") sort_by?: string,
    @Query("order") order?: "asc" | "desc"
  ) {
    const adminUser = { companyId: companyId } as any;
    return this.walletService.getWalletsWithFilters(adminUser, {
      company_id: companyId,
      currency,
      country,
      country_iso_code,
      page,
      limit,
      sort_by,
      order,
    });
  }

  @Patch("wallets/:id")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Update wallet (Admin Access)" })
  async updateWalletAdmin(
    @Param("id") id: string,
    @Body() data: { is_active?: boolean; country_phone_code?: string }
  ) {
    // find wallet to resolve company_id
    const walletRes: any = await this.walletService.getWalletById(
      undefined as any,
      id
    );
    console.log("This is my wallet Res", walletRes);

    const companyId =
      walletRes?.data?.company_id ??
      walletRes?.output?.company_id ??
      walletRes?.company_id;
    return this.walletService.updateWallet(companyId, id, data as any);
  }

  @Delete("wallets/:id")
  @ApiBearerAuth()
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Delete wallet (Admin Access)" })
  async deleteWalletAdmin(@Param("id") id: string) {
    const walletRes: any = await this.walletService.getWalletById(
      undefined as any,
      id
    );
    const companyId =
      walletRes?.data?.company_id ??
      walletRes?.output?.company_id ??
      walletRes?.company_id;
    return this.walletService.deleteWallet(companyId, id);
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

  @Get("all")
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Get all cards with optional filters and ordering" })
  @ApiResponse({
    status: 200,
    description: "Cards retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getAllCards(
    @Query("filters") filtersJson?: string,
    @Query("order_by") order_by?: string,
    @Query("order") order?: "asc" | "desc"
  ) {
    const filters: any = filtersJson ? JSON.parse(filtersJson) : {};

    const orderObj: any = {};
    if (order_by) orderObj[order_by] = order || "asc";

    return await this.adminService.getAllCards(filters, orderObj);
  }
}
