# Maplerad Webhook Documentation

## Overview

Webhooks provide real-time notifications for card events from Maplerad. The system processes various webhook events to update local database records, trigger notifications, and maintain data synchronization.

## Webhook Architecture

```
Maplerad API → Webhook Endpoint → Webhook Service → Database Updates
                                      ↓
                              Notification System
                                      ↓
                              Customer Alerts
```

## Webhook Endpoint

**Endpoint**: `POST /webhook/maplerad`

**Content-Type**: `application/json`

**Authentication**: Signature verification (recommended for production)

## Supported Events

### 1. transaction.created

**Description**: Triggered when a new transaction occurs on a card.

**Payload Structure**:

```json
{
  "type": "transaction.created",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "_id": "txn_123456789",
      "card": "card_abcdef123456",
      "amount": 5000,
      "currency": "USD",
      "status": "success",
      "merchant": {
        "name": "Amazon",
        "category": "retail",
        "city": "Seattle",
        "country": "US"
      },
      "created_at": "2023-12-01T10:00:00Z"
    }
  }
}
```

**Processing Logic**:

1. **Extract Data**: Parse transaction details from webhook payload
2. **Find Card**: Locate card in local database using `provider_card_id`
3. **Validate Transaction**: Check if transaction already exists
4. **Create Transaction Record**: Insert new transaction with proper categorization
5. **Update Balances**: Adjust card balance if necessary
6. **Send Notifications**: Alert customer of transaction

**Transaction Types**:

- **settlement**: Regular merchant transactions
- **failed_transaction_charge**: Fee for failed transactions
- **cross_border_charge**: International transaction fees
- **refund**: Refund transactions

### 2. authorization.declined

**Description**: Triggered when a card authorization is declined.

**Payload Structure**:

```json
{
  "type": "authorization.declined",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "_id": "auth_123456789",
      "card": "card_abcdef123456",
      "amount": 15000,
      "currency": "USD",
      "status": "declined",
      "approved": false,
      "merchant": {
        "name": "Hotel Booking",
        "city": "Paris",
        "country": "FR"
      },
      "requestHistory": [
        {
          "reason": "insufficient_funds",
          "narration": "No sufficient funds available"
        }
      ]
    }
  }
}
```

**Processing Logic**:

1. **Extract Details**: Parse authorization failure information
2. **Find Customer**: Locate customer associated with card
3. **Create Transaction Record**: Log failed transaction
4. **Analyze Failure Reason**: Parse `requestHistory` for specific failure cause
5. **Send Notifications**: Alert customer with specific failure reason
6. **Handle Insufficient Funds**: Calculate required amount if applicable

**Failure Reasons**:

- **insufficient_funds**: Not enough balance
- **card_inactive**: Card is frozen or terminated
- **invalid_card**: Card validation failed
- **transaction_not_permitted**: Transaction type not allowed

### 3. authorization.code

**Description**: Provides 3D Secure authorization codes.

**Payload Structure**:

```json
{
  "type": "authorization.code",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "code": "123456",
      "card": "card_abcdef123456"
    }
  }
}
```

**Processing Logic**:

1. **Extract Code**: Get the 3D Secure authorization code
2. **Find Customer**: Locate customer for notification
3. **Send Notification**: Deliver code via push notification and database
4. **Log Event**: Record code generation for audit

**Note**: Email notifications are avoided due to code expiration

### 4. transaction.refund

**Description**: Triggered when a refund is processed.

**Payload Structure**:

```json
{
  "type": "transaction.refund",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "_id": "refund_123456789",
      "card": "card_abcdef123456",
      "amount": 2500,
      "currency": "USD",
      "status": "completed",
      "merchant": {
        "name": "Online Store",
        "city": "London",
        "country": "GB"
      }
    }
  }
}
```

**Processing Logic**:

1. **Extract Details**: Parse refund transaction data
2. **Create Transaction Record**: Log refund with type "refund"
3. **Update Balances**: Adjust card balance if necessary
4. **Send Notifications**: Inform customer of refund

### 5. card.updated

**Description**: Triggered when card status changes.

**Payload Structure**:

```json
{
  "type": "card.updated",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "_id": "card_abcdef123456",
      "status": "inactive",
      "updated_at": "2023-12-01T10:00:00Z"
    }
  }
}
```

**Processing Logic**:

1. **Extract Status**: Get new card status
2. **Map Status**: Convert Maplerad status to local status
3. **Update Database**: Update card status in local database
4. **Log Change**: Record status change for audit

**Status Mapping**:

- `"active"` → `"ACTIVE"`
- `"inactive"` → `"FREEZE"`
- `"canceled"` → `"TERMINATED"`

### 6. card.terminated

**Description**: Triggered when a card is terminated.

**Payload Structure**:

```json
{
  "type": "card.terminated",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "_id": "card_abcdef123456",
      "status": "canceled",
      "balance": 500,
      "updated_at": "2023-12-01T10:00:00Z"
    }
  }
}
```

**Processing Logic**:

1. **Extract Details**: Get termination information and remaining balance
2. **Update Card Status**: Set status to "TERMINATED"
3. **Handle Remaining Balance**: Transfer any remaining balance to wallet
4. **Create Transaction**: Record balance transfer
5. **Send Notifications**: Inform customer of termination

## Webhook Service Implementation

### Class Structure

