# Webhook Processing Flow

## Overview

The Webhook Processing Flow handles real-time notifications from Maplerad about card events, transactions, and status changes. This is an asynchronous, event-driven flow that processes incoming webhooks, updates local data, and triggers appropriate actions.

## Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Validation  │───▶│ Event       │
│ Received    │    │ & Security  │    │ Routing     │
│ POST /webhook│   │ Checks      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Event       │───▶│ Data        │───▶│ Database    │
│ Processing  │    │ Transformation│  │ Updates     │
│ Handler     │    │ & Mapping    │    │ & Sync      │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Notifications│───▶│ Audit Log   │───▶│ Response    │
│ & Alerts    │    │ Creation    │    │ Success     │
│             │    │ & Tracking  │    │ / Error     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Step-by-Step Process

### Step 1: Webhook Reception

**File**: `src/modules/webhook/webhook.controller.ts` (lines 15-25)

**Endpoint**: `POST /webhook/maplerad`

**Raw Webhook Payload**:

```json
{
  "type": "transaction.created",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "_id": "txn_123456789",
      "card": "card_abcdef123456",
      "amount": 5000,
      "merchant": {
        "name": "Amazon",
        "category": "retail",
        "city": "Seattle",
        "country": "US"
      },
      "status": "success"
    }
  }
}
```

**Initial Logging**:

```typescript
// Log webhook reception
console.log("------------ MAPLERAD WEBHOOK RECEIVED -------------");
console.log("Headers:", JSON.stringify(req.headers, null, 2));
console.log("Raw Body:", req.body);
console.log("Content-Type:", req.headers["content-type"]);
console.log("User-Agent:", req.headers["user-agent"]);
console.log("---------------------------------------------------");
```

### Step 2: Security Validation

**File**: `src/modules/webhook/webhook.service.ts` (lines 10-30)

**Signature Verification** (Optional but Recommended):

```typescript
// Verify webhook signature if configured
const signature = headers["x-maplerad-signature"];
if (process.env.MAPLERAD_WEBHOOK_SECRET && signature) {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.MAPLERAD_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body), "utf8")
    .digest("hex");

  const isValidSignature = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValidSignature) {
    console.error("❌ WEBHOOK SIGNATURE VERIFICATION FAILED");
    return { status: "error", message: "Invalid signature" };
  }
}
```

**Request Validation**:

```typescript
// Basic payload validation
if (!req.body || typeof req.body !== "object") {
  console.error("❌ INVALID WEBHOOK PAYLOAD");
  return { status: "error", message: "Invalid payload format" };
}

const { type, data } = req.body;
if (!type || !data || !data.object) {
  console.error("❌ MISSING REQUIRED WEBHOOK FIELDS");
  return { status: "error", message: "Missing required fields" };
}
```

### Step 3: Event Type Identification

**File**: `src/modules/webhook/webhook.service.ts` (lines 31-50)

**Event Type Extraction**:

```typescript
// Extract event details
const eventType = req.body.type;
const eventTime = req.body.createdAt;
const eventData = req.body.data.object;

// Log event identification
console.log(`📋 WEBHOOK EVENT IDENTIFIED: ${eventType}`);
console.log(`🕒 EVENT TIME: ${new Date(eventTime * 1000).toISOString()}`);
```

**Supported Event Types**:

```typescript
const supportedEvents = [
  "transaction.created",
  "authorization.declined",
  "authorization.code",
  "transaction.refund",
  "card.updated",
  "card.terminated",
];

if (!supportedEvents.includes(eventType)) {
  console.warn(`⚠️ UNSUPPORTED EVENT TYPE: ${eventType}`);
  return { status: "success", message: "Event type not supported" };
}
```

### Step 4: Card Identification and Validation

**File**: `src/modules/webhook/webhook.service.ts` (lines 51-80)

**Extract Card Information**:

```typescript
// Extract card ID based on event type
let cardId: string;

if (eventType === "card.updated" || eventType === "card.terminated") {
  cardId = eventData._id;
} else {
  // For transaction events
  cardId = eventData.card;
}

console.log(`💳 CARD ID EXTRACTED: ${cardId}`);
```

**Card Lookup in Database**:

```typescript
// Find card in local database
const cardResult = await CardModel.getOne({
  provider_card_id: cardId,
});

if (!cardResult.output) {
  console.error(`❌ CARD NOT FOUND IN DATABASE: ${cardId}`);
  return { status: "error", message: "Card not found in database" };
}

const card = cardResult.output;
console.log(`✅ CARD FOUND: ${card.id} (Customer: ${card.customer_id})`);
```

### Step 5: Duplicate Event Detection

