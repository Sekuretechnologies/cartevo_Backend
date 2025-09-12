# Cartevo - Maplerad Integration Implementation Details

## Key Implementation Patterns

### 1. Service Orchestration Pattern

The `CardIssuanceService` implements a sophisticated orchestration pattern:

```typescript
async processCardIssuance(request: CardIssuanceRequest): Promise<OutputProps> {
  try {
    // 1. Prepare context
    const context = await this.prepareContext(request);

    // 2. Validate and reserve funds
    await this.validateAndReserveFunds(context);

    // 3. Create Maplerad card
    const cardResult = await this.createMapleradCard(context);

    // 4. Wait for webhook
    const webhookResult = await this.waitForWebhook(context);

    // 5. Process successful issuance
    const result = await this.processSuccessfulIssuance(context, webhookResult);

    return result;
  } catch (error) {
    await this.handleIssuanceFailure(request, error);
    // Error handling and cleanup
  }
}
```

### 2. Context-Driven Processing

Uses a comprehensive context object to pass data between stages:

```typescript
interface CardIssuanceContext {
  customer: any;
  company: any;
  companyWallet: any;
  completeDto: any;
  feeCalculation: FeeCalculation;
  clientReference: string;
}
```

### 3. Status Tracking System

Implements detailed status tracking throughout the process:

- `INITIATED → FUNDS_RESERVED → MAPLERAD_REQUESTED → WEBHOOK_RECEIVED → COMPLETED`
- Each status change is logged for debugging and monitoring
- Status used for appropriate cleanup on failures

### 4. Error Handling Strategy

#### Custom Error Classes

```typescript
class CardIssuanceError extends Error {
  constructor(message: string, public code: string, public details?: any)
}

class InsufficientFundsError extends CardIssuanceError
class WebhookTimeoutError extends CardIssuanceError
```

#### Automatic Cleanup

```typescript
private async handleIssuanceFailure(request, error) {
  // Refund funds if they were reserved
  if (this.status === "FUNDS_RESERVED" || this.status === "MAPLERAD_REQUESTED") {
    await UnifiedWalletService.refundFunds(/* ... */);
  }

  // Send failure notification
  await NotificationService.sendCardIssuanceFailureNotification(/* ... */);
}
```

## Database Operations

### Balance Transaction Records

Comprehensive balance tracking for all monetary operations:

```typescript
// Wallet debit record
await UnifiedWalletService.createBalanceRecord(
  transactionId,
  "wallet",
  companyWallet.id,
  originalBalance,
  newBalance,
  -feeCalculation.totalFee,
  "USD",
  "debit",
  "Card issuance fee and initial balance debit"
);

// Card credit record
await UnifiedWalletService.createBalanceRecord(
  transactionId,
  "card",
  cardId,
  0,
  initialBalance,
  initialBalance,
  "USD",
  "credit",
  "Initial card balance credit"
);
```

### Transaction Creation

Detailed transaction records with all relevant information:

```typescript
await TransactionModel.create({
  id: transactionId,
  company_id: company.id,
  customer_id: customer.id,
  wallet_id: companyWallet.id,
  card_id: cardId,
  category: TRANSACTION_CATEGORY.CARD,
  type: TRANSACTION_TYPE.CARD_ISSUANCE_FIRST,
  status: TRANSACTION_STATUS.SUCCESS,
  description: `Card issuance for ${customer.first_name} ${customer.last_name}`,
  amount: feeCalculation.totalFee,
  currency: "USD",
  fee_amount: feeCalculation.issuanceFee,
  net_amount: context.completeDto.initialBalance,
  reference: clientReference,
  // ... timestamps
});
```

## Fee Calculation System

### Range-Based Fee Structure

