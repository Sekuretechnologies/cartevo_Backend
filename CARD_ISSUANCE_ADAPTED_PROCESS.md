# Card Issuance Adapted Process Documentation

## Overview

This document describes the adapted card issuance process that has been implemented to support a company-centric architecture where customers belong to companies and all operations are conducted in USD using the company's USD wallet.

## Key Architectural Changes

### 1. Company-Centric Model

- **Before**: Individual users had their own wallets and currency conversions
- **After**: Customers belong to companies, and all card operations use the company's USD wallet exclusively

### 2. USD-Only Operations

- **Before**: Complex currency conversions between local currencies and USD
- **After**: All operations are conducted in USD only, eliminating currency conversion complexity

### 3. Unified Fee Structure

- **Before**: Different fees for first cards vs additional cards with complex calculations
- **After**: Single fee structure using `getCardFees()` for all card operations

### 4. Enhanced Balance Tracking

- **Before**: Basic transaction logging
- **After**: Comprehensive balance transaction records tracking old/new balances for both wallets and cards

## Database Schema Changes

### New Model: BalanceTransactionRecord

```prisma
model BalanceTransactionRecord {
  id                  String   @id @default(uuid())
  transaction_id      String   @map("transaction_id") // Links to main transaction
  entity_type         String   @map("entity_type") // 'wallet' or 'card'
  entity_id           String   @map("entity_id") // wallet_id or card_id
  old_balance         Float    @default(0)
  new_balance         Float    @default(0)
  amount_changed      Float    @default(0) // Positive for increase, negative for decrease
  currency            String
  change_type         String?   @map("change_type") // 'debit', 'credit', 'transfer_in', 'transfer_out'
  description         String?
  created_at          DateTime @default(now()) @map("created_at")

  @@map("balance_transaction_records")
}
```

This model provides granular tracking of balance changes for audit and reconciliation purposes.

## Step-by-Step Card Issuance Process

### Phase 1: Pre-Flight Validation

1. **Customer Verification**

   ```typescript
   const customerResult = await CustomerModel.getOne({ id: customerId });
   const customer = customerResult.output;
   ```

2. **Company Association**

   ```typescript
   const companyResult = await CompanyModel.getOne({
     id: customer.company_id,
   });
   const company = companyResult.output;
   ```

3. **USD Wallet Verification**
   ```typescript
   const walletResult = await WalletModel.get({
     company_id: company.id,
     currency: "USD",
   });
   ```
   - Ensures company has a USD wallet
   - Returns error if USD wallet not found

### Phase 2: Fee Calculation

1. **Simple Fee Calculation**

   ```typescript
   const feeCalculation = await calculateCardFees(
     company.id,
     completeDto.initialBalance
   );
   ```

2. **Fee Structure**

   - Uses `getCardFees(companyId)` to get issuance fee
   - Total fee = issuance fee + initial balance
   - No distinction between first/additional cards

3. **Balance Validation**
   ```typescript
   if (companyWallet.balance < totalToDebitUsd) {
     return error("Company USD wallet balance insufficient");
   }
   ```

### Phase 3: Fund Reservation

1. **Secure Reservation**

   ```typescript
   const reserveResult = await reserveCompanyWalletFunds(
     companyWallet.id,
     totalToDebitUsd,
     `Card issuance reservation for customer ${customer.first_name}`,
     clientReference
   );
   ```

2. **Atomic Operation**
   - Funds are logically reserved before external API calls
   - Prevents race conditions and ensures fund availability

### Phase 4: Maplerad Integration

1. **Customer Creation/Verification**

   ```typescript
   const customerIdResult = await ensureMapleradCustomer(customer);
   const mapleradCustomerId = customerIdResult.output;
   ```

2. **Card Creation Request**

   ```typescript
   const cardData = {
     customer_id: mapleradCustomerId,
     currency: "USD",
     type: "VIRTUAL",
     auto_approve: true,
     brand: convertBrandToMapleradFormat(completeDto.cardBrand),
     amount: Math.round(completeDto.initialBalance * 100),
   };
   ```

3. **Webhook Waiting**
   ```typescript
   const webhookResult = await webhookWaitingService.waitForWebhook(
     mapleradReference,
     600000 // 10 minutes timeout
   );
   ```

### Phase 5: Local Database Updates

1. **Card Creation**

   ```typescript
   const newCardResult = await CardModel.create({
     id: cardId,
     company_id: company.id,
     customer_id: customerId,
     status: finalCard.status?.toUpperCase() || "ACTIVE",
     balance: finalCard.balance || completeDto.initialBalance,
     currency: "USD",
     // ... other card details
   });
   ```

2. **Transaction Recording**

   ```typescript
   const transactionResult = await TransactionModel.create({
     id: transactionId,
     company_id: company.id,
     customer_id: customerId,
     wallet_id: companyWallet.id,
     card_id: cardId,
     category: "card",
     type: "purchase",
     amount: totalToDebitUsd,
     currency: "USD",
     // ... other transaction details
   });
   ```

