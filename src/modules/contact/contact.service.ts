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
  getAllMessages() {
    throw new Error("Method not implemented.");
  }

  // repondre a un message
}
