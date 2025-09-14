# Maplerad API Endpoints Documentation

## Overview

This document provides detailed documentation for all Maplerad integration API endpoints, including request/response formats, authentication requirements, and error handling.

## Base URL

All endpoints are prefixed with: `/maplerad/cards`

## Authentication

All endpoints require:

- **JWT Authentication**: User must be logged in
- **OwnerGuard**: User must be a company owner
- **Company Context**: All operations are scoped to the user's company

## Endpoints

### 1. Create Card

**Endpoint**: `POST /maplerad/cards`

**Description**: Creates a new virtual USD card for a customer.

**Method**: `POST`

**Content-Type**: `application/json`

**Authentication**: Required (OwnerGuard)

#### Request Body

```typescript
{
  customer_id: string; // Required: Customer UUID
  brand: "VISA" | "MASTERCARD"; // Required: Card brand
  name_on_card: string; // Required: Name to appear on card (max 50 chars)
  amount: number; // Required: Initial funding amount (min: 2 USD)
}
```

#### Request Example

```bash
curl -X POST "/maplerad/cards" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "123e4567-e89b-12d3-a456-426614174000",
    "brand": "VISA",
    "name_on_card": "John Doe",
    "amount": 50
  }'
```

#### Success Response (201 Created)

```typescript
{
  status: "success",
  message: "Card created successfully",
  card: {
    id: "card_123456789",
    customer_id: "cust_123",
    status: "ACTIVE",
    balance: 50,
    number: "****-****-****-1234",
    masked_number: "****-****-****-1234",
    last4: "1234",
    cvv: "encrypted_token",
    expiry_month: 12,
    expiry_year: 99,
    brand: "VISA",
    currency: "USD",
    created_at: "2025-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request**

```typescript
{
  statusCode: 400,
  message: "Insufficient wallet balance to create card",
  error: "Bad Request"
}
```

**403 Forbidden**

```typescript
{
  statusCode: 403,
  message: "Forbidden resource",
  error: "Forbidden"
}
```

**500 Internal Server Error**

```typescript
{
  statusCode: 500,
  message: "Card creation failed: API Error",
  error: "Internal Server Error"
}
```

### 2. Fund Card

**Endpoint**: `POST /maplerad/cards/:cardId/fund`

**Description**: Adds funds to an existing card from the company's USD wallet.

**Method**: `POST`

**Parameters**:

- `cardId` (path): Card identifier

#### Request Body

```typescript
{
  customer_id: string; // Required: Customer UUID for verification
  amount: number; // Required: Amount to fund (min: 1 USD)
}
```

#### Request Example

```bash
curl -X POST "/maplerad/cards/card_123/fund" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 25
  }'
```

#### Success Response (200 OK)

```typescript
{
  status: "success",
  message: "Card funded successfully with $25"
}
```

### 3. Withdraw from Card

**Endpoint**: `POST /maplerad/cards/:cardId/withdraw`

**Description**: Withdraws funds from a card back to the company's USD wallet.

**Method**: `POST`

**Parameters**:

- `cardId` (path): Card identifier

#### Request Body

```typescript
{
  customer_id: string; // Required: Customer UUID for verification
  amount: number; // Required: Amount to withdraw (min: 1 USD)
}
```

#### Success Response (200 OK)

```typescript
{
  status: "success",
  message: "Successfully withdrawn $10 from card"
}
```

### 4. Freeze Card

**Endpoint**: `PUT /maplerad/cards/:cardId/freeze`

**Description**: Freezes a card to prevent transactions.

**Method**: `PUT`

**Parameters**:

- `cardId` (path): Card identifier

#### Request Body

```typescript
{
  customer_id: string; // Required: Customer UUID for verification
}
```

#### Success Response (200 OK)

```typescript
{
  success: true,
  message: "Card frozen successfully"
}
```

### 5. Unfreeze Card

**Endpoint**: `PUT /maplerad/cards/:cardId/unfreeze`

**Description**: Unfreezes a card to allow transactions.

**Method**: `PUT`

**Parameters**:

- `cardId` (path): Card identifier

#### Request Body

```typescript
{
  customer_id: string; // Required: Customer UUID for verification
}
```

#### Success Response (200 OK)

```typescript
{
  success: true,
  message: "Card unfrozen successfully"
}
```

### 6. Get All Cards

**Endpoint**: `GET /maplerad/cards`

**Description**: Retrieves all Maplerad cards for the user's company.

**Method**: `GET`

#### Success Response (200 OK)

```typescript
[
  {
    id: "card_123",
    customer_id: "cust_123",
    status: "ACTIVE",
    balance: 50,
    number: "****-****-****-1234",
    created_at: "2025-01-01T00:00:00.000Z",
    customer: {
      id: "cust_123",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
    },
  },
];
```

### 7. Get Card Details

**Endpoint**: `GET /maplerad/cards/:cardId`

**Description**: Retrieves detailed information about a specific card.

**Method**: `GET`

**Parameters**:

- `cardId` (path): Card identifier

**Query Parameters**:

- `reveal` (optional): Set to "true" to reveal sensitive card details

#### Request Example

```bash
# Get masked card details
curl -X GET "/maplerad/cards/card_123" \
  -H "Authorization: Bearer <jwt_token>"

# Get full card details (reveals PAN and CVV)
curl -X GET "/maplerad/cards/card_123?reveal=true" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Success Response (200 OK)

```typescript
{
  id: "card_123",
  customer_id: "cust_123",
  status: "ACTIVE",
  balance: 50,
  number: "4111111111111111",  // Revealed if ?reveal=true
  masked_number: "****-****-****-1111",
  last4: "1111",
  cvv: "123",                   // Revealed if ?reveal=true
  expiry_month: 12,
  expiry_year: 99,
  brand: "VISA",
  currency: "USD",
  created_at: "2025-01-01T00:00:00.000Z",
  customer: {
    id: "cust_123",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com"
  }
}
```

