import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { EmailService } from "../../services/email.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, EmailService],
})
export class AdminModule {}
