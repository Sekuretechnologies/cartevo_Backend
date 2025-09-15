# Maplerad Integration Error Handling Documentation

## Overview

This document outlines the comprehensive error handling strategies implemented in the Maplerad integration, including error types, handling patterns, logging, and recovery mechanisms.

## Error Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Errors    │───▶│   Service       │───▶│   Controller    │
│                 │    │   Errors        │    │   Errors        │
│ • Maplerad API  │    │ • Business      │    │ • HTTP          │
│ • Network       │    │ • Validation    │    │ • Validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Logging       │    │   Monitoring    │    │   Recovery      │
│                 │    │                 │    │                 │
│ • Structured    │    │ • Alerts        │    │ • Retry         │
│ • Audit Trail   │    │ • Metrics       │    │ • Rollback      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Error Types

### 1. API Errors

Errors originating from the Maplerad API:

```typescript
// Maplerad API Error Structure
interface MapleradApiError {
  message: string;
  statusCode: number;
  details?: any;
  payload?: any;
}
```

**Common API Errors:**

| Error Code | Description                          | Resolution                |
| ---------- | ------------------------------------ | ------------------------- |
| 400        | Bad Request - Invalid parameters     | Check request payload     |
| 401        | Unauthorized - Invalid API key       | Verify credentials        |
| 403        | Forbidden - Insufficient permissions | Check API key permissions |
| 404        | Not Found - Resource doesn't exist   | Verify resource ID        |
| 429        | Too Many Requests - Rate limited     | Implement backoff         |
| 500        | Internal Server Error                | Contact Maplerad support  |

### 2. Business Logic Errors

Application-specific business rule violations:

```typescript
// Business Logic Error Examples
throw new BadRequestException("Insufficient wallet balance to create card");
throw new BadRequestException("Customer not found");
throw new BadRequestException(
  "Card limit exceeded - maximum 5 cards per customer"
);
throw new BadRequestException("Age requirement not met - customer must be 18+");
throw new BadRequestException("Cannot fund frozen card");
throw new BadRequestException(
  "Incorrect card source - card is not from Maplerad"
);
```

### 3. Validation Errors

Input validation failures:

```typescript
// Validation Error Examples
throw new BadRequestException(
  "Invalid card brand - must be VISA or MASTERCARD"
);
throw new BadRequestException(
  "Amount must be at least 2 USD for card creation"
);
throw new BadRequestException("Customer ID is required");
throw new BadRequestException("Card name must be 1-50 characters");
```

### 4. Database Errors

Database operation failures:

```typescript
// Database Error Handling
try {
  await CardModel.create(cardData);
} catch (error) {
  console.error("Database error creating card:", error);
  throw new BadRequestException("Failed to save card to database");
}
```

### 5. Network Errors

Connectivity and timeout issues:

```typescript
// Network Error Handling
try {
  const response = await axios.get(url, { timeout: 30000 });
} catch (error) {
  if (error.code === "ECONNREFUSED") {
    throw new BadRequestException("Unable to connect to Maplerad API");
  }
  if (error.code === "ETIMEDOUT") {
    throw new BadRequestException("Maplerad API request timeout");
  }
}
```

## Error Handling Patterns

### 1. Controller Level Error Handling

```typescript
// MapleradController error handling
@Post()
@ApiOperation({ summary: "Create a new Maplerad card" })
async createCard(
  @Body() createCardDto: CreateCardDto,
  @CurrentUser() user: CurrentUserData
): Promise<CreateCardResponseDto> {
  try {
    return await this.mapleradService.createCard(createCardDto);
  } catch (error) {
    // Log error with context
    console.error("Card creation failed:", {
      userId: user.id,
      customerId: createCardDto.customer_id,
      error: error.message,
      stack: error.stack
    });

    // Re-throw to let NestJS handle HTTP response
    throw error;
  }
}
```

### 2. Service Level Error Handling

```typescript
// MapleradService error handling
async createCard(createCardDto: CreateCardDto): Promise<CreateCardResponseDto> {
  // Validation errors
  if (!createCardDto.customer_id) {
    throw new BadRequestException("Customer ID is required");
  }

  // Business logic errors
  const customer = await this.validateCustomer(createCardDto.customer_id);
  if (!customer) {
    throw new BadRequestException("Customer not found");
  }

  // API errors
  try {
    const cardData = await this.createMapleradCard(createCardDto);
    return cardData;
  } catch (error) {
    console.error("Maplerad API error:", error);
    throw new BadRequestException("Failed to create card with Maplerad");
  }
}
```

### 3. Utility Level Error Handling

```typescript
// Maplerad utilities error handling
export const makeMapleradRequest = async (config: IMapleradConfig) => {
  try {
    const response = await axios(config);

    // Handle HTTP 200 with error content
    if (response.data?.statusCode >= 400) {
      return fnOutput.error({
        error: {
          message: response.data.message || "Maplerad API error",
          statusCode: response.data.statusCode,
          details: response.data,
        },
      });
    }

    return fnOutput.success({ output: response.data });
  } catch (error: any) {
    console.error("Maplerad API request failed:", {
      url: config.url,
      method: config.method,
      error: error.message,
    });

    return fnOutput.error({
      error: {
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
        details: error.response?.data || null,
      },
    });
  }
};
```

