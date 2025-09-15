# Monix - Maplerad Integration Implementation Details

## Key Implementation Patterns

### 1. Production-Grade API Client Pattern

The Monix implementation features a comprehensive API client that handles all aspects of Maplerad integration:

```typescript
class MapleradService {
  private readonly httpClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    // Structured configuration loading
    const mapleradConfig = this.configService.get("maplerad");

    // HTTPS-enforced client with proper timeouts
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 300000, // 5 minutes
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${this.secretKey}`,
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
      }),
    });

    // Comprehensive request/response interceptors
    this.setupInterceptors();
  }
}
```

### 2. Multi-Stage Card Issuance Orchestration

Complex workflow management with error recovery at each stage:

```typescript
async issueRetailCard(issueCardDto: Partial<IssueRetailCardDto>, userId: string) {
  // 1. Auto-fill user information from existing data
  const completeDto = await this.autoFillUserInfo(userId, issueCardDto);

  // 2. Calculate complex fees with range-based pricing
  const feeCalculation = await this.cardFeeService.calculateCardPurchaseFees(
    userId, "maplerad", validatedDto.cardCurrency,
    validatedDto.initialBalance, validatedDto.contactlessPayment || false
  );

  // 3. Secure fund reservation BEFORE external API calls
  await this.reserveWalletFundsBeforeSudo(userId, totalToDebitXaf, description, clientReference);

  let mapleradCallSucceeded = false;
  try {
    // 4. Ensure/create Maplerad customer
    const customerId = await this.ensureMapleradCustomer(userId);

    // 5. Create card via Maplerad API
    const mapleradResponse = await this.mapleradService.createCard(cardData);
    mapleradCallSucceeded = true;

    // 6. Save metadata for webhook correlation
    await this.saveCardCreationMetadata(mapleradReference, userId, feeCalculation, validatedDto, clientReference, customerId);

    // 7. Wait for webhook confirmation (10 minutes timeout)
    const webhookResult = await this.webhookWaitingService.waitForWebhook(mapleradReference, 600000);

    // 8. Process successful completion
    return await this.processSuccessfulCompletion(webhookResult, feeCalculation);

  } catch (error) {
    // Strategic error handling based on API success
    if (!mapleradCallSucceeded) {
      // Refund funds - no service delivered
      await this.refundWalletFundsAfterSudoFailure(userId, totalToDebitXaf, clientReference, error.message);
    } else {
      // Keep funds - service was delivered successfully
      logger.warn("Service delivered - funds conserved");
    }
    throw error;
  }
}
```

### 3. Sophisticated Webhook Processing Architecture

Comprehensive event handling with performance optimizations:

```typescript
class MapleradWebhookController {
  async handleWebhook(
    payload: MapleradWebhookPayload,
    headers: Record<string, string>
  ) {
    // 1. Signature verification with HMAC SHA-256
    const isSignatureValid = this.verifyWebhookSignature(
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature
    );

    // 2. Idempotency check
    if (await this.isWebhookAlreadyProcessed(webhookId)) {
      return { success: true, message: "Already processed" };
    }

    // 3. Event-specific processing
    switch (payload.event) {
      case "issuing.transaction":
        return await this.processTransaction(payload);
      case "issuing.created.successful":
        return await this.processCardCreated(payload);
      case "issuing.created.failed":
        return await this.processCardCreationFailed(payload);
      case "issuing.terminated":
        return await this.processCardTerminated(payload);
      case "issuing.charge":
        return await this.processCardCharge(payload);
    }
  }

  // Optimized transaction processing
  private async processAuthorizationTransaction(
    payload: MapleradWebhookPayload
  ) {
    // Critical: Record transaction synchronously
    await this.recordTransactionFromWebhook(payload);

    const isSuccessfulPayment =
      payload.status === "SUCCESS" && payload.mode === "DEBIT";

    if (isSuccessfulPayment) {
      // Performance optimization: Process fees asynchronously
      this.processSuccessfulPaymentFeesAsync(payload).catch((error) => {
        this.logger.error("Async fee processing error", {
          error: error.message,
        });
      });

      // Performance optimization: Send notifications asynchronously
      this.sendPaymentSuccessNotificationAsync(payload).catch((error) => {
        this.logger.error("Async notification error", { error: error.message });
      });
    }

    return { success: true, processed: true, feesApplied: isSuccessfulPayment };
  }
}
```

### 4. Advanced Customer Enrollment with KYC

Complete customer lifecycle management:

```typescript
async ensureMapleradCustomer(userId: string): Promise<string> {
  const user = await this.usersService.findOne(userId);

  if (user.cardCustomerId) {
    return user.cardCustomerId;
  }

  // Create comprehensive enrollment data
  const enrollData = this.mapleradService.createEnrollDataFromMonixUser({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth?.toISOString().split("T")[0],
    country: user.countryIsoCode || "CM",
    address: user.address,
    city: user.city,
    state: user.state,
    postalCode: "00000",
    idType: user.idType,
    idNumber: user.idNumber,
    idFrontImageUrl: user.idFrontImageUrl,
    idBackImageUrl: user.idBackImageUrl,
    selfieImageUrl: user.selfieImageUrl,
  });

  const customer = await this.mapleradService.enrollCustomerFull(enrollData);

  // Extract customer ID from various response formats
  const customerId = customer?.id || customer?.customer_id || customer?.data?.id || customer?.data?.customer_id;

  // Update user with Maplerad customer ID
  await this.usersService.update(userId, { cardCustomerId: customerId });

  return customerId;
}
```

## Database Operations

### Complex Entity Relationships

```typescript
@Entity("cards")
export class Card {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  // Maplerad integration fields
  @Column({ nullable: true })
  midenCardId: string; // Maplerad card ID

