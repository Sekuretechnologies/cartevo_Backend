import { Module } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { ContactController } from "./contact.controller";
import { EmailService } from "@/services/email.service";
import { AuthModule } from "../auth/auth.module";
import { TokenBlacklistService } from "@/services/token-blacklist.service";

@Module({
  imports: [AuthModule],
  providers: [ContactService, EmailService, TokenBlacklistService],
  controllers: [ContactController],
})
export class ContactModule {}
