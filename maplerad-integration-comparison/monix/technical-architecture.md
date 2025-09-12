# Monix - Maplerad Integration Technical Architecture

## Service Layer Architecture

### Core Services Overview

#### 1. MapleradService (2138 lines)

**Purpose**: Comprehensive API client for all Maplerad operations  
**Location**: `src/modules/card/services/maplerad.service.ts`

**Key Responsibilities**:

- Complete Maplerad API wrapper
- Customer enrollment with full KYC support
- Card lifecycle management (create, fund, withdraw, terminate)
- Transaction synchronization
- Real-time balance inquiries
- Webhook signature verification
- Advanced error handling with retry logic

**API Coverage**:

```typescript
// Customer Management
- enrollCustomerFull(data: MapleradEnrollCustomerData)
- getCustomer(customerId: string)
- updateCustomer(data: MapleradUpdateCustomerData)

// Card Operations
- createCard(data: MapleradCreateCardData)
- getCardDetails(cardId: string)
- getCustomerCards(customerId: string)
- fundCard(cardId: string, amount: number)
- withdrawFromCard(cardId: string, amount: number)
- terminateCard(cardId: string)
- freezeCard(cardId: string)
- unfreezeCard(cardId: string)

// Transaction Management
- getCardTransactions(cardId: string, filters?)
- getTransaction(transactionId: string)
- getCardDeclineCharges(filters?)

// Utility Functions
- getRealCardBalance(cardId: string)
- mapMapleradCardStatus(status: string)
- convertFromSmallestUnit(amount: number, currency: string)
```

#### 2. CardIssuanceService (2746 lines)

**Purpose**: Complex orchestrator for card creation workflow  
**Location**: `src/modules/card/services/card-issuance.service.ts`

**Advanced Features**:

- Multi-step card issuance with status tracking
- Automatic customer enrollment with document verification
- Fund reservation before external API calls
- Webhook-based asynchronous completion
- Advanced error recovery with fund rollback
- Support for multiple card types (retail, lite, corporate)

**Workflow Stages**:

1. Auto-fill user information from existing data
2. Calculate complex fees with range-based pricing
3. Secure fund reservation from user wallet
4. Create/verify Maplerad customer
5. Initiate card creation via Maplerad API
6. Wait for webhook confirmation (10 minutes timeout)
7. Create local database records
8. Send notifications and cleanup

**Error Handling Strategy**:

```typescript
// Pre-API failure: Automatic fund refund
if (!mapleradCallSucceeded) {
  await this.refundWalletFundsAfterSudoFailure();
}

// Post-API success: Keep funds (service delivered)
else {
  logger.warn("Service delivered - funds kept");
  await this.syncCardDataFromMaplerad();
}
```

#### 3. MapleradWebhookController (3535 lines)

**Purpose**: Comprehensive webhook event processing  
**Location**: `src/modules/card/controllers/maplerad-webhook.controller.ts`

**Supported Events**:

```typescript
interface MapleradWebhookEvents {
  "issuing.transaction": AuthorizationTransaction;
  "issuing.created.successful": CardCreationSuccess;
  "issuing.created.failed": CardCreationFailure;
  "issuing.terminated": CardTermination;
  "issuing.charge": PaymentFailureFee;
}
```

**Advanced Processing Features**:

- Webhook signature verification with HMAC SHA-256
- Asynchronous fee processing for performance
- Intelligent transaction correlation
- Automatic balance synchronization
- Advanced failure fee management
- Real-time notification system

#### 4. MapleradSyncService

**Purpose**: Data synchronization between Maplerad and local database  
**Location**: `src/modules/card/services/maplerad-sync.service.ts`

**Synchronization Capabilities**:

- Real-time card status synchronization
- Transaction history synchronization
- Balance reconciliation
- Automated data consistency checks
- Bulk synchronization operations

### Controller Layer

#### Webhook Processing Architecture

```typescript
class MapleradWebhookController {
  // Main webhook handler with signature verification
  async handleWebhook(payload, headers, req, res);

  // Event-specific processors
  private async processTransaction(payload);
  private async processCardCreated(payload);
  private async processCardCreationFailed(payload);
  private async processCardTerminated(payload);

  // Advanced fee management
  private async processSuccessfulPaymentFeesAsync(payload);
  private async checkAndApplyFailureFeeIfNeeded(payload);
}
```

## Database Integration

### Entity Architecture

```typescript
// Core Entities
interface Card {
  id: string;
  userId: string;
  midenCardId: string; // Maplerad card ID
  cardCustomerId: string; // Maplerad customer ID
  secureCardDetails: string; // Encrypted card details
  nameOnCard: string;
  cardBrand: CardBrand;
  cardClass: CardClass;
  balance: number;
  currency: string;
  status: CardStatus;
  // ... extensive metadata
}

interface CardTransaction {
  id: string;
  card: Card;
  amount: number;
  type: CardTransactionType;
  status: CardTransactionStatus;
  merchantName?: string;
  location?: string;
  reference: string;
  externalReference: string;
  // ... comprehensive tracking fields
}
```

### Complex Business Logic

```typescript
// Fee Calculation System
class CardFeeOptimizedService {
  async calculateCardPurchaseFees(
    userId: string,
    cardType: string,
    currency: CardCurrency,
    initialBalance: number,
    contactlessPayment: boolean
  ): Promise<FeeCalculation>;

  // Range-based fee calculations
  // First card vs additional card logic
  // Multi-currency support
  // Exchange rate integration
}
```

