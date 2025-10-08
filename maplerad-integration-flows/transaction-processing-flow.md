# Transaction Processing Flow

## Overview

The Transaction Processing Flow handles the complete lifecycle of card transactions from initiation through settlement. This flow manages both real-time transaction processing during merchant interactions and post-processing of transaction data for reporting and reconciliation.

## Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Transaction │───▶│ Authorization│───▶│ Maplerad   │
│ Initiation  │    │ Check       │    │ Processing │
│ (Merchant)  │    │ & Validation│    │ & Response │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Settlement  │───▶│ Balance     │───▶│ Webhook     │
│ Processing  │    │ Updates     │    │ Notification│
│ & Clearing  │    │ & Fees      │    │ & Sync      │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Reconciliation│───▶│ Reporting  │───▶│ Audit Trail │
│ & Validation │    │ & Analytics│    │ & Compliance│
│             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Transaction Types

### 1. Purchase/Authorization Transactions

**Description**: Standard merchant purchase transactions

**Flow Characteristics**:

- Real-time processing
- Immediate authorization response
- Balance deduction on approval
- Settlement occurs later

### 2. Settlement Transactions

**Description**: Clearing and settlement of authorized transactions

**Flow Characteristics**:

- Batch processing
- Final balance updates
- Fee calculations and deductions
- Reconciliation with authorizations

### 3. Refund Transactions

**Description**: Reversal of previous transactions

**Flow Characteristics**:

- Credit to card balance
- Linked to original transaction
- Fee processing
- Notification to customer

### 4. Failed Transaction Charges

**Description**: Fees for declined transactions

**Flow Characteristics**:

- Automatic fee assessment
- Balance deduction
- No merchant interaction
- Regulatory compliance

## Step-by-Step Transaction Flow

### Phase 1: Transaction Initiation

**File**: `src/modules/maplerad/maplerad.controller.ts` (lines 71-90)

**Merchant Transaction Request**:

```typescript
// Merchant initiates transaction
const transactionRequest = {
  cardNumber: "4111111111111111",
  amount: 100.0,
  currency: "USD",
  merchant: {
    name: "Online Store",
    category: "retail",
    city: "New York",
    country: "US",
  },
  timestamp: new Date(),
};
```

**Card Validation**:

```typescript
// Validate card exists and is active
const cardResult = await CardModel.getOne({
  number: encryptedCardNumber, // Encrypted lookup
  status: "ACTIVE",
});

if (!cardResult.output) {
  return {
    approved: false,
    responseCode: "05", // Do not honor
    message: "Card not found or inactive",
  };
}

const card = cardResult.output;
```

### Phase 2: Authorization Processing

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 320-360)

**Balance Verification**:

```typescript
// Check available balance
const availableBalance = card.balance;
const transactionAmount = transactionRequest.amount;

if (availableBalance < transactionAmount) {
  return {
    approved: false,
    responseCode: "51", // Insufficient funds
    message: "Insufficient card balance",
  };
}
```

**Risk Assessment**:

```typescript
// Basic risk checks
const riskFactors = {
  amount: transactionAmount,
  merchantCategory: transactionRequest.merchant.category,
  cardVelocity: await this.checkCardVelocity(card.id),
  geographicRisk: this.assessGeographicRisk(
    transactionRequest.merchant.country,
    card.country
  ),
};

// Decline if high risk
if (this.isHighRisk(riskFactors)) {
  return {
    approved: false,
    responseCode: "01", // Refer to card issuer
    message: "Transaction declined due to risk assessment",
  };
}
```

**Maplerad Authorization**:

```typescript
// Forward to Maplerad for processing
const mapleradRequest = {
  card_id: card.provider_card_id,
  amount: convertToSmallestUnit(transactionAmount),
  currency: "USD",
  merchant: transactionRequest.merchant,
  timestamp: transactionRequest.timestamp,
};

const authResult = await mapleradUtils.authorizeTransaction(mapleradRequest);

if (!authResult.approved) {
  return {
    approved: false,
    responseCode: authResult.responseCode,
    message: authResult.message,
  };
}
```

### Phase 3: Transaction Approval

**Hold Amount**:

