# Maplerad Service Documentation

## Overview

The `MapleradService` is the core business logic layer for the Maplerad integration. It handles all card operations, customer management, transaction processing, and integration with the Maplerad API and local database.

## Class Structure

```typescript
@Injectable()
export class MapleradService {
  constructor(private prisma: PrismaService) {}
  // ... methods
}
```

## Core Methods

### 1. createCard()

**Purpose**: Creates a new virtual USD card for a customer.

**Parameters**:

```typescript
createCardDto: CreateCardDto = {
  customer_id: string,
  brand: "VISA" | "MASTERCARD",
  name_on_card: string,
  amount: number,
};
```

**Process Flow**:

1. **Validation Phase**:

   - Validates customer exists and belongs to company
   - Checks customer age (minimum 18 years)
   - Validates card brand (VISA/MASTERCARD only)
   - Checks card creation limit (max 5 cards per customer)
   - Validates funding amount (minimum 2 USD)

2. **Balance Check**:

   - Retrieves company's USD wallet
   - Calculates total cost (creation fee + funding amount)
   - Verifies sufficient wallet balance

3. **Customer Enrollment**:

   - Checks if customer has Maplerad customer ID
   - Creates Maplerad customer if not exists
   - Updates local customer record with Maplerad ID

4. **Card Creation**:

   - Calls Maplerad API to create virtual card
   - Handles API response and error cases
   - Extracts card details (PAN, CVV, expiry, etc.)

5. **Database Operations**:
   - Updates wallet balance (deduct creation fee + funding)
   - Creates local card record with encrypted sensitive data
   - Creates transaction records for creation and funding
   - Logs customer action

**Error Handling**:

- Customer validation errors
- Insufficient balance errors
- Maplerad API errors
- Database transaction failures

### 2. fundCard()

**Purpose**: Adds funds to an existing card from the company's wallet.

**Parameters**:

```typescript
companyId: string,
cardId: string,
amount: number,
customerId: string
```

**Process Flow**:

1. **Validation**:

   - Verifies customer and card ownership
   - Checks card is not frozen
   - Validates funding amount (minimum 1 USD)
   - Confirms card uses Maplerad provider

2. **Balance Management**:

   - Retrieves current wallet balance
   - Verifies sufficient funds for funding
   - Calculates new balances

3. **Maplerad API Call**:

   - Calls Maplerad funding endpoint
   - Handles success/error responses
   - Logs API interactions

4. **Database Updates**:
   - Updates card balance
   - Deducts amount from wallet
   - Creates transaction record
   - Logs operation

### 3. withdrawFromCard()

**Purpose**: Withdraws funds from a card back to the company's wallet.

**Parameters**:

```typescript
companyId: string,
cardId: string,
amount: number,
customerId: string
```

**Process Flow**:

1. **Validation**:

   - Verifies customer and card ownership
   - Checks card is not frozen
   - Validates withdrawal amount
   - Confirms sufficient card balance

2. **Maplerad API Call**:

   - Calls Maplerad withdrawal endpoint
   - Processes response

3. **Balance Updates**:
   - Updates card balance (decrease)
   - Updates wallet balance (increase)
   - Creates transaction record

### 4. freezeCard() / unfreezeCard()

**Purpose**: Controls card status to prevent/allow transactions.

**Process Flow**:

1. **Validation**: Verifies ownership and current status
2. **Maplerad API Call**: Updates card status in Maplerad
3. **Database Update**: Updates local card status
4. **Response**: Returns success/failure status

### 5. findAllByCompany()

**Purpose**: Retrieves all Maplerad cards for a company.

**Parameters**:

```typescript
companyId: string;
```

**Process Flow**:

1. **Database Query**: Fetches cards with Maplerad provider
2. **Data Mapping**: Converts to response format
3. **Customer Data**: Includes customer information
4. **Response**: Returns formatted card list

### 6. findOne()

**Purpose**: Retrieves detailed information about a specific card.

**Parameters**:

```typescript
companyId: string,
cardId: string,
reveal?: boolean
```

**Process Flow**:

1. **Database Query**: Fetches card details
2. **Sensitive Data Handling**:
   - If `reveal=true`: Fetches real card data from Maplerad API
   - Decrypts stored tokens to reveal PAN/CVV
   - Updates local storage with fresh encrypted data
3. **Response Formatting**: Returns masked or revealed data

### 7. getTransactions()

**Purpose**: Retrieves transaction history for a card.

**Parameters**:

```typescript
companyId: string,
cardId: string
```

**Process Flow**:

1. **Authorization**: Verifies card belongs to company
2. **Database Query**: Fetches transactions for card
3. **Data Formatting**: Converts to response format
4. **Response**: Returns transaction list

## Data Models

### Card Creation Flow

