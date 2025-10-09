import contactModel from "@/models/prisma/contactModel";
import { EmailService } from "@/services/email.service";
import { Injectable } from "@nestjs/common";
import { ContactDto } from "./dto/contact.dto";

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async sendContactMessage(data: ContactDto) {
    await this.emailService.sendContactEmail(data);
    return { message: "Message sent successfully" };
  }

  // admin endpoint
  async getAllMessages(options: {
    page?: number;
    limit?: number;
    [key: string]: any;
  }) {
    const { page, limit, ...filters } = options;
    return await contactModel.getAllMessages({ page, limit, filters });
  }

  // repondre a un message en tant qu'admin mettre le message dans response de helpRequest de mon schema prisma. Par la meme occasion, le status de helpRequest passe a RESOLVED
  async replyToMessage(id: string, response: string) {
    // 1. Get the original message to retrieve user details
    const messageResult = await contactModel.getOne({ id });
    if (messageResult.error) {
      throw new Error(`Help request with ID ${id} not found.`);
    }
    const originalMessage = messageResult.output;

    // 2. Update the message in the database
    const updateResult = await contactModel.update(id, {
      response,
      status: "RESOLVED",
    });

    if (updateResult.error) {
      throw new Error(`Failed to update help request with ID ${id}.`);
    }

    // 3. Send the reply email via the EmailService
    await this.emailService.sendHelpReplyEmail(
      originalMessage.email,
      originalMessage.name,
      originalMessage.subject,
      response, // The admin's response
      originalMessage.message, // The user's original message
    );

    return updateResult;
  }

  async getMessageById(id: string) {
    return await contactModel.getOne({ id });
  }
}