```typescript
// Place hold on card balance
const holdAmount = transactionAmount;
const newBalance = card.balance - holdAmount;

await CardModel.update(card.id, {
  balance: newBalance,
  held_balance: (card.held_balance || 0) + holdAmount,
});
```

**Create Authorization Record**:

```typescript
// Record authorization
const authRecord = {
  id: uuidv4(),
  type: "authorization",
  category: "card",
  amount: transactionAmount,
  currency: "USD",
  customer_id: card.customer_id,
  company_id: card.company_id,
  card_id: card.id,
  order_id: authResult.transactionId,
  provider: encodeText("maplerad"),
  status: "PENDING",
  description: `Authorization: ${transactionRequest.merchant.name}`,
  merchant: transactionRequest.merchant,
  created_at: new Date(),
};

await TransactionModel.create(authRecord);
```

**Return Approval Response**:

```typescript
return {
  approved: true,
  responseCode: "00", // Approved
  authorizationCode: authResult.authCode,
  transactionId: authRecord.id,
  message: "Transaction approved",
};
```

### Phase 4: Settlement Processing

**Settlement Initiation** (Batch Process):

```typescript
// Process settlements in batches
const pendingAuthorizations = await TransactionModel.get({
  type: "authorization",
  status: "PENDING",
  created_at: {
    lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24 hours
  },
});
```

**Settlement with Maplerad**:

```typescript
// Settle each authorization
for (const auth of pendingAuthorizations) {
  const settlementResult = await mapleradUtils.settleTransaction({
    transaction_id: auth.order_id,
    amount: convertToSmallestUnit(auth.amount),
  });

  if (settlementResult.success) {
    // Update authorization status
    await TransactionModel.update(auth.id, {
      status: "SETTLED",
      settled_at: new Date(),
    });

    // Create settlement transaction
    await TransactionModel.create({
      id: uuidv4(),
      type: "settlement",
      category: "card",
      amount: auth.amount,
      currency: "USD",
      customer_id: auth.customer_id,
      company_id: auth.company_id,
      card_id: auth.card_id,
      order_id: settlementResult.settlementId,
      provider: encodeText("maplerad"),
      status: "SUCCESS",
      description: `Settlement: ${auth.description}`,
      created_at: new Date(),
    });
  }
}
```

**Balance Reconciliation**:

```typescript
// Release held balance
const card = await CardModel.getOne({ id: auth.card_id });
const newHeldBalance = Math.max(0, card.held_balance - auth.amount);

await CardModel.update(card.id, {
  held_balance: newHeldBalance,
});
```

### Phase 5: Fee Processing

**Transaction Fee Calculation**:

```typescript
// Calculate fees based on transaction type and amount
const feeStructure = {
  domestic: 0.029, // 2.9% for domestic transactions
  international: 0.039, // 3.9% for international
  atm: 2.5, // $2.50 flat fee for ATM
  failed: 0.25, // $0.25 for failed transactions
};

const feeAmount = this.calculateTransactionFee(
  transactionAmount,
  transactionType,
  merchantCountry,
  cardCountry
);
```

**Fee Deduction**:

```typescript
// Deduct fee from card balance
if (feeAmount > 0) {
  const card = await CardModel.getOne({ id: transaction.card_id });
  const newBalance = card.balance - feeAmount;

  await CardModel.update(card.id, { balance: newBalance });

  // Record fee transaction
  await TransactionModel.create({
    id: uuidv4(),
    type: "fee",
    category: "card",
    amount: feeAmount,
    currency: "USD",
    customer_id: card.customer_id,
    company_id: card.company_id,
    card_id: card.id,
    provider: encodeText("maplerad"),
    status: "SUCCESS",
    description: `Transaction fee: ${transaction.description}`,
    created_at: new Date(),
  });
}
```

### Phase 6: Notification and Alerts

**Customer Notifications**:

```typescript
// Send transaction notification
await NotificationModel.create({
  title: "Card Transaction",
  customer_id: transaction.customer_id,
  text: `Transaction of $${transactionAmount} at ${merchantName}\n\nRemaining balance: $${newBalance}`,
  category: "card_transaction",
  transaction_id: transaction.id,
});
```

