import { EmailService } from "@/services/email.service";
import { Injectable } from "@nestjs/common";
import { ContactDto } from "./dto/contact.dto";
import contactModel from "@/models/prisma/contactModel";

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async sendContactMessage(data: ContactDto) {
    await this.emailService.sendContactEmail(data);
    return { message: "Message sent successfully" };
  }

  // admin endpoint
  async getAllMessages() {
    return await contactModel.getAllMessages({ state: "ACTIVE" });
  }

  // repondre a un message en tant qu'admin mettre le message dans response de helpRequest de mon schema prisma. Par la meme occasion, le status de helpRequest passe a RESOLVED
  async replyToMessage(id: string, response: string) {
    return await contactModel.update(id, {
      response,
      status: "RESOLVED",
    });
  }
}