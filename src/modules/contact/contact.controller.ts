import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ContactDto, SendAuth } from "./dto/contact.dto";
import { ContactService } from "./contact.service";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { use } from "passport";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post("send")
  async sendContactMessage(@Body() data: ContactDto) {
    return this.contactService.sendContactMessage(data);
  }

  @Post("send-auth")
  @UseGuards(JwtAuthGuard)
  async sendAuthMessage(@CurrentUser() user: any, @Body() body: SendAuth) {
    return this.contactService.sendAuthMessage({
      data: body,
      userId: user.userId,
      companyId: user.companyId,
    });
  }

  @Get("get-my-messages")
  @UseGuards(JwtAuthGuard)
  async getMyMessage(
    @CurrentUser() user: any,
    @Query("status") status?: "PENDING" | "RESOLVED",
    @Query("state") state?: "ACTIVE" | "INACTIVE"
  ) {
    // Préparer les filtres si fournis
    const filters = {
      ...(status && { status }),
      ...(state && { state }),
    };

    return this.contactService.getMyMessage({
      email: user.email,
      filters,
    });
  }

  @Get("get-all-messages")
  async getAllMessages() {
    return this.contactService.getAllMessages();
  }
}