```typescript
// Local Card Model
{
  id: string,                    // UUID
  status: "ACTIVE" | "FROZEN" | "TERMINATED",
  customer_id: string,
  company_id: string,
  country: string,
  brand: "VISA" | "MASTERCARD",
  provider: "maplerad",         // Encrypted
  currency: "USD",
  name: string,                  // Cardholder name
  balance: number,
  reference: string,             // Maplerad account ID
  provider_card_id: string,      // Maplerad card ID
  number: string,                // Encrypted PAN token
  masked_number: string,         // ****-****-****-1234
  last4: string,
  cvv: string,                   // Encrypted CVV token
  expiry_month: number,
  expiry_year: number,
  postal_code: string,
  street: string,
  city: string,
  state_code: string,
  country_iso_code: string,
  is_active: true,
  is_virtual: true
}
```

### Transaction Model

```typescript
{
  id: string,
  status: "SUCCESS" | "FAILED" | "PENDING",
  category: "card",
  type: "purchase" | "fund" | "withdraw" | "settlement",
  amount: number,
  currency: "USD",
  customer_id: string,
  company_id: string,
  card_id: string,
  card_balance_before: number,
  card_balance_after: number,
  wallet_balance_before: number,
  wallet_balance_after: number,
  provider: "maplerad",          // Encrypted
  order_id: string,              // Maplerad transaction ID
  description: string,
  created_at: Date
}
```

## Error Handling

### Custom Exceptions

```typescript
// Business Logic Errors
throw new BadRequestException("Insufficient wallet balance to create card");
throw new BadRequestException("Customer not found");
throw new BadRequestException(
  "Card not found or does not belong to this customer"
);
throw new BadRequestException("Incorrect card source");
throw new BadRequestException("Cannot fund a frozen card");
throw new NotFoundException("Company not found");
```

### Maplerad API Errors

```typescript
// API Error Handling
if (cardMapleradResult.error) {
  console.error("❌ Error creating Maplerad card:", cardMapleradResult.error);
  // Log detailed error
  // Throw appropriate exception
}
```

## Security Features

### Data Encryption

- **PAN Encryption**: Card numbers stored as JWT tokens
- **CVV Encryption**: CVV stored as JWT tokens
- **Provider Field**: Provider name encrypted in database

### Access Control

- **Company Isolation**: All operations scoped to company
- **Customer Verification**: Customer ownership validation
- **User Authorization**: Company owner permissions required

## Database Operations

### Transaction Management

All card operations use database transactions to ensure data consistency:

```typescript
return CardModel.operation(async (prisma) => {
  // Multiple database operations
  // Automatic rollback on error
});
```

### Audit Logging

All operations create audit logs:

```typescript
await CustomerLogsModel.create({
  customer_id: customer.id,
  action: "card-purchase",
  status: "SUCCESS",
  log_json: {
    /* operation details */
  },
  log_txt: "Card creation success message",
  created_at: new Date(),
});
```

## Integration Points

### Maplerad API Integration

- **Authentication**: Bearer token authentication
- **Base URL**: Configurable via environment variables
- **Error Handling**: Standardized error response format
- **Rate Limiting**: Respects API rate limits

### Local Database Integration

- **Prisma ORM**: Type-safe database operations
- **Transaction Support**: ACID compliance
- **Model Relations**: Proper foreign key relationships
- **Migration Support**: Database schema versioning

### Wallet System Integration

- **Balance Management**: Real-time balance updates
- **Currency Handling**: USD wallet operations
- **Fee Deduction**: Automatic fee processing
- **Transaction History**: Complete audit trail

## Performance Considerations

### Optimization Strategies

- **Database Indexing**: Proper indexes on frequently queried fields
- **Connection Pooling**: Efficient database connection management
- **Caching**: Consider caching for frequently accessed data
- **Batch Operations**: Group related database operations

### Monitoring

- **Response Times**: Track API response times
- **Error Rates**: Monitor error rates and patterns
- **Database Performance**: Query performance monitoring
- **API Limits**: Track Maplerad API usage

## Testing Strategy

### Unit Tests

- **Service Methods**: Test each service method in isolation
- **Mock Dependencies**: Mock Prisma and Maplerad API calls
- **Error Scenarios**: Test error handling paths
- **Edge Cases**: Test boundary conditions

### Integration Tests

- **End-to-End Flows**: Test complete card creation flow
- **Database Integration**: Test actual database operations
- **API Integration**: Test Maplerad API interactions
- **Transaction Rollback**: Test error recovery

## Maintenance

### Code Organization

- **Separation of Concerns**: Clear separation between business logic and data access
- **Error Handling**: Centralized error handling patterns
- **Logging**: Comprehensive logging for debugging
- **Documentation**: Inline code documentation

### Future Enhancements

- **Webhook Integration**: Real-time transaction updates
- **Bulk Operations**: Batch card creation and funding
- **Advanced Analytics**: Transaction analytics and reporting
- **Multi-Currency Support**: Support for additional currencies
