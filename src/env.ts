import { config } from "dotenv";
import { cleanEnv, num, port, str } from "envalid";

config();

const env = cleanEnv(process.env, {
  PORT: port(),
  // DATABASE_URL: str(),
  // DATABASE_PASSWORD: str(),
  HOST: str(),
  NODE_ENV: str(),
  // API_URI: str(),
  API_VERSION: str({ default: "v1" }),
  API_PREFIX: str({ default: "api" }),
  THROTTLE_TTL: num({ default: 60 }),
  THROTTLE_LIMIT: num({ default: 10 }),
  // PRIVATE_KEY: str(),
  /** ------------------------*/
  // POSTGRES_DB_URL: str(),
  // POSTGRES_DB_NAME: str(),
  // POSTGRES_DB_USERNAME: str(),
  // POSTGRES_DB_PASSWORD: str(),
  /** ------------------------*/
  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str(),
  CROSS_ENV_JWT_SECRET: str({ default: "" }),
  /** ------------------------*/
  EMAIL_HOST: str(),
  EMAIL_PORT: str(),
  EMAIL_USERNAME: str(),
  EMAIL_PASSWORD: str(),
  EMAIL_FROM: str(),
  /** ------------------------*/
  POSTMARK_HOST: str(),
  POSTMARK_PORT: str(),
  POSTMARK_USERNAME: str(),
  POSTMARK_PASSWORD: str(),
  POSTMARK_API_TOKEN: str(),
  /** ------------------------*/
  // REDIS_URL: str(),
  /** ------------------------*/
  // LATEST_VERSION_ANDROID: str(),
  // LATEST_VERSION_IOS: str(),
  /** ------------------------*/
  // CDF_TO_XAF_RATE: num(), // 1CDF = 0.20XAF ==> 1XAF = 5CDF
  /** ------------------------*/
  AFRIBAPAY_API_COLLECT_URL: str(),
  AFRIBAPAY_API_PAYOUT_URL: str(),
  AFRIBAPAY_API_AGENT_ID: str(),
  AFRIBAPAY_API_KEY: str(),
  AFRIBAPAY_API_USER: str(),
  AFRIBAPAY_API_MERCHANT: str(),
  /** ------------------------*/
  /** Sudo Card Provider */
  SUDO_BASE_URL: str(),
  SUDO_API_KEY: str(),
  /** Cameroon Specific Fees */
  // SUDO_DOLLARS_FEES: num(),
  // SUDO_FIRST_CARD_CREATION_FEES: num(),
  // SUDO_CARD_CREATION_FEES: num(),
  // SUDO_CARD_WITHDRAW_FEES: num(),
  /** ------------------------*/
  DEBIT_ACCOUNT_ID_SANDBOX: str(),
  DEBIT_ACCOUNT_ID_PRODUCTION: str(),
  /** ------------------------*/
  /** Maplerad Card Provider */
  MAPLERAD_BASE_URL: str(),
  MAPLERAD_SECRET_KEY: str(),
  // MAPLERAD_ENROLL_CREATE_CARD_URL: str(),
  /** Maplerad Fees (USD) */
  // MAPLERAD_CARD_CREATION_FEE: num(),
  // MAPLERAD_CARD_FUNDING_FEE: num(),
  // MAPLERAD_CARD_WITHDRAWAL_FEE: num(),
  /** ------------------------*/
  VAULT_URL: str(),
  VAULT_ID: str(),
  VGS_SCRIPT: str(),
});

export default env;
