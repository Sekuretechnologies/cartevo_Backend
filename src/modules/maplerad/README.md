# Maplerad Module

A comprehensive NestJS module for integrating with Maplerad's virtual card services. This module provides complete card management functionality including creation, funding, withdrawal, transaction processing, and webhook handling.

## 🚀 Features

- **Virtual Card Creation**: Issue USD virtual cards via Maplerad API
- **Card Funding**: Add funds to cards from company wallet
- **Card Withdrawal**: Withdraw funds back to company wallet
- **Real-time Transactions**: Process card transactions with webhook integration
- **Card Management**: Freeze, unfreeze, and terminate cards
- **Security**: Encrypted sensitive data storage with JWT tokens
- **Audit Trail**: Comprehensive logging and transaction history
- **Error Handling**: Robust error handling with rollback mechanisms

## 📋 API Endpoints

### Card Management

```http
POST   /maplerad/cards              # Create new virtual card
GET    /maplerad/cards              # List company cards
GET    /maplerad/cards/:id          # Get card details
PUT    /maplerad/cards/:id/freeze   # Freeze card
PUT    /maplerad/cards/:id/unfreeze # Unfreeze card
```

### Card Operations

```http
POST   /maplerad/cards/:id/fund     # Fund card from wallet
POST   /maplerad/cards/:id/withdraw # Withdraw from card to wallet
GET    /maplerad/cards/:id/transactions # Get card transactions
```

### Webhooks

```http
POST   /webhook/maplerad            # Handle Maplerad webhooks
POST   /webhook/maplerad/health     # Webhook health check
```

## 🔧 Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Maplerad API Configuration
MAPLERAD_BASE_URL=https://api.maplerad.com/v1
MAPLERAD_SECRET_KEY=your_maplerad_secret_key_here
```

### 2. Module Registration

The module is already registered in `src/app.module.ts`:

```typescript
import { MapleradModule } from "./modules/maplerad/maplerad.module";

@Module({
  imports: [
    // ... other modules
    MapleradModule,
  ],
})
export class AppModule {}
```

### 3. Webhook Configuration

Configure your Maplerad dashboard to send webhooks to:

```
https://your-domain.com/webhook/maplerad
```

## 💳 Usage Examples

### Create a Card

```typescript
const cardData = {
  customer_id: "customer-uuid",
  brand: "VISA", // or "MASTERCARD"
  name_on_card: "John Doe",
  amount: 50, // Initial funding amount in USD
};

const response = await fetch("/maplerad/cards", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
  },
  body: JSON.stringify(cardData),
});

const result = await response.json();
// {
//   "status": "success",
//   "message": "Card created successfully",
//   "card": {
//     "id": "card-uuid",
//     "masked_number": "****-****-****-1234",
//     "balance": 50,
//     "status": "ACTIVE"
//   }
// }
```

### Fund a Card

```typescript
const fundData = {
  customer_id: "customer-uuid",
  card_id: "card-uuid",
  amount: 25, // Amount to fund in USD
};

const response = await fetch("/maplerad/cards/card-uuid/fund", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
  },
  body: JSON.stringify(fundData),
});

const result = await response.json();
// {
//   "status": "success",
//   "message": "Card funded successfully with $25",
//   "data": {
//     "card_balance": 75,
//     "wallet_balance": 475
//   }
// }
```

### Get Card Details

```typescript
const response = await fetch("/maplerad/cards/card-uuid?reveal=true", {
  headers: {
    Authorization: "Bearer your-jwt-token",
  },
});

