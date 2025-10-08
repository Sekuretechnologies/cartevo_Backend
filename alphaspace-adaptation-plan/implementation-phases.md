# Implementation Phases for AlphaSpace Adaptation

## Overview

This document outlines the 4-phase implementation approach for adapting the MONIX AlphaSpace integration to WAVLET. Each phase builds upon the previous one, with clear deliverables, success criteria, and rollback mechanisms.

## Phase 1: Foundation Setup (Weeks 1-2)

### Objectives

- Establish AlphaSpace infrastructure in WAVLET
- Create basic service connectivity and authentication
- Update database schemas for AlphaSpace data
- Validate environment configuration

### Deliverables

#### 1.1 Environment Configuration

**WAVLET Environment Variables Addition:**

```env
# AlphaSpace Configuration
ALPHASPACE_CLIENT_ID=your_alphaspace_client_id
ALPHASPACE_CLIENT_SECRET=your_alphaspace_client_secret
ALPHASPACE_USERNAME=your_alphaspace_username
ALPHASPACE_PASSWORD=your_alphaspace_password
ALPHASPACE_ENVIRONMENT=test  # 'test' or 'live'
ALPHASPACE_LIVE_URL=https://omega.alpha.africa
ALPHASPACE_TEST_URL=https://lion.alpha.africa
ALPHASPACE_WEBHOOK_SECRET=your_webhook_secret  # Optional, for HMAC validation
ALPHASPACE_TIMEOUT=30000
ALPHASPACE_MAX_RETRIES=3
```

**Configuration Class:**

```typescript
// src/config/alphaspace.config.ts
export interface AlphaSpaceConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  environment: "test" | "live";
  liveUrl: string;
  testUrl: string;
  webhookSecret?: string;
  timeout: number;
  maxRetries: number;
}
```

#### 1.2 Database Schema Updates

**Prisma Schema Extensions:**

```prisma
// Update CardStatus enum
enum CardStatus {
  ACTIVE
  FROZEN
  TERMINATED
  PENDING      // Add for AlphaSpace
  FAILED       // Add for AlphaSpace
}

// Add AlphaSpace provider
enum CardProvider {
  maplerad
  alphaspce    // Note: MONIX uses 'alphaspce' - keep this typo for consistency
}

// Extend Card model
model Card {
  // ... existing fields ...
  provider_card_id     String?         // AlphaSpace card ID
  masked_number        String?         // Masked card number
  first_six           String?         // First 6 digits
  last_four           String?         // Last 4 digits
  card_brand          String?         // VISA/MASTERCARD
  card_expiry_month   String?         // Expiry month
  card_expiry_year    String?         // Expiry year

  // Fee tracking fields
  fee_config          Json?           // Fee configuration (from MONIX)
  fee_history         Json[]         // Fee collection history

  // Provider metadata
  provider_metadata   Json?           // Additional AlphaSpace data
  last_sync_at        DateTime?       // Last synchronization timestamp

  // Multi-tenant fields
  company_id          String          // WAVLET company isolation
}

// New: Balance transaction records (from MONIX)
model BalanceTransactionRecord {
  id                  String     @id @default(cuid())
  transaction_id      String
  entity_type         String     // 'card' or 'wallet'
  entity_id           String
  old_balance         Decimal    @precision(15, 2)
  new_balance         Decimal    @precision(15, 2)
  amount_changed      Decimal    @precision(15, 2)
  currency            String     @default("USD")
  change_type         String     // 'credit' or 'debit'
  description         String

  created_at          DateTime   @default(now())
  updated_at          DateTime   @updatedAt
}
```

#### 1.3 Basic AlphaSpace Service

**Create Core Service Structure:**

