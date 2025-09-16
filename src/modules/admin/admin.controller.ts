import { Body, Controller, Get, Put } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { KybDto, KycDto } from "./dto/admin.dto";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("get-all-companies")
  async getAllCompanies() {
    return this.adminService.getAllCompanies();
  }

  @Put("handle-kyc")
  async handleKyc(@Body() dto: KycDto) {
    return this.adminService.handleKyc(dto);
  }

  @Put("handle-kyb")
  async handleKyb(@Body() dto: KybDto) {
    return this.adminService.handleKyb(dto);
  }
}
