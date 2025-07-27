"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentBusiness = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentBusiness = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
//# sourceMappingURL=current-business.decorator.js.map