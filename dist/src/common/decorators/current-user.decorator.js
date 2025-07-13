"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return {
        userId: request.user.sub,
        email: request.user.email,
        companyId: request.user.companyId,
        roles: request.user.roles || [],
    };
});
//# sourceMappingURL=current-user.decorator.js.map