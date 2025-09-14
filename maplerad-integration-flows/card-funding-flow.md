# Card Funding Flow

## Overview

The Card Funding Flow handles the process of adding money to an existing virtual card from the company's USD wallet. This is a synchronous flow that requires immediate balance updates and transaction recording.

## Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ API Request │───▶│ Controller  │───▶│  Service    │
│             │    │ Validation  │    │ Business    │
│ POST /fund  │    │ & Guards    │    │ Logic       │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Card &      │───▶│ Balance     │───▶│ Maplerad   │
│ Wallet      │    │ Validation  │    │ API Call   │
│ Validation  │    │ & Checks    │    │ Funding    │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Database    │───▶│ Transaction │───▶│ Response    │
│ Updates     │    │ Records     │    │ Success     │
│ & Sync      │    │ & Audit     │    │ / Error     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Step-by-Step Process

### Step 1: API Request Reception

**File**: `src/modules/maplerad/maplerad.controller.ts` (lines 51-70)

**Endpoint**: `POST /maplerad/cards/:cardId/fund`

**Input Validation**:

```typescript
// Request body validation
{
  customer_id: string,  // Required: Customer UUID for verification
  amount: number       // Required: Amount to fund (min: 1 USD)
}
```

**Path Parameter Validation**:

```typescript
// Card ID validation
const cardId = params.cardId;
if (!cardId || !isValidUUID(cardId)) {
  throw new BadRequestException("Invalid card ID");
}
```

### Step 2: Authentication & Authorization

**JWT Token Validation**:

```typescript
// Extract and validate JWT token
const authHeader = headers.authorization;
if (!authHeader?.startsWith("Bearer ")) {
  throw new UnauthorizedException("Missing or invalid authorization header");
}

const token = authHeader.substring(7);
const user = await this.jwtService.verify(token);
```

**Company Ownership Verification**:

```typescript
// Ensure user belongs to company that owns the card
const card = await CardModel.getOne({
  id: cardId,
  company_id: user.companyId,
});

if (!card) {
  throw new NotFoundException("Card not found or access denied");
}
```

### Step 3: Card Validation

**Card Existence Check**:

```typescript
// Verify card exists and is accessible
const card = await CardModel.getOne({
  id: cardId,
  customer_id: fundCardDto.customer_id,
  company_id: user.companyId,
});

if (!card) {
  throw new NotFoundException("Card not found");
}
```

**Card Status Validation**:

```typescript
// Check if card is in valid state for funding
if (card.status === CardStatus.TERMINATED) {
  throw new BadRequestException("Cannot fund terminated card");
}

if (card.status === CardStatus.FROZEN) {
  throw new BadRequestException("Cannot fund frozen card");
}

if (decodeText(card.provider) !== "maplerad") {
  throw new BadRequestException("Card is not a Maplerad card");
}
```

**Amount Validation**:

```typescript
// Validate funding amount
const amount = fundCardDto.amount;
if (!amount || amount < 1) {
  throw new BadRequestException("Funding amount must be at least 1 USD");
}

if (amount > 10000) {
  throw new BadRequestException("Maximum funding amount is 10,000 USD");
}
```

### Step 4: Wallet Balance Verification

**Wallet Retrieval**:

```typescript
// Get company's USD wallet
const usdWallet = await WalletModel.getOne({
  company_id: user.companyId,
  currency: "USD",
  active: true,
});

if (!usdWallet) {
  throw new BadRequestException("USD wallet not found");
}
```

**Balance Check**:

```typescript
// Verify sufficient balance
if (usdWallet.balance < amount) {
  throw new BadRequestException(
    `Insufficient wallet balance. Required: $${amount}, Available: $${usdWallet.balance}`
  );
}
```

### Step 5: Pre-Funding Validation

**Card Balance Retrieval**:

```typescript
// Get current card balance from Maplerad
const cardBalanceResult = await mapleradUtils.getRealCardBalance(
  card.provider_card_id
);

if (cardBalanceResult.error) {
  console.warn(
    "Could not retrieve card balance from Maplerad:",
    cardBalanceResult.error
  );
  // Continue with funding but log the issue
}
```

