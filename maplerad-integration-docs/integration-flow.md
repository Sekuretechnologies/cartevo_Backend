# Maplerad Integration Flow Documentation

## Overview

This document outlines the complete integration flow for Maplerad virtual card operations, from customer enrollment to transaction processing and webhook handling.

## Architecture Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Request   │───▶│   Controller    │───▶│    Service      │
│                 │    │                 │    │                 │
│ • REST Endpoints│    │ • Validation    │    │ • Business      │
│ • Request/Resp  │    │ • Guards        │    │ • Logic         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Maplerad API  │◀──▶│   Utilities     │    │   Database      │
│                 │    │                 │    │                 │
│ • Card Creation │    │ • API Calls     │    │ • Transactions   │
│ • Funding       │    │ • Error Handling│    │ • Balances      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Webhooks      │───▶│   Event         │───▶│   Notifications  │
│                 │    │   Processing    │    │                 │
│ • Real-time     │    │ • Updates       │    │ • Customer       │
│ • Updates       │    │ • Sync          │    │ • Alerts         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Complete Card Creation Flow

### Step 1: API Request

**Endpoint**: `POST /maplerad/cards`

**Request**:

```json
{
  "customer_id": "cust_123",
  "brand": "VISA",
  "name_on_card": "John Doe",
  "amount": 50
}
```

### Step 2: Controller Validation

```typescript
// MapleradController.createCard()
@Post()
@ApiOperation({ summary: "Create a new Maplerad card" })
async createCard(
  @Body() createCardDto: CreateCardDto,
  @CurrentUser() user: CurrentUserData
): Promise<CreateCardResponseDto> {
  // 1. Validate user permissions (OwnerGuard)
  // 2. Validate request data
  // 3. Call service method
  return this.mapleradService.createCard(createCardDto);
}
```

### Step 3: Service Business Logic

```typescript
// MapleradService.createCard()
async createCard(createCardDto: CreateCardDto) {
  // 3.1 Customer Validation
  const customer = await this.validateCustomer(createCardDto.customer_id);

  // 3.2 Age Verification (18+)
  const age = this.calculateAge(customer.date_of_birth);
  if (age < 18) throw new BadRequestException("Age requirement not met");

  // 3.3 Card Limit Check (max 5 cards)
  const cardCount = await this.getCustomerCardCount(customer.id);
  if (cardCount >= 5) throw new BadRequestException("Card limit exceeded");

  // 3.4 Balance Verification
  const company = await this.getCompany(customer.company_id);
  const usdWallet = await this.getUSDWallet(company.id);
  const totalCost = company.cardPrice + createCardDto.amount;

  if (usdWallet.balance < totalCost) {
    throw new BadRequestException("Insufficient wallet balance");
  }

  // 3.5 Customer Enrollment (if needed)
  let mapleradCustomerId = customer.maplerad_customer_id;
  if (!mapleradCustomerId) {
    mapleradCustomerId = await this.enrollCustomerInMaplerad(customer);
    await this.updateCustomerMapleradId(customer.id, mapleradCustomerId);
  }

  // 3.6 Card Creation via Maplerad API
  const cardData = await this.createMapleradCard({
    customerId: mapleradCustomerId,
    brand: createCardDto.brand,
    amount: createCardDto.amount
  });

  // 3.7 Database Operations
  const cardId = await this.saveCardToDatabase(cardData, customer, company);

  // 3.8 Transaction Records
  await this.createCardCreationTransaction(cardId, company.cardPrice);
  await this.createFundingTransaction(cardId, createCardDto.amount);

  // 3.9 Wallet Balance Update
  await this.updateWalletBalance(usdWallet.id, -totalCost);

  // 3.10 Audit Logging
  await this.logCardCreation(customer.id, cardId);

  return { status: "success", card: cardData };
}
```

### Step 4: Maplerad API Integration

```typescript
// Maplerad API Calls
const customerResult = await mapleradUtils.createCustomer(customerData);
const cardResult = await mapleradUtils.createCardSimple(
  mapleradCustomerId,
  brand,
  amount
);
const cardDetails = await mapleradUtils.getCardDetailsFromMaplerad(cardId);
```

### Step 5: Database Persistence

```typescript
// Card Model Creation
const cardResult = await CardModel.create({
  id: cardId,
  status: "ACTIVE",
  customer_id: customer.id,
  company_id: company.id,
  brand: cardData.brand,
  provider: encodeText("maplerad"),
  provider_card_id: cardData.id,
  number: encryptedCardNumber,
  cvv: encryptedCvv,
  balance: cardData.balance,
  // ... other fields
});

// Transaction Records
await TransactionModel.create({
  id: transactionId,
  type: "purchase",
  category: "card",
  amount: cardCreationFee,
  customer_id: customer.id,
  card_id: cardId,
  // ... other fields
});
```

## Card Funding Flow

### Step 1: API Request

**Endpoint**: `POST /maplerad/cards/:cardId/fund`

```json
{
  "amount": 25,
  "customer_id": "cust_123"
}
```

### Step 2: Validation & Processing

