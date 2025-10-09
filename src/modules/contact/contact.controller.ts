import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { OmniGuard } from "../auth/guards/omni.guard";
import { ContactService } from "./contact.service";
import { ContactDto } from "./dto/contact.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post("send")
  async sendContactMessage(@Body() data: ContactDto) {
    return this.contactService.sendContactMessage(data);
  }

  @Get("get-all-messages")
  @UseGuards(OmniGuard)
  async getAllMessages() {
    return this.contactService.getAllMessages();
  }

  @Post(":id/reply")
  @UseGuards(OmniGuard)
  reply(@Param("id") id: string, @Body() body: { response: string }) {
    return this.contactService.replyToMessage(id, body.response);
  }
}