**Low Balance Alerts**:

```typescript
// Check for low balance
const lowBalanceThreshold = 10.0; // $10 threshold

if (newBalance <= lowBalanceThreshold) {
  await NotificationModel.create({
    title: "Low Card Balance Alert",
    customer_id: transaction.customer_id,
    text: `Your card balance is low: $${newBalance}\n\nPlease fund your card to avoid declined transactions.`,
    category: "low_balance",
    priority: "high",
  });
}
```

### Phase 7: Reconciliation and Reporting

**Daily Reconciliation**:

```typescript
// Reconcile transactions with Maplerad
const reconciliationReport = await this.generateReconciliationReport(
  startDate,
  endDate
);

// Compare local transactions with Maplerad statements
const discrepancies = await this.findDiscrepancies(
  localTransactions,
  mapleradTransactions
);

// Log reconciliation results
await this.logReconciliationResults(reconciliationReport, discrepancies);
```

**Transaction Analytics**:

```typescript
// Generate transaction insights
const analytics = {
  totalVolume: await TransactionModel.sum({ dateRange }),
  transactionCount: await TransactionModel.count({ dateRange }),
  averageTicket: totalVolume / transactionCount,
  topMerchants: await this.getTopMerchants(dateRange),
  geographicDistribution: await this.getGeographicDistribution(dateRange),
  failureRate: await this.calculateFailureRate(dateRange),
};

// Store analytics for reporting
await AnalyticsModel.create({
  date: new Date(),
  type: "card_transactions",
  data: analytics,
});
```

## Error Scenarios

### Authorization Declines

**Insufficient Funds**:

```typescript
if (card.balance < transactionAmount) {
  // Log decline reason
  await this.logTransactionDecline(
    card.id,
    transactionAmount,
    "INSUFFICIENT_FUNDS"
  );

  // Send webhook notification
  await this.sendWebhookNotification("authorization.declined", {
    card: card.provider_card_id,
    amount: transactionAmount,
    reason: "insufficient_funds",
    narration: `Available balance: $${card.balance}, Required: $${transactionAmount}`,
  });

  return {
    approved: false,
    responseCode: "51",
    message: "Insufficient funds",
  };
}
```

**Card Inactive/Frozen**:

```typescript
if (card.status !== "ACTIVE") {
  await this.logTransactionDecline(card.id, transactionAmount, "CARD_INACTIVE");

  return {
    approved: false,
    responseCode: "46", // Closed account
    message: "Card is not active",
  };
}
```

### Settlement Failures

**Settlement Processing Error**:

```typescript
// Handle settlement failures
if (!settlementResult.success) {
  await TransactionModel.update(auth.id, {
    status: "SETTLEMENT_FAILED",
    reason: settlementResult.error,
  });

  // Queue for retry
  await this.queueSettlementRetry(auth.id);

  console.error(
    `Settlement failed for transaction ${auth.id}:`,
    settlementResult.error
  );
}
```

## Performance Considerations

### Transaction Batching

```typescript
// Process transactions in batches for efficiency
const batchSize = 100;
const transactions = await TransactionModel.get({
  status: "PENDING",
  limit: batchSize,
});

// Process batch
const results = await Promise.allSettled(
  transactions.map((tx) => this.processTransaction(tx))
);

// Handle results
results.forEach((result, index) => {
  if (result.status === "rejected") {
    console.error(
      `Transaction ${transactions[index].id} failed:`,
      result.reason
    );
  }
});
```

### Caching Strategy

```typescript
// Cache frequently accessed data
const cardCacheKey = `card:${cardId}`;
let card = await this.cache.get(cardCacheKey);

if (!card) {
  card = await CardModel.getOne({ id: cardId });
  await this.cache.set(cardCacheKey, card, 300); // 5 minutes
}

// Cache merchant risk scores
const merchantRiskKey = `merchant_risk:${merchantId}`;
let riskScore = await this.cache.get(merchantRiskKey);

if (riskScore === null) {
  riskScore = await this.calculateMerchantRisk(merchantId);
  await this.cache.set(merchantRiskKey, riskScore, 3600); // 1 hour
}
```

### Database Optimization

