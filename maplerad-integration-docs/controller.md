# Maplerad Controller Documentation

## Overview

The `MapleradController` is a NestJS controller that provides REST API endpoints for managing Maplerad virtual cards. It handles HTTP requests and responses, delegating business logic to the `MapleradService`.

## Class Structure

```typescript
@ApiTags("Maplerad Cards")
@Controller("maplerad/cards")
@UseGuards(OwnerGuard)
export class MapleradController {
  constructor(private readonly mapleradService: MapleradService) {}
  // ... methods
}
```

## Endpoints

### 1. Create Card

**Endpoint**: `POST /maplerad/cards`

**Description**: Creates a new virtual USD card for a customer.

**Authentication**: Requires `OwnerGuard` (user must be company owner)

**Request Body**:

```typescript
{
  "customer_id": "string",     // Required: Customer ID
  "brand": "VISA|MASTERCARD", // Required: Card brand
  "name_on_card": "string",   // Required: Name to appear on card
  "amount": number           // Required: Initial funding amount (min: 2 USD)
}
```

**Response**:

```typescript
{
  "status": "success",
  "message": "Card created successfully",
  "card": {
    "id": "string",
    "customer_id": "string",
    "status": "ACTIVE",
    "balance": number,
    "number": "****-****-****-****",
    "masked_number": "****-****-****-1234",
    "last4": "1234",
    "cvv": "encrypted_token",
    "expiry_month": 12,
    "expiry_year": 99,
    "brand": "VISA",
    "currency": "USD",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid brand, insufficient amount, customer not found
- `403 Forbidden`: User not authorized
- `500 Internal Server Error`: Maplerad API error

### 2. Fund Card

**Endpoint**: `POST /maplerad/cards/:cardId/fund`

**Description**: Adds funds to an existing card from the company's USD wallet.

**Parameters**:

- `cardId` (path): Card identifier

**Request Body**:

```typescript
{
  "amount": number,        // Required: Amount to fund (min: 1 USD)
  "customer_id": "string"  // Required: Customer ID for verification
}
```

**Response**:

```typescript
{
  "status": "success",
  "message": "Card funded successfully with $50"
}
```

### 3. Withdraw from Card

**Endpoint**: `POST /maplerad/cards/:cardId/withdraw`

**Description**: Withdraws funds from a card back to the company's USD wallet.

**Parameters**:

- `cardId` (path): Card identifier

**Request Body**:

```typescript
{
  "amount": number,        // Required: Amount to withdraw (min: 1 USD)
  "customer_id": "string"  // Required: Customer ID for verification
}
```

**Response**:

```typescript
{
  "status": "success",
  "message": "Successfully withdrawn $25 from card"
}
```

### 4. Freeze Card

**Endpoint**: `PUT /maplerad/cards/:cardId/freeze`

**Description**: Freezes a card to prevent transactions.

**Parameters**:

- `cardId` (path): Card identifier

**Request Body**:

```typescript
{
  "customer_id": "string"  // Required: Customer ID for verification
}
```

**Response**:

```typescript
{
  "success": true,
  "message": "Card frozen successfully"
}
```

### 5. Unfreeze Card

**Endpoint**: `PUT /maplerad/cards/:cardId/unfreeze`

**Description**: Unfreezes a card to allow transactions.

**Parameters**:

- `cardId` (path): Card identifier

**Request Body**:

```typescript
{
  "customer_id": "string"  // Required: Customer ID for verification
}
```

**Response**:

```typescript
{
  "success": true,
  "message": "Card unfrozen successfully"
}
```

### 6. Get All Cards

**Endpoint**: `GET /maplerad/cards`

**Description**: Retrieves all Maplerad cards for the user's company.

**Response**:

```typescript
[
  {
    id: "string",
    customer_id: "string",
    status: "ACTIVE",
    balance: number,
    number: "****-****-****-****",
    created_at: "2025-01-01T00:00:00.000Z",
    customer: {
      id: "string",
      first_name: "string",
      last_name: "string",
      email: "string",
    },
  },
];
```

### 7. Get Card Details

**Endpoint**: `GET /maplerad/cards/:cardId`

**Description**: Retrieves detailed information about a specific card.

**Parameters**:

- `cardId` (path): Card identifier

**Query Parameters**:

- `reveal` (optional): Set to "true" to reveal sensitive card details

**Response**:

```typescript
{
  "id": "string",
  "customer_id": "string",
  "status": "ACTIVE",
  "balance": number,
  "number": "****-****-****-****",  // Masked or revealed based on query param
  "masked_number": "****-****-****-1234",
  "last4": "1234",
  "cvv": "encrypted_token",        // Revealed if query param is true
  "expiry_month": 12,
  "expiry_year": 99,
  "brand": "VISA",
  "currency": "USD",
  "created_at": "2025-01-01T00:00:00.000Z",
  "customer": {
    "id": "string",
    "first_name": "string",
    "last_name": "string",
    "email": "string"
  }
}
```

### 8. Get Card Transactions

**Endpoint**: `GET /maplerad/cards/:cardId/transactions`

**Description**: Retrieves transaction history for a specific card.

**Parameters**:

- `cardId` (path): Card identifier

**Response**:

```typescript
[
  {
    id: "string",
    category: "card",
    type: "fund|withdraw|settlement",
    card_id: "string",
    card_balance_before: number,
    card_balance_after: number,
    wallet_balance_before: number,
    wallet_balance_after: number,
    amount: number,
    currency: "USD",
    status: "SUCCESS|FAILED|PENDING",
    created_at: "2025-01-01T00:00:00.000Z",
  },
];
```

## Security Features

### Authentication & Authorization

- **OwnerGuard**: Ensures only company owners can access endpoints
- **JWT Tokens**: User authentication via `@CurrentUser()` decorator
- **Company Validation**: All operations validate company ownership

### Data Protection

- **Sensitive Data Encryption**: PAN and CVV encrypted with JWT tokens
- **Masked Responses**: Card numbers masked by default
- **Selective Revelation**: Sensitive data only revealed with explicit permission

## Error Handling

The controller uses NestJS exception filters and returns standardized error responses:

```typescript
// Example error response
{
  "statusCode": 400,
  "message": "Insufficient wallet balance to create card",
  "error": "Bad Request"
}
```

## Dependencies

- `MapleradService`: Business logic service
- `OwnerGuard`: Authorization guard
- `@CurrentUser()`: User context decorator
- Card DTOs: Request/response validation

## Swagger Documentation

All endpoints are documented with Swagger/OpenAPI:

- `@ApiTags("Maplerad Cards")`: Groups endpoints under "Maplerad Cards" tag
- `@ApiOperation()`: Describes endpoint purpose
- `@ApiResponse()`: Documents response formats and status codes

## Rate Limiting

Consider implementing rate limiting for card creation and funding operations to prevent abuse:

```typescript
// Example rate limiting (to be implemented)
@UseGuards(RateLimitGuard)
@Post()
createCard() {
  // Implementation
}
```

## Logging

All controller methods include comprehensive logging:

- Request parameters logging
- Response data logging (with sensitive data masked)
- Error logging with context
- Performance timing

## Testing

Controller endpoints should be tested with:

- Unit tests for each endpoint
- Integration tests with mocked service
- Authentication/authorization tests
- Error scenario tests
- Rate limiting tests