## External API Integration

### Maplerad Customer Enrollment

```typescript
interface MapleradEnrollCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  identification_number: string;
  dob: string;

  phone: {
    phone_country_code: string;
    phone_number: string;
  };

  identity: {
    type: string;
    image: string; // Document image URL
    number: string;
    country: string;
  };

  address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };

  photo?: string; // Selfie image URL
}
```

### Advanced Card Creation

```typescript
interface MapleradCreateCardData {
  customer_id: string;
  currency: string; // Always "USD" for virtual cards
  type: string; // Always "VIRTUAL"
  auto_approve: boolean; // Always true
  brand?: string; // VISA or MASTERCARD
  amount?: number; // Pre-funding amount in cents
}
```

## Webhook Processing Architecture

### Event Processing Pipeline

1. **Signature Verification**: HMAC SHA-256 validation
2. **Event Classification**: Determine webhook type and processing strategy
3. **Idempotency Check**: Prevent duplicate processing
4. **Business Logic Execution**: Event-specific processing
5. **Database Updates**: Atomic transaction updates
6. **Notification Dispatch**: Real-time user notifications
7. **Cleanup**: Metadata cleanup and logging

### Advanced Transaction Processing

```typescript
// Authorization Transaction Processing
async processAuthorizationTransaction(payload) {
  // 1. Record transaction synchronously
  await this.recordTransactionFromWebhook(payload);

  // 2. Process fees asynchronously for performance
  if (isSuccessfulPayment) {
    this.processSuccessfulPaymentFeesAsync(payload);
    this.sendPaymentSuccessNotificationAsync(payload);
  }

  return { success: true, processed: true };
}
```

### Sophisticated Fee Management

```typescript
// Intelligent failure fee processing
async processDeclineTransaction(payload) {
  // 1. Record declined transaction
  await this.recordTransactionFromWebhook(payload);

  // 2. Store balance before decline for verification
  await this.storeBalanceBeforeDecline(payload.reference, payload.card_id);

  // 3. Schedule fee verification after 30 seconds
  setTimeout(() => {
    this.checkAndApplyFailureFeeIfNeeded(payload);
  }, 30000);

  // 4. Send insufficient funds notification if applicable
  if (payload.description?.includes("no sufficient funds")) {
    this.handleInsufficientFundsNotificationAsync(payload);
  }
}
```

## Configuration Management

### Environment-Based Configuration

```typescript
// Maplerad configuration structure
const mapleradConfig = {
  secretKey: process.env.MAPLERAD_SECRET_KEY,
  publicKey: process.env.MAPLERAD_PUBLIC_KEY,
  webhookSecret: process.env.MAPLERAD_WEBHOOK_SECRET,
  baseUrl: process.env.MAPLERAD_BASE_URL || "https://api.maplerad.com",
  environment: process.env.MAPLERAD_ENVIRONMENT || "sandbox",
  timeout: 300000, // 5 minutes
  maxRetries: 3,
};
```

### Service Initialization

```typescript
class MapleradService {
  constructor(private configService: ConfigService) {
    this.validateConfiguration();
    this.initializeHttpClient();
    this.setupInterceptors();
  }

  private validateConfiguration() {
    if (!this.secretKey || !this.publicKey) {
      throw new Error("Maplerad configuration missing");
    }
  }
}
```

## Error Handling & Recovery

### Multi-Level Error Management

1. **API Level**: HTTP error handling with retry logic
2. **Business Logic Level**: Custom error classes with specific codes
3. **Database Level**: Transaction rollback and data consistency
4. **User Level**: User-friendly error messages and notifications
5. **System Level**: Logging, monitoring, and alerting

### Advanced Recovery Mechanisms

```typescript
// Post-API success error handling
private async handlePostMapleradErrorRecovery(
  userId: string,
  totalReservedAmount: number,
  clientReference: string,
  error: any,
  context: string,
  mapleradCardId?: string
) {
  // Funds kept because service was delivered
  logger.error("Service delivered - funds conserved", {
    fundsKept: true,
    serviceDelivered: true,
    requiresDataSync: true
  });

  // Attempt data recovery from Maplerad
  if (mapleradCardId) {
    await this.syncCardDataFromMaplerad(mapleradCardId, userId, clientReference);
  }
}
```

## Performance Optimizations

### Asynchronous Processing

- Webhook processing optimized for fast response times
- Fee calculations moved to background processing
- Notification sending decoupled from main flow
- Balance synchronization handled asynchronously

### Caching Strategy

- Metadata caching for webhook correlation
- Balance caching for performance
- Configuration caching
- Exchange rate caching

### Database Optimization

- Efficient indexing strategy
- Query optimization with proper joins
- Batch operations for bulk updates
- Connection pooling and management

## Security Features

### Data Protection

- Encrypted card details storage
- Sensitive data masking in logs
- Secure webhook signature verification
- PCI DSS compliance considerations

### Access Control

- Role-based access control
- API authentication and authorization
- Audit trail maintenance
- Request rate limiting

## Monitoring & Observability

### Comprehensive Logging

- Structured logging with correlation IDs
- Performance metrics tracking
- Error rate monitoring
- Business metrics collection

### Health Checks

- Service availability monitoring
- Database connectivity checks
- External API health monitoring
- Webhook processing status tracking
