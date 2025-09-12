# Maplerad Card Integration Implementation Plan

## Overview

This plan outlines the steps to integrate Maplerad as a new card provider alongside the existing Sudo provider in the WAVLET API project.

## Current Project Analysis

### Architecture

- **Framework**: NestJS with TypeScript
- **Database**: Prisma ORM with PostgreSQL
- **Current Provider**: Sudo (located in `src/utils/cards/sudo.ts`)
- **Card Module**: `src/modules/card/` with service, controller, and DTOs
- **Models**: Prisma models for Card, Customer, Transaction, Wallet, etc.

### Existing Card Flow

1. Customer creation via Sudo API
2. Card creation with funding source selection
3. Card funding/withdrawal via account transfers
4. Transaction tracking and balance management
5. Integration with wallet system for fee deduction

## Maplerad Integration Analysis

### Source Structure (from skr-api-v2)

- **index.ts**: Main export file combining card and transaction utilities
- **card.ts**: Customer enrollment, card CRUD operations, status management
- **card-transaction.ts**: Funding, withdrawals, transaction retrieval
- **tools.ts**: Utility functions, validations, currency conversions

### Key Features to Implement

1. **Customer Enrollment**: KYC-compliant customer creation with identity verification
2. **Card Issuance**: Virtual USD cards with Visa/Mastercard support
3. **Card Management**: Status control (freeze/unfreeze/terminate)
4. **Funding Operations**: Load money onto cards
5. **Withdrawal Operations**: Withdraw funds from cards to wallet
6. **Transaction Tracking**: Real-time transaction monitoring
7. **Balance Management**: Accurate balance tracking and updates

## Implementation Plan

### Phase 1: Project Setup and Structure

1. **Create Directory Structure**

   - Create `src/utils/cards/maplerad/` directory
   - Set up file structure mirroring source but adapted for current project

2. **Environment Variables**
   - Add Maplerad-specific environment variables to `src/env.ts`
   - Include base URL, API key, and configuration settings

### Phase 2: Core Integration Files

3. **Create Tools Module** (`tools.ts`)

   - Adapt validation functions for current data models
   - Implement currency conversion utilities
   - Create error handling helpers
   - Map data formats between Maplerad and local models

4. **Create Card Utilities** (`card.ts`)

   - Adapt customer enrollment logic
   - Implement card creation with proper data mapping
   - Add card status management functions
   - Handle sensitive data encryption/decryption

5. **Create Transaction Utilities** (`card-transaction.ts`)

   - Implement funding operations
   - Add withdrawal functionality
   - Create transaction retrieval methods
   - Handle transaction status mapping

6. **Create Main Index** (`index.ts`)
   - Export all utilities in organized manner
   - Maintain consistency with existing patterns

### Phase 3: Service Integration

7. **Update Card Service**

   - Add Maplerad provider support to `src/modules/card/card.service.ts`
   - Implement provider selection logic
   - Adapt existing methods to work with Maplerad
   - Handle provider-specific error responses

8. **Database Model Updates**
   - Ensure Prisma models support Maplerad data fields
   - Add any missing fields for Maplerad-specific data
   - Update relationships if needed

### Phase 4: Testing and Validation

9. **Unit Tests**

   - Create tests for each utility function
   - Test error handling scenarios
   - Validate data transformations

10. **Integration Tests**
    - Test end-to-end card creation flow
    - Validate funding and withdrawal operations
    - Test transaction synchronization

## Key Adaptations Required

### 1. Data Model Mapping

- **Customer ID**: Maplerad uses `customer_id` vs local `sudo_customer_id`
- **Card Reference**: Maplerad uses `card_id` vs local `provider_card_id`
- **Balance Tracking**: Ensure consistent balance updates across providers

### 2. Error Handling

- Adapt Maplerad error responses to match current project's error format
- Implement proper logging for debugging
- Handle provider-specific error codes

### 3. Authentication

- Maplerad uses Bearer token authentication
- Ensure secure storage of API credentials
- Implement proper request signing if required

### 4. Currency Handling

- Maplerad cards are USD-only
- Implement proper USD/XAF conversion for fees
- Handle currency-specific validations

### 5. Transaction Flow

- Adapt transaction creation logic for Maplerad's API
- Ensure wallet balance updates work correctly
- Implement proper transaction status tracking

## File Structure to Create

```
src/utils/cards/maplerad/
├── index.ts              # Main export file
├── card.ts              # Card and customer operations
├── card-transaction.ts  # Transaction operations
└── tools.ts             # Utility functions
```

## Environment Variables to Add