**Transaction Limits Check**:

```typescript
// Check daily funding limits
const todayFunding = await TransactionModel.sum({
  card_id: cardId,
  type: "fund",
  created_at: {
    gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
    lt: new Date(new Date().setHours(23, 59, 59, 999)), // End of today
  },
});

const dailyLimit = 50000; // $50,000 daily limit
if ((todayFunding || 0) + amount > dailyLimit) {
  throw new BadRequestException("Daily funding limit exceeded");
}
```

### Step 6: Maplerad API Funding Call

**API Request Preparation**:

```typescript
// Prepare funding data
const fundingData = {
  cardId: card.provider_card_id,
  amount: convertToSmallestUnit(amount), // Convert to cents
  currency: "USD",
};

// Log funding attempt
console.log("💰 FUNDING CARD - START", {
  cardId: card.id,
  providerCardId: card.provider_card_id,
  amount: amount,
  currency: "USD",
  timestamp: new Date().toISOString(),
});
```

**API Call with Error Handling**:

```typescript
// Make funding call to Maplerad
const fundingResult = await mapleradUtils.fundCard(
  card.provider_card_id,
  amount
);

if (fundingResult.error) {
  console.error("❌ MAPLERAD FUNDING ERROR", {
    cardId: card.id,
    providerCardId: card.provider_card_id,
    amount: amount,
    error: fundingResult.error.message,
    details: fundingResult.error.details,
  });

  throw new BadRequestException(
    `Funding failed: ${fundingResult.error.message}`
  );
}

// Log successful API call
console.log("✅ MAPLERAD FUNDING SUCCESS", {
  cardId: card.id,
  transactionId: fundingResult.output?.id,
  amount: amount,
});
```

### Step 7: Database Updates

**Wallet Balance Update**:

```typescript
// Calculate new balances
const walletBalanceBefore = usdWallet.balance;
const walletBalanceAfter = usdWallet.balance - amount;

// Update wallet balance
const walletUpdateResult = await WalletModel.update(usdWallet.id, {
  balance: walletBalanceAfter,
});

if (walletUpdateResult.error) {
  console.error("❌ WALLET UPDATE ERROR", walletUpdateResult.error);
  throw new BadRequestException("Failed to update wallet balance");
}
```

**Card Balance Update**:

```typescript
// Update local card balance
const cardBalanceBefore = card.balance;
const cardBalanceAfter = card.balance + amount;

const cardUpdateResult = await CardModel.update(card.id, {
  balance: cardBalanceAfter,
});

if (cardUpdateResult.error) {
  console.error("❌ CARD UPDATE ERROR", cardUpdateResult.error);

  // Attempt to rollback wallet balance
  await WalletModel.update(usdWallet.id, {
    balance: walletBalanceBefore,
  });

  throw new BadRequestException("Failed to update card balance");
}
```

### Step 8: Transaction Record Creation

**Transaction Data Preparation**:

```typescript
// Prepare transaction record
const transactionData = {
  id: uuidv4(),
  type: "fund",
  category: "card",
  amount: amount,
  currency: "USD",
  customer_id: card.customer_id,
  company_id: card.company_id,
  card_id: card.id,
  card_balance_before: cardBalanceBefore,
  card_balance_after: cardBalanceAfter,
  wallet_balance_before: walletBalanceBefore,
  wallet_balance_after: walletBalanceAfter,
  provider: encodeText("maplerad"),
  order_id: fundingResult.output?.id || uuidv4(),
  description: `Card funding: ${card.masked_number}`,
  status: "SUCCESS",
  created_at: new Date(),
};
```

**Transaction Creation**:

```typescript
// Create transaction record
const transactionResult = await TransactionModel.create(transactionData);

if (transactionResult.error) {
  console.error("❌ TRANSACTION CREATION ERROR", transactionResult.error);

  // Rollback both wallet and card balance updates
  await Promise.all([
    WalletModel.update(usdWallet.id, { balance: walletBalanceBefore }),
    CardModel.update(card.id, { balance: cardBalanceBefore }),
  ]);

  throw new BadRequestException("Failed to record transaction");
}
```