```typescript
// src/modules/alphaspace/services/alphaspace.service.ts
@Injectable()
export class AlphaSpaceService {
  constructor(
    private config: AlphaSpaceConfig,
    private prisma: PrismaService
  ) {}

  // Basic authentication test
  async authenticate(): Promise<boolean> {
    try {
      const authResult = await this.authenticateWithPassword();
      return authResult.access_token !== undefined;
    } catch (error) {
      this.logger.error("AlphaSpace authentication failed", error);
      return false;
    }
  }

  // Simple API test
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.makeAuthenticatedRequest("GET", "/alpha/cards/test");
      return { success: true, message: "AlphaSpace connection successful" };
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }
}
```

#### 1.4 Module Structure Setup

**Create AlphaSpace Module:**

```typescript
// src/modules/alphaspace/alphaspace.module.ts
@Module({
  imports: [PrismaModule, WalletModule], // WALLET integration for fees
  controllers: [], // To be added in Phase 2
  providers: [
    AlphaSpaceService,
    // Additional services to be added
  ],
  exports: [AlphaSpaceService],
})
export class AlphaSpaceModule {}
```

#### 1.5 Basic Testing Infrastructure

**Unit Tests:**

```typescript
// src/modules/alphaspace/services/alphaspace.service.spec.ts
describe("AlphaSpaceService", () => {
  let service: AlphaSpaceService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AlphaSpaceService],
    }).compile();

    service = module.get<AlphaSpaceService>(AlphaSpaceService);
  });

  it("should authenticate successfully", async () => {
    const result = await service.authenticate();
    expect(result).toBe(true);
  });

  it("should test connection", async () => {
    const result = await service.testConnection();
    expect(result.success).toBe(true);
  });
});
```

### Success Criteria - Phase 1

- [ ] Environment variables configured and tested
- [ ] Database migration scripts created and applied
- [ ] AlphaSpace service authenticates successfully
- [ ] Basic API connectivity verified
- [ ] Unit tests pass (50% coverage minimum)
- [ ] No breaking changes to existing Maplerad integration

### Phase 1 Rollback Strategy

- Remove environment variables
- Revert database migration
- Delete AlphaSpace module files
- Restart application

---

## Phase 2: Core Functionality (Weeks 3-6)

### Objectives

- Implement complete card lifecycle operations
- Create API controllers for client consumption
- Integrate with WAVLET's wallet system for funding
- Implement basic transaction processing

### Deliverables

#### 2.1 Card Lifecycle Operations

**Complete AlphaSpaceService Methods:**

```typescript
// Card creation with WAVLET model mapping
async createCard(cardData: WAVLETCreateCardData): Promise<WAVLETCardResult> {
  // 1. WAVLET model validation
  const validatedData = await this.validateWAVLETCardData(cardData);

  // 2. Map to AlphaSpace format (transparency layer)
  const alphaSpaceData = this.mapWAVLETToAlphaSpace(validatedData);

  // 3. Create AlphaSpace card
  const alphaSpaceResult = await this.createCardNative(alphaSpaceData);

  // 4. Map back to WAVLET format
  const wavletResult = this.mapAlphaSpaceToWAVLET(alphaSpaceResult);

  // 5. Save to WAVLET database
  await this.saveCardToWAVLETDatabase(wavletResult);

  return wavletResult;
}

// Transparency layer implementation
private mapWAVLETToAlphaSpace(wavletData: WAVLETCreateCardData): AlphaSpaceCreateCardData {
  return {
    cardholder_id: wavletData.customer_id,
    purpose: wavletData.brand === "VISA" ? "visacard-1" : "mastercard-1",
  };
}

private mapAlphaSpaceToWAVLET(alphaSpaceData: any): WAVLETCardResult {
  return {
    success: true,
    data: {
      id: alphaSpaceData.card.id,
      status: this.convertAlphaSpaceStatus(alphaSpaceData.card.state),
      masked_pan: alphaSpaceData.card.masked_number,
      brand: this.convertAlphaSpaceBrand(alphaSpaceData.card.brand),
      // Map other fields...
    }
  };
}
```

