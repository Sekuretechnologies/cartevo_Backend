"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const common_1 = require("@nestjs/common");
const admin = require("firebase-admin");
const config_1 = require("@nestjs/config");
let FirebaseService = class FirebaseService {
    constructor(configService) {
        this.configService = configService;
        this.initializeFirebase();
    }
    initializeFirebase() {
        try {
            const serviceAccount = {
                type: this.configService.get("FIREBASE_TYPE") || "service_account",
                project_id: this.configService.get("FIREBASE_PROJECT_ID"),
                private_key_id: this.configService.get("FIREBASE_PRIVATE_KEY_ID"),
                private_key: this.configService
                    .get("FIREBASE_PRIVATE_KEY")
                    ?.replace(/\\n/g, "\n"),
                client_email: this.configService.get("FIREBASE_CLIENT_EMAIL"),
                client_id: this.configService.get("FIREBASE_CLIENT_ID"),
                auth_uri: this.configService.get("FIREBASE_AUTH_URI") ||
                    "https://accounts.google.com/o/oauth2/auth",
                token_uri: this.configService.get("FIREBASE_TOKEN_URI") ||
                    "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: this.configService.get("FIREBASE_AUTH_PROVIDER_X509_CERT_URL") ||
                    "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: this.configService.get("FIREBASE_CLIENT_X509_CERT_URL"),
                universe_domain: this.configService.get("FIREBASE_UNIVERSE_DOMAIN") ||
                    "googleapis.com",
            };
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    storageBucket: this.configService.get("FIREBASE_STORAGE_BUCKET"),
                });
            }
            this.storage = admin.storage();
            this.bucket = this.storage.bucket();
        }
        catch (error) {
            console.error("Firebase initialization error:", error);
            throw new common_1.BadRequestException("Firebase configuration error");
        }
    }
    async uploadFile(file, fileName, folder = "cartevo_documents", contentType = "application/octet-stream") {
        try {
            const timestamp = Date.now();
            const uniqueFileName = `${folder}/${timestamp}_${fileName}`;
            const fileUpload = this.bucket.file(uniqueFileName);
            const stream = fileUpload.createWriteStream({
                metadata: {
                    contentType,
                },
                public: true,
                validation: "md5",
            });
            return new Promise((resolve, reject) => {
                stream.on("error", (error) => {
                    console.error("Upload error:", error);
                    reject(new common_1.BadRequestException("File upload failed"));
                });
                stream.on("finish", async () => {
                    try {
                        await fileUpload.makePublic();
                        const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${uniqueFileName}`;
                        resolve(publicUrl);
                    }
                    catch (error) {
                        console.error("Error making file public:", error);
                        reject(new common_1.BadRequestException("Failed to make file public"));
                    }
                });
                stream.end(file);
            });
        }
        catch (error) {
            console.error("Firebase upload error:", error);
            throw new common_1.BadRequestException("File upload failed");
        }
    }
    async uploadBase64File(base64Data, fileName, folder = "documents") {
        try {
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new common_1.BadRequestException("Invalid base64 format");
            }
            const contentType = matches[1];
            const data = matches[2];
            const buffer = Buffer.from(data, "base64");
            return await this.uploadFile(buffer, fileName, folder, contentType);
        }
        catch (error) {
            console.error("Base64 upload error:", error);
            throw new common_1.BadRequestException("Base64 file upload failed");
        }
    }
    async deleteFile(fileUrl) {
        try {
            const urlParts = fileUrl.split("/");
            const fileName = urlParts[urlParts.length - 1];
            const file = this.bucket.file(fileName);
            await file.delete();
            return true;
        }
        catch (error) {
            console.error("File deletion error:", error);
            return false;
        }
    }
    async getFileMetadata(fileUrl) {
        try {
            const urlParts = fileUrl.split("/");
            const fileName = urlParts[urlParts.length - 1];
            const file = this.bucket.file(fileName);
            const [metadata] = await file.getMetadata();
            return metadata;
        }
        catch (error) {
            console.error("Get metadata error:", error);
            throw new common_1.BadRequestException("Failed to get file metadata");
        }
    }
};
exports.FirebaseService = FirebaseService;
exports.FirebaseService = FirebaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map