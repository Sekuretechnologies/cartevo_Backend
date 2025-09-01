import { Module } from "@nestjs/common";
import { WebhookController } from "./webhook.controller";
import { WebhookServiceSudo } from "./webhook.service.sudo";
import { WebhookServiceAfribapay } from "./webhook.service.afribapay";

@Module({
  controllers: [WebhookController],
  providers: [WebhookServiceSudo, WebhookServiceAfribapay],
})
export class WebhookModule {}
