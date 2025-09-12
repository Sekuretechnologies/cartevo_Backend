import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CompanyModule } from "./modules/company/company.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { CardModule } from "./modules/card/card.module";
import { UserModule } from "./modules/user/user.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { MapleradModule } from "./modules/maplerad/maplerad.module";

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
    WalletModule,
    MapleradModule,
  ],
})
export class AppModule {}