### 8. Get Card Transactions

**Endpoint**: `GET /maplerad/cards/:cardId/transactions`

**Description**: Retrieves transaction history for a specific card.

**Method**: `GET`

**Parameters**:

- `cardId` (path): Card identifier

#### Success Response (200 OK)

```typescript
[
  {
    id: "txn_123",
    category: "card",
    type: "fund",
    card_id: "card_123",
    card_balance_before: 25,
    card_balance_after: 50,
    wallet_balance_before: 1000,
    wallet_balance_after: 975,
    amount: 25,
    currency: "USD",
    status: "SUCCESS",
    created_at: "2025-01-01T00:00:00.000Z",
  },
];
```

## Error Codes

### Common HTTP Status Codes

| Status Code | Description           |
| ----------- | --------------------- |
| 200         | Success               |
| 201         | Created               |
| 400         | Bad Request           |
| 401         | Unauthorized          |
| 403         | Forbidden             |
| 404         | Not Found             |
| 500         | Internal Server Error |

### Business Logic Errors

| Error Message               | Description                              | Resolution                |
| --------------------------- | ---------------------------------------- | ------------------------- |
| Insufficient wallet balance | Company wallet doesn't have enough funds | Add funds to wallet       |
| Customer not found          | Invalid customer_id provided             | Verify customer exists    |
| Card not found              | Invalid card_id provided                 | Verify card exists        |
| Card limit exceeded         | Customer has reached 5 card limit        | Remove unused cards       |
| Age requirement not met     | Customer is under 18                     | Customer must be 18+      |
| Cannot fund frozen card     | Card is frozen                           | Unfreeze card first       |
| Incorrect card source       | Card not from Maplerad                   | Use correct card provider |

## Rate Limiting

- **Card Creation**: 10 requests per minute per company
- **Funding/Withdrawal**: 30 requests per minute per card
- **Status Changes**: 60 requests per minute per card
- **Queries**: 100 requests per minute per company

## Request/Response Headers

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

### Response Headers

```http
Content-Type: application/json
X-Request-ID: <unique_request_id>
X-Rate-Limit-Remaining: <remaining_requests>
X-Rate-Limit-Reset: <reset_timestamp>
```

## Validation Rules

### Card Creation

- `customer_id`: Must be valid UUID, customer must exist and belong to company
- `brand`: Must be "VISA" or "MASTERCARD"
- `name_on_card`: 1-50 characters, alphanumeric and spaces only
- `amount`: Must be >= 2 USD

### Funding/Withdrawal

- `customer_id`: Must match card owner
- `amount`: Must be >= 1 USD
- Card must be ACTIVE (not frozen)
- Sufficient balance for withdrawal

### General

- All requests require valid JWT token
- User must be company owner
- All operations scoped to user's company
- Card must exist and be owned by customer

## Webhook Endpoints

### Maplerad Webhook

**Endpoint**: `POST /webhook/maplerad`

**Description**: Receives real-time updates from Maplerad for card events.

**Authentication**: None (webhook signature verification recommended)

#### Webhook Payload Example

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
        "category": "retail"
      },
      "status": "success"
    }
  }
}
```

#### Webhook Response

```typescript
{
  status: "success",
  processed: true
}
```

## SDK Usage Examples

### JavaScript/Node.js

```javascript
const axios = require("axios");

const api = axios.create({
  baseURL: "https://api.yourapp.com",
  headers: {
    Authorization: `Bearer ${jwtToken}`,
    "Content-Type": "application/json",
  },
});

// Create card
const card = await api.post("/maplerad/cards", {
  customer_id: "cust_123",
  brand: "VISA",
  name_on_card: "John Doe",
  amount: 50,
});

// Fund card
await api.post(`/maplerad/cards/${card.data.card.id}/fund`, {
  customer_id: "cust_123",
  amount: 25,
});
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {jwt_token}',
    'Content-Type': 'application/json'
}

# Create card
card_data = {
    'customer_id': 'cust_123',
    'brand': 'VISA',
    'name_on_card': 'John Doe',
    'amount': 50
}

response = requests.post(
    'https://api.yourapp.com/maplerad/cards',
    json=card_data,
    headers=headers
)

card = response.json()
```

## Testing

### Test Environment

Use the following test data for development:

```json
{
  "test_customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "test_card_id": "card_test_123456789",
  "test_amount": 10
}
```

### Postman Collection

Import the provided Postman collection for comprehensive API testing:

```json
{
  "info": {
    "name": "Maplerad Integration API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://api.yourapp.com"
    },
    {
      "key": "jwt_token",
      "value": "your_jwt_token_here"
    }
  ]
}
```

## Monitoring

### Health Check

**Endpoint**: `GET /health/maplerad`

**Description**: Checks Maplerad integration health.

```typescript
{
  status: "healthy",
  timestamp: "2025-01-01T00:00:00.000Z",
  services: {
    maplerad_api: "healthy",
    database: "healthy",
    redis: "healthy"
  }
}
```

### Metrics

Monitor these key metrics:

- API response times
- Error rates by endpoint
- Card creation success rate
- Webhook processing latency
- Database query performance

## Changelog

### v1.0.0

- Initial release
- Basic card CRUD operations
- Funding and withdrawal
- Webhook integration

### v1.1.0

- Enhanced error handling
- Rate limiting
- Improved logging
- Security enhancements

### v1.2.0

- Bulk operations
- Advanced filtering
- Analytics endpoints
- Performance optimizations
