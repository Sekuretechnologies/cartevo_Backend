import contactModel from "@/models/prisma/contactModel";
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
      originalMessage.message // The user's original message
    );

    return updateResult;
  }

  async getMessageById(id: string) {
    return await contactModel.getOne({ id });
  }
}
