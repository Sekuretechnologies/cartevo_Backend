import { EmailService } from "@/services/email.service";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContactDto, SendAuth } from "./dto/contact.dto";
import ContactModel from "@/models/prisma/contactModel";
import { response } from "express";
import { FilterObject } from "@/types";
import { CompanyModel, UserModel } from "@/models";
import { email } from "envalid";
import getPhonePrefixByCountry from "@/utils/getPhonePrefix/getPhonePrefix";

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

  async sendAuthMessage({
    data,
    userId,
    companyId,
  }: {
    data: SendAuth;
    userId: string;
    companyId: string;
  }) {
    const userResult = await UserModel.getOne({ id: userId });
    const companyResult = await CompanyModel.getOne({ id: companyId });

    if (userResult.error) {
      throw new NotFoundException("User not found");
    }

    if (companyResult.error) {
      throw new NotFoundException("Company not found");
    }

    const company = companyResult.output;

    const user = userResult.output;

    const phoneCode = getPhonePrefixByCountry(user.nationality);

    const result = await ContactModel.createMessage({
      name: user.first_name,
      companyName: company.name,
      phone: user.phone_number,
      countryCode: phoneCode,
      activity: data.activity,
      service: data.service,
      subject: data.subject,
      message: data.message,
      email: user.email,
    });

    return {
      success: true,
      message: "message send successfully",
      result: result,
    };
  }

  async getMyMessage(data: { filters?: FilterObject; email: string }) {
    const user = await UserModel.getOne({ email: data.email });

    if (user.error) {
      throw new NotFoundException("user not found");
    }

    const result = await ContactModel.getMyMessage(data.email, data.filters);

    const messages = result.output;
    console.log("message retournee", messages);

    return { message: "messages retrieved successfully", messages };
  }

  // admin endpoint
  getAllMessages() {
    throw new Error("Method not implemented.");
  }

  // repondre a un message
}