#### 2.2 Fund and Withdraw Operations

**Integration with WAVLET Wallet:**

```typescript
// Fund card with wallet balance verification
async fundCard(cardId: string, amount: number, companyId: string): Promise<any> {
  // 1. Verify WAVLET card ownership
  const card = await this.prisma.card.findFirst({
    where: { id: cardId, company_id: companyId }
  });

  // 2. Check wallet balance
  const wallet = await this.prisma.wallet.findFirst({
    where: { company_id: companyId, currency: 'USD' }
  });

  if (wallet.balance < amount) {
    throw new BadRequestException('Insufficient wallet balance');
  }

  // 3. Reserve funds (like MONIX implementation)
  await this.reserveFunds(wallet.id, amount);

  // 4. Call AlphaSpace API
  try {
    const result = await this.fundCardNative(card.provider_card_id, amount);

    // 5. Update balances
    await this.updateBalances(cardId, wallet.id, amount);

    return result;
  } catch (error) {
    // Rollback on failure
    await this.rollbackFunds(wallet.id, amount);
    throw error;
  }
}
```

#### 2.3 API Controllers

**Compatible with existing WAVLET APIs:**

```typescript
// src/modules/alphaspace/controllers/card.controller.ts
@Controller("cards")
@UseGuards(JwtAuthGuard)
export class AlphaSpaceCardController {
  constructor(private alphaSpaceService: AlphaSpaceService) {}

  // Drop-in replacement for existing Maplerad endpoints
  @Post()
  async createCard(@Body() dto: CreateCardDto, @CurrentUser() user: any) {
    // Same interface as Maplerad controller
    return this.alphaSpaceService.createCard({
      ...dto,
      company_id: user.companyId, // WAVLET multi-tenant support
    });
  }

  @Post(":cardId/fund")
  async fundCard(@Param("cardId") cardId: string, @Body() dto: FundCardDto) {
    return this.alphaSpaceService.fundCard(cardId, dto.amount, dto.customer_id);
  }
}
```

#### 2.4 Transaction Processing

**Basic Transaction Records:**

```typescript
// Create WAVLET transaction records
private async createTransactionRecord(
  cardId: string,
  type: string,
  amount: number,
  metadata: any
) {
  await this.prisma.transaction.create({
    data: {
      id: uuidv4(),
      status: 'SUCCESS',
      category: 'CARD',
      type: type,
      amount: amount,
      currency: 'USD',
      customer_id: metadata.customerId,
      company_id: metadata.companyId,
      card_id: cardId,
      description: metadata.description,
      // WALLET audit trail fields
      provider: 'alphaspace',
      created_at: new Date(),
    }
  });
}
```

#### 2.5 Basic Webhook Integration

**Simple Webhook Handler:**

```typescript
// src/modules/alphaspace/controllers/webhook.controller.ts
@Controller("webhooks")
export class AlphaSpaceWebhookController {
  @Post("alphaspace")
  async handleWebhook(@Body() payload: any, @Headers() headers: any) {
    // Basic webhook processing (HMAC validation added in Phase 3)
    this.logger.log("AlphaSpace webhook received", { payload });

    // Update card status based on webhook events
    if (payload.event === "issuing.created.successful") {
      await this.updateCardStatus(payload.card.id, "ACTIVE");
    }

    return { success: true };
  }
}
```

### Success Criteria - Phase 2

- [ ] CRUD operations working for cards
- [ ] Fund/withdraw operations functional
- [ ] API controllers responding correctly
- [ ] Basic transaction records created
- [ ] Webhook events processed (no HMAC yet)
- [ ] Integration with existing WAVLET APIs
- [ ] 70% test coverage achieved

### Phase 2 Rollback Strategy

- Flag-based feature toggle to disable AlphaSpace
- Database records can be left (non-breaking)
- API routes can coexist with Maplerad

---

## Phase 3: Advanced Features (Weeks 7-10)

