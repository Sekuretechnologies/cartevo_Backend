import { Controller, Post, Body, Headers, Req } from "@nestjs/common";
import { WebhookServiceSudo } from "./webhook.service.sudo";

@Controller("webhook")
export class WebhookController {
  constructor(private readonly webhookService: WebhookServiceSudo) {}

  @Post("sudo")
  async handleWebhookSudo(
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: any
  ) {
    // You can add signature verification and event type handling here
    return this.webhookService.processSudoWebhook(body, headers, req);
  }
}
