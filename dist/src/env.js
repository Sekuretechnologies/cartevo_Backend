"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const envalid_1 = require("envalid");
(0, dotenv_1.config)();
const env = (0, envalid_1.cleanEnv)(process.env, {
    PORT: (0, envalid_1.port)(),
    HOST: (0, envalid_1.str)(),
    NODE_ENV: (0, envalid_1.str)(),
    API_VERSION: (0, envalid_1.str)({ default: "v1" }),
    API_PREFIX: (0, envalid_1.str)({ default: "api" }),
    THROTTLE_TTL: (0, envalid_1.num)({ default: 60 }),
    THROTTLE_LIMIT: (0, envalid_1.num)({ default: 10 }),
    JWT_SECRET: (0, envalid_1.str)(),
    JWT_EXPIRES_IN: (0, envalid_1.str)(),
    EMAIL_HOST: (0, envalid_1.str)(),
    EMAIL_PORT: (0, envalid_1.str)(),
    EMAIL_USERNAME: (0, envalid_1.str)(),
    EMAIL_PASSWORD: (0, envalid_1.str)(),
    EMAIL_FROM: (0, envalid_1.str)(),
    POSTMARK_HOST: (0, envalid_1.str)(),
    POSTMARK_PORT: (0, envalid_1.str)(),
    POSTMARK_USERNAME: (0, envalid_1.str)(),
    POSTMARK_PASSWORD: (0, envalid_1.str)(),
    POSTMARK_API_TOKEN: (0, envalid_1.str)(),
    SUDO_BASE_URL: (0, envalid_1.str)(),
    SUDO_API_KEY: (0, envalid_1.str)(),
    SUDO_DOLLARS_FEES: (0, envalid_1.num)(),
    SUDO_FIRST_CARD_CREATION_FEES: (0, envalid_1.num)(),
    SUDO_CARD_CREATION_FEES: (0, envalid_1.num)(),
    SUDO_CARD_WITHDRAW_FEES: (0, envalid_1.num)(),
    DEBIT_ACCOUNT_ID_SANDBOX: (0, envalid_1.str)(),
    DEBIT_ACCOUNT_ID_PRODUCTION: (0, envalid_1.str)(),
    VAULT_URL: (0, envalid_1.str)(),
    VAULT_ID: (0, envalid_1.str)(),
    VGS_SCRIPT: (0, envalid_1.str)(),
});
exports.default = env;
//# sourceMappingURL=env.js.map