// AlphaSpace Providers
// Configuration providers for AlphaSpace integration

import { AlphaSpaceConfig } from "../../config/alphaspace.config";

export const AlphaSpaceConfigProvider = {
  provide: "ALPHASPACE_CONFIG",
  useFactory: (): AlphaSpaceConfig => ({
    clientId: process.env.ALPHASPACE_CLIENT_ID || "your_alphaspace_client_id",
    clientSecret:
      process.env.ALPHASPACE_CLIENT_SECRET || "your_alphaspace_client_secret",
    username: process.env.ALPHASPACE_USERNAME || "your_alphaspace_username",
    password: process.env.ALPHASPACE_PASSWORD || "your_alphaspace_password",
    environment:
      (process.env.ALPHASPACE_ENVIRONMENT as "test" | "live") || "test",
    liveUrl: process.env.ALPHASPACE_LIVE_URL || "https://omega.alpha.africa",
    testUrl: process.env.ALPHASPACE_TEST_URL || "https://lion.alpha.africa",
    webhookSecret: process.env.ALPHASPACE_WEBHOOK_SECRET,
    timeout: parseInt(process.env.ALPHASPACE_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.ALPHASPACE_MAX_RETRIES || "3"),
  }),
};
