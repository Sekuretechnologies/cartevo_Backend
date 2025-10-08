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
  userMode?: "prod" | "preprod";
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    const userMode: "prod" | "preprod" = user.mode || "prod";

    if (user.type === "user") {
      console.log({
        userId: user.userId || user.sub,
        email: user.email,
        companyId: user.companyId,
        companies: user.companies || [],
        type: "user",
        userMode,
      });

      return {
        userId: user.userId || user.sub,
        email: user.email,
        companyId: user.companyId,
        companies: user.companies || [],
        type: "user",
        userMode,
      };
    } else if (user.type === "company") {
      console.log({
        companyId: user.companyId,
        clientId: user.clientId,
        companyName: user.companyName,
        type: "company",
        userMode,
      });

      return {
        companyId: user.companyId,
        clientId: user.clientId,
        companyName: user.companyName,
        type: "company",
        userMode,
      };
    }

    console.log({
      userId: user.sub,
      email: user.email,
      companyId: user.companyId,
      companies: user.companies || [],
    });
    // Fallback for legacy tokens
    return {
      userId: user.sub,
      email: user.email,
      companyId: user.companyId,
      companies: user.companies || [],
    };
  }
);
