import { Controller, Post, Body, Headers, Req } from "@nestjs/common";
import { WebhookServiceSudo } from "./webhook.service.sudo";
import { WebhookServiceAfribapay } from "./webhook.service.afribapay";

@Controller("webhook")
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookServiceSudo,
    private readonly webhookServiceAfribapay: WebhookServiceAfribapay
  ) {}

  @Post("sudo")
  async handleWebhookSudo(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: any
  ) {
    // You can add signature verification and event type handling here
    return this.webhookService.processSudoWebhook(body, headers, req);
  }

  @Post("afribapay")
  async handleAfribapayWebhook(@Body() body: any) {
    return this.webhookServiceAfribapay.handleAfribapayWebhook(body);
  }
}