```typescript
// 2.1 Validate Card Ownership
const card = await this.validateCardOwnership(cardId, customerId, companyId);

// 2.2 Check Card Status
if (card.status === "FROZEN") {
  throw new BadRequestException("Cannot fund frozen card");
}

// 2.3 Verify Wallet Balance
const wallet = await this.getUSDWallet(companyId);
if (wallet.balance < amount) {
  throw new BadRequestException("Insufficient wallet balance");
}

// 2.4 Call Maplerad API
const fundResult = await mapleradUtils.fundCard(card.provider_card_id, amount);

// 2.5 Update Balances
await this.updateCardBalance(cardId, card.balance + amount);
await this.updateWalletBalance(wallet.id, wallet.balance - amount);

// 2.6 Create Transaction Record
await this.createFundingTransaction(cardId, amount, customerId, companyId);
```

## Card Transaction Flow

### Real-time Transaction Processing

```
Merchant Transaction → Maplerad API → Webhook → Local Processing
```

### Step 1: Merchant Transaction

- Customer makes purchase with virtual card
- Maplerad processes authorization
- Transaction recorded in Maplerad system

### Step 2: Webhook Notification

```json
{
  "type": "transaction.created",
  "data": {
    "object": {
      "_id": "txn_123",
      "card": "card_456",
      "amount": 10000, // in cents
      "merchant": { "name": "Amazon" },
      "status": "success"
    }
  }
}
```

### Step 3: Webhook Processing

```typescript
// WebhookService.processMapleradWebhook()
async processMapleradWebhook(body, headers, req) {
  // 3.1 Parse webhook payload
  const { cardId, eventType, data } = this.parseWebhookPayload(body);

  // 3.2 Find card in database
  const card = await CardModel.getOne({ provider_card_id: cardId });

  // 3.3 Process transaction
  switch (eventType) {
    case "transaction.created":
      await this.handleTransactionCreated(card, data);
      break;
  }
}
```

### Step 4: Transaction Creation

```typescript
// Handle transaction.created event
async handleTransactionCreated(card, data) {
  // 4.1 Convert amount (cents to dollars)
  const usdAmount = data.amount / 100;

  // 4.2 Determine transaction type
  const transactionType = this.categorizeTransaction(data.merchant);

  // 4.3 Create transaction record
  await TransactionModel.create({
    amount: usdAmount,
    type: transactionType,
    category: "card",
    customer_id: card.customer_id,
    card_id: card.id,
    order_id: data._id,
    description: `Purchase at ${data.merchant.name}`,
    // ... other fields
  });

  // 4.4 Update card balance
  await CardModel.update(card.id, {
    balance: card.balance - usdAmount
  });

  // 4.5 Send notification
  await this.sendTransactionNotification(card.customer_id, usdAmount, data.merchant.name);
}
```

## Card Withdrawal Flow

### Step 1: API Request

**Endpoint**: `POST /maplerad/cards/:cardId/withdraw`

```json
{
  "amount": 10,
  "customer_id": "cust_123"
}
```

### Step 2: Processing Flow

```typescript
// 2.1 Validate card and balance
const card = await this.validateCardForWithdrawal(cardId, customerId);
if (card.balance < amount) {
  throw new BadRequestException("Insufficient card balance");
}

// 2.2 Call Maplerad withdrawal API
const withdrawResult = await mapleradUtils.withdrawFromCard(
  card.provider_card_id,
  amount
);

// 2.3 Update balances
await this.updateCardBalance(cardId, card.balance - amount);
await this.updateWalletBalance(walletId, wallet.balance + amount);

// 2.4 Create transaction record
await this.createWithdrawalTransaction(cardId, amount);
```

## Error Handling Flow

### API Error Handling

```typescript
// Maplerad API Error
if (cardResult.error) {
  console.error("Maplerad API Error:", cardResult.error);

  // Log detailed error
  await this.logApiError(cardResult.error, customerId);

  // Throw appropriate exception
  throw new BadRequestException(
    "Card creation failed: " + cardResult.error.message
  );
}
```

### Database Transaction Rollback

```typescript
// Database transaction with rollback
return CardModel.operation(async (prisma) => {
  try {
    // Multiple database operations
    await this.updateWalletBalance(walletId, newBalance);
    await this.createCardRecord(cardData);
    await this.createTransactionRecord(transactionData);

    return { success: true };
  } catch (error) {
    // Automatic rollback on error
    console.error("Database transaction failed:", error);
    throw error;
  }
});
```

## Notification Flow

### Transaction Notifications

```typescript
// Send transaction notification
async sendTransactionNotification(customerId, amount, merchantName) {
  await NotificationModel.create({
    title: "Card Transaction",
    customer_id: customerId,
    text: `Transaction of $${amount} at ${merchantName}`,
    category: "card_transaction",
  });
}
```

### Failure Notifications

```typescript
// Insufficient funds notification
async sendInsufficientFundsNotification(customerId, requiredAmount) {
  await NotificationModel.create({
    title: "Payment Failed",
    customer_id: customerId,
    text: `Payment failed. Please add $${requiredAmount} to your card.`,
    category: "payment_failed",
  });
}
```