  @Column({ nullable: true })
  cardCustomerId: string; // Maplerad customer ID

  // Encrypted card details
  @Column({ type: "text", nullable: true })
  secureCardDetails: string;

  @Column()
  nameOnCard: string;

  @Column({ type: "enum", enum: CardBrand })
  cardBrand: CardBrand;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: "enum", enum: CardStatus, default: CardStatus.ACTIVE })
  status: CardStatus;

  // Relationships
  @OneToMany(() => CardTransaction, (transaction) => transaction.card)
  transactions: CardTransaction[];
}
```

### Advanced Transaction Tracking

```typescript
@Entity("card_transactions")
export class CardTransaction {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => Card, (card) => card.transactions)
  @JoinColumn({ name: "card_id" })
  card: Card;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "enum", enum: CardTransactionType })
  type: CardTransactionType;

  @Column({ type: "enum", enum: CardTransactionStatus })
  status: CardTransactionStatus;

  @Column()
  reference: string;

  @Column({ nullable: true })
  externalReference: string; // Maplerad transaction ID

  @Column({ nullable: true })
  merchantName: string;

  @Column({ nullable: true })
  location: string;

  // Fee tracking
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  feePercentage: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  feeFixed: number;
}
```

## Fee Calculation System

### Range-Based Fee Configuration

```typescript
class CardFeeOptimizedService {
  async calculateCardPurchaseFees(
    userId: string,
    cardType: string,
    currency: CardCurrency,
    initialBalance: number,
    contactlessPayment: boolean
  ): Promise<FeeCalculation> {
    // Check if first card for user
    const isFirstCard = await this.cardService.isFirstCard(userId);

    // Get base fees from configuration
    const baseFees = await this.getBaseFees(cardType, currency);

    // Apply discounts for first card
    const issuanceFee = isFirstCard ? 0 : baseFees.issuanceFee;

    // Calculate exchange rates
    const exchangeRate = await this.exchangeRateService.getCurrentRate(
      "USD",
      "XAF"
    );

    // Apply topup fees based on ranges
    const topupFeeUsd = this.calculateTopupFee(initialBalance, currency);
    const topupFeeXaf = Math.round(topupFeeUsd * exchangeRate.rate);

    return {
      issuanceFeeXaf: issuanceFee,
      topupFeeUsd,
      topupFeeXaf,
      totalFeeXaf: issuanceFee + topupFeeXaf,
      isFirstCard,
      exchangeRateUsed: exchangeRate.rate,
      breakdown: {
        issuanceDiscount: isFirstCard ? baseFees.issuanceFee : 0,
        contactlessPremium: contactlessPayment ? baseFees.contactlessExtra : 0,
      },
    };
  }
}
```

### Dynamic Fee Range Processing

```typescript
private calculateTopupFee(amount: number, currency: CardCurrency): number {
  const feeRanges = {
    'USD': [
      { min: 0, max: 10, fee: 0.5, type: 'fixed' },
      { min: 10, max: 100, fee: 2, type: 'percentage' },
      { min: 100, max: Infinity, fee: 1, type: 'percentage' }
    ]
  };

  const ranges = feeRanges[currency] || feeRanges['USD'];
  const applicableRange = ranges.find(range => amount >= range.min && amount < range.max);

  if (!applicableRange) return 0;

  return applicableRange.type === 'percentage'
    ? (amount * applicableRange.fee) / 100
    : applicableRange.fee;
}
```

## Webhook Correlation System

### Metadata Management

```typescript
class CardCreationTrackingService {
  async saveCreationMetadata(metadata: {
    reference: string;
    userId: string;
    customerId: string;
    cardBrand: string;
    initialBalance: number;
    clientReference: string;
    feeCalculation: any;
    validatedDto: any;
  }): Promise<void> {
    // Store in cache/database for webhook correlation
    await this.cacheManager.set(
      `card_creation:${metadata.reference}`,
      metadata,
      600000 // 10 minutes TTL
    );
  }