**File**: `src/modules/webhook/webhook.service.ts` (lines 81-110)

**Check for Duplicate Processing**:

```typescript
// Prevent duplicate processing using Redis
const eventKey = `webhook:${eventType}:${cardId}:${eventData._id}`;
const isDuplicate = await this.redis.exists(eventKey);

if (isDuplicate) {
  console.log(`🔄 DUPLICATE EVENT DETECTED: ${eventKey}`);
  return { status: "success", message: "Event already processed" };
}

// Mark event as processed
await this.redis.setex(eventKey, 3600, "processed"); // 1 hour TTL
```

**Database Duplicate Check**:

```typescript
// For transaction events, check if already processed
if (eventType.includes("transaction")) {
  const existingTransaction = await TransactionModel.getOne({
    order_id: eventData._id,
    card_id: card.id,
  });

  if (existingTransaction.output) {
    console.log(`🔄 TRANSACTION ALREADY EXISTS: ${eventData._id}`);
    return { status: "success", message: "Transaction already recorded" };
  }
}
```

### Step 6: Event-Specific Processing

**File**: `src/modules/webhook/webhook.service.ts` (lines 111-140)

**Route to Event Handler**:

```typescript
// Route based on event type
switch (eventType) {
  case "transaction.created":
    await this.handleTransactionCreated(card, eventData, eventTime);
    break;

  case "authorization.declined":
    await this.handleAuthorizationDeclined(card, eventData, eventTime);
    break;

  case "authorization.code":
    await this.handleAuthorizationCode(card, eventData, eventTime);
    break;

  case "transaction.refund":
    await this.handleTransactionRefund(card, eventData, eventTime);
    break;

  case "card.updated":
    await this.handleCardUpdated(card, eventData, eventTime);
    break;

  case "card.terminated":
    await this.handleCardTerminated(card, eventData, eventTime);
    break;

  default:
    console.warn(`⚠️ NO HANDLER FOR EVENT TYPE: ${eventType}`);
}
```

### Step 7: Transaction Created Handler

**File**: `src/modules/webhook/webhook.service.ts` (lines 141-180)

**Process Transaction Data**:

```typescript
private async handleTransactionCreated(card: any, data: any, eventTime: number) {
  // Convert amount from cents to dollars
  const usdAmount = Math.abs(Number(data.amount)) / 100;

  // Determine transaction type
  const transactionType = this.categorizeTransaction(data.merchant);

  // Prepare transaction record
  const transactionData = {
    id: uuidv4(),
    amount: usdAmount,
    currency: "USD",
    category: "card",
    type: transactionType,
    status: "SUCCESS",
    customer_id: card.customer_id,
    company_id: card.company_id,
    card_id: card.id,
    order_id: data._id,
    provider: encodeText("maplerad"),
    description: this.buildTransactionDescription(data.merchant, transactionType),
    created_at: new Date(eventTime * 1000).toISOString()
  };

  // Create transaction record
  const transactionResult = await TransactionModel.create(transactionData);

  if (transactionResult.error) {
    console.error("❌ FAILED TO CREATE TRANSACTION RECORD", transactionResult.error);
    return;
  }

  // Update card balance
  const newBalance = card.balance - usdAmount;
  await CardModel.update(card.id, { balance: newBalance });

  console.log(`✅ TRANSACTION PROCESSED: ${transactionData.id} - $${usdAmount}`);
}
```

### Step 8: Authorization Declined Handler

**File**: `src/modules/webhook/webhook.service.ts` (lines 181-210)

**Process Failed Authorization**:

```typescript
private async handleAuthorizationDeclined(card: any, data: any, eventTime: number) {
  const usdAmount = Math.abs(Number(data.amount)) / 100;

  // Create failed transaction record
  const transactionData = {
    id: uuidv4(),
    amount: usdAmount,
    currency: "USD",
    category: "card",
    type: "authorization",
    status: "FAILED",
    customer_id: card.customer_id,
    company_id: card.company_id,
    card_id: card.id,
    order_id: data._id,
    provider: encodeText("maplerad"),
    reason: data.requestHistory?.[0]?.narration || "Authorization declined",
    description: `Failed payment: ${data.merchant?.name || 'Unknown merchant'}`,
    created_at: new Date(eventTime * 1000).toISOString()
  };

  await TransactionModel.create(transactionData);

  // Send notification for failed payment
  await this.sendPaymentFailureNotification(card.customer_id, usdAmount, data);

  console.log(`❌ AUTHORIZATION DECLINED PROCESSED: ${usdAmount}`);
}
```

### Step 9: 3D Secure Code Handler

**File**: `src/modules/webhook/webhook.service.ts` (lines 211-230)

