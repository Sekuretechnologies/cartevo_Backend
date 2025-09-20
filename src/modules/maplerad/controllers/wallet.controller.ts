import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { MapleradUtils } from "../utils/maplerad.utils";

/**
 * 💰 Maplerad Wallet Operations Controller
 * Handles wallet-related operations for testing and development
 */
@ApiTags("Maplerad Wallet")
@Controller("maplerad/wallet")
export class WalletController {
  constructor() {}

  /**
   * 💳 Credit Test Wallet
   * Public endpoint to credit the Maplerad test wallet
   */
  @Post("credit-test")
  @ApiOperation({
    summary: "Credit test wallet",
    description:
      "Credit the Maplerad test wallet with specified amount and currency",
  })
  @ApiResponse({
    status: 200,
    description: "Test wallet credited successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Test wallet credited successfully",
        },
        data: { type: "object" },
        timestamp: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid parameters",
  })
  @ApiResponse({
    status: 500,
    description: "Internal server error",
  })
  async creditTestWallet(@Body() body: { amount: number; currency?: string }) {
    console.log("💰 WALLET CONTROLLER - Credit Test Wallet Request", {
      amount: body.amount,
      currency: body.currency || "USD",
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate input
      if (!body.amount || body.amount <= 0) {
        throw new HttpException(
          "Amount must be a positive number",
          HttpStatus.BAD_REQUEST
        );
      }

      const currency = body.currency || "USD";

      // Validate currency
      const validCurrencies = ["USD", "EUR", "GBP", "NGN"];
      if (!validCurrencies.includes(currency.toUpperCase())) {
        throw new HttpException(
          `Invalid currency. Supported currencies: ${validCurrencies.join(
            ", "
          )}`,
          HttpStatus.BAD_REQUEST
        );
      }

      console.log("🔄 CALLING MAPLERAD CREDIT TEST WALLET API", {
        amount: body.amount,
        currency: currency.toUpperCase(),
        timestamp: new Date().toISOString(),
      });

      // Call the MapleradUtils method
      const result = await MapleradUtils.creditTestWallet(
        body.amount,
        currency.toUpperCase()
      );

      if (result.error) {
        console.error("❌ MAPLERAD CREDIT TEST WALLET FAILED", {
          amount: body.amount,
          currency: currency.toUpperCase(),
          error: result.error.message,
          details: result.error.details,
          timestamp: new Date().toISOString(),
        });

        throw new HttpException(
          `Failed to credit test wallet: ${result.error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      console.log("✅ MAPLERAD CREDIT TEST WALLET SUCCESSFUL", {
        amount: body.amount,
        currency: currency.toUpperCase(),
        response: result.output,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: "Test wallet credited successfully",
        data: result.output,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("❌ WALLET CONTROLLER ERROR", {
        amount: body.amount,
        currency: body.currency || "USD",
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
