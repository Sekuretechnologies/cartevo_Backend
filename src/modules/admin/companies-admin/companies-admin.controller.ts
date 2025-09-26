import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CompaniesAdminService } from "./companies-admin.service";
import { OmniGuard } from "@/modules/auth/guards/omni.guard";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";

@ApiTags("Companies Admin")
@ApiBearerAuth()
@Controller("companies-admin")
export class CompaniesAdminController {
  constructor(private companiesAdminService: CompaniesAdminService) {}

  @Get("users-by-company/:id")
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Get all users of a company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({
    status: 200,
    description: "Users list retrieved successfully.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async getUsersByCompany(@Param("id") id: string) {
    return this.companiesAdminService.getUserByCompany(id);
  }

  @Get("customers-by-company/:id")
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Get all customers of a company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({
    status: 200,
    description: "Customers list retrieved successfully.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async getCustomersByCompany(@Param("id") id: string) {
    return this.companiesAdminService.getCustomersByCompany(id);
  }

  @Get("transactions-by-company/:id")
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Get all transactions of a company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({
    status: 200,
    description: "Transactions list retrieved successfully.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async getTransactionsByCompany(@Param("id") id: string) {
    return this.companiesAdminService.getTransactionsByCompany(id);
  }

  @Get("cards-by-company/:id")
  @UseGuards(OmniGuard)
  @ApiOperation({ summary: "Get all cards of a company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({
    status: 200,
    description: "Cards list retrieved successfully.",
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  async getCardsByCompany(@Param("id") id: string) {
    return this.companiesAdminService.getCardsByCompany(id);
  }
}
