# Cartevo - Maplerad Integration Technical Architecture

## Service Layer Architecture

### Core Services Overview

#### 1. CardIssuanceService

**Purpose**: Main orchestrator for the complete card issuance workflow  
**Location**: `src/services/card/maplerad/services/cardIssuanceService.ts`

**Key Responsibilities**:

- Context preparation and validation
- Fund validation and reservation
- Maplerad API integration
- Webhook handling with timeout management
- Database operations (card, transaction, balance records)
- Error handling with automatic cleanup
- Success/failure notifications

**Workflow Stages**:

1. `INITIATED` - Process started
2. `FUNDS_RESERVED` - Company wallet funds validated and reserved
3. `MAPLERAD_REQUESTED` - Card creation request sent to Maplerad
4. `WEBHOOK_RECEIVED` - Confirmation webhook received
5. `CARD_CREATED` - Local database updated
6. `TRANSACTIONS_RECORDED` - Transaction records created
7. `COMPLETED` - Process finished successfully
8. `FAILED` - Process failed with cleanup
9. `REFUNDED` - Funds returned to wallet

**Error Handling**:

- Custom error classes with specific codes
- Automatic fund refunding on failures
- Comprehensive logging at each stage
- Graceful degradation with notification alerts

#### 2. FeeCalculationService

**Purpose**: Unified fee calculation system  
**Location**: `src/services/card/maplerad/services/feeCalculationService.ts`

**Features**:

- Range-based fee calculations
- Support for both percentage and fixed fees
- Card issuance fees
- Payment success/failure fees with different ranges
- Fallback mechanisms for calculation errors
- Multi-currency support (USD/XAF)

**Fee Types**:

```typescript
interface FeeCalculation {
  issuanceFee: number;
  totalFee: number;
  breakdown: {
    issuanceFee: number;
    initialBalance: number;
  };
}
```

#### 3. NotificationService

**Purpose**: Unified notification and email system  
**Location**: `src/services/card/maplerad/services/notificationService.ts`

**Capabilities**:

- Database notification creation
- Email sending with templates
- Success/failure notification handling
- Configurable email templates
- Error handling for notification failures

#### 4. UnifiedWalletService

**Purpose**: Wallet operations and balance management  
**Location**: `src/services/card/maplerad/services/walletService.ts`

**Operations**:

- Fund reservation and validation
- Balance updates and tracking
- Balance transaction record creation
- Fund refunding on failures
- Multi-currency wallet support
- Company wallet retrieval by currency

### Controller Layer

#### CardManagementService

**Purpose**: High-level card operations  
**Location**: `src/services/card/maplerad/controllers/cardManagementService.ts`

**Features**:

- Card creation using refactored services
- Card status management (active/frozen/terminated)
- Card retrieval with synchronization
- Card hiding (soft delete)

#### WebhookService

**Purpose**: Maplerad webhook processing  
**Location**: `src/services/card/maplerad/controllers/webhookService.ts`

**Webhook Types Handled**:

- `issuing.created.successful` - Card creation success
- `issuing.created.failed` - Card creation failure
- `issuing.terminated` - Card termination
- `issuing.transaction` - Transaction events

### Type System

#### Core Types (`cardIssuance.types.ts`)

```typescript
// Request/Response types
interface CardIssuanceRequest
interface CardIssuanceContext
interface FeeCalculation
interface WalletReservation
interface CardCreationResult

// Notification types
interface NotificationContext
interface EmailContext

// Error classes
class CardIssuanceError
class InsufficientFundsError
class WebhookTimeoutError

// Status tracking
type IssuanceStatus
```

## Database Integration

### Models Used

- **CardModel**: Card storage and management
- **TransactionModel**: Transaction record keeping
- **CustomerModel**: Customer information
- **CompanyModel**: Company data
- **WalletModel**: Wallet balance management
- **BalanceTransactionRecordModel**: Balance change tracking
- **NotificationModel**: Notification storage

### Balance Tracking System

- Comprehensive balance record creation for all changes
- Separate records for wallet debits and card credits
- Transaction-linked balance changes
- Support for multiple entities (wallet, card)

## External API Integration

### Maplerad API Integration

- Customer creation/management
- Card creation with auto-approval
- Webhook confirmation system
- Error response handling
- Currency conversion (cents/dollars)

### Configuration Management

- Environment-based settings
- Service initialization patterns
- Configurable timeouts and retry policies
- Database connection management

## Error Handling Strategy

### Error Classification

1. **Business Logic Errors**: Insufficient funds, invalid requests
2. **External API Errors**: Maplerad API failures, network issues
3. **Database Errors**: Transaction failures, constraint violations
4. **System Errors**: Configuration issues, service unavailability

### Error Recovery

- Automatic fund refunding on failures
- Notification alerts for all failure types
- Comprehensive logging for debugging
- Graceful degradation where possible

## Monitoring & Observability

### Logging Strategy

- Structured logging with contextual information
- Process stage tracking with status updates
- Error logging with full context
- Performance metrics logging

### Health Checks

- Service initialization validation
- Database connectivity checks
- External API availability monitoring
- Webhook processing status

## Security Considerations

### Data Protection

- Sensitive card data masking
- Secure customer information handling
- Audit trail maintenance
- PCI compliance considerations

### API Security

- Webhook signature validation
- Request authentication
- Rate limiting capabilities
- Input validation and sanitization

## Scalability Features

### Performance Optimizations

- Service caching where appropriate
- Database query optimization
- Async operation handling
- Circuit breaker patterns for external calls

### Reliability Features

- Timeout management for webhooks
- Retry logic for failed operations
- Fallback mechanisms for service failures
- Transaction atomicity where possible