### Objectives

- Implement sophisticated fee management system
- Add comprehensive error handling and recovery
- Enhance security with HMAC webhook validation
- Optimize performance with caching and monitoring

### Deliverables

#### 3.1 Fee Cascade System

**Adapted from MONIX's PaymentDebtManager:**

```typescript
// src/modules/alphaspace/services/fee-management.service.ts
@Injectable()
export class FeeManagementService {
  async collectPaymentFee(feeContext: FeeContext): Promise<FeeResult> {
    // 1. Try to deduct from card balance
    const cardFee = await this.attemptCardFeeDeduction(feeContext);
    if (cardFee.success) return cardFee;

    // 2. Fall back to wallet balance
    const walletFee = await this.attemptWalletFeeDeduction(feeContext);
    if (walletFee.success) return walletFee;

    // 3. Create debt record for later collection
    return await this.createPaymentDebt(feeContext);
  }

  private async attemptCardFeeDeduction(
    context: FeeContext
  ): Promise<FeeResult> {
    const card = await this.prisma.card.findUnique({
      where: { id: context.cardId },
    });

    if (card.balance >= context.amount) {
      await this.prisma.card.update({
        where: { id: context.cardId },
        data: { balance: { decrement: context.amount } },
      });

      await this.recordFeeTransaction(context, "card_balance");

      return { success: true, source: "card", amount: context.amount };
    }

    return { success: false };
  }

  private async createPaymentDebt(context: FeeContext): Promise<FeeResult> {
    // Create debt record for manual collection
    await this.prisma.customerLog.create({
      data: {
        customer_id: context.customerId,
        action: "payment_debt_created",
        status: "PENDING",
        log_json: {
          card_id: context.cardId,
          amount: context.amount,
          currency: context.currency,
          reason: "insufficient_funds",
        },
      },
    });

    return { success: true, source: "debt", amount: context.amount };
  }
}
```

#### 3.2 Enhanced Error Handling

**Comprehensive Error Recovery:**

```typescript
export class AlphaSpaceErrorHandler {
  static async handleApiError(error: any, operation: string, context: any) {
    const enrichedError = AlphaSpaceErrorHandler.enrichError(
      error,
      operation,
      context
    );

    // Log comprehensive error details
    await AlphaSpaceErrorHandler.logError(enrichedError);

    // Determine recovery strategy
    const recoveryStrategy =
      AlphaSpaceErrorHandler.determineRecovery(enrichedError);

    switch (recoveryStrategy) {
      case "retry_after_auth":
        return await AlphaSpaceErrorHandler.retryWithReauth(operation, context);

      case "rollback_transaction":
        return await AlphaSpaceErrorHandler.rollbackTransaction(context);

      case "create_debt":
        return await AlphaSpaceErrorHandler.createPaymentDebt(context);

      default:
        throw new BadRequestException(enrichedError.message);
    }
  }
}
```

#### 3.3 HMAC Webhook Security

**Enhanced Webhook Validation:**

```typescript
// src/modules/alphaspace/services/webhook-security.service.ts
@Injectable()
export class WebhookSecurityService {
  private readonly CRYPTO_ALGORITHM = "sha256";

  async validateWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string,
    secret?: string
  ): Promise<boolean> {
    // If no secret configured, accept webhooks (development mode)
    if (!secret) {
      this.logger.warn("AlphaSpace webhook secret not configured");
      return true;
    }

    // Timestamp validation (30 second window)
    const now = Date.now();
    const webhookTimestamp = parseInt(timestamp);

    if (now - webhookTimestamp > 30000) {
      throw new Error("Webhook timestamp expired");
    }

    // HMAC validation
    const expectedSignature = this.generateSignature(
      payload,
      timestamp,
      secret
    );
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );

    if (!isValid) {
      this.logger.warn("Invalid AlphaSpace webhook signature");
      throw new Error("Invalid webhook signature");
    }

    return true;
  }

  private generateSignature(
    payload: string,
    timestamp: string,
    secret: string
  ): string {
    const message = `${timestamp}.${payload}`;
    return crypto
      .createHmac(this.CRYPTO_ALGORITHM, secret)
      .update(message)
      .digest("hex");
  }
}
```

