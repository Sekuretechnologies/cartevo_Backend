# Card Creation Flow

## Overview

The Card Creation Flow is the primary process for creating new virtual USD cards in the Maplerad integration. This flow handles everything from initial API request to final database persistence, including customer enrollment, card issuance, and balance management.

## Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ API Request │───▶│ Controller  │───▶│  Service    │
│             │    │ Validation  │    │ Business    │
│ POST /cards │    │ & Guards    │    │ Logic       │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Customer    │───▶│ Maplerad   │───▶│ Database    │
│ Validation  │    │ API Call   │    │ Persistence │
│ & Enrollment│    │ Card       │    │ & Balance   │
│             │    │ Creation   │    │ Updates     │
└─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Transaction │───▶│ Audit Log  │───▶│ Response    │
│ Records     │    │ Creation   │    │ Success     │
│ & Funding   │    │ & Alerts   │    │ / Error     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Step-by-Step Process

### Step 1: API Request Reception

**File**: `src/modules/maplerad/maplerad.controller.ts` (lines 32-50)

**Endpoint**: `POST /maplerad/cards`

**Input Validation**:

```typescript
// Request body validation
{
  customer_id: string,     // Required: Valid UUID
  brand: "VISA" | "MASTERCARD", // Required: Supported brand
  name_on_card: string,    // Required: 1-50 characters
  amount: number          // Required: Min 2 USD
}
```

**Authentication Check**:

```typescript
// JWT token validation
const user = await this.validateJwtToken(headers.authorization);

// Company ownership verification
if (user.companyId !== customer.company_id) {
  throw new ForbiddenException("Access denied");
}
```

### Step 2: Customer Validation

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 45-85)

**Database Queries**:

```typescript
// Fetch customer details
const customer = await CustomerModel.getOne({
  id: createCardDto.customer_id,
  company_id: user.companyId,
});

// Validate customer exists
if (!customer) {
  throw new BadRequestException("Customer not found");
}
```

**Business Rules Validation**:

```typescript
// Age verification (18+ requirement)
const customerAge = calculateAge(customer.date_of_birth);
if (customerAge < 18) {
  throw new BadRequestException("Customer must be 18 or older");
}

// Card limit check (max 5 cards per customer)
const existingCards = await CardModel.count({
  customer_id: customer.id,
  status: { not: CardStatus.TERMINATED },
});
if (existingCards >= 5) {
  throw new BadRequestException("Maximum 5 cards allowed per customer");
}
```

### Step 3: Wallet Balance Verification

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 86-110)

**Balance Check**:

```typescript
// Get company's USD wallet
const usdWallet = await WalletModel.getOne({
  company_id: user.companyId,
  currency: "USD",
  is_active: true,
});

// Calculate total cost
const cardCreationFee = company.cardPrice.toNumber();
const fundingAmount = createCardDto.amount;
const totalCost = cardCreationFee + fundingAmount;

// Verify sufficient balance
if (usdWallet.balance < totalCost) {
  throw new BadRequestException(
    `Insufficient balance. Required: $${totalCost}, Available: $${usdWallet.balance}`
  );
}
```

### Step 4: Customer Enrollment in Maplerad

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 111-140)

**Check Existing Enrollment**:

```typescript
// Check if customer already has Maplerad ID
let mapleradCustomerId = customer.maplerad_customer_id;

if (!mapleradCustomerId) {
  // Enroll customer in Maplerad
  const enrollmentData = prepareMapleradCustomerData(customer);

  const enrollmentResult = await mapleradUtils.createCustomer(enrollmentData);

  if (enrollmentResult.error) {
    throw new BadRequestException(
      "Failed to enroll customer in Maplerad: " + enrollmentResult.error.message
    );
  }

  mapleradCustomerId = enrollmentResult.output.id;

  // Update local customer record
  await CustomerModel.update(customer.id, {
    maplerad_customer_id: mapleradCustomerId,
  });
}
```

