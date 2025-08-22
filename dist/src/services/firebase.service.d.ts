import { ConfigService } from "@nestjs/config";
export declare class FirebaseService {
    private configService;
    private storage;
    private bucket;
    constructor(configService: ConfigService);
    private initializeFirebase;
    uploadFile(file: Buffer, fileName: string, folder?: string, contentType?: string): Promise<string>;
    uploadBase64File(base64Data: string, fileName: string, folder?: string): Promise<string>;
    deleteFile(fileUrl: string): Promise<boolean>;
    getFileMetadata(fileUrl: string): Promise<any>;
}