  async getCreationMetadata(reference: string): Promise<any> {
    return await this.cacheManager.get(`card_creation:${reference}`);
  }

  async cleanupCreationMetadata(reference: string): Promise<void> {
    await this.cacheManager.del(`card_creation:${reference}`);
  }
}
```

### Webhook Waiting Service

```typescript
class WebhookWaitingService {
  private readonly webhookPromises = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  async waitForWebhook(
    reference: string,
    timeoutMs: number
  ): Promise<WebhookResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.webhookPromises.delete(reference);
        reject(new Error(`Webhook timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.webhookPromises.set(reference, { resolve, reject, timeout });
    });
  }

  notifyWebhookReceived(reference: string, data: any): void {
    const promise = this.webhookPromises.get(reference);
    if (promise) {
      clearTimeout(promise.timeout);
      this.webhookPromises.delete(reference);
      promise.resolve({ success: true, data });
    }
  }
}
```

## Advanced Error Handling

### Sophisticated Error Classification

```typescript
private handleMapleradError(error: any): Error {
  const status = error.response?.status;
  const responseData = error.response?.data;

  // Extract error codes from various response formats
  const errorCode = responseData?.error_code || responseData?.code;
  const errorMessage = responseData?.message || responseData?.error_message || error.message;

  // Handle validation errors (array format)
  if (responseData?.message && Array.isArray(responseData.message)) {
    const validationErrors = responseData.message.map((err: any) => {
      if (err.constraints) {
        return Object.values(err.constraints).join(", ");
      }
      return err.message || "Validation error";
    });
    return new Error(validationErrors.join(". "));
  }

  // Map specific error codes to user-friendly messages
  const errorMappings = {
    'INSUFFICIENT_FUNDS': 'Insufficient balance for this operation',
    'INVALID_AMOUNT': 'Invalid amount specified',
    'CUSTOMER_NOT_FOUND': 'Customer not found',
    'KYC_INCOMPLETE': 'KYC verification incomplete',
    'CARD_LIMIT_EXCEEDED': 'Maximum card limit reached'
  };

  if (errorCode && errorMappings[errorCode]) {
    return new Error(errorMappings[errorCode]);
  }

  // HTTP status-based error handling
  switch (status) {
    case 400: return new Error('Invalid request data');
    case 401: return new Error('Authentication failed');
    case 403: return new Error('Access forbidden');
    case 404: return new Error('Resource not found');
    case 429: return new Error('Rate limit exceeded');
    case 500: return new Error('Server error');
    default: return new Error('Service unavailable');
  }
}
```

## Performance Optimizations

### Asynchronous Processing Patterns

```typescript
// Fee processing moved to background for fast webhook response
private async processSuccessfulPaymentFeesAsync(payload: MapleradWebhookPayload): Promise<void> {
  try {
    const card = await this.cardRepository.findOne({ where: { midenCardId: payload.card_id } });
    const amountUsd = this.mapleradService.convertFromSmallestUnit(Number(payload.amount), "USD");

    // Apply existing fee collection system
    const feeResult = await this.paymentDebtManagerService.collectPaymentFee({
      cardId: card.id,
      userId: card.userId,
      sudoTransactionId: payload.reference,
      amount: amountUsd,
      currency: "USD",
      merchantName: payload.merchant?.name || "Unknown merchant"
    });

    this.logger.log("Payment fees applied asynchronously", {
      cardId: card.id,
      feeMethod: feeResult.method,
      feeAmount: feeResult.feeAmount
    });
  } catch (error) {
    this.logger.error("Async fee processing failed", { error: error.message });
  }
}
```

### Intelligent Caching Strategy

```typescript
class MapleradService {
  private readonly balanceCache = new Map<
    string,
    { balance: number; timestamp: number }
  >();

  async getRealCardBalance(cardId: string): Promise<number> {
    // Check cache first (5-minute TTL)
    const cached = this.balanceCache.get(cardId);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.balance;
    }

    // Fetch from API and cache
    const response = await this.getCardDetails(cardId);
    const balance = this.convertFromSmallestUnit(
      response?.data?.balance || 0,
      "USD"
    );

    this.balanceCache.set(cardId, {
      balance,
      timestamp: Date.now(),
    });

    return balance;
  }
}
```

## Multi-Currency Support

### Dynamic Exchange Rate Integration

```typescript
class ExchangeRateService {
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{
    convertedAmount: number;
    rate: number;
    timestamp: Date;
  }> {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1, timestamp: new Date() };
    }

    const rate = await this.getCurrentRate(fromCurrency, toCurrency);
    const convertedAmount = Math.round(amount * rate.rate * 100) / 100;

    return {
      convertedAmount,
      rate: rate.rate,
      timestamp: new Date(),
    };
  }
}
```

This comprehensive implementation demonstrates the production-ready nature of the Monix Maplerad integration, with sophisticated error handling, performance optimizations, and comprehensive business logic that handles complex real-world scenarios.
