# Maplerad Services Integration Plan

## Overview

The services in `src/services/card/maplerad/` need to be restructured to match the project's NestJS architecture and use the correct Prisma models instead of Supabase models.

## Current Issues

1. **Model Inconsistencies**: Services use `@/models` (Supabase) instead of `@/models/prisma`
2. **Utils Path Mismatch**: Import from `@/utils/transactions/card/maplerad` instead of `@/utils/cards/maplerad`
3. **Module Integration**: Services are not part of the `MapleradModule`
4. **Dependency Conflicts**: Mix of Supabase and Prisma dependencies

## Services to Integrate

### 1. CardCreationTrackingService

- **Current**: Uses `UserlogsModel` from Supabase
- **Target**: Use `CustomerLogsModel` from Prisma
- **Purpose**: Track card creation metadata and pending operations

### 2. CardFeeOptimizedService

- **Current**: Uses custom fee calculation logic
- **Target**: Integrate with existing `getCardFees` utility
- **Purpose**: Calculate optimized fees for card operations

### 3. CardIssuanceService

- **Current**: Complex issuance logic with webhook handling
- **Target**: Simplify and integrate with MapleradModule
- **Purpose**: Handle card creation with proper error handling and webhooks

### 4. CardMetadataSyncService

- **Current**: Sync metadata between systems
- **Target**: Use Prisma models for metadata operations
- **Purpose**: Synchronize card metadata across systems

### 5. CardTransactionStatusService

- **Current**: Track transaction statuses
- **Target**: Integrate with existing transaction models
- **Purpose**: Monitor and update card transaction statuses

### 6. CardTransactionsService

- **Current**: Handle card transactions
- **Target**: Use `TransactionModel` from Prisma
- **Purpose**: Process card-related transactions

### 7. PaymentDebtManagerService

- **Current**: Manage payment debts
- **Target**: Integrate with wallet and transaction systems
- **Purpose**: Handle debt management for card payments

### 8. WalletService

- **Current**: Custom wallet operations
- **Target**: Use `WalletModel` from Prisma
- **Purpose**: Manage wallet operations for Maplerad

### 9. WebhookWaitingService

- **Current**: Handle webhook waiting logic
- **Target**: Integrate with existing webhook system
- **Purpose**: Wait for and process Maplerad webhooks

## Implementation Steps

### Phase 1: Model Migration

1. Update all services to import from `@/models/prisma`
2. Replace Supabase model usage with Prisma equivalents
3. Update method calls to match Prisma model APIs

### Phase 2: Utils Path Updates

1. Change imports from `@/utils/transactions/card/maplerad` to `@/utils/cards/maplerad`
2. Update any utility function calls to match new paths

### Phase 3: Service Refactoring

1. Convert services to NestJS injectable services
2. Add proper dependency injection
3. Update constructor parameters to use PrismaService

### Phase 4: Module Integration

1. Move services to `src/modules/maplerad/services/`
2. Add services to `MapleradModule` providers
3. Update `MapleradService` to use the new services

### Phase 5: Dependency Cleanup

1. Remove Supabase dependencies
2. Update any remaining import conflicts
3. Ensure all services use consistent error handling

## File Structure After Integration

```
src/modules/maplerad/
├── maplerad.module.ts
├── maplerad.controller.ts
├── maplerad.service.ts
└── services/
    ├── card-creation-tracking.service.ts
    ├── card-fee-optimized.service.ts
    ├── card-issuance.service.ts
    ├── card-metadata-sync.service.ts
    ├── card-transaction-status.service.ts
    ├── card-transactions.service.ts
    ├── payment-debt-manager.service.ts
    ├── wallet.service.ts
    └── webhook-waiting.service.ts
```

## Testing Strategy

1. Unit tests for each migrated service
2. Integration tests for module functionality
3. End-to-end tests for complete card workflows

## Rollback Plan

- Keep original services as backup during migration
- Gradual rollout with feature flags
- Database migration scripts for any schema changes

## Success Criteria

- All services use Prisma models consistently
- Services are properly integrated into MapleradModule
- No Supabase dependencies remain
- All imports follow project conventions
- Card creation and management workflows function correctly