```typescript
@Injectable()
export class WebhookServiceMaplerad {
  async processMapleradWebhook(body: any, headers: any, req: any) {
    // Main webhook processing logic
  }
}
```

### Event Processing Flow

```typescript
async processMapleradWebhook(body, headers, req) {
  // 1. Extract event data
  const { cardId, eventTime, eventType, data } = this.parseWebhookPayload(body);

  // 2. Find card in database
  const card = await this.findCardByProviderId(cardId);

  // 3. Process based on event type
  switch (eventType) {
    case "transaction.created":
      await this.handleTransactionCreated(card, data, eventTime);
      break;
    case "authorization.declined":
      await this.handleAuthorizationDeclined(card, data, eventTime);
      break;
    // ... other event handlers
  }

  // 4. Return success response
  return { status: "success", processed: true };
}
```

## Error Handling

### Webhook Processing Errors

```typescript
// Invalid payload
if (!cardId || !data) {
  throw new NotFoundException("Invalid payload: Missing cardId or data.");
}

// Card not found
if (!card) {
  throw new NotFoundException(`Card with ID ${cardId} not found.`);
}

// Unhandled event type
throw new NotFoundException(`Unhandled eventType: ${eventType}`);
```

### Database Errors

```typescript
// Transaction creation failure
if (!transactionResult.output) {
  console.error("Failed to create transaction record");
  // Log error but don't throw - webhook should still return success
}
```

## Security Considerations

### Signature Verification

```typescript
// Recommended: Verify webhook signature
const signature = headers["x-maplerad-signature"];
const expectedSignature = this.generateSignature(payload, secretKey);

if (!this.verifySignature(signature, expectedSignature)) {
  throw new UnauthorizedException("Invalid webhook signature");
}
```

### Request Validation

- **IP Whitelisting**: Only accept webhooks from Maplerad IPs
- **Timestamp Validation**: Check webhook timestamp is recent
- **Idempotency**: Handle duplicate webhook deliveries

## Database Updates

### Transaction Creation

```typescript
const transactionResult = await TransactionModel.create({
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
  description: transactionDescription,
  created_at: utcToLocalTime(eventTime)?.toISOString(),
  // ... other fields
});
```

### Balance Updates

```typescript
// For terminations with remaining balance
if (data.balance && Number(data.balance) > 0.5) {
  const newWalletBalance = wallet.balance + Number(data.balance);

  await WalletModel.update(wallet.id, {
    balance: newWalletBalance,
  });
}
```

## Notification System

### Customer Notifications

```typescript
// Insufficient funds notification
await NotificationModel.create({
  title: "Payment Failed - Insufficient Funds",
  customer_id: customer.id,
  text: `Your payment of ${usdAmount} USD failed. Please add ${remainingAmount} USD.`,
  transaction_id: transaction.id,
  category: "payment_failed",
});
```

### 3D Secure Code Notifications

```typescript
// 3D Secure authorization code
await NotificationModel.create({
  title: "3D Secure Authorization Code",
  customer_id: customer.id,
  text: `Your 3D Secure code is: ${authCode}. Use this to complete your payment.`,
  category: "3ds_auth_code",
});
```

## Logging and Monitoring

### Webhook Processing Logs

```typescript
console.log("------------ MAPLERAD WEBHOOK RECEIVED -------------");
console.log("Event Type:", eventType);
console.log("Card ID:", cardId);
console.log("Amount:", data.amount);
console.log("Status:", data.status);
```

### Error Logs

```typescript
console.error("Webhook processing failed:", {
  eventType,
  cardId,
  error: error.message,
  payload: body,
});
```

## Testing Webhooks

### Local Testing

```bash
# Using ngrok for local webhook testing
ngrok http 3000

# Webhook URL: https://abc123.ngrok.io/webhook/maplerad
```

### Test Payloads

```json
// Test transaction.created
{
  "type": "transaction.created",
  "createdAt": 1638360000,
  "data": {
    "object": {
      "_id": "test_txn_123",
      "card": "test_card_456",
      "amount": 1000,
      "merchant": { "name": "Test Merchant" }
    }
  }
}
```

## Production Considerations

### Reliability

- **Retry Logic**: Implement webhook retry mechanism
- **Duplicate Handling**: Handle duplicate webhook deliveries
- **Timeout Handling**: Set appropriate timeouts for processing

### Monitoring

- **Success Rate**: Track webhook processing success rate
- **Latency**: Monitor processing time
- **Error Rate**: Alert on high error rates
- **Event Coverage**: Ensure all event types are handled

### Scaling

- **Queue Processing**: Consider queue-based processing for high volume
- **Database Optimization**: Optimize database queries for webhook processing
- **Caching**: Cache frequently accessed data

## Troubleshooting

### Common Issues

1. **Card Not Found**: Webhook received for non-existent card
2. **Invalid Payload**: Malformed webhook payload
3. **Processing Timeout**: Webhook processing taking too long
4. **Database Connection**: Database connectivity issues

### Debug Steps

1. Check webhook payload structure
2. Verify card exists in database
3. Review application logs
4. Test with sample payload
5. Check database connectivity

## Future Enhancements

- **Webhook Signature Verification**: Implement cryptographic verification
- **Event Filtering**: Allow selective webhook event processing
- **Batch Processing**: Handle multiple events in single webhook
- **Custom Event Types**: Support for additional Maplerad events
- **Webhook Analytics**: Detailed analytics and reporting
