# Maplerad Card Services - Refactored Architecture

## Overview

This directory contains the refactored Maplerad card issuance services with improved architecture, better error handling, and cleaner separation of concerns.

## Architecture

### Core Services

#### 1. CardIssuanceService (`services/cardIssuanceService.ts`)

Main orchestrator service that handles the complete card issuance workflow:

- Context preparation
- Fund validation and reservation
- Maplerad API integration
- Webhook handling
- Database operations
- Notifications and cleanup

#### 2. FeeCalculationService (`services/feeCalculationService.ts`)

Unified fee calculation service:

- Card issuance fees
- Payment success fees
- Payment failure fees
- Range-based fee calculations

#### 3. NotificationService (`services/notificationService.ts`)

Unified notification and email service:

- Database notifications
- Email sending
- Template management
- Error handling

#### 4. UnifiedWalletService (`services/walletService.ts`)

Wallet operations service:

- Fund reservation and refund
- Balance validation
- Balance updates
- Transaction record creation

### Type Definitions

#### Core Types (`types/cardIssuance.types.ts`)

- `CardIssuanceRequest`: Input for card issuance
- `CardIssuanceContext`: Internal context during processing
- `FeeCalculation`: Fee breakdown structure
- `NotificationContext`: Notification data
- `EmailContext`: Email data
- Custom error classes with proper error codes

### Legacy Services (Maintained for Compatibility)

- `webhookWaitingService.ts`: Webhook handling with circuit breaker
- `cardMetadataSync.ts`: Card synchronization utilities
- `cardFeeOptimizedService.ts`: Legacy fee calculations
- `walletService.ts`: Legacy wallet operations

## Usage

### Basic Card Issuance

```typescript
import { CardIssuanceService, CardIssuanceRequest } from "./services";

const request: CardIssuanceRequest = {
  customerId: "customer-123",
  cardBrand: "visa",
  initialBalance: 100,
  clientReference: "REF-123",
  name: "John Doe",
  color: "blue",
};

const result = await CardIssuanceService.issueRetailCard(request);
```

### Using Individual Services

```typescript
import {
  FeeCalculationService,
  NotificationService,
  UnifiedWalletService,
} from "./services";

// Calculate fees
const fees = await FeeCalculationService.calculateCardIssuanceFees(
  "company-123",
  100
);

// Send notification
await NotificationService.sendCardIssuanceSuccessNotification({
  customerId: "customer-123",
  amount: 100,
  currency: "USD",
  reference: "REF-123",
});

// Check wallet balance
const hasFunds = await UnifiedWalletService.validateSufficientFunds(
  "wallet-123",
  150
);
```

## Key Improvements

### 1. Separation of Concerns

- Each service has a single responsibility
- Clear interfaces between services
- Easy to test and maintain

### 2. Error Handling

- Custom error classes with error codes
- Proper error propagation
- Graceful failure handling with cleanup

### 3. Type Safety

- Comprehensive TypeScript interfaces
- Proper typing for all data structures
- Better IDE support and error detection

### 4. Service Initialization

- Proper dependency injection
- Service initialization management
- Configuration management

### 5. Transaction Management

- Atomic operations where possible
- Proper rollback on failures
- Balance record tracking

### 6. Notification System

- Unified notification handling
- Email template management
- Database notification integration

## Migration Guide

### From Legacy Implementation

**Before:**

```typescript
// Old way - monolithic function
const result = await issueRetailCardAdapted(dto, customerId, name, color);
```

**After:**

```typescript
// New way - using refactored service
import { CardIssuanceService } from "./services";

const request: CardIssuanceRequest = {
  /* ... */
};
const result = await CardIssuanceService.issueRetailCard(request);
```

### Backward Compatibility

The legacy `issueRetailCardAdapted` function is maintained and now internally uses the new `CardIssuanceService`, ensuring backward compatibility.

## Configuration

Services require proper initialization:

```typescript
import { NotificationService } from "./services/notificationService";
import { ConfigService } from "@nestjs/config";

// Initialize notification service
const configService = new ConfigService();
NotificationService.initialize(configService);
```

## Error Codes

- `CUSTOMER_NOT_FOUND`: Customer doesn't exist
- `COMPANY_NOT_FOUND`: Company doesn't exist
- `INSUFFICIENT_FUNDS`: Wallet balance insufficient
- `MISSING_REFERENCE`: Maplerad reference missing
- `WEBHOOK_FAILED`: Webhook processing failed
- `DATABASE_ERROR`: Database operation failed
- `TRANSACTION_ERROR`: Transaction creation failed

## Testing

Each service can be tested independently:

```typescript
// Example test for FeeCalculationService
describe("FeeCalculationService", () => {
  it("should calculate card issuance fees correctly", async () => {
    const fees = await FeeCalculationService.calculateCardIssuanceFees(
      "company-123",
      100
    );
    expect(fees.totalFee).toBeGreaterThan(0);
  });
});
```

## Future Enhancements

1. **Database Transactions**: Implement proper database transactions for atomicity
2. **Caching**: Add Redis caching for frequently accessed data
3. **Metrics**: Add performance monitoring and metrics
4. **Retry Logic**: Implement exponential backoff for failed operations
5. **Audit Logging**: Enhanced audit trail for all operations
6. **Rate Limiting**: Add rate limiting for API calls
7. **Circuit Breaker**: Enhanced circuit breaker patterns

## File Structure

```
src/services/card/maplerad/
├── services/
│   ├── cardIssuanceService.ts      # Main orchestrator
│   ├── feeCalculationService.ts    # Fee calculations
│   ├── notificationService.ts      # Notifications & emails
│   ├── walletService.ts           # Wallet operations
│   └── index.ts                   # Service exports
├── types/
│   └── cardIssuance.types.ts      # Type definitions
├── cardIssuanceAdapted.ts         # Legacy wrapper
├── webhookWaitingService.ts       # Webhook handling
├── cardMetadataSync.ts           # Sync utilities
├── cardFeeOptimizedService.ts    # Legacy fees
├── walletService.ts              # Legacy wallet
└── README.md                     # This file
```

## Contributing

When adding new features:

1. Add types to `types/cardIssuance.types.ts`
2. Implement in appropriate service
3. Update service exports in `services/index.ts`
4. Add tests
5. Update documentation

## Support

For questions or issues with the refactored services, refer to the individual service documentation or create an issue in the project repository.
