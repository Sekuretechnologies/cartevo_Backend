import dotenv from "dotenv";
import { cleanEnv, num, port, str } from "envalid";

dotenv.config();

const env = cleanEnv(process.env, {
  PORT: port(),
  DATABASE_URL: str(),
  DATABASE_PASSWORD: str(),
  HOST: str(),
  NODE_ENV: str(),
  API_URI: str(),
  API_VERSION: str({ default: "v1" }),
  API_PREFIX: str({ default: "api" }),
  THROTTLE_TTL: num({ default: 60 }),
  THROTTLE_LIMIT: num({ default: 10 }),
  PRIVATE_KEY: str(),
  /** ------------------------*/
  POSTGRES_DB_URL: str(),
  POSTGRES_DB_NAME: str(),
  POSTGRES_DB_USERNAME: str(),
  POSTGRES_DB_PASSWORD: str(),
  /** ------------------------*/
  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str(),
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
  /** ------------------------*/
  REDIS_URL: str(),
  /** ------------------------*/
  CM_TOP_UP_FEES: str(),
  CM_WITHDRAW_FEES: str(),
  GA_TOP_UP_FEES: str(),
  GA_WITHDRAW_FEES: str(),
  BJ_TOP_UP_FEES: str(),
  BJ_WITHDRAW_FEES: str(),
  CD_TOP_UP_FEES: str(),
  CD_WITHDRAW_FEES: str(),
  /** ------------------------*/
  NAIRA_RATE: str(),
  NAIRA_FEES: str(),
  MIDEN_BASEURL: str(),
  MIDEN_TOKENURL: str(),
  MIDEN_CLIENT_ID: str(),
  MIDEN_SECRET_KEY: str(),
  MIDEN_UNIQUE_KEY: str(),
  MIDEN_WEBHOOK_HASH_SECRET: str(),

  /** ------------------------*/
  /** Cameroon Specific Fees */
  CM_MIDEN_DOLLARS_FEES: num(),
  CM_MIDEN_FIRST_CARD_CREATION_FEES: num(),
  CM_MIDEN_CARD_CREATION_FEES: num(),
  CM_MIDEN_CARD_WITHDRAW_FEES: num(),

  /** Gabon Specific Fees */
  GA_MIDEN_DOLLARS_FEES: num(),
  GA_MIDEN_FIRST_CARD_CREATION_FEES: num(),
  GA_MIDEN_CARD_CREATION_FEES: num(),
  GA_MIDEN_CARD_WITHDRAW_FEES: num(),

  /** Benin Specific Fees */
  BJ_MIDEN_DOLLARS_FEES: num(),
  BJ_MIDEN_FIRST_CARD_CREATION_FEES: num(),
  BJ_MIDEN_CARD_CREATION_FEES: num(),
  BJ_MIDEN_CARD_WITHDRAW_FEES: num(),

  /** Congo RDC Specific Fees */
  CD_MIDEN_DOLLARS_FEES: num(),
  CD_MIDEN_FIRST_CARD_CREATION_FEES: num(),
  CD_MIDEN_CARD_CREATION_FEES: num(),
  CD_MIDEN_CARD_WITHDRAW_FEES: num(),

  /** ------------------------*/
  TOP_UP_DOLLARS_RATE_FIRST: num(),
  TOP_UP_DOLLARS_RATE_SECOND: num(),
  TOP_UP_DOLLARS_RATE_THIRD: num(),
  TOP_UP_DOLLARS_RATE_FINAL: num(),
  /** ------------------------*/
  PAWAPAY_BASEURL: str(),
  PAWAPAY_TOKEN: str(),
  /** ------------------------*/
  PAYMENT_LINK_URL: str(),
  /** ------------------------*/
  CHN_PAYMENT_FEES: num(),
  /** ------------------------*/
  SMOBILPAY_BASEURL: str(),
  /** ------------------------*/
  FREEMOPAY_BASEURL: str(),
  FREEMOPAY_APP_KEY: str(),
  FREEMOPAY_SECRET_KEY: str(),
  /** ------------------------*/
  LATEST_VERSION_ANDROID: str(),
  LATEST_VERSION_IOS: str(),
  /** ------------------------*/
  CDF_TO_XAF_RATE: num(), // 1CDF = 0.20XAF ==> 1XAF = 5CDF
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
  SUDO_DOLLARS_FEES: num(),
  SUDO_FIRST_CARD_CREATION_FEES: num(),
  SUDO_CARD_CREATION_FEES: num(),
  SUDO_CARD_WITHDRAW_FEES: num(),
  /** ------------------------*/
  DEBIT_ACCOUNT_ID_SANDBOX: str(),
  DEBIT_ACCOUNT_ID_PRODUCTION: str(),
  /** ------------------------*/
  VAULT_URL: str(),
  VAULT_ID: str(),
  VGS_SCRIPT: str(),
});

export default env;
