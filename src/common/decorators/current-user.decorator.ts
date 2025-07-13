import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  userId: string;
  email: string;
  companyId: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return {
      userId: request.user.sub,
      email: request.user.email,
      companyId: request.user.companyId,
      roles: request.user.roles || [],
    };
  },
);
