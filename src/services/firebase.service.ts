import { Injectable, BadRequestException } from "@nestjs/common";
import * as admin from "firebase-admin";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class FirebaseService {
  private storage: admin.storage.Storage;
  private bucket: any;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = {
        type: this.configService.get("FIREBASE_TYPE") || "service_account",
        project_id: this.configService.get("FIREBASE_PROJECT_ID"),
        private_key_id: this.configService.get("FIREBASE_PRIVATE_KEY_ID"),
        private_key: this.configService
          .get("FIREBASE_PRIVATE_KEY")
          ?.replace(/\\n/g, "\n"),
        client_email: this.configService.get("FIREBASE_CLIENT_EMAIL"),
        client_id: this.configService.get("FIREBASE_CLIENT_ID"),
        auth_uri:
          this.configService.get("FIREBASE_AUTH_URI") ||
          "https://accounts.google.com/o/oauth2/auth",
        token_uri:
          this.configService.get("FIREBASE_TOKEN_URI") ||
          "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          this.configService.get("FIREBASE_AUTH_PROVIDER_X509_CERT_URL") ||
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: this.configService.get(
          "FIREBASE_CLIENT_X509_CERT_URL"
        ),
        universe_domain:
          this.configService.get("FIREBASE_UNIVERSE_DOMAIN") ||
          "googleapis.com",
      };

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount
          ),
          storageBucket: this.configService.get("FIREBASE_STORAGE_BUCKET"),
        });
      }

      this.storage = admin.storage();
      this.bucket = this.storage.bucket();
    } catch (error) {
      console.error("Firebase initialization error:", error);
      throw new BadRequestException("Firebase configuration error");
    }
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    folder: string = "cartevo_documents",
    contentType: string = "application/octet-stream"
  ): Promise<string> {
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
          reject(new BadRequestException("File upload failed"));
        });

        stream.on("finish", async () => {
          try {
            // Make the file publicly accessible
            await fileUpload.makePublic();

            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${uniqueFileName}`;
            resolve(publicUrl);
          } catch (error) {
            console.error("Error making file public:", error);
            reject(new BadRequestException("Failed to make file public"));
          }
        });

        stream.end(file);
      });
    } catch (error) {
      console.error("Firebase upload error:", error);
      throw new BadRequestException("File upload failed");
    }
  }

  async uploadBase64File(
    base64Data: string,
    fileName: string,
    folder: string = "documents"
  ): Promise<string> {
    try {
      // Extract content type and data from base64 string
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new BadRequestException("Invalid base64 format");
      }

      const contentType = matches[1];
      const data = matches[2];
      const buffer = Buffer.from(data, "base64");

      return await this.uploadFile(buffer, fileName, folder, contentType);
    } catch (error) {
      console.error("Base64 upload error:", error);
      throw new BadRequestException("Base64 file upload failed");
    }
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      const file = this.bucket.file(fileName);
      await file.delete();

      return true;
    } catch (error) {
      console.error("File deletion error:", error);
      return false;
    }
  }

  async getFileMetadata(fileUrl: string): Promise<any> {
    try {
      const urlParts = fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      const file = this.bucket.file(fileName);
      const [metadata] = await file.getMetadata();

      return metadata;
    } catch (error) {
      console.error("Get metadata error:", error);
      throw new BadRequestException("Failed to get file metadata");
    }
  }
}
