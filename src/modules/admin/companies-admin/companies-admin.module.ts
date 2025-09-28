import { Module } from "@nestjs/common";
import { CompaniesAdminService } from "./companies-admin.service";
import { CompaniesAdminController } from "./companies-admin.controller";
import { OmniGuard } from "@/modules/auth/guards/omni.guard";
import { TokenBlacklistService } from "@/services/token-blacklist.service";

@Module({
  providers: [CompaniesAdminService, OmniGuard, TokenBlacklistService],
  controllers: [CompaniesAdminController],
})
export class CompaniesAdminModule {}
