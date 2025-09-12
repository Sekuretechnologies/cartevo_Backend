import { Module } from "@nestjs/common";
import { MapleradController } from "./maplerad.controller";
import { MapleradService } from "./maplerad.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CardIssuanceService } from "../../services/card/maplerad/services/cardIssuanceService";

@Module({
  imports: [PrismaModule],
  controllers: [MapleradController],
  providers: [MapleradService, CardIssuanceService],
  exports: [MapleradService, CardIssuanceService],
})
export class MapleradModule {}