```typescript
async calculatePaymentSuccessFees(
  companyId: string,
  transactionAmount: number,
  countryIsoCode: string = "CM"
) {
  const cardFees = await getCardFees(companyId, countryIsoCode);

  // Find applicable range
  const ranges = Array.from(cardFees.paymentSuccessFees.keys());
  const applicableRange = ranges.find((range) => {
    const [min, max] = range.split("_").map(Number);
    return transactionAmount >= min && transactionAmount <= max;
  });

  if (applicableRange) {
    const feeConfig = cardFees.paymentSuccessFees.get(applicableRange);
    const feeAmount = feeConfig.type === "PERCENTAGE"
      ? (transactionAmount * feeConfig.value) / 100
      : feeConfig.value;

    return {
      feeUsd: feeAmount,
      feeXaf: feeAmount * 650,
      rangeUsed: applicableRange,
    };
  }

  // Fallback calculation
  return {
    feeUsd: Math.max(0.5, transactionAmount * 0.005),
    feeXaf: Math.max(325, transactionAmount * 0.005 * 650),
  };
}
```

## Webhook Processing

### Timeout Management

```typescript
const webhookResult = await webhookWaitingService.waitForWebhook(
  clientReference,
  600000 // 10 minutes timeout
);

if (!webhookResult.success) {
  if (webhookResult.timeout) {
    throw new WebhookTimeoutError(clientReference, 600000);
  }
  throw new CardIssuanceError(
    webhookResult.error || "Failed to create card via webhook",
    "WEBHOOK_FAILED"
  );
}
```

### Webhook Event Processing

```typescript
static async handleWebhook(payload: any) {
  const eventType = payload.event;

  switch (eventType) {
    case "issuing.transaction":
      return await this.processTransaction(payload);
    case "issuing.created.successful":
      return await this.processCardCreated(payload);
    case "issuing.created.failed":
      return await this.processCardCreationFailed(payload);
    case "issuing.terminated":
      return await this.processCardTerminated(payload);
    default:
      console.warn(`Unknown webhook event type: ${eventType}`);
      return { success: true, message: "Event acknowledged but not processed" };
  }
}
```

## Notification System

### Multi-Channel Notifications

```typescript
// Database notification
await NotificationService.sendCardIssuanceSuccessNotification({
  customerId: customer.id,
  companyId: company.id,
  cardId: savedCard?.id,
  amount: completeDto.initialBalance,
  currency: "USD",
  reference: clientReference,
});

// Email notification
if (company.email) {
  await NotificationService.sendCardCreationEmail({
    company,
    customer,
    card: savedCard,
    amount: completeDto.initialBalance,
    currency: "USD",
    reference: clientReference,
  });
}
```

## Legacy Compatibility

### Adapter Pattern Implementation

```typescript
const issueRetailCardAdapted = async (
  issueCardDto: any,
  customerId: string,
  name?: string,
  color?: string
) => {
  // Initialize services if needed
  initializeServices();

  // Convert legacy parameters to new request format
  const request: CardIssuanceRequest = {
    customerId,
    cardBrand: issueCardDto.cardBrand,
    initialBalance: issueCardDto.initialBalance,
    clientReference: issueCardDto.clientReference,
    name: name || issueCardDto.name,
    color: color || issueCardDto.color,
  };

  // Use refactored service
  return CardIssuanceService.issueRetailCard(request);
};
```

## Configuration Management

### Service Initialization

```typescript
let servicesInitialized = false;

const initializeServices = () => {
  if (!servicesInitialized) {
    const configService = new ConfigService();
    NotificationService.initialize(configService);
    servicesInitialized = true;
  }
};
```

## Testing Strategy

### Service Layer Testing

- Each service can be tested independently
- Mock external dependencies (Maplerad API, database)
- Test error scenarios with proper cleanup verification
- Integration tests for complete workflows

### Error Scenario Testing

- Insufficient funds handling
- Webhook timeout scenarios
- Database failure recovery
- External API failure handling

## Performance Considerations

### Optimization Strategies

- Efficient database queries with proper indexing
- Async operations for non-blocking processing
- Connection pooling for database operations
- Caching for frequently accessed data

### Monitoring Points

- Process completion times
- Error rates by stage
- Webhook response times
- Database query performance