```typescript
// Maplerad Configuration
MAPLERAD_BASE_URL: str(),
MAPLERAD_SECRET_KEY: str(),
MAPLERAD_ENROLL_CREATE_CARD_URL: str(),

// Maplerad Fees (USD)
MAPLERAD_CARD_CREATION_FEE: num(),
MAPLERAD_CARD_FUNDING_FEE: num(),
MAPLERAD_CARD_WITHDRAWAL_FEE: num(),
```

## Success Criteria

1. **Functional Integration**: All Maplerad card operations work end-to-end
2. **Data Consistency**: Balances and transactions sync correctly
3. **Error Handling**: Proper error responses and logging
4. **Performance**: Operations complete within acceptable time limits
5. **Security**: Sensitive data properly encrypted and secured
6. **Maintainability**: Code follows project patterns and is well-documented

## Risk Mitigation

1. **Testing**: Comprehensive testing before production deployment
2. **Rollback**: Ability to disable Maplerad provider if issues arise
3. **Monitoring**: Implement proper logging and monitoring
4. **Documentation**: Clear documentation for maintenance and troubleshooting

## Timeline Estimate

- **Phase 1**: 2-3 hours (Setup and structure)
- **Phase 2**: 4-6 hours (Core integration files)
- **Phase 3**: 3-4 hours (Service integration)
- **Phase 4**: 2-3 hours (Testing and validation)

**Total Estimated Time**: 11-16 hours

## Implementation Status

✅ **COMPLETED PHASES:**

### Phase 1: Project Setup and Structure

- ✅ Created `src/utils/cards/maplerad/` directory
- ✅ Added Maplerad-specific environment variables to `src/env.ts`

### Phase 2: Core Integration Files

- ✅ Created `tools.ts` with adapted utility functions for WAVLET
- ✅ Created `card.ts` with customer enrollment and card operations
- ✅ Created `card-transaction.ts` with funding, withdrawals, and transaction retrieval
- ✅ Created `index.ts` exporting all utilities

### Phase 3: Service Integration

- ✅ Created `MapleradService` with full card management functionality
- ✅ Created `MapleradController` with REST API endpoints
- ✅ Created `MapleradModule` for NestJS integration
- ✅ Updated `AppModule` to include MapleradModule

## Files Created

```
src/utils/cards/maplerad/
├── index.ts              # Main export file
├── card.ts              # Card and customer operations
├── card-transaction.ts  # Transaction operations
└── tools.ts             # Utility functions

src/modules/maplerad/
├── maplerad.service.ts     # Business logic service
├── maplerad.controller.ts  # REST API controller
└── maplerad.module.ts      # NestJS module
```

## API Endpoints Available

- `POST /maplerad/cards` - Create new Maplerad card
- `POST /maplerad/cards/:cardId/fund` - Fund a card
- `POST /maplerad/cards/:cardId/withdraw` - Withdraw from card
- `PUT /maplerad/cards/:cardId/freeze` - Freeze card
- `PUT /maplerad/cards/:cardId/unfreeze` - Unfreeze card
- `GET /maplerad/cards` - Get all company cards
- `GET /maplerad/cards/:cardId` - Get specific card
- `GET /maplerad/cards/:cardId/transactions` - Get card transactions

## Environment Variables Required

Add these to your `.env` file:

```env
# Maplerad Configuration
MAPLERAD_BASE_URL=https://api.maplerad.com/v1
MAPLERAD_SECRET_KEY=your_maplerad_secret_key
MAPLERAD_ENROLL_CREATE_CARD_URL=https://api.maplerad.com/v1

# Maplerad Fees (USD)
MAPLERAD_CARD_CREATION_FEE=2
MAPLERAD_CARD_FUNDING_FEE=0
MAPLERAD_CARD_WITHDRAWAL_FEE=0
```

## Next Steps

1. **Configure Environment**: Add the required environment variables
2. **Test Integration**: Test the endpoints with Maplerad API
3. **Database Migration**: Ensure customer model supports `maplerad_customer_id` field
4. **Documentation**: Update API documentation
5. **Production Deployment**: Deploy and monitor in production

## Key Features Implemented

- ✅ Customer enrollment with KYC compliance
- ✅ Virtual USD card creation (Visa/Mastercard)
- ✅ Card funding and withdrawal operations
- ✅ Card status management (freeze/unfreeze)
- ✅ Transaction tracking and synchronization
- ✅ Secure sensitive data handling
- ✅ Comprehensive error handling and logging
- ✅ Integration with existing wallet system
- ✅ RESTful API with Swagger documentation
