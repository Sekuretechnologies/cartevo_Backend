import { Module } from "@nestjs/common";
import { WebhookController } from "./webhook.controller";
import { WebhookServiceSudo } from "./webhook.service.sudo";

@Module({
  controllers: [WebhookController],
  providers: [WebhookServiceSudo],
})
export class WebhookModule {}