### Step 5: Card Creation via Maplerad API

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 141-180)

**API Call Preparation**:

```typescript
// Prepare card creation data
const cardData = {
  customer_id: mapleradCustomerId,
  currency: "USD",
  type: "VIRTUAL",
  brand: createCardDto.brand,
  amount: convertToSmallestUnit(createCardDto.amount), // Convert to cents
  auto_approve: true,
};

// Make API call with retry logic
const cardResult = await this.createMapleradCardWithRetry(cardData);
```

**Retry Logic**:

```typescript
private async createMapleradCardWithRetry(cardData: any, attempt = 1): Promise<any> {
  try {
    const result = await mapleradUtils.createCard(cardData);
    return result;
  } catch (error) {
    if (attempt < 3 && this.isRetryableError(error)) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.createMapleradCardWithRetry(cardData, attempt + 1);
    }
    throw error;
  }
}
```

### Step 6: Database Persistence

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 181-220)

**Card Record Creation**:

```typescript
// Generate unique card ID
const cardId = uuidv4();

// Extract card details from Maplerad response
const mapleradCard = cardResult.output.data || cardResult.output;

// Encrypt sensitive data
const encryptedCardNumber = signToken(mapleradCard.cardNumber);
const encryptedCvv = signToken(mapleradCard.cvv);

// Create card record
const cardRecord = await CardModel.create({
  id: cardId,
  status: "ACTIVE",
  customer_id: customer.id,
  company_id: customer.company_id,
  brand: mapleradCard.brand,
  provider: encodeText("maplerad"),
  provider_card_id: mapleradCard.id,
  number: `tkMplr_${encryptedCardNumber}`,
  cvv: `tkMplr_${encryptedCvv}`,
  masked_number: mapleradCard.masked_pan,
  last4: mapleradCard.last4,
  expiry_month: mapleradCard.expiryMonth,
  expiry_year: mapleradCard.expiryYear,
  balance: convertFromSmallestUnit(mapleradCard.balance || 0),
  name: createCardDto.name_on_card.toUpperCase(),
  currency: "USD",
  is_active: true,
  is_virtual: true,
  created_at: new Date(),
});
```

### Step 7: Balance Updates

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 221-235)

**Wallet Debit**:

```typescript
// Deduct total cost from wallet
const walletUpdateResult = await WalletModel.update(usdWallet.id, {
  balance: usdWallet.balance - totalCost,
});

if (walletUpdateResult.error) {
  // Rollback card creation if wallet update fails
  await this.rollbackCardCreation(cardId);
  throw new BadRequestException("Failed to update wallet balance");
}
```

### Step 8: Transaction Records

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 236-280)

**Creation Fee Transaction**:

```typescript
// Record card creation fee
await TransactionModel.create({
  id: uuidv4(),
  type: "purchase",
  category: "card",
  amount: cardCreationFee,
  currency: "USD",
  customer_id: customer.id,
  company_id: customer.company_id,
  card_id: cardId,
  wallet_balance_before: usdWallet.balance,
  wallet_balance_after: usdWallet.balance - totalCost,
  provider: encodeText("maplerad"),
  description: "Card creation fee",
  status: "SUCCESS",
});
```

**Funding Transaction**:

```typescript
// Record initial funding
await TransactionModel.create({
  id: uuidv4(),
  type: "fund",
  category: "card",
  amount: fundingAmount,
  currency: "USD",
  customer_id: customer.id,
  company_id: customer.company_id,
  card_id: cardId,
  card_balance_before: 0,
  card_balance_after: fundingAmount,
  wallet_balance_before: usdWallet.balance - cardCreationFee,
  wallet_balance_after: usdWallet.balance - totalCost,
  provider: encodeText("maplerad"),
  description: "Initial card funding",
  status: "SUCCESS",
});
```

### Step 9: Audit Logging

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 281-300)