**Process 3D Secure Code**:

```typescript
private async handleAuthorizationCode(card: any, data: any, eventTime: number) {
  const authCode = data.code;

  if (!authCode) {
    console.warn("⚠️ NO AUTH CODE IN WEBHOOK PAYLOAD");
    return;
  }

  // Send 3D Secure code notification
  await NotificationModel.create({
    title: "3D Secure Authorization Code",
    customer_id: card.customer_id,
    text: `Your 3D Secure code is: ${authCode}\n\nUse this code to complete your payment. This code expires soon.`,
    category: "3ds_auth_code"
  });

  console.log(`🔐 3D SECURE CODE SENT: ${authCode.substring(0, 2)}****`);
}
```

### Step 10: Card Status Update Handler

**File**: `src/modules/webhook/webhook.service.ts` (lines 231-260)

**Process Card Status Changes**:

```typescript
private async handleCardUpdated(card: any, data: any, eventTime: number) {
  // Map Maplerad status to local status
  const statusMapping = {
    'active': 'ACTIVE',
    'inactive': 'FREEZE',
    'canceled': 'TERMINATED'
  };

  const newStatus = statusMapping[data.status] || data.status?.toUpperCase();

  if (newStatus && newStatus !== card.status) {
    await CardModel.update(card.id, { status: newStatus });

    // Log status change
    await CustomerLogsModel.create({
      customer_id: card.customer_id,
      action: "card-status-changed",
      status: "SUCCESS",
      log_json: {
        card_id: card.id,
        old_status: card.status,
        new_status: newStatus,
        maplerad_status: data.status
      },
      log_txt: `Card status changed: ${card.status} → ${newStatus}`,
      created_at: new Date()
    });

    console.log(`🔄 CARD STATUS UPDATED: ${card.status} → ${newStatus}`);
  }
}
```

### Step 11: Notification System

**File**: `src/modules/webhook/webhook.service.ts` (lines 261-280)

**Send Customer Notifications**:

```typescript
private async sendPaymentFailureNotification(
  customerId: string,
  amount: number,
  webhookData: any
) {
  const merchantName = webhookData.merchant?.name || 'Unknown Merchant';

  await NotificationModel.create({
    title: "Payment Failed",
    customer_id: customerId,
    text: `Your payment of $${amount} to ${merchantName} was declined.\n\nReason: ${webhookData.requestHistory?.[0]?.narration || 'Payment declined by card issuer'}`,
    category: "payment_failed",
    transaction_id: null // Will be set when transaction is created
  });
}
```

### Step 12: Audit Logging

**File**: `src/modules/webhook/webhook.service.ts` (lines 281-300)

**Comprehensive Event Logging**:

```typescript
// Log webhook processing completion
await CustomerLogsModel.create({
  customer_id: card.customer_id,
  action: `webhook-${eventType.replace(".", "-")}`,
  status: "SUCCESS",
  log_json: {
    webhook_event_type: eventType,
    webhook_event_time: eventTime,
    card_id: card.id,
    processed_data: {
      amount: data.amount,
      merchant: data.merchant?.name,
      status: data.status,
    },
    processing_timestamp: new Date().toISOString(),
  },
  log_txt: `Webhook processed: ${eventType} for card ${card.id}`,
  created_at: new Date(),
});
```

### Step 13: Success Response

**File**: `src/modules/webhook/webhook.service.ts` (lines 301-310)

**Webhook Acknowledgment**:

```typescript
// Return success response to Maplerad
return {
  status: "success",
  message: `Event ${eventType} processed successfully`,
  processed: true,
  timestamp: new Date().toISOString(),
};
```

## Error Handling

### Webhook Processing Errors

```typescript
try {
  // Webhook processing logic
  await this.processWebhookEvent(eventType, card, data, eventTime);
} catch (error) {
  console.error("❌ WEBHOOK PROCESSING ERROR", {
    eventType,
    cardId: card?.id,
    error: error.message,
    stack: error.stack,
  });

  // Log error but still return success to prevent retries
  await this.logWebhookError(eventType, card?.id, error);

  return {
    status: "success", // Return success to stop Maplerad retries
    message: "Event received but processing failed",
    error: true,
  };
}
```

### Database Error Recovery

```typescript
// Handle database errors gracefully
if (transactionResult.error) {
  console.error(
    "❌ DATABASE ERROR IN WEBHOOK PROCESSING",
    transactionResult.error
  );

  // Don't throw - log and continue
  await this.logDatabaseError(eventType, card.id, transactionResult.error);

  // Attempt to queue for retry
  await this.queueForRetry(eventType, card.id, data);
}
```

## Performance Considerations

### Asynchronous Processing

