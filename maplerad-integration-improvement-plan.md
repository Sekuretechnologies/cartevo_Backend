# Cartevo Maplerad Integration Improvement Plan

## 🎯 Objective

Transform the Cartevo Maplerad integration from a solid foundation into a production-grade, comprehensive card issuance system that matches the sophistication of the Monix implementation.

---

## 📊 Current State Assessment

### **Strengths**

- ✅ Clean, well-architected codebase
- ✅ Strong TypeScript implementation
- ✅ Good separation of concerns
- ✅ Recently refactored with improved error handling
- ✅ Solid foundation for expansion

### **Critical Gaps**

- ❌ No customer enrollment system
- ❌ Missing 60% of webhook event handling
- ❌ Limited error recovery strategy
- ❌ No real-time transaction synchronization
- ❌ Basic fee management system
- ❌ No multi-currency support

---

## 🚀 Implementation Roadmap

### **Phase 1: Critical Foundation (Weeks 1-2)**

#### **Milestone 1.1: Customer Enrollment System**

**Priority**: CRITICAL  
**Effort**: 5 days  
**Files to Create**:

- `src/services/card/maplerad/services/customerEnrollmentService.ts`
- `src/services/card/maplerad/types/customerEnrollment.types.ts`
- `src/services/card/maplerad/utils/documentValidation.ts`

**Features to Implement**:

```typescript
interface CustomerEnrollmentService {
  // Core enrollment with full KYC
  enrollCustomerWithKYC(customerId: string): Promise<MapleradCustomerResult>;

  // Document verification
  validateIdentityDocument(
    documentUrl: string,
    documentType: string
  ): Promise<ValidationResult>;

  // Address verification
  validateAddress(address: CustomerAddress): Promise<AddressValidationResult>;

  // Phone verification
  validatePhone(
    phone: string,
    countryCode: string
  ): Promise<PhoneValidationResult>;

  // Update customer information
  updateCustomerInfo(
    customerId: string,
    updates: CustomerUpdates
  ): Promise<UpdateResult>;
}
```

#### **Milestone 1.2: Comprehensive Webhook Processing**

**Priority**: CRITICAL  
**Effort**: 4 days  
**Files to Enhance**:

- `src/services/card/maplerad/controllers/webhookService.ts`
- `src/services/card/maplerad/types/webhook.types.ts`
- `src/services/card/maplerad/services/transactionProcessingService.ts`

**Missing Webhook Events to Add**:

```typescript
interface WebhookEventHandlers {
  // Transaction processing
  processTransaction(payload: TransactionWebhook): Promise<WebhookResult>;

  // Payment decline handling
  processDeclineTransaction(payload: DeclineWebhook): Promise<WebhookResult>;

  // Failure fee management
  processCardCharge(payload: ChargeWebhook): Promise<WebhookResult>;

  // Settlement processing
  processSettlement(payload: SettlementWebhook): Promise<WebhookResult>;

  // Refund processing
  processRefund(payload: RefundWebhook): Promise<WebhookResult>;
}
```

### **Phase 2: Advanced Features (Weeks 3-4)**

#### **Milestone 2.1: Advanced Error Recovery Strategy**

**Priority**: HIGH  
**Effort**: 3 days  
**Files to Enhance**:

- `src/services/card/maplerad/services/cardIssuanceService.ts`
- `src/services/card/maplerad/services/errorRecoveryService.ts`
- `src/services/card/maplerad/services/walletService.ts`

**Strategic Error Handling**:

```typescript
interface ErrorRecoveryStrategy {
  // Pre-API failure: Full refund
  handlePreAPIFailure(
    reservedAmount: number,
    reason: string
  ): Promise<RefundResult>;

  // Post-API success: Strategic fund management
  handlePostAPIError(
    apiSucceeded: boolean,
    context: string
  ): Promise<RecoveryResult>;

  // Comprehensive cleanup
  performTransactionCleanup(transactionId: string): Promise<CleanupResult>;
}
```

#### **Milestone 2.2: Real-Time Balance Synchronization**

**Priority**: HIGH  
**Effort**: 4 days  
**Files to Create**:

- `src/services/card/maplerad/services/balanceSyncService.ts`
- `src/services/card/maplerad/services/transactionSyncService.ts`
- `src/services/card/maplerad/utils/reconciliation.ts`

**Synchronization Features**:

```typescript
interface BalanceSyncService {
  // Real-time balance sync
  syncCardBalance(cardId: string): Promise<SyncResult>;

  // Transaction correlation
  correlateTransactions(cardId: string): Promise<CorrelationResult>;

  // Balance reconciliation
  reconcileBalances(): Promise<ReconciliationReport>;

  // Discrepancy detection
  detectDiscrepancies(): Promise<DiscrepancyReport>;
}
```

### **Phase 3: Sophisticated Features (Weeks 5-6)**

#### **Milestone 3.1: Advanced Fee Management**

**Priority**: HIGH  
**Effort**: 4 days  
**Files to Enhance**:

- `src/services/card/maplerad/services/feeCalculationService.ts`
- `src/services/card/maplerad/services/failureFeeService.ts`
- `src/services/card/maplerad/types/fee.types.ts`

**Advanced Fee System**:

```typescript
interface AdvancedFeeCalculation {
  // Range-based fee calculations
  calculateRangeBasedFees(amount: number, currency: string): Promise<FeeResult>;

  // Intelligent failure fee management
  processFailureFeeStrategy(
    cardId: string,
    transactionRef: string
  ): Promise<FeeResult>;

  // Multi-currency fee conversion
  convertFeesAcrossCurrencies(
    fee: Fee,
    targetCurrency: string
  ): Promise<ConvertedFee>;

  // First card discount logic
  applyFirstCardDiscounts(
    customerId: string,
    baseFee: number
  ): Promise<DiscountedFee>;
}
```

#### **Milestone 3.2: Multi-Currency Support**

**Priority**: MEDIUM  
**Effort**: 3 days  
**Files to Create**:

- `src/services/card/maplerad/services/currencyService.ts`
- `src/services/card/maplerad/utils/exchangeRate.ts`

### **Phase 4: Performance & Production Readiness (Weeks 7-8)**

#### **Milestone 4.1: Asynchronous Processing Optimization**

**Priority**: MEDIUM  
**Effort**: 3 days  
**Files to Optimize**:

- All webhook processing for background operations
- Fee calculation optimization
- Notification service enhancement

#### **Milestone 4.2: Monitoring & Observability**

**Priority**: MEDIUM  
**Effort**: 2 days  
**Files to Create**:

- `src/services/card/maplerad/monitoring/metricsService.ts`
- `src/services/card/maplerad/monitoring/healthCheckService.ts`

---

## 🎯 Detailed Implementation Specifications

### **Implementation 1: Customer Enrollment Service**

**Target File**: `src/services/card/maplerad/services/customerEnrollmentService.ts`

**Core Features**:

```typescript
export class CustomerEnrollmentService {
  /**
   * Complete customer enrollment with KYC verification
   */
  static async enrollCustomerWithKYC(
    customerId: string
  ): Promise<EnrollmentResult> {
    // 1. Get customer data from database
    const customer = await CustomerModel.getOne({ id: customerId });

    // 2. Validate required documents
    await this.validateKYCDocuments(customer.output);

    // 3. Create Maplerad enrollment data
    const enrollmentData = this.buildEnrollmentData(customer.output);

    // 4. Submit to Maplerad API
    const mapleradCustomer = await this.submitEnrollment(enrollmentData);

    // 5. Update local customer record
    await this.updateLocalCustomerRecord(customerId, mapleradCustomer);

    return {
      success: true,
      mapleradCustomerId: mapleradCustomer.id,
      verificationStatus: "completed",
    };
  }

  /**
   * Document validation using advanced rules
   */
  private static async validateKYCDocuments(
    customer: any
  ): Promise<ValidationResult> {
    const validations = [];

    // Identity document validation
    if (!customer.id_document) {
      validations.push("Identity document is required");
    }

    // Address verification
    if (!customer.address || !customer.city) {
      validations.push("Complete address information is required");
    }

    // Phone verification
    if (!customer.phone || !this.isValidPhoneNumber(customer.phone)) {
      validations.push("Valid phone number is required");
    }

    if (validations.length > 0) {
      throw new CustomerEnrollmentError(
        "KYC_INCOMPLETE",
        validations.join(", ")
      );
    }

    return { valid: true, verifications: [] };
  }
}
```

### **Implementation 2: Enhanced Webhook Processing**

**Target File**: `src/services/card/maplerad/controllers/webhookService.ts`

**Missing Event Handlers**:

```typescript
/**
 * Process all transaction types comprehensively
 */
async processTransaction(payload: MapleradWebhookPayload): Promise<WebhookResult> {
  const { type, card_id, amount, status, merchant } = payload;

  // Get local card for context
  const card = await this.getLocalCard(card_id);

  switch (type) {
    case "AUTHORIZATION":
      return await this.processAuthorizationTransaction(payload, card);

    case "SETTLEMENT":
      return await this.processSettlementTransaction(payload, card);

    case "DECLINE":
      return await this.processDeclineWithFeeStrategy(payload, card);

    case "FUNDING":
      return await this.processFundingTransaction(payload, card);

    case "WITHDRAWAL":
      return await this.processWithdrawalTransaction(payload, card);

    case "REFUND":
    case "REVERSAL":
      return await this.processRefundTransaction(payload, card);

    default:
      return { success: true, message: `Event ${type} acknowledged` };
  }
}

/**
 * Advanced decline processing with intelligent fee management
 */
private async processDeclineWithFeeStrategy(
  payload: MapleradWebhookPayload,
  card: any
): Promise<WebhookResult> {

  // 1. Record declined transaction immediately
  await TransactionModel.create({
    card_id: card.id,
    company_id: card.company_id,
    customer_id: card.customer_id,
    amount: this.convertFromCents(payload.amount),
    type: TRANSACTION_TYPE.PAYMENT_FAILED,
    status: TRANSACTION_STATUS.FAILED,
    description: `Payment declined - ${payload.merchant?.name || 'Unknown merchant'}`,
    reference: payload.reference,
    created_at: new Date()
  });

  // 2. Store pre-decline balance for fee verification
  const preDeclineBalance = await this.storeBalanceSnapshot(card.provider_card_id);

  // 3. Schedule failure fee verification (30 seconds)
  setTimeout(async () => {
    await this.verifyAndApplyFailureFee(payload, preDeclineBalance);
  }, 30000);

  // 4. Send immediate notification for insufficient funds
  if (payload.description?.includes('no sufficient funds')) {
    await this.sendInsufficientFundsNotification(card, payload);
  }

  return { success: true, processed: true };
}

/**
 * Intelligent failure fee management
 */
private async verifyAndApplyFailureFee(
  payload: MapleradWebhookPayload,
  preDeclineBalance: number
): Promise<void> {

  // Get current balance to detect if Maplerad charged
  const currentBalance = await this.getRealTimeBalance(payload.card_id);
  const balanceReduction = preDeclineBalance - currentBalance;

  // If Maplerad charged ~$0.30, no additional fee needed
  if (Math.abs(balanceReduction - 0.30) < 0.05) {
    this.logger.log('Maplerad already charged failure fee', {
      cardId: payload.card_id,
      chargeDetected: balanceReduction
    });
    return;
  }

  // Apply our failure fee since Maplerad didn't charge
  await this.applyFailureFee(payload.card_id, 0.50, payload.reference);

  this.logger.log('Applied failure fee - Maplerad did not charge', {
    cardId: payload.card_id,
    feeApplied: 0.50,
    reason: 'maplerad_no_charge'
  });
}
```

### **Implementation 3: Advanced Error Recovery**

**Target File**: `src/services/card/maplerad/services/errorRecoveryService.ts`

**Strategic Error Management**:

```typescript
export class ErrorRecoveryService {
  /**
   * Strategic error recovery based on API success status
   */
  static async handleStrategicError(
    error: any,
    context: {
      apiCallSucceeded: boolean;
      reservedAmount: number;
      customerId: string;
      reference: string;
    }
  ): Promise<ErrorRecoveryResult> {
    const { apiCallSucceeded, reservedAmount, customerId, reference } = context;

    if (!apiCallSucceeded) {
      // API failed - full service failure
      return await this.handleServiceFailure(
        customerId,
        reservedAmount,
        error,
        reference
      );
    } else {
      // API succeeded - service delivered but processing error
      return await this.handleServiceDeliveredError(
        customerId,
        reservedAmount,
        error,
        reference
      );
    }
  }

  /**
   * Handle complete service failure with fund refund
   */
  private static async handleServiceFailure(
    customerId: string,
    reservedAmount: number,
    error: any,
    reference: string
  ): Promise<ErrorRecoveryResult> {
    this.logger.warn("Service failure - refunding reserved funds", {
      customerId,
      amount: reservedAmount,
      error: error.message,
      reference,
    });

    // Get company wallet for refund
    const customer = await CustomerModel.getOne({ id: customerId });
    const companyWallet = await UnifiedWalletService.getCompanyWallet(
      customer.output.company_id,
      "USD"
    );

    // Refund reserved funds
    await UnifiedWalletService.refundFunds(
      companyWallet.id,
      reservedAmount,
      reference,
      `Card creation failed: ${error.message}`
    );

    // Send failure notification
    await NotificationService.sendCardIssuanceFailureNotification(
      {
        customerId,
        companyId: customer.output.company_id,
        amount: reservedAmount,
        currency: "USD",
        reference,
      },
      error.message
    );

    return {
      strategy: "full_refund",
      refunded: true,
      amount: reservedAmount,
      notificationSent: true,
    };
  }

  /**
   * Handle errors after successful API call - keep funds
   */
  private static async handleServiceDeliveredError(
    customerId: string,
    reservedAmount: number,
    error: any,
    reference: string
  ): Promise<ErrorRecoveryResult> {
    this.logger.error(
      "Service delivered but processing error - funds conserved",
      {
        customerId,
        amount: reservedAmount,
        error: error.message,
        reference,
        strategy: "funds_kept",
      }
    );

    // Funds are kept since Maplerad service was delivered
    // Attempt to recover card data from Maplerad
    try {
      await this.attemptCardDataRecovery(reference);
    } catch (recoveryError) {
      // Log but don't fail - service was delivered
      this.logger.error("Card data recovery failed but service delivered", {
        reference,
        recoveryError: recoveryError.message,
      });
    }

    return {
      strategy: "funds_kept",
      refunded: false,
      amount: reservedAmount,
      reason: "service_delivered",
    };
  }
}
```

### **Implementation 4: Real-Time Balance Synchronization**

**Target File**: `src/services/card/maplerad/services/balanceSyncService.ts`

**Synchronization Features**:

```typescript
export class BalanceSyncService {
  /**
   * Real-time balance synchronization
   */
  static async syncCardBalance(cardId: string): Promise<SyncResult> {
    // Get local card
    const localCard = await CardModel.getOne({ id: cardId });
    if (localCard.error) {
      throw new Error(`Card not found: ${cardId}`);
    }

    // Get real balance from Maplerad
    const realBalance = await this.getMapleradBalance(
      localCard.output.provider_card_id
    );

    // Check for discrepancies
    const discrepancy = Math.abs(localCard.output.balance - realBalance);

    if (discrepancy > 0.01) {
      // More than 1 cent difference
      // Update local balance
      await CardModel.update(cardId, {
        balance: realBalance,
        last_sync_at: new Date(),
        updated_at: new Date(),
      });

      // Log discrepancy
      this.logger.warn("Balance discrepancy detected and corrected", {
        cardId,
        localBalance: localCard.output.balance,
        mapleradBalance: realBalance,
        discrepancy,
        corrected: true,
      });

      return {
        synchronized: true,
        discrepancyFound: true,
        correctedAmount: discrepancy,
        newBalance: realBalance,
      };
    }

    return { synchronized: true, discrepancyFound: false };
  }

  /**
   * Bulk synchronization for all active cards
   */
  static async syncAllActiveCards(): Promise<BulkSyncResult> {
    const activeCards = await CardModel.get({
      provider: "maplerad",
      status: "ACTIVE",
    });

    const results = [];
    for (const card of activeCards.output) {
      try {
        const result = await this.syncCardBalance(card.id);
        results.push({ cardId: card.id, result });
      } catch (error) {
        results.push({
          cardId: card.id,
          error: error.message,
        });
      }
    }

    return {
      totalCards: activeCards.output.length,
      synchronized: results.filter((r) => r.result?.synchronized).length,
      errors: results.filter((r) => r.error).length,
      discrepanciesFound: results.filter((r) => r.result?.discrepancyFound)
        .length,
    };
  }
}
```

### **Implementation 5: Comprehensive Fee Management**

**Target File**: `src/services/card/maplerad/services/advancedFeeService.ts`

**Advanced Fee System**:

```typescript
export class AdvancedFeeService extends FeeCalculationService {
  /**
   * Range-based fee calculations with business rules
   */
  static async calculateAdvancedFees(
    companyId: string,
    amount: number,
    currency: string,
    feeType: "issuance" | "success" | "failure",
    context?: {
      isFirstCard?: boolean;
      cardType?: string;
      customerTier?: string;
    }
  ): Promise<AdvancedFeeResult> {
    // Get fee configuration for company
    const feeConfig = await this.getFeeConfiguration(companyId);

    // Apply business rules
    const businessRules = {
      firstCardDiscount: context?.isFirstCard ? 0.5 : 0,
      premiumTierDiscount: context?.customerTier === "premium" ? 0.25 : 0,
      bulkDiscount: await this.calculateBulkDiscount(companyId, amount),
    };

    // Find applicable fee range
    const feeRanges = feeConfig[feeType] || [];
    const applicableRange = feeRanges.find(
      (range) => amount >= range.minAmount && amount <= range.maxAmount
    );

    if (!applicableRange) {
      return this.getDefaultFeeCalculation(feeType);
    }

    // Calculate base fee
    const baseFee =
      applicableRange.type === "PERCENTAGE"
        ? (amount * applicableRange.value) / 100
        : applicableRange.value;

    // Apply all discounts
    const totalDiscounts = Object.values(businessRules).reduce(
      (sum, discount) => sum + discount,
      0
    );
    const finalFee = Math.max(0, baseFee - totalDiscounts);

    return {
      baseFee,
      discounts: businessRules,
      finalFee,
      currency,
      appliedRange: applicableRange.name,
      breakdown: {
        baseAmount: amount,
        feeAmount: finalFee,
        totalAmount: amount + finalFee,
        savings: totalDiscounts,
      },
    };
  }
}
```

---

## 🔧 Implementation Timeline

### **Week 1-2: Foundation**

- [ ] **Day 1-3**: Implement Customer Enrollment Service
- [ ] **Day 4-6**: Add comprehensive webhook processing
- [ ] **Day 7-8**: Integrate enrollment with existing card issuance
- [ ] **Day 9-10**: Testing and bug fixes

### **Week 3-4: Advanced Features**

- [ ] **Day 1-3**: Implement advanced error recovery
- [ ] **Day 4-6**: Add real-time balance synchronization
- [ ] **Day 7-8**: Enhance fee management system
- [ ] **Day 9-10**: Integration testing

### **Week 5-6: Sophisticated Features**

- [ ] **Day 1-3**: Add multi-currency support
- [ ] **Day 4-6**: Implement intelligent failure fee management
- [ ] **Day 7-8**: Add metadata correlation system
- [ ] **Day 9-10**: Performance optimization

### **Week 7-8: Production Readiness**

- [ ] **Day 1-3**: Implement asynchronous processing
- [ ] **Day 4-6**: Add comprehensive monitoring
- [ ] **Day 7-8**: Performance testing and optimization
- [ ] **Day 9-10**: Documentation and deployment preparation

---

## 🎯 Success Criteria

### **Phase 1 Success Metrics**

- ✅ Customer enrollment success rate: >95%
- ✅ Webhook processing coverage: 100% of critical events
- ✅ Error recovery success rate: >99%

### **Phase 2 Success Metrics**

- ✅ Balance synchronization accuracy: 100%
- ✅ Transaction correlation success: >99%
- ✅ Fee calculation accuracy: 100%

### **Phase 3 Success Metrics**

- ✅ Webhook response time: <200ms
- ✅ System availability: >99.9%
- ✅ Data consistency: 100%

### **Final Production Readiness Criteria**

- ✅ All critical webhook events handled
- ✅ Complete customer lifecycle management
- ✅ Comprehensive error recovery strategy
- ✅ Real-time data synchronization
- ✅ Advanced fee management system
- ✅ Performance optimized for scale
- ✅ Comprehensive monitoring and alerting

---

## 💰 Resource Requirements

### **Development Resources**

- **Senior Backend Developer**: 8 weeks full-time
- **DevOps Engineer**: 2 weeks for monitoring setup
- **QA Engineer**: 2 weeks for testing

### **Infrastructure Requirements**

- **Monitoring System**: Application performance monitoring
- **Caching Layer**: Redis for webhook correlation
- **Database**: Additional indexes for performance
- **Alerting**: Real-time error and performance alerts

### **Testing Requirements**

- **Unit Tests**: All new services (>90% coverage)
- **Integration Tests**: Webhook processing scenarios
- **Performance Tests**: High-volume transaction processing
- **Security Tests**: Webhook signature verification

---

This comprehensive plan will transform Cartevo's solid Maplerad foundation into a production-grade, feature-complete card issuance system that rivals the sophistication of the Monix implementation while maintaining Cartevo's clean architectural advantages.