**Customer Action Log**:

```typescript
// Log successful card creation
await CustomerLogsModel.create({
  customer_id: customer.id,
  action: "card-purchase",
  status: "SUCCESS",
  log_json: {
    card_id: cardId,
    amount: createCardDto.amount,
    brand: createCardDto.brand,
    maplerad_customer_id: mapleradCustomerId,
    maplerad_card_id: mapleradCard.id,
  },
  log_txt: `Card created successfully: ${cardId}`,
  created_at: new Date(),
});
```

### Step 10: Response Generation

**File**: `src/modules/maplerad/maplerad.service.ts` (lines 301-320)

**Success Response**:

```typescript
return {
  status: "success",
  message: "Card created successfully",
  card: {
    id: cardId,
    customer_id: customer.id,
    status: "ACTIVE",
    balance: fundingAmount,
    number: mapleradCard.masked_pan,
    masked_number: mapleradCard.masked_pan,
    last4: mapleradCard.last4,
    expiry_month: mapleradCard.expiryMonth,
    expiry_year: mapleradCard.expiryYear,
    brand: mapleradCard.brand,
    currency: "USD",
    created_at: new Date(),
  },
};
```

## Error Scenarios

### Insufficient Balance Error

```typescript
// Error flow for insufficient balance
if (usdWallet.balance < totalCost) {
  await CustomerLogsModel.create({
    customer_id: customer.id,
    action: "card-purchase",
    status: "FAILED",
    log_json: {
      error: "INSUFFICIENT_BALANCE",
      required: totalCost,
      available: usdWallet.balance,
    },
    log_txt: `Card creation failed: Insufficient balance`,
    created_at: new Date(),
  });

  throw new BadRequestException("Insufficient wallet balance");
}
```

### Maplerad API Failure

```typescript
// Error flow for API failure
if (cardResult.error) {
  await CustomerLogsModel.create({
    customer_id: customer.id,
    action: "card-purchase",
    status: "FAILED",
    log_json: {
      error: cardResult.error.message,
      maplerad_response: cardResult.error.details,
    },
    log_txt: `Card creation failed: Maplerad API error`,
    created_at: new Date(),
  });

  throw new BadRequestException("Failed to create card with Maplerad");
}
```

### Database Transaction Failure

```typescript
// Rollback mechanism
private async rollbackCardCreation(cardId: string): Promise<void> {
  try {
    // Attempt to terminate card in Maplerad
    const card = await CardModel.getOne({ id: cardId });
    if (card?.provider_card_id) {
      await mapleradUtils.terminateCard(card.provider_card_id);
    }

    // Remove local card record
    await CardModel.delete(cardId);

    console.log(`Rolled back card creation for ${cardId}`);
  } catch (rollbackError) {
    console.error(`Failed to rollback card creation for ${cardId}:`, rollbackError);
  }
}
```

## Performance Considerations

### Database Optimization

```typescript
// Use database transactions for consistency
return CardModel.operation(async (prisma) => {
  // All database operations within transaction
  const card = await prisma.card.create({ data: cardData });
  const wallet = await prisma.wallet.update({
    where: { id: walletId },
    data: walletData,
  });
  const transaction = await prisma.transaction.create({
    data: transactionData,
  });

  return { card, wallet, transaction };
});
```

### Caching Strategy

```typescript
// Cache customer data to reduce database queries
const customerCacheKey = `customer:${customerId}`;
let customer = await this.cache.get(customerCacheKey);

if (!customer) {
  customer = await CustomerModel.getOne({ id: customerId });
  await this.cache.set(customerCacheKey, customer, 300); // 5 minutes TTL
}
```

### Batch Operations

```typescript
// Batch database operations where possible
const [card, wallet, transactions] = await Promise.all([
  CardModel.create(cardData),
  WalletModel.update(walletId, walletData),
  TransactionModel.createMany([transaction1Data, transaction2Data]),
]);
```