```typescript
// Process webhook asynchronously to avoid timeouts
@Post('/webhook/maplerad')
async handleWebhook(@Body() body: any, @Headers() headers: any, @Req() req: any) {
  // Immediately acknowledge receipt
  const response = { status: "success", received: true };

  // Process in background
  setImmediate(() => {
    this.processWebhookAsync(body, headers, req)
      .catch(error => console.error("Async webhook processing failed:", error));
  });

  return response;
}
```

### Batch Processing

```typescript
// Batch multiple webhook events if needed
private async processWebhookBatch(events: WebhookEvent[]): Promise<void> {
  const transactionPromises = events.map(event =>
    TransactionModel.create(event.transactionData)
  );

  await Promise.allSettled(transactionPromises);
}
```

### Caching Strategy

```typescript
// Cache card data to reduce database queries
private async getCachedCard(cardId: string): Promise<any> {
  const cacheKey = `card:${cardId}`;
  let card = await this.cache.get(cacheKey);

  if (!card) {
    const cardResult = await CardModel.getOne({ provider_card_id: cardId });
    card = cardResult.output;

    if (card) {
      await this.cache.set(cacheKey, card, 300); // 5 minutes TTL
    }
  }

  return card;
}
```

## Monitoring Points

### Flow Entry

```typescript
console.log("🏠 WEBHOOK PROCESSING FLOW - START", {
  eventType,
  cardId,
  eventTime,
  payloadSize: JSON.stringify(req.body).length,
  timestamp: new Date().toISOString(),
});
```

### Key Checkpoints

```typescript
// After validation
console.log("✅ WEBHOOK - VALIDATION PASSED", { eventType, cardId });

// After card lookup
console.log("🔍 WEBHOOK - CARD FOUND", {
  cardId: card.id,
  customerId: card.customer_id,
});

// After processing
console.log("⚙️ WEBHOOK - EVENT PROCESSED", { eventType, success: true });
```

### Flow Exit

```typescript
console.log("🎉 WEBHOOK PROCESSING FLOW - COMPLETED", {
  eventType,
  cardId,
  duration: Date.now() - startTime,
  success: true,
});
```

## Testing Strategy

### Webhook Simulation

```typescript
describe("Webhook Processing Flow", () => {
  it("should process transaction.created event", async () => {
    const webhookPayload = {
      type: "transaction.created",
      createdAt: 1638360000,
      data: {
        object: {
          _id: "txn_test_123",
          card: "card_test_456",
          amount: 10000,
          merchant: { name: "Test Merchant" },
          status: "success",
        },
      },
    };

    // Mock card lookup
    jest.spyOn(CardModel, "getOne").mockResolvedValue({
      output: mockCard,
    });

    const result = await service.processMapleradWebhook(
      webhookPayload,
      {},
      { body: webhookPayload }
    );

    expect(result.status).toBe("success");
    expect(result.processed).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe("Webhook Integration", () => {
  it("should handle real webhook payload", async () => {
    // Create test card
    const card = await createTestCard();

    // Simulate webhook payload
    const webhookData = {
      type: "transaction.created",
      data: {
        object: {
          _id: "txn_integration_123",
          card: card.provider_card_id,
          amount: 5000,
          merchant: { name: "Integration Test" },
        },
      },
    };

    // Send webhook
    const response = await request(app.getHttpServer())
      .post("/webhook/maplerad")
      .send(webhookData);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");

    // Verify transaction created
    const transaction = await TransactionModel.getOne({
      order_id: "txn_integration_123",
    });

    expect(transaction.output).toBeDefined();
    expect(transaction.output.amount).toBe(50); // 5000 cents = 50 USD
  });
});
```

## Success Metrics

- **Processing Success Rate**: > 99% of webhooks processed successfully
- **Average Processing Time**: < 500ms per webhook
- **Duplicate Detection Rate**: > 95% of duplicates caught
- **Error Recovery Rate**: > 98% of errors handled gracefully

## Troubleshooting

### Common Issues

1. **Invalid Signatures**: Webhook signature verification failures
2. **Missing Cards**: Webhook received for non-existent cards
3. **Duplicate Processing**: Same event processed multiple times
4. **Database Connection Issues**: Failures during data persistence
5. **Timeout Issues**: Webhook processing taking too long

### Debug Steps

1. Check webhook payload structure and required fields
2. Verify card exists in database with correct provider_card_id
3. Review Redis for duplicate event detection
4. Check database connectivity and transaction status
5. Monitor processing time and identify bottlenecks

This comprehensive webhook processing flow ensures reliable, real-time updates from Maplerad with proper error handling, duplicate detection, and performance optimization.
