import { WebhookServiceSudo } from "./webhook.service.sudo";
export declare class WebhookController {
    private readonly webhookService;
    constructor(webhookService: WebhookServiceSudo);
    handleWebhookSudo(body: any, headers: any, req: any): Promise<import("../../utils/shared/fnOutputHandler").OutputProps>;
}