## Monitoring Points

### Flow Entry

```typescript
console.log("🚀 CARD CREATION FLOW - START", {
  customerId: createCardDto.customer_id,
  brand: createCardDto.brand,
  amount: createCardDto.amount,
  userId: user.id,
  companyId: user.companyId,
  timestamp: new Date().toISOString(),
});
```

### Key Checkpoints

```typescript
// After validation
console.log("✅ CARD CREATION - VALIDATION PASSED", { customerId, totalCost });

// After Maplerad API call
console.log("📤 CARD CREATION - MAPLERAD API SUCCESS", {
  mapleradCardId: mapleradCard.id,
  cardId,
});

// After database persistence
console.log("💾 CARD CREATION - DATABASE PERSISTENCE COMPLETE", { cardId });
```

### Flow Exit

```typescript
console.log("🎉 CARD CREATION FLOW - COMPLETED", {
  cardId,
  duration: Date.now() - startTime,
  success: true,
});
```

## Testing Strategy

### Unit Tests

```typescript
describe("Card Creation Flow", () => {
  it("should create card successfully", async () => {
    // Mock all dependencies
    jest.spyOn(CustomerModel, "getOne").mockResolvedValue(mockCustomer);
    jest.spyOn(WalletModel, "getOne").mockResolvedValue(mockWallet);
    jest.spyOn(mapleradUtils, "createCard").mockResolvedValue(mockCardResult);

    // Execute flow
    const result = await service.createCard(createCardDto);

    // Verify result
    expect(result.status).toBe("success");
    expect(result.card).toBeDefined();
  });

  it("should handle insufficient balance", async () => {
    // Mock insufficient balance
    jest.spyOn(WalletModel, "getOne").mockResolvedValue({
      ...mockWallet,
      balance: 1, // Less than required
    });

    // Verify error thrown
    await expect(service.createCard(createCardDto)).rejects.toThrow(
      "Insufficient wallet balance"
    );
  });
});
```

### Integration Tests

```typescript
describe("Card Creation Integration", () => {
  it("should create card end-to-end", async () => {
    // Setup test data
    const customer = await createTestCustomer();
    const wallet = await createTestWallet(100);

    // Make API request
    const response = await request(app.getHttpServer())
      .post("/maplerad/cards")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send({
        customer_id: customer.id,
        brand: "VISA",
        name_on_card: "Test User",
        amount: 50,
      });

    // Verify response
    expect(response.status).toBe(201);
    expect(response.body.card).toBeDefined();

    // Verify database state
    const card = await CardModel.getOne({ id: response.body.card.id });
    expect(card.status).toBe("ACTIVE");
    expect(card.balance).toBe(50);

    // Verify wallet balance updated
    const updatedWallet = await WalletModel.getOne({ id: wallet.id });
    expect(updatedWallet.balance).toBe(48); // 100 - 2 (fee) - 50 (funding)
  });
});
```

## Success Metrics

- **Success Rate**: > 95% of card creation attempts succeed
- **Average Response Time**: < 3 seconds
- **Error Rate**: < 5% of requests fail
- **Rollback Success Rate**: > 99% of failed operations are properly rolled back

## Troubleshooting

### Common Issues

1. **Maplerad API Timeouts**: Increase timeout values or implement retry logic
2. **Database Connection Issues**: Check connection pool settings
3. **Insufficient Balance**: Clear error message with required vs available amounts
4. **Customer Validation Failures**: Verify customer data and company ownership

### Debug Steps

1. Check application logs for flow entry/exit points
2. Verify Maplerad API credentials and connectivity
3. Confirm database connectivity and transaction status
4. Validate customer and wallet data integrity
5. Check for race conditions in concurrent card creation

This comprehensive card creation flow ensures reliable, secure, and performant virtual card issuance with proper error handling and monitoring throughout the entire process.
