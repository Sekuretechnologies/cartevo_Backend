export declare class WebhookService {
    processSudoWebhook(body: any, headers: any, req: any): Promise<{
        status: string;
        received: boolean;
    }>;
}