### Step 9: Audit Logging

**Customer Action Log**:

```typescript
// Log successful funding
await CustomerLogsModel.create({
  customer_id: card.customer_id,
  action: "fund-card",
  status: "SUCCESS",
  log_json: {
    card_id: card.id,
    amount: amount,
    wallet_balance_before: walletBalanceBefore,
    wallet_balance_after: walletBalanceAfter,
    card_balance_before: cardBalanceBefore,
    card_balance_after: cardBalanceAfter,
    maplerad_transaction_id: fundingResult.output?.id,
    transaction_id: transactionData.id,
  },
  log_txt: `Card funding successful: ${card.id} - $${amount}`,
  created_at: new Date(),
});
```

### Step 10: Success Response

**Response Generation**:

```typescript
return {
  status: "success",
  message: `Card funded successfully with $${amount}`,
  data: {
    card_id: card.id,
    funded_amount: amount,
    card_balance: cardBalanceAfter,
    wallet_balance: walletBalanceAfter,
    transaction_id: transactionData.id,
  },
};
```

## Error Scenarios

### Insufficient Wallet Balance

```typescript
if (usdWallet.balance < amount) {
  await CustomerLogsModel.create({
    customer_id: card.customer_id,
    action: "fund-card",
    status: "FAILED",
    log_json: {
      error: "INSUFFICIENT_BALANCE",
      requested: amount,
      available: usdWallet.balance,
    },
    log_txt: `Card funding failed: Insufficient balance`,
    created_at: new Date(),
  });

  throw new BadRequestException("Insufficient wallet balance");
}
```

### Maplerad API Failure

```typescript
if (fundingResult.error) {
  await CustomerLogsModel.create({
    customer_id: card.customer_id,
    action: "fund-card",
    status: "FAILED",
    log_json: {
      error: "MAPLERAD_API_ERROR",
      card_id: card.id,
      amount: amount,
      maplerad_error: fundingResult.error.message,
    },
    log_txt: `Card funding failed: Maplerad API error`,
    created_at: new Date(),
  });

  throw new BadRequestException(
    `Funding failed: ${fundingResult.error.message}`
  );
}
```

### Database Update Failure

```typescript
// Comprehensive rollback on database errors
private async rollbackFunding(
  walletId: string,
  cardId: string,
  originalWalletBalance: number,
  originalCardBalance: number
): Promise<void> {
  try {
    await Promise.all([
      WalletModel.update(walletId, { balance: originalWalletBalance }),
      CardModel.update(cardId, { balance: originalCardBalance })
    ]);

    console.log(`Rolled back funding for card ${cardId}`);
  } catch (rollbackError) {
    console.error(`Failed to rollback funding for card ${cardId}:`, rollbackError);
    // Alert administrators of inconsistent state
    await this.alertInconsistentState(cardId, rollbackError);
  }
}
```

## Performance Considerations

### Database Transaction Management

```typescript
// Use database transactions for atomicity
return CardModel.operation(async (prisma) => {
  // All operations within single transaction
  const walletUpdate = await prisma.wallet.update({
    where: { id: usdWallet.id },
    data: { balance: walletBalanceAfter },
  });

  const cardUpdate = await prisma.card.update({
    where: { id: card.id },
    data: { balance: cardBalanceAfter },
  });

  const transaction = await prisma.transaction.create({
    data: transactionData,
  });

  return { walletUpdate, cardUpdate, transaction };
});
```

### Concurrent Funding Protection

```typescript
// Prevent concurrent funding operations on same card
const fundingLockKey = `funding_lock:${cardId}`;
const lockAcquired = await this.redis.set(
  fundingLockKey,
  "locked",
  "EX",
  30, // 30 second lock
  "NX" // Only set if key doesn't exist
);

if (!lockAcquired) {
  throw new BadRequestException(
    "Card is currently being funded by another request"
  );
}

// Release lock after operation
await this.redis.del(fundingLockKey);
```

### Caching Strategy

