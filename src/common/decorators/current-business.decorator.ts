import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentBusinessData {
  businessId: string;
  clientId: string;
  businessName: string;
}

export const CurrentBusiness = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentBusinessData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