```typescript
// Use database indexes for fast queries
const transactions = await TransactionModel.get(
  {
    card_id: cardId,
    created_at: {
      gte: startDate,
      lte: endDate,
    },
  },
  {
    orderBy: { created_at: "desc" },
    include: ["card", "customer"],
  }
);
```

## Monitoring Points

### Transaction Entry

```typescript
console.log("💳 TRANSACTION PROCESSING - START", {
  transactionId: transaction.id,
  cardId: transaction.card_id,
  amount: transaction.amount,
  merchant: transaction.merchant?.name,
  type: transaction.type,
  timestamp: new Date().toISOString(),
});
```

### Authorization Phase

```typescript
console.log("🔐 AUTHORIZATION PHASE", {
  transactionId,
  approved: authResult.approved,
  responseCode: authResult.responseCode,
  processingTime: Date.now() - startTime,
});
```

### Settlement Phase

```typescript
console.log("💰 SETTLEMENT PHASE", {
  transactionId,
  settled: settlementResult.success,
  settlementId: settlementResult.settlementId,
  processingTime: Date.now() - startTime,
});
```

### Completion

```typescript
console.log("✅ TRANSACTION PROCESSING - COMPLETED", {
  transactionId,
  finalStatus: transaction.status,
  totalProcessingTime: Date.now() - startTime,
  success: true,
});
```

## Testing Strategy

### Unit Tests

```typescript
describe("Transaction Processing Flow", () => {
  it("should approve valid transaction", async () => {
    // Mock card with sufficient balance
    jest.spyOn(CardModel, "getOne").mockResolvedValue({
      output: { ...mockCard, balance: 100 },
    });

    const result = await service.processAuthorization({
      cardNumber: "4111111111111111",
      amount: 50,
      merchant: mockMerchant,
    });

    expect(result.approved).toBe(true);
    expect(result.responseCode).toBe("00");
  });

  it("should decline insufficient funds", async () => {
    jest.spyOn(CardModel, "getOne").mockResolvedValue({
      output: { ...mockCard, balance: 10 },
    });

    const result = await service.processAuthorization({
      cardNumber: "4111111111111111",
      amount: 50,
      merchant: mockMerchant,
    });

    expect(result.approved).toBe(false);
    expect(result.responseCode).toBe("51");
  });
});
```

### Integration Tests

```typescript
describe("Transaction Integration", () => {
  it("should process complete transaction lifecycle", async () => {
    // 1. Create test card with balance
    const card = await createTestCard(100);

    // 2. Process authorization
    const authResult = await processTransaction({
      cardId: card.id,
      amount: 25,
      merchant: "Test Merchant",
    });

    expect(authResult.approved).toBe(true);

    // 3. Verify balance hold
    const updatedCard = await CardModel.getOne({ id: card.id });
    expect(updatedCard.balance).toBe(75); // 100 - 25
    expect(updatedCard.held_balance).toBe(25);

    // 4. Process settlement
    await processSettlement(authResult.transactionId);

    // 5. Verify final state
    const finalCard = await CardModel.getOne({ id: card.id });
    expect(finalCard.balance).toBe(75); // Held amount cleared
    expect(finalCard.held_balance).toBe(0);
  });
});
```

## Success Metrics

- **Authorization Success Rate**: > 95% of valid transactions approved
- **Settlement Success Rate**: > 99% of authorizations settled
- **Average Processing Time**: < 200ms for authorizations
- **Reconciliation Accuracy**: > 99.9% match with Maplerad statements

## Troubleshooting

### Common Issues

1. **Authorization Timeouts**: Network issues with Maplerad
2. **Balance Inconsistencies**: Race conditions in concurrent transactions
3. **Settlement Failures**: Communication issues during batch processing
4. **Fee Calculation Errors**: Incorrect fee application
5. **Duplicate Transactions**: Same transaction processed multiple times

### Debug Steps

1. Check transaction logs for processing timeline
2. Verify card balance and hold amounts
3. Review Maplerad API responses
4. Check for concurrent transaction conflicts
5. Validate fee calculation logic

This comprehensive transaction processing flow ensures secure, reliable, and efficient handling of all card transactions with proper authorization, settlement, and reconciliation processes.
