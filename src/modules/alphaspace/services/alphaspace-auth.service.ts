// AlphaSpace Authentication Service
// WAVLET adaptation of MONIX AlphaSpace OAuth2 authentication

import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import {
  AlphaSpaceConfig,
  AlphaSpaceOAuthResponse,
} from "../../../config/alphaspace.config";

@Injectable()
export class AlphaSpaceAuthService {
  private readonly logger = new Logger(AlphaSpaceAuthService.name);

  private axiosInstance: any = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private isAuthenticating = false;

  constructor(private readonly alphaSpaceConfig: AlphaSpaceConfig) {}

  /**
   * Initialize Axios instance with base configuration
   */
  private initializeAxios(): any {
    if (!this.axiosInstance) {
      this.axiosInstance = axios.create({
        timeout: this.alphaSpaceConfig.timeout,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      });

      // Add response interceptor for error handling
      this.axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
          this.logger.error("AlphaSpace HTTP Error", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.response?.data?.message || error.message,
            url: error.config?.url,
          });
          return Promise.reject(error);
        }
      );
    }
    return this.axiosInstance;
  }

  /**
   * Check if current access token is valid
   */
  private isTokenValid(): boolean {
    if (!this.accessToken) return false;
    // Add 5-minute buffer before expiry
    return Date.now() < this.tokenExpiry - 5 * 60 * 1000;
  }

  /**
   * Get base URL for current environment
   */
  private getBaseUrl(): string {
    return this.alphaSpaceConfig.environment === "live"
      ? this.alphaSpaceConfig.liveUrl
      : this.alphaSpaceConfig.testUrl;
  }

  /**
   * Authenticate with AlphaSpace using OAuth2 password grant
   */
  async authenticate(): Promise<string> {
    // Prevent concurrent authentication attempts
    if (this.isAuthenticating) {
      this.logger.warn(
        "AlphaSpace authentication already in progress, waiting..."
      );
      while (this.isAuthenticating) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.accessToken!;
    }

    try {
      this.isAuthenticating = true;

      this.logger.log("🔐 ALPHASPACE AUTH - Starting OAuth2 authentication", {
        environment: this.alphaSpaceConfig.environment,
        baseUrl: this.getBaseUrl(),
      });

      const axiosInstance = this.initializeAxios();

      // Prepare OAuth2 password grant data
      const authData = new URLSearchParams({
        grant_type: "password",
        client_id: this.alphaSpaceConfig.clientId,
        client_secret: this.alphaSpaceConfig.clientSecret,
        username: this.alphaSpaceConfig.username,
        password: this.alphaSpaceConfig.password,
      });

      const response = await axiosInstance.post(
        `${this.getBaseUrl()}/oauth/token`,
        authData.toString()
      );

      // Store tokens
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token || null;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      this.logger.log("✅ ALPHASPACE AUTH - Authentication successful", {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
      });

      return this.accessToken;
    } catch (error: any) {
      this.logger.error("❌ ALPHASPACE AUTH - Authentication failed", {
        error: error.message,
        statusCode: error.response?.status,
        environment: this.alphaSpaceConfig.environment,
      });

      // Clear any partial tokens
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiry = 0;

      throw new Error(`AlphaSpace authentication failed: ${error.message}`);
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.accessToken!;
    }

    // Token is invalid or expired, authenticate again
    this.logger.debug(
      "ALPHASPACE AUTH - Token expired or invalid, re-authenticating"
    );
    return this.authenticate();
  }

  /**
   * Refresh access token using refresh token
   * (For future implementation if needed)
   */
  // async refreshAccessToken(): Promise<string> {
  //   if (!this.refreshToken) {
  //     throw new Error('No refresh token available');
  //   }
  //
  //   try {
  //     const axiosInstance = this.initializeAxios();
  //     const refreshData = new URLSearchParams({
  //       grant_type: 'refresh_token',
  //       client_id: this.alphaSpaceConfig.clientId,
  //       client_secret: this.alphaSpaceConfig.clientSecret,
  //       refresh_token: this.refreshToken,
  //     });
  //
  //     const response = await axiosInstance.post<AlphaSpaceOAuthResponse>(
  //       `${this.getBaseUrl()}/oauth/token`,
  //       refreshData.toString()
  //     );
  //
  //     this.accessToken = response.data.access_token;
  //     this.refreshToken = response.data.refresh_token || this.refreshToken;
  //     this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
  //
  //     return this.accessToken;
  //   } catch (error: any) {
  //     this.logger.error('Token refresh failed, full authentication required', error);
  //     return this.authenticate();
  //   }
  // }

  /**
   * Clear stored tokens (for testing or logout)
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    this.logger.debug("ALPHASPACE AUTH - Tokens cleared");
  }
}
