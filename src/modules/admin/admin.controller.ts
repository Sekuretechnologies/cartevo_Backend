import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiResponse,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { KybDto, KycDto } from "./dto/admin.dto";

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
}
