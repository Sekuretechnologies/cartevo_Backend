"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("../../env");
const getCardFees = () => {
    return {
        firstCard: Number(env_1.default.SUDO_FIRST_CARD_CREATION_FEES || 0) * 1,
        additionalCard: Number(env_1.default.SUDO_CARD_CREATION_FEES || 0) * 1,
        fundingFees: Number(env_1.default.SUDO_DOLLARS_FEES || 0) * 1,
        withdrawFees: Number(env_1.default.SUDO_CARD_WITHDRAW_FEES || 0) * 1,
    };
};
exports.default = getCardFees;
//# sourceMappingURL=cardFees.js.map