```typescript
// Cache wallet balance to reduce database queries
const walletCacheKey = `wallet:${user.companyId}:USD`;
let usdWallet = await this.cache.get(walletCacheKey);

if (!usdWallet) {
  usdWallet = await WalletModel.getOne({
    company_id: user.companyId,
    currency: "USD",
    active: true,
  });
  await this.cache.set(walletCacheKey, usdWallet, 60); // 1 minute TTL
}
```

## Monitoring Points

### Flow Entry

```typescript
console.log("💰 CARD FUNDING FLOW - START", {
  cardId: cardId,
  customerId: fundCardDto.customer_id,
  amount: fundCardDto.amount,
  userId: user.id,
  companyId: user.companyId,
  timestamp: new Date().toISOString(),
});
```

### Key Checkpoints

```typescript
// After validation
console.log("✅ FUNDING - VALIDATION PASSED", {
  cardId,
  amount,
  walletBalance: usdWallet.balance,
});

// After Maplerad API call
console.log("📤 FUNDING - MAPLERAD API SUCCESS", {
  cardId,
  mapleradTransactionId: fundingResult.output?.id,
});

// After database updates
console.log("💾 FUNDING - DATABASE UPDATES COMPLETE", {
  cardId,
  newCardBalance: cardBalanceAfter,
  newWalletBalance: walletBalanceAfter,
});
```

### Flow Exit

```typescript
console.log("🎉 CARD FUNDING FLOW - COMPLETED", {
  cardId,
  amount,
  duration: Date.now() - startTime,
  success: true,
});
```

## Testing Strategy

### Unit Tests

```typescript
describe("Card Funding Flow", () => {
  it("should fund card successfully", async () => {
    // Mock dependencies
    jest.spyOn(CardModel, "getOne").mockResolvedValue(mockCard);
    jest.spyOn(WalletModel, "getOne").mockResolvedValue(mockWallet);
    jest.spyOn(mapleradUtils, "fundCard").mockResolvedValue(mockFundingResult);

    const result = await service.fundCard(
      companyId,
      cardId,
      amount,
      customerId
    );

    expect(result.status).toBe("success");
    expect(result.message).toContain("funded successfully");
  });

  it("should handle insufficient balance", async () => {
    jest.spyOn(WalletModel, "getOne").mockResolvedValue({
      ...mockWallet,
      balance: 10, // Less than required amount
    });

    await expect(
      service.fundCard(companyId, cardId, 50, customerId)
    ).rejects.toThrow("Insufficient wallet balance");
  });
});
```

### Integration Tests

```typescript
describe("Card Funding Integration", () => {
  it("should fund card end-to-end", async () => {
    const card = await createTestCard();
    const wallet = await createTestWallet(100);

    const response = await request(app.getHttpServer())
      .post(`/maplerad/cards/${card.id}/fund`)
      .set("Authorization", `Bearer ${jwtToken}`)
      .send({
        customer_id: card.customer_id,
        amount: 25,
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");

    // Verify balances updated
    const updatedCard = await CardModel.getOne({ id: card.id });
    const updatedWallet = await WalletModel.getOne({ id: wallet.id });

    expect(updatedCard.balance).toBe(card.balance + 25);
    expect(updatedWallet.balance).toBe(wallet.balance - 25);
  });
});
```

## Success Metrics

- **Success Rate**: > 98% of funding attempts succeed
- **Average Response Time**: < 2 seconds
- **Concurrent Funding Handling**: Support for multiple funding requests
- **Rollback Success Rate**: > 99% of failed operations are properly rolled back

## Troubleshooting

### Common Issues

1. **Race Conditions**: Multiple funding requests on same card simultaneously
2. **Stale Balance Data**: Cached balance not reflecting recent transactions
3. **Maplerad API Timeouts**: Network issues causing funding delays
4. **Database Lock Contention**: High concurrency causing database locks

### Debug Steps

1. Check Redis locks for concurrent funding attempts
2. Verify wallet and card balance consistency
3. Review Maplerad API response logs
4. Check database transaction isolation levels
5. Monitor for cache invalidation issues

This comprehensive card funding flow ensures secure, atomic, and performant balance transfers with proper error handling and monitoring throughout the entire process.
