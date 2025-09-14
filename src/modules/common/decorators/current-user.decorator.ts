import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserData {
  userId?: string;
  email?: string;
  companies?: Array<{
    companyId: string;
    companyName: string;
    role: string;
  }>;
  type?: "user" | "company";
  // Company token fields
  clientId?: string;
  companyName?: string;
  companyId?: string; // For backward compatibility with company tokens
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (user.type === "user") {
      return {
        userId: user.userId,
        email: user.email,
        companies: user.companies || [],
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
      companies: user.companies || [],
    };
  }
);