## Error Response Format

### HTTP Error Response Structure

```typescript
// Standard NestJS error response
{
  statusCode: 400,
  message: "Insufficient wallet balance to create card",
  error: "Bad Request"
}

// Custom error response
{
  status: "error",
  message: "Card creation failed",
  details: {
    customer_id: "cust_123",
    error_code: "INSUFFICIENT_BALANCE",
    required_amount: 52,
    available_balance: 30
  }
}
```

### Success Response with Warnings

```typescript
// Success response with warnings
{
  status: "success",
  message: "Card created successfully",
  warnings: [
    "Card balance may take a few minutes to reflect",
    "First transaction may be delayed"
  ],
  card: { /* card data */ }
}
```

## Logging Strategy

### Structured Logging

```typescript
// Error logging with context
console.error("Card creation failed:", {
  operation: "createCard",
  userId: user.id,
  companyId: user.companyId,
  customerId: createCardDto.customer_id,
  amount: createCardDto.amount,
  brand: createCardDto.brand,
  error: {
    message: error.message,
    stack: error.stack,
    code: error.code,
  },
  timestamp: new Date().toISOString(),
});
```

### Audit Logging

```typescript
// Customer action logging
await CustomerLogsModel.create({
  customer_id: customer.id,
  action: "card-purchase",
  status: "FAILED",
  log_json: {
    error_message: error.message,
    error_details: error.details,
    customer_id: customer.id,
    amount: createCardDto.amount,
  },
  log_txt: `Card creation failed: ${error.message}`,
  created_at: new Date(),
});
```

### API Call Logging

```typescript
// Maplerad API interaction logging
console.log("📤 MAPLERAD REQUEST", {
  method: "POST",
  endpoint: "/issuing",
  url: `${env.MAPLERAD_BASE_URL}/issuing`,
  environment: env.NODE_ENV,
  payload: cardData,
  timestamp: new Date().toISOString(),
});

console.log("📥 MAPLERAD RESPONSE", {
  status: 200,
  statusText: "OK",
  responseData: response.data,
  responseSize: JSON.stringify(response.data).length,
  duration: Date.now() - startTime,
  success: true,
});
```

## Recovery Mechanisms

### 1. Transaction Rollback

```typescript
// Database transaction with automatic rollback
return CardModel.operation(async (prisma) => {
  // Step 1: Deduct from wallet
  await WalletModel.update(walletId, {
    balance: wallet.balance - totalCost,
  });

  // Step 2: Create card in Maplerad
  const cardResult = await mapleradUtils.createCard(cardData);
  if (cardResult.error) throw new Error("Maplerad card creation failed");

  // Step 3: Save card to database
  await CardModel.create(cardData);

  // Step 4: Create transaction record
  await TransactionModel.create(transactionData);

  return { success: true };
});
// If any step fails, all changes are rolled back
```

### 2. Retry Mechanism

```typescript
// API call retry with exponential backoff
async createMapleradCard(cardData: any, retryCount = 0): Promise<any> {
  const maxRetries = 3;

  try {
    const result = await mapleradUtils.createCard(cardData);
    return result;
  } catch (error) {
    if (retryCount < maxRetries && this.isRetryableError(error)) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Retrying Maplerad API call in ${delay}ms (attempt ${retryCount + 1})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.createMapleradCard(cardData, retryCount + 1);
    }

    throw error;
  }
}

// Check if error is retryable
private isRetryableError(error: any): boolean {
  const retryableCodes = [500, 502, 503, 504];
  const retryableMessages = ['timeout', 'network', 'connection'];

  return retryableCodes.includes(error.statusCode) ||
         retryableMessages.some(msg => error.message?.toLowerCase().includes(msg));
}
```

### 3. Circuit Breaker Pattern

```typescript
// Circuit breaker for Maplerad API
class MapleradCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute(operation: () => Promise<any>): Promise<any> {
    if (this.isOpen()) {
      throw new Error("Circuit breaker is open - Maplerad API unavailable");
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.failureThreshold) {
      return Date.now() - this.lastFailureTime < this.timeout;
    }
    return false;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}
```

## Error Monitoring

### Health Checks

```typescript
// Maplerad integration health check
@Get('/health/maplerad')
async getMapleradHealth(): Promise<any> {
  const checks = {
    database: await this.checkDatabaseHealth(),
    maplerad_api: await this.checkMapleradApiHealth(),
    redis: await this.checkRedisHealth()
  };

  const isHealthy = Object.values(checks).every(status => status === 'healthy');

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: checks
  };
}

private async checkMapleradApiHealth(): Promise<string> {
  try {
    const result = await mapleradUtils.makeMapleradRequest({
      method: 'GET',
      url: '/health' // Assuming Maplerad has a health endpoint
    });

    return result.error ? 'unhealthy' : 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
}
```

