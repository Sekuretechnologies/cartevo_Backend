import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserData {
  userId?: string;
  email?: string;
  companyId?: string;
  roles?: string[];
  type?: "user" | "company";
  // Company token fields
  clientId?: string;
  companyName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (user.type === "user") {
      return {
        userId: user.userId,
        email: user.email,
        companyId: user.companyId,
        roles: user.roles || [],
        type: "user",
      };
    } else if (user.type === "company") {
      return {
        companyId: user.companyId,
        clientId: user.clientId,
        companyName: user.companyName,
        type: "company",
      };
    }

    // Fallback for legacy tokens
    return {
      userId: user.sub,
      email: user.email,
      companyId: user.companyId || user.company_id,
      roles: user.roles || [],
    };
  }
);
