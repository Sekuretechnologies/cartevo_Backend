import { Module } from "@nestjs/common";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";
import { FirebaseService } from "@/services/firebase.service";
import { EmailService } from "@/services/email.service";
import { CardSyncService } from "@/modules/maplerad/services/card.sync.service";
import { MapleradModule } from "@/modules/maplerad/maplerad.module";

@Module({
  imports: [MapleradModule],
  controllers: [CustomerController],
  providers: [CustomerService, EmailService, FirebaseService, CardSyncService],
  exports: [CustomerService],
})
export class CustomerModule {}