## Security Flow

### Data Encryption Flow

```typescript
// Sensitive data encryption
const encryptedCardNumber = encodeText(cardData.number);
const encryptedCvv = signToken(cardData.cvv);

// Storage
await CardModel.create({
  number: `tkMplr_${signToken(encryptedCardNumber)}`,
  cvv: `tkMplr_${signToken(encryptedCvv)}`,
});
```

### Access Control Flow

```typescript
// Company isolation
const cards = await CardModel.get({
  company_id: user.companyId,
  provider: encodeText("maplerad"),
});

// Customer ownership validation
const card = await CardModel.getOne({
  id: cardId,
  customer_id: customerId,
  company_id: companyId,
});
```

## Monitoring and Logging Flow

### Comprehensive Logging

```typescript
// Request logging
console.log("🚀 CREATE CARD - START", {
  customerId: createCardDto.customer_id,
  brand: createCardDto.brand,
  amount: createCardDto.amount,
  operation: "createCard",
});

// API call logging
console.log("📤 MAPLERAD REQUEST", {
  method: "POST",
  endpoint: "/issuing",
  payload: cardData,
});

// Response logging
console.log("📥 MAPLERAD RESPONSE", {
  status: 200,
  responseData: response.data,
  success: true,
});

// Error logging
console.error("❌ CARD CREATION ERROR", {
  customerId,
  error: error.message,
  stack: error.stack,
});
```

### Audit Trail

```typescript
// Customer action logging
await CustomerLogsModel.create({
  customer_id: customer.id,
  action: "card-purchase",
  status: "SUCCESS",
  log_json: {
    card_id: cardId,
    amount: createCardDto.amount,
    brand: createCardDto.brand,
  },
  log_txt: `Card created successfully: ${cardId}`,
  created_at: new Date(),
});
```

## Performance Optimization Flow

### Database Optimization

```typescript
// Efficient queries with proper indexing
const card = await CardModel.getOne({
  id: cardId,
  company_id: companyId, // Indexed field
});

// Batch operations
const [card, wallet, customer] = await Promise.all([
  CardModel.getOne({ id: cardId }),
  WalletModel.getOne({ company_id: companyId, currency: "USD" }),
  CustomerModel.getOne({ id: customerId }),
]);
```

### Caching Strategy

```typescript
// Cache frequently accessed data
const company =
  (await this.cache.get(`company:${companyId}`)) ||
  (await CompanyModel.getOne({ id: companyId }));

// Cache Maplerad customer ID
const mapleradId =
  (await this.cache.get(`maplerad_customer:${customerId}`)) ||
  customer.maplerad_customer_id;
```

## Testing Flow

### Unit Testing

```typescript
// Service method testing
describe("MapleradService", () => {
  it("should create card successfully", async () => {
    // Mock dependencies
    jest.spyOn(mapleradUtils, "createCard").mockResolvedValue(mockCardResponse);

    // Test service method
    const result = await service.createCard(createCardDto);

    // Assertions
    expect(result.status).toBe("success");
    expect(result.card).toBeDefined();
  });
});
```

### Integration Testing

```typescript
// End-to-end testing
describe("Card Creation Flow", () => {
  it("should create card from API to database", async () => {
    // Setup test data
    const testCustomer = await createTestCustomer();
    const testCompany = await createTestCompany();

    // Make API request
    const response = await request(app.getHttpServer())
      .post("/maplerad/cards")
      .send({
        customer_id: testCustomer.id,
        brand: "VISA",
        amount: 50,
      });

    // Verify response
    expect(response.status).toBe(201);
    expect(response.body.card).toBeDefined();

    // Verify database
    const card = await CardModel.getOne({ id: response.body.card.id });
    expect(card).toBeDefined();
    expect(card.status).toBe("ACTIVE");
  });
});
```

## Failure Recovery Flow

### Transaction Rollback

```typescript
// Automatic rollback on failure
return CardModel.operation(async (prisma) => {
  // Operation 1: Deduct from wallet
  await WalletModel.update(walletId, { balance: newWalletBalance });

  // Operation 2: Create card (might fail)
  const cardResult = await CardModel.create(cardData);
  if (cardResult.error) throw new Error("Card creation failed");

  // Operation 3: Create transaction
  await TransactionModel.create(transactionData);

  return { success: true };
});
// If any operation fails, all changes are rolled back
```

### Error Recovery

```typescript
// Retry mechanism for API calls
async createMapleradCard(cardData, retryCount = 0) {
  try {
    return await mapleradUtils.createCard(cardData);
  } catch (error) {
    if (retryCount < 3 && this.isRetryableError(error)) {
      await this.delay(1000 * (retryCount + 1)); // Exponential backoff
      return this.createMapleradCard(cardData, retryCount + 1);
    }
    throw error;
  }
}
```

This comprehensive flow documentation covers all aspects of the Maplerad integration, from initial API requests through to final database persistence and webhook processing.
