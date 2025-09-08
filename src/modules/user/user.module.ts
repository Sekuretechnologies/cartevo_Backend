import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { EmailService } from "../../services/email.service";
import { TokenBlacklistService } from "../../services/token-blacklist.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // secret: configService.get<string>('JWT_SECRET'),
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "1h",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserController],
  providers: [UserService, EmailService, TokenBlacklistService],
  exports: [UserService, TokenBlacklistService],
})
export class UserModule {}
