import { Body, Controller, Get, Post } from "@nestjs/common";
import { ContactDto } from "./dto/contact.dto";
import { ContactService } from "./contact.service";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post("send")
  async sendContactMessage(@Body() data: ContactDto) {
    return this.contactService.sendContactMessage(data);
  }

  @Get("get-all-messages")
  async getAllMessages() {
    return this.contactService.getAllMessages();
  }
}