#### 3.4 Performance Optimizations

**Caching Implementation:**

```typescript
// src/modules/alphaspace/services/cache.service.ts
@Injectable()
export class AlphaSpaceCacheService {
  constructor(private redis: Redis) {}

  // Cache card details for 5 minutes
  async getCardDetails(cardId: string): Promise<CardDetails | null> {
    const cacheKey = `alphaspace:card:${cardId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  }

  async setCardDetails(cardId: string, details: CardDetails): Promise<void> {
    const cacheKey = `alphaspace:card:${cardId}`;
    await this.redis.setex(cacheKey, 300, JSON.stringify(details));
  }

  // Cache invalidation
  async invalidateCard(cardId: string): Promise<void> {
    await this.redis.del(`alphaspace:card:${cardId}`);
  }
}
```

### Success Criteria - Phase 3

- [ ] Fee cascade system working end-to-end
- [ ] HMAC webhook validation active
- [ ] Error recovery mechanisms functional
- [ ] Performance optimizations implemented
- [ ] 80% test coverage achieved
- [ ] Comprehensive logging enabled

### Phase 3 Rollback Strategy

- Disable advanced features via feature flags
- Keep basic card operations functional
- Revert to simple webhook handling

---

## Phase 4: Testing & Deployment (Weeks 11-14)

### Objectives

- Comprehensive testing of entire AlphaSpace system
- Gradual deployment with feature flags
- Production monitoring and alerting setup
- User acceptance testing and feedback

### Deliverables

#### 4.1 Comprehensive Test Suite

**Integration Tests:**

```typescript
// tests/e2e/alphaspace-card-lifecycle.spec.ts
describe("AlphaSpace Card Lifecycle", () => {
  let alphaSpaceService: AlphaSpaceService;
  let walletService: WalletService;

  beforeAll(async () => {
    // Setup test environment
  });

  it("should create card, fund it, and use it", async () => {
    // 1. Create card
    const card = await alphaSpaceService.createCard(testCardData);
    expect(card.success).toBe(true);

    // 2. Fund card
    const fundResult = await alphaSpaceService.fundCard(
      card.id,
      50.0,
      testCompanyId
    );
    expect(fundResult.success).toBe(true);

    // 3. Process transaction (mock webhook)
    const transactionResult = await alphaSpaceService.processTransaction(
      mockTransactionData
    );
    expect(transactionResult.feeCollected).toBe(true);

    // 4. Verify balances
    const finalCard = await alphaSpaceService.getCard(card.id);
    const finalWallet = await walletService.getCompanyWallet(testCompanyId);
    expect(finalCard.balance).toBe(25.0); // After fees
    expect(finalWallet.balance).toBeGreaterThan(0);
  });
});
```

#### 4.2 Production Readiness

**Health Checks:**

```typescript
// src/modules/alphaspace/controllers/health.controller.ts
@Controller("health")
export class AlphaSpaceHealthController {
  @Get("alphaspace")
  async checkHealth() {
    const authHealth = await this.checkAuthentication();
    const apiHealth = await this.checkApiConnectivity();
    const dbHealth = await this.checkDatabaseConnectivity();

    return {
      status: authHealth && apiHealth && dbHealth ? "healthy" : "unhealthy",
      checks: {
        authentication: authHealth,
        apiConnectivity: apiHealth,
        database: dbHealth,
      },
    };
  }
}
```

#### 4.3 Feature Flag Deployment

**Gradual Rollout:**

```typescript
// Feature flag implementation
@Injectable()
export class AlphaSpaceFeatureFlagService {
  async isAlphaSpaceEnabled(companyId?: string): Promise<boolean> {
    // Check global feature flag
    const globalEnabled = process.env.ALPHASPACE_ENABLED === "true";

    // Check company-specific override
    if (companyId) {
      const companySetting = await this.getCompanyAlphaSpaceSetting(companyId);
      return companySetting ?? globalEnabled;
    }

    return globalEnabled;
  }