3. **Balance Tracking Records**

   **Wallet Debit Record:**

   ```typescript
   await BalanceTransactionRecordModel.create({
     transaction_id: transactionId,
     entity_type: "wallet",
     entity_id: companyWallet.id,
     old_balance: originalWalletBalance,
     new_balance: originalWalletBalance - totalToDebitUsd,
     amount_changed: -totalToDebitUsd,
     currency: "USD",
     change_type: "debit",
     description: `Card issuance fee and initial balance debit`,
   });
   ```

   **Card Credit Record:**

   ```typescript
   await BalanceTransactionRecordModel.create({
     transaction_id: transactionId,
     entity_type: "card",
     entity_id: cardId,
     old_balance: 0,
     new_balance: completeDto.initialBalance,
     amount_changed: completeDto.initialBalance,
     currency: "USD",
     change_type: "credit",
     description: `Initial card balance credit`,
   });
   ```

4. **Wallet Balance Update**
   ```typescript
   await WalletModel.update(companyWallet.id, {
     balance: updatedWalletBalance,
     updated_at: new Date(),
   });
   ```

### Phase 6: Notifications

1. **Company Email Notification**

   ```typescript
   if (company.email) {
     emailQueueService.addEmail({
       userId: customerId,
       cardId: savedCard?.id,
       type: "cardCreated",
       recipientEmail: company.email, // Company email only
     });
   }
   ```

2. **Company In-App Notification**

   ```typescript
   await NotificationModel.create({
     customer_id: customerId,
     title: "Card Issuance Successful",
     text: `A new card has been issued for customer ${customer.first_name}...`,
   });
   ```

3. **Customer Push Notification**
   ```typescript
   notificationQueueService.addNotification({
     userId: customerId,
     title: "Card Created 🎉",
     message: `Your new card has been created successfully!`,
   });
   ```

## Error Handling & Rollback

### Automatic Refund on Failure

1. **Maplerad API Failure**

   ```typescript
   if (!mapleradCallSucceeded) {
     const refundResult = await refundCompanyWalletFunds(
       companyWallet.id,
       totalToDebitUsd,
       clientReference,
       err.message
     );
   }
   ```

2. **Transaction Status Update**

   ```typescript
   await TransactionModel.update(purchaseTransaction.id, {
     status: "FAILED",
     updated_at: utcToLocalTime(new Date())?.toISOString(),
   });
   ```

3. **Failure Notifications**
   - Company receives failure notification
   - Detailed error logging for debugging

## Fee Calculation Function

```typescript
const calculateCardFees = async (
  companyId: string,
  initialBalance: number
): Promise<CardFeeCalculation> => {
  const cardFees = await getCardFees(companyId);

  const issuanceFee = cardFees.issuanceFee;
  const totalFee = issuanceFee + initialBalance;

  return {
    issuanceFee,
    totalFee,
    breakdown: {
      issuanceFee,
      initialBalance,
    },
  };
};
```

## Benefits of the Adapted Process

### 1. Simplified Architecture

- No currency conversion complexity
- Single wallet per company for USD operations
- Unified fee structure

### 2. Enhanced Audit Trail

- Granular balance tracking
- Complete transaction history
- Easy reconciliation

### 3. Improved Reliability

- Atomic fund reservations
- Automatic rollback on failures
- Comprehensive error handling

### 4. Company-Focused Operations

- All notifications go to company
- Company wallet management
- Centralized control

### 5. Scalability

- No per-user wallet complexity
- Efficient balance tracking
- Optimized database queries

## API Usage Example

```typescript
import { issueRetailCardAdapted } from "@/services/card/maplerad/cardIssuanceAdapted";

const result = await issueRetailCardAdapted(
  {
    cardBrand: "visa",
    initialBalance: 50,
    firstName: "John",
    lastName: "Doe",
    // ... other card details
  },
  "customer-uuid-123",
  "John Doe",
  "blue"
);

if (result.output) {
  console.log("Card issued successfully:", result.output.card);
  console.log("Company wallet balance:", result.output.companyWalletBalance);
} else {
  console.error("Card issuance failed:", result.error);
}
```

## Monitoring & Analytics

The new system provides enhanced monitoring capabilities:

1. **Balance Tracking**: Real-time wallet and card balance monitoring
2. **Transaction Auditing**: Complete audit trail for all operations
3. **Failure Analysis**: Detailed error logging and failure patterns
4. **Performance Metrics**: Processing times and success rates

## Future Enhancements

1. **Batch Processing**: Support for bulk card issuance
2. **Advanced Notifications**: Customizable notification templates
3. **Reporting**: Comprehensive reporting on card operations
4. **Integration APIs**: RESTful APIs for third-party integrations

---

This adapted card issuance process provides a robust, scalable solution for company-based card operations with comprehensive balance tracking and error handling.
