import { Module } from '@nestjs/common';
import { CompaniesAdminService } from './companies-admin.service';
import { CompaniesAdminController } from './companies-admin.controller';

@Module({
  providers: [CompaniesAdminService],
  controllers: [CompaniesAdminController]
})
export class CompaniesAdminModule {}