### Metrics Collection

```typescript
// Error metrics collection
const errorMetrics = {
  api_errors: 0,
  business_errors: 0,
  validation_errors: 0,
  database_errors: 0,
  network_errors: 0,
};

// Increment error counters
if (error instanceof MapleradApiError) {
  errorMetrics.api_errors++;
} else if (error instanceof ValidationError) {
  errorMetrics.validation_errors++;
} else if (error instanceof DatabaseError) {
  errorMetrics.database_errors++;
}

// Send metrics to monitoring system
await this.metricsService.sendMetrics("maplerad_errors", errorMetrics);
```

## Error Codes Reference

### Application Error Codes

| Code                 | Description            | HTTP Status |
| -------------------- | ---------------------- | ----------- |
| CARD_CREATION_FAILED | Failed to create card  | 500         |
| INSUFFICIENT_BALANCE | Wallet balance too low | 400         |
| CUSTOMER_NOT_FOUND   | Customer doesn't exist | 400         |
| CARD_NOT_FOUND       | Card doesn't exist     | 404         |
| INVALID_BRAND        | Invalid card brand     | 400         |
| AGE_REQUIREMENT      | Customer under 18      | 400         |
| CARD_LIMIT_EXCEEDED  | Too many cards         | 400         |
| FROZEN_CARD          | Card is frozen         | 400         |
| INVALID_PROVIDER     | Wrong card provider    | 400         |

### Maplerad API Error Codes

| Code                     | Description                    | Resolution            |
| ------------------------ | ------------------------------ | --------------------- |
| INVALID_API_KEY          | API key invalid                | Check credentials     |
| INSUFFICIENT_PERMISSIONS | API key lacks permissions      | Update API key        |
| CARD_NOT_FOUND           | Card doesn't exist in Maplerad | Check card ID         |
| INVALID_AMOUNT           | Amount out of allowed range    | Adjust amount         |
| CUSTOMER_NOT_VERIFIED    | Customer KYC incomplete        | Complete verification |
| DUPLICATE_REQUEST        | Request already processed      | Use idempotency key   |

## Testing Error Scenarios

### Unit Tests

```typescript
describe("MapleradService Error Handling", () => {
  it("should throw error for insufficient balance", async () => {
    // Mock wallet with low balance
    jest.spyOn(walletModel, "getOne").mockResolvedValue({
      output: { balance: 1 },
    });

    const createCardDto = {
      customer_id: "cust_123",
      brand: "VISA",
      amount: 50,
    };

    await expect(service.createCard(createCardDto)).rejects.toThrow(
      "Insufficient wallet balance"
    );
  });

  it("should handle Maplerad API errors gracefully", async () => {
    // Mock Maplerad API failure
    jest.spyOn(mapleradUtils, "createCard").mockResolvedValue({
      error: { message: "API Error", statusCode: 500 },
    });

    const createCardDto = {
      /* valid data */
    };

    await expect(service.createCard(createCardDto)).rejects.toThrow(
      "Failed to create card with Maplerad"
    );
  });
});
```

### Integration Tests

```typescript
describe("Error Recovery Integration", () => {
  it("should rollback database changes on API failure", async () => {
    // Setup: Create wallet with balance
    const wallet = await createTestWallet(100);

    // Mock Maplerad API to fail
    jest
      .spyOn(mapleradUtils, "createCard")
      .mockRejectedValue(new Error("API temporarily unavailable"));

    const createCardDto = {
      customer_id: "cust_123",
      brand: "VISA",
      amount: 50,
    };

    // Attempt card creation
    await expect(service.createCard(createCardDto)).rejects.toThrow();

    // Verify wallet balance unchanged
    const updatedWallet = await WalletModel.getOne({ id: wallet.id });
    expect(updatedWallet.output.balance).toBe(100);
  });
});
```

## Best Practices

### Error Handling Principles

1. **Fail Fast**: Validate inputs early and throw errors immediately
2. **Specific Errors**: Use specific error messages, not generic ones
3. **Context Preservation**: Include relevant context in error messages
4. **Logging**: Log all errors with sufficient context for debugging
5. **Recovery**: Implement recovery mechanisms where possible
6. **User-Friendly**: Provide user-friendly error messages in responses

### Error Prevention

1. **Input Validation**: Validate all inputs thoroughly
2. **Type Safety**: Use TypeScript for compile-time error prevention
3. **Unit Tests**: Test error scenarios extensively
4. **Integration Tests**: Test end-to-end error flows
5. **Monitoring**: Monitor for error patterns and address root causes

### Documentation

1. **Error Catalog**: Maintain catalog of all possible errors
2. **Resolution Guide**: Document resolution steps for common errors
3. **API Documentation**: Document error responses in API docs
4. **Runbooks**: Create runbooks for production error resolution

This comprehensive error handling documentation ensures robust, maintainable, and user-friendly error management throughout the Maplerad integration.