  async enableAlphaSpaceForCompany(companyId: string): Promise<void> {
    // Company-specific enablement
    await this.prisma.companySetting.upsert({
      where: {
        company_id_key: { company_id: companyId, key: "alphaspace_enabled" },
      },
      update: { value: "true" },
      create: {
        company_id: companyId,
        key: "alphaspace_enabled",
        value: "true",
      },
    });
  }
}
```

#### 4.4 Monitoring Setup

**Production Monitoring:**

```typescript
// src/modules/alphaspace/services/monitoring.service.ts
@Injectable()
export class AlphaSpaceMonitoringService {
  // Key metrics to track
  private readonly metrics = {
    apiCallCount: new Counter(
      "alphaspace_api_calls_total",
      "Total AlphaSpace API calls"
    ),
    apiCallDuration: new Histogram(
      "alphaspace_api_call_duration",
      "API call duration"
    ),
    errorCount: new Counter(
      "alphaspace_errors_total",
      "Total AlphaSpace errors"
    ),
    feeCollectionAmount: new Counter(
      "alphaspace_fee_collection_total",
      "Fee collection amount"
    ),
  };

  async recordApiCall(endpoint: string, duration: number, success: boolean) {
    this.labels.api_endpoint = endpoint;
    this.metrics.apiCallCount.inc(this.labels);

    this.labels.api_endpoint = endpoint;
    this.labels.success = success.toString();
    this.metrics.apiCallDuration.observe(this.labels, duration);
  }

  async recordError(error: any, context: any) {
    this.metrics.errorCount.inc({ error_type: error.code || "unknown" });
  }

  async getMetrics(): Promise<string> {
    // Expose Prometheus metrics
    return register.metrics();
  }
}
```

### Success Criteria - Phase 4

- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met (<200ms P95)
- [ ] Health checks and monitoring active
- [ ] Feature flag deployment tested
- [ ] Production environment validated
- [ ] Rollback procedures documented and tested
- [ ] 90%+ test coverage achieved

### Phase 4 Rollback Strategy

- Feature flags allow instant rollback to Maplerad
- Database records remain intact
- Webhook endpoints can be disabled

## Phase Timeline Summary

| Phase | Duration | Key Deliverables     | Success Criteria               |
| ----- | -------- | -------------------- | ------------------------------ |
| 1     | 2 weeks  | Foundation setup     | Authentication + basic schema  |
| 2     | 4 weeks  | Core functionality   | CRUD operations + transactions |
| 3     | 4 weeks  | Advanced features    | Fees + security + performance  |
| 4     | 4 weeks  | Testing & deployment | Production ready system        |

## Risk Mitigation Throughout Phases

### Technical Risks

- **Daily Code Reviews**: Ensure quality and adherence to WAVLET patterns
- **Automated Testing**: Prevent regressions with comprehensive test suite
- **Pair Programming**: Complex integrations developed collaboratively

### Business Risks

- **Stakeholder Demos**: Weekly demos to gather feedback and alignment
- **Feature Flags**: Allow gradual rollout and easy rollback
- **A/B Testing**: Validate AlphaSpace performance against Maplerad

### Resource Management

- **Scrum Methodology**: Bi-weekly sprints with clear deliverables
- **Knowledge Sharing**: Regular team training on AlphaSpace concepts
- **MONIX Liaison**: Maintain communication with source system experts

This phased approach ensures a controlled, measured implementation that minimizes risk while maximizing the value of adapting the proven MONIX AlphaSpace integration to WAVLET.
