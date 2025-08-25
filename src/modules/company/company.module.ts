import { Module } from "@nestjs/common";
import { CompanyController } from "./company.controller";
import { CompanyService } from "./company.service";
import { EmailService } from "../../services/email.service";
import { FirebaseService } from "../../services/firebase.service";

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, EmailService, FirebaseService],
  exports: [CompanyService, FirebaseService],
})
export class CompanyModule {}
