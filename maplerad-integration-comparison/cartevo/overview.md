# Cartevo Project - Maplerad Integration Overview

## Summary

The Cartevo project features a highly sophisticated and well-architected Maplerad integration that has been recently refactored for improved maintainability, error handling, and separation of concerns.

## Project Structure

```
src/services/card/maplerad/
├── services/                      # Core business logic services
│   ├── cardIssuanceService.ts    # Main orchestrator service
│   ├── feeCalculationService.ts  # Fee calculations
│   ├── notificationService.ts    # Notifications & emails
│   ├── walletService.ts          # Wallet operations
│   ├── webhookWaitingService.ts  # Webhook handling
│   └── index.ts                  # Service exports
├── controllers/                   # API controllers
│   ├── cardManagementService.ts  # Card CRUD operations
│   ├── cardTransactionService.ts # Transaction handling
│   ├── webhookService.ts         # Webhook processors
│   └── index.ts                  # Controller exports
├── types/                         # Type definitions
│   ├── cardIssuance.types.ts     # Core types & errors
│   └── transaction.types.ts      # Transaction types
├── docs/                          # Documentation
│   ├── card-creation-process.md
│   ├── card-funding-process.md
│   └── webhook-processing-system.md
├── cardIssuanceAdapted.ts         # Legacy wrapper
└── README.md                      # Main documentation
```

## Architecture Highlights

### 1. **Separation of Concerns**

- Clear separation between services, controllers, and types
- Each service has a single responsibility
- Easy to test and maintain individual components

### 2. **Service Layer Architecture**

- **CardIssuanceService**: Main orchestrator for card creation workflow
- **FeeCalculationService**: Unified fee calculations with range-based logic
- **NotificationService**: Handles notifications and email sending
- **UnifiedWalletService**: Manages wallet operations and balance tracking

### 3. **Error Handling**

- Custom error classes with specific error codes
- Proper error propagation and graceful failure handling
- Automatic cleanup and fund refunding on failures

### 4. **Type Safety**

- Comprehensive TypeScript interfaces for all data structures
- Proper typing reduces runtime errors
- Better IDE support and development experience

## Key Features

### Advanced Workflow Management

- Multi-step card issuance process with status tracking
- Automatic fund reservation and validation
- Webhook-based asynchronous processing
- Comprehensive failure handling with cleanup

### Transaction Management

- Balance transaction record tracking
- Atomic operations where possible
- Proper rollback mechanisms on failures

### Fee Calculation System

- Range-based fee calculations
- Support for both percentage and fixed fees
- Separate handling for success/failure fees
- Fallback mechanisms for fee calculation errors

### Notification System

- Database notifications integration
- Email template management
- Both success and failure notifications

## Technical Implementation

### Database Integration

- Uses Prisma ORM for database operations
- Proper model relationships and constraints
- Balance transaction record tracking

### External API Integration

- Maplerad API integration with proper error handling
- Customer creation and management
- Card creation with webhook confirmation

### Configuration Management

- Environment-based configuration
- Service initialization patterns
- Dependency injection support

## Development Maturity

- **High**: Well-documented, tested, and production-ready
- Follows modern Node.js/NestJS patterns
- Comprehensive error handling and logging
- Backward compatibility maintained
