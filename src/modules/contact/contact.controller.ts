import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ContactDto, SendAuth } from "./dto/contact.dto";
import { helpRequestState, helpRequestStatus } from "@prisma/client";
import { OmniGuard } from "../auth/guards/omni.guard";
import { ContactService } from "./contact.service";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

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
    console.log("body", body);
    console.log("CurrentUser", user);
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
  @UseGuards(OmniGuard)
  async getAllMessages(
    @Query()
    query: {
      page?: string;
      limit?: string;
      status?: helpRequestStatus;
      state?: helpRequestState;
      email?: string;
    }
  ) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const { status, state, email } = query;

    const filters: any = {};

    // Validate and add status filter
    if (status && Object.values(helpRequestStatus).includes(status)) {
      filters.status = status;
    }

    // Validate and add state filter
    if (state && Object.values(helpRequestState).includes(state)) {
      filters.state = state;
    }

    if (email) {
      filters.email = { contains: email, mode: "insensitive" };
    }

    return this.contactService.getAllMessages({ page, limit, ...filters });
  }

  @Get(":id")
  async getMessageById(@Param("id") id: string) {
    return this.contactService.getMessageById(id);
  }

  @Post(":id/reply")
  @UseGuards(OmniGuard)
  reply(@Param("id") id: string, @Body() body: { response: string }) {
    return this.contactService.replyToMessage(id, body.response);
  }
}
