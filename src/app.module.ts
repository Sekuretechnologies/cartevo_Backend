import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CompanyModule } from "./company/company.module";
import { CustomerModule } from "./customer/customer.module";
import { CardModule } from "./card/card.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      ttl: parseInt(process.env.THROTTLE_TTL || "60") * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || "10"),
    }),
    PrismaModule,
    AuthModule,
    CompanyModule,
    CustomerModule,
    CardModule,
    UserModule,
  ],
})
export class AppModule {}