const card = await response.json();
// {
//   "id": "card-uuid",
//   "masked_number": "****-****-****-1234",
//   "number": "4111111111111111", // Only if reveal=true
//   "cvv": "123", // Only if reveal=true
//   "balance": 75,
//   "status": "ACTIVE"
// }
```

## 🔄 Webhook Events

The module handles the following webhook events from Maplerad:

### Transaction Events

- `transaction.created` - Successful card transaction
- `authorization.declined` - Failed transaction attempt
- `authorization.code` - 3D Secure authorization code
- `transaction.refund` - Refund processed

### Card Events

- `card.updated` - Card status or details changed
- `card.terminated` - Card terminated

### Example Webhook Payload

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

## 🛡️ Security Features

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Company Isolation**: Users can only access their company's cards
- **Data Encryption**: Sensitive card data encrypted with JWT tokens
- **Webhook Validation**: Optional signature verification
- **Rate Limiting**: Built-in request throttling
- **Audit Logging**: All operations logged for compliance

## 📊 Data Models

### Card Model

```typescript
{
  id: string;
  customer_id: string;
  company_id: string;
  provider: "maplerad"; // Encrypted
  provider_card_id: string;
  number: string; // Encrypted
  masked_number: string;
  cvv: string; // Encrypted
  expiry_month: number;
  expiry_year: number;
  balance: number;
  status: "ACTIVE" | "FROZEN" | "TERMINATED";
  brand: "VISA" | "MASTERCARD";
  currency: "USD";
  created_at: Date;
}
```

### Transaction Model

```typescript
{
  id: string;
  card_id: string;
  customer_id: string;
  company_id: string;
  type: "purchase" | "fund" | "withdraw" | "refund";
  amount: number;
  currency: "USD";
  provider: "maplerad"; // Encrypted
  order_id: string; // Maplerad transaction ID
  status: "SUCCESS" | "FAILED" | "PENDING";
  description: string;
  created_at: Date;
}
```

## 🔧 Business Rules

- **Age Verification**: Customers must be 18+ to create cards
- **Card Limits**: Maximum 5 cards per customer
- **Funding Limits**: Minimum $1, maximum $50 per funding operation
- **Balance Requirements**: Minimum $2 to create a card
- **Transaction Fees**: Configurable fees for card operations
- **Daily Limits**: Configurable daily funding limits

## 📈 Monitoring

### Health Checks

```http
GET /webhook/maplerad/health
```

### Logging

All operations are logged with the following information:

- User ID and company ID
- Operation type and parameters
- Success/failure status
- Error details (if applicable)
- Timestamp

### Metrics

- Success rates for card operations
- Average processing times
- Error rates by operation type
- Webhook processing statistics

## 🚨 Error Handling

The module includes comprehensive error handling:

- **Validation Errors**: Invalid input parameters
- **Authentication Errors**: Invalid or missing JWT tokens
- **Authorization Errors**: Access denied to resources
- **Balance Errors**: Insufficient wallet or card balance
- **API Errors**: Maplerad API failures with retry logic
- **Database Errors**: Transaction rollbacks on failures

## 🧪 Testing

### Unit Tests

```bash
npm test -- src/modules/maplerad/maplerad.service.spec.ts
```

### Integration Tests

```bash
npm test -- src/modules/maplerad/maplerad.controller.spec.ts
```

### Webhook Testing

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/webhook/maplerad \
  -H "Content-Type: application/json" \
  -d @test-webhook-payload.json
```

## 📚 Dependencies

- `@nestjs/common`
- `@nestjs/core`
- `axios` - HTTP client for Maplerad API
- `class-validator` - Request validation
- `prisma` - Database ORM
- `jsonwebtoken` - JWT token handling

## 🔗 Related Documentation

- [Maplerad API Documentation](https://docs.maplerad.com)
- [Card Creation Flow](./maplerad-integration-flows/card-creation-flow.md)
- [Card Funding Flow](./maplerad-integration-flows/card-funding-flow.md)
- [Webhook Processing Flow](./maplerad-integration-flows/webhook-processing-flow.md)
- [Transaction Processing Flow](./maplerad-integration-flows/transaction-processing-flow.md)

## 🤝 Support

For technical support or questions about the Maplerad integration:

1. Check the integration documentation in `/maplerad-integration-docs/`
2. Review the flow documentation in `/maplerad-integration-flows/`
3. Check application logs for detailed error information
4. Contact the development team

## 📝 Changelog

### v1.0.0

- Initial Maplerad integration
- Card creation, funding, and withdrawal flows
- Webhook processing for real-time updates
- Comprehensive error handling and logging
- Security features with encrypted data storage
