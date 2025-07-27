import { Injectable } from "@nestjs/common";

@Injectable()
export class WebhookService {
  async processSudoWebhook(body: any, headers: any, req: any) {
    // Implement your webhook event processing logic here
    // For now, just log and return a success response
    console.log("Received webhook:", { body, headers });
    return { status: "success", received: true };
  }
}
