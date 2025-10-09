import { EmailService } from "@/services/email.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContactDto } from "./dto/contact.dto";
import ContactModel from "@/models/prisma/contactModel";
import { response } from "express";
import { FilterObject } from "@/types";
import { UserModel } from "@/models";
import { email } from "envalid";

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async sendContactMessage(data: ContactDto) {
    console.log("donnees", data);
    const result = await ContactModel.createMessage({
      name: data.name,
      companyName: data.entrepriseName,
      phone: data.whatsapp,
      countryCode: data.country_code,
      activity: data.activity,
      service: data.service,
      subject: data.subject,
      message: data.message,
      email: data.email,
    });

    if (!result.error) {
      await this.emailService.sendContactEmail(data);
    }
    const message = result.output;

    return message;
  }

  async getMyMessage(data: { filters?: FilterObject; email: string }) {
    const user = await UserModel.getOne({ email: data.email });

    if (user.error) {
      throw new NotFoundException("user not found");
    }

    const result = await ContactModel.getMyMessage(data.email, data.filters);

    const messages = result.output;

    return { message: "messages retrieved successfully", messages };
  }

  // admin endpoint
  getAllMessages() {
    throw new Error("Method not implemented.");
  }

  // repondre a un message
}
