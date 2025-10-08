# AlphaSpace Service Adaptation to WAVLET

## Overview

This document details how to adapt the MONIX AlphaSpace services to work within the WAVLET architecture, focusing on service integration, model compatibility, and business logic adaptation.

## Core Service Architecture

### Current MONIX AlphaSpaceService Structure

```typescript
// MONIX: src/modules/card/services/alphaspace.service.ts
@Injectable()
export class AlphaSpaceService {
  constructor(
    private connection: TypeORMConnection, // MONIX: TypeORM
    private alphaSpaceConfig: AlphaSpaceConfig,
    private feeService: FeeService,
    private cacheManager: CacheManager
  ) {}

  // MONIX methods use Supabase-style queries
}
```

### Adapted WAVLET AlphaSpaceService Structure

```typescript
// WAVLET: src/modules/alphaspace/services/alphaspace.service.ts
@Injectable()
export class AlphaSpaceService {
  constructor(
    private prisma: PrismaService, // WAVLET: Prisma client
    private alphaSpaceConfig: AlphaSpaceConfig,
    private feeManagementService: FeeManagementService, // Adapted from MONIX
    private alphaSpaceCacheService: AlphaSpaceCacheService // New caching layer
  ) {}

  private readonly logger = new Logger(AlphaSpaceService.name);
}
```

## Authentication Implementation

### MONIX AlphaSpace Authentication

```typescript
// MONIX OAuth2 with password grant
async authenticateWithPassword(): Promise<OAuthResult> {
  const response = await axios.post(`${baseUrl}/oauth/token`, {
    grant_type: 'password',
    client_id: this.config.clientId,
    client_secret: this.config.clientSecret,
    username: this.config.username,
    password: this.config.password,
  });

  this.accessToken = response.data.access_token;
  this.refreshToken = response.data.refresh_token;
  return response.data;
}
```

### WAVLET Adapted Authentication

```typescript
// WAVLET adapted OAuth2 with enhanced error handling
async authenticateWithPassword(): Promise<OAuthResult> {
  try {
    this.logger.log('🔐 ALPHASPACE AUTH - Initiating OAuth2 authentication');

    const response = await axios.post(`${this.config.baseUrl}/oauth/token`, {
      grant_type: 'password',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      username: this.config.username,
      password: this.config.password,
    }, {
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      }
    });

    // WAVLET: Enhanced logging with structured data
    this.logger.log('✅ ALPHASPACE AUTH - OAuth2 authentication successful', {
      hasAccessToken: !!response.data.access_token,
      hasRefreshToken: !!response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
    });

    // WAVLET: Store tokens securely (could use Redis in future)
    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };

  } catch (error: any) {
    this.logger.error('❌ ALPHASPACE AUTH - OAuth2 authentication failed', {
      error: error.message,
      statusCode: error.response?.status,
      config: {
        baseUrl: this.config.baseUrl,
        clientId: this.config.clientId,
        timeout: this.config.timeout,
      }
    });

    throw new BadRequestException('Failed to authenticate with AlphaSpace API');
  }
}
```

## Card Creation Implementation

### MONIX Card Creation

```typescript
// MONIX: Legacy customer enrollment + card creation
async enrollCustomerFull(enrollData: AlphaSpaceEnrollCustomerData): Promise<any> {
  const customerData = {
    first_name: enrollData.first_name,
    last_name: enrollData.last_name,
    email: enrollData.email,
    country: enrollData.nationality,
    identification_number: enrollData.identification_number,
    dob: enrollData.dob,
    phone: enrollData.phone,
    identity: enrollData.identity,
    address: enrollData.address,
    photo: enrollData.photo,
  };

  return await this.makeAuthenticatedRequest('POST', '/customers/enroll', customerData);
}
```

### WAVLET Card Creation (Maplerad Compatible)

```typescript
// WAVLET: Streamlined card creation with MongoDB models
async createCard(cardData: WAVLETCreateCardData): Promise<WAVLETCardResult> {
  // 1. WAVLET: Validate input data with Zod/class-validator
  const validatedData = await this.validateCardCreationData(cardData);

  // 2. WAVLET: Check company permissions and balance
  await this.validateCompanyPermissions(cardData.company_id, validatedData.amount);

  try {
    // 3. WAVLET: Create cardholder (customer) first
    const cardholder = await this.createCardholder(validatedData);

    // 4. WAVLET: Create actual card
    const cardCreationResult = await this.createCardInternal(cardholder.id, validatedData);

    // 5. WAVLET: Auto-fund card if amount specified
    if (validatedData.amount && validatedData.amount > 0) {
      await this.fundCard(cardCreationResult.card.id, validatedData.amount);
    }

    // 6. WAVLET: Save to/database and return compatible format
    const savedCard = await this.saveCardToDatabase(cardCreationResult, validatedData);

    return {
      success: true,
      card: this.mapToWAVLETFormat(savedCard),
      metadata: {
        provider: 'alphaspace',
        cardholder_id: cardholder.id,
        fees: cardCreationResult.fees,
      }
    };

  } catch (error) {
    // WAVLET: Comprehensive error handling with WALLET integration
    await this.handleCardCreationError(error, validatedData);
    throw error;
  }
}

private async createCardholder(validatedData: ValidatedCardData): Promise<Cardholder> {
  const cardholderData = {
    name: `${validatedData.firstName} ${validatedData.lastName}`.substring(0, 23),
    first_name: validatedData.firstName.substring(0, 12),
    last_name: validatedData.lastName.substring(0, 12),
    gender: validatedData.gender === 'male' ? 0 : 1,
    date_of_birth: validatedData.dateOfBirth,
    email_address: this.cleanEmail(validatedData.email),
    purpose: validatedData.brand === 'MASTERCARD' ? 'mastercard-1' : 'visacard-1',
  };

  const response = await this.makeAuthenticatedRequest('POST', '/alpha/cards/holder', cardholderData);

  // WAVLET: Wait for approval if needed
  if (response.data.status === 'submitted') {
    return await this.waitForCardholderApproval(response.data.id);
  }

  return response.data;
}
```

## Database Integration

### MONIX Database Operations

```typescript
// MONIX: TypeORM entity operations
const card = new CardEntity();
card.userId = userId;
card.cardType = "alphaspce"; // Note: typo in MONIX
card.midenCardId = cardData.id; // AlphaSpace card ID
// ... other fields

await this.cardRepository.save(card);
```

### WAVLET Database Operations

```typescript
// WAVLET: Prisma operations with enhanced error handling
async saveCardToDatabase(cardCreationResult: any, validatedData: ValidatedCardData): Promise<Card> {
  try {
    const cardData = {
      id: uuidv4(),
      userId: validatedData.customer_id,
      company_id: validatedData.company_id,  // WAVLET: Multi-tenant support
      provider: 'alphaspce',  // Keep MONIX typo for compatibility
      provider_card_id: cardCreationResult.card.id,

      // Card details
      masked_number: cardCreationResult.card.card_number ?
        this.maskCardNumber(cardCreationResult.card.card_number) :
        `****-****-****-****`,
      first_six: cardCreationResult.card.card_number?.substring(0, 6) || '',
      last_four: cardCreationResult.card.card_number?.slice(-4) || '',
      card_brand: this.mapAlphaSpaceBrand(cardCreationResult.card.brand),
      card_expiry_month: this.extractExpiryMonth(cardCreationResult.card),
      card_expiry_year: this.extractExpiryYear(cardCreationResult.card),

      // Status and balance
      status: CardStatus.PENDING,  // WAVLET: Wait for webhook confirmation
      balance: validatedData.amount || 0,
      currency: 'USD',

      // WAVLET: Additional metadata
      fee_config: cardCreationResult.fees_meta,
      provider_metadata: cardCreationResult.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const card = await this.prisma.card.create({ data: cardData });

    this.logger.log('💳 WAVLET ALPHASPACE - Card saved to database', {
      cardId: card.id,
      providerCardId: card.provider_card_id,
      status: card.status,
      balance: card.balance,
    });

    return card;

  } catch (error) {
    this.logger.error('❌ WAVLET ALPHASPACE - Failed to save card to database', {
      error: error.message,
      customerId: validatedData.customer_id,
      companyId: validatedData.company_id,
      providerCardId: cardCreationResult.card?.id,
    });

    throw new BadRequestException('Failed to save card information');
  }
}
```

## Fee Management Integration

### MONIX Fee Collection

```typescript
// MONIX: Simple fee calculation
async calculateFees(cardType: CardType, currency: CardCurrency): Promise<FeeResult> {
  const feeConfig = await this.feeConfigRepository.findOne({
    where: { cardType, currency }
  });

  return {
    successFee: feeConfig.successFee,
    failureFee: feeConfig.failureFee,
    crossBorderFee: feeConfig.crossBorderFee,
  };
}
```

### WAVLET Fee Integration

```typescript
// WAVLET: Sophisticated fee cascade system
async collectPaymentFee(feeContext: FeeContext): Promise<FeeResult> {
  const context = {
    cardId: feeContext.cardId,
    customerId: feeContext.customerId,
    companyId: feeContext.companyId,
    amount: feeContext.amount,
    currency: feeContext.currency,
    type: 'PAYMENT_SUCCESS_FEE',
    description: `Fee for transaction: ${feeContext.merchantName}`,
  };

  // 1. WAVLET: Try card balance first (like MONIX)
  const cardResult = await this.attemptCardFeeDeduction(context);
  if (cardResult.success) {
    return cardResult;
  }

  // 2. WAVLET: Cascade to wallet balance
  const walletResult = await this.attemptWalletFeeDeduction(context);
  if (walletResult.success) {
    // WAVLET: Update wallet balance
    await this.updateWalletBalance(context.companyId, -context.amount);
    return walletResult;
  }

  // 3. WAVLET: Create debt record for later collection
  return await this.createFeeDebt(context);
}

private async attemptCardFeeDeduction(context: FeeContext): Promise<FeeResult> {
  const card = await this.prisma.card.findUnique({
    where: { id: context.cardId }
  });

  if (!card || card.balance < context.amount) {
    return { success: false };
  }

  // WAVLET: Atomic balance update
  await this.prisma.card.update({
    where: { id: context.cardId },
    data: { balance: { decrement: context.amount } }
  });

  // WAVLET: Create balance transaction record
  await this.createBalanceTransactionRecord({
    transaction_id: uuidv4(),
    entity_type: 'card',
    entity_id: context.cardId,
    old_balance: card.balance,
    new_balance: card.balance - context.amount,
    amount_changed: -context.amount,
    description: context.description,
  });

  return {
    success: true,
    source: 'card',
    amount: context.amount
  };
}
```

## Error Handling Adaptation

### MONIX Error Handling

```typescript
// MONIX: Basic error handling
catch (error) {
  console.error('AlphaSpace API Error:', error.message);
  throw new Error('Card creation failed');
}
```

### WAVLET Error Handling

```typescript
// WAVLET: Comprehensive error handling with recovery
enum ErrorRecoveryStrategy {
  RETRY_WITH_REAUTH = 'retry_with_reauth',
  ROLLBACK_TRANSACTION = 'rollback_transaction',
  CREATE_DEBT_RECORD = 'create_debt_record',
  NOTIFY_ADMIN = 'notify_admin',
}

async handleApiError(error: any, operation: string, context?: any): Promise<void> {
  const enrichedError = await this.enrichError(error, operation, context);
  const recoveryStrategy = this.determineRecoveryStrategy(enrichedError);

  // WAVLET: Comprehensive logging
  this.logger.error(`❌ ALPHASPACE ${operation.toUpperCase()} - Error occurred`, {
    error: enrichedError,
    operation,
    context,
    recoveryStrategy,
    timestamp: new Date().toISOString(),
  });

  switch (recoveryStrategy) {
    case ErrorRecoveryStrategy.RETRY_WITH_REAUTH:
      await this.authenticateWithPassword();
      if (context?.retryable) {
        return await this.retryOperation(operation, context);
      }
      break;

    case ErrorRecoveryStrategy.ROLLBACK_TRANSACTION:
      await this.rollbackTransaction(context);
      break;

    case ErrorRecoveryStrategy.CREATE_DEBT_RECORD:
      await this.createDebtRecord(context);
      break;

    case ErrorRecoveryStrategy.NOTIFY_ADMIN:
      await this.notifyAdmin(enrichedError, context);
      break;
  }

  throw this.createUserFriendlyError(enrichedError);
}

private async enrichError(error: any, operation: string, context?: any): Promise<EnrichedError> {
  return {
    originalError: error.message,
    operation,
    context,
    timestamp: new Date().toISOString(),
    apiErrorCode: error.response?.data?.code,
    httpStatusCode: error.response?.status,
    requestConfig: {
      method: error.config?.method,
      url: error.config?.url,
      timeout: error.config?.timeout,
    },
    systemInfo: {
      nodeVersion: process.version,
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
    }
  };
}
```

## Service Dependency Management

### MONIX Dependencies

```typescript
// MONIX: TypeORM-based dependencies
constructor(
  @InjectRepository(CardEntity) private cardRepository: Repository<CardEntity>,
  @InjectRepository(FeeConfigEntity) private feeConfigRepository: Repository<FeeConfigEntity>,
  @Inject(WINSTON_LOGGER) private logger: Logger,
  private httpService: HttpService,
  private configService: ConfigService,
) {}
```

### WAVLET Dependencies

```typescript
// WAVLET: Prisma-based dependencies with enhanced services
constructor(
  private prisma: PrismaService,                    // WAVLET: Prisma client
  private alphaSpaceCacheService: AlphaSpaceCacheService,  // WAVLET: Redis caching
  private feeManagementService: FeeManagementService,     // WAVLET: Enhanced fee system
  private webhookSecurityService: WebhookSecurityService,  // WAVLET: HMAC validation
  private monitoringService: AlphaSpaceMonitoringService,  // WAVLET: Prometheus metrics
) {}

private readonly logger = new Logger(AlphaSpaceService.name);  // WAVLET: NestJS logger
```

## Testing Strategy

### MONIX Testing

```typescript
// MONIX: Basic unit tests
describe("AlphaSpaceService", () => {
  let service: AlphaSpaceService;

  beforeEach(() => {
    service = new AlphaSpaceService(mockRepository, mockConfig);
  });

  it("should create card", async () => {
    const result = await service.createCard(testData);
    expect(result.success).toBe(true);
  });
});
```

### WAVLET Testing Strategy

```typescript
// WAVLET: Comprehensive testing with mocking
describe("AlphaSpaceService", () => {
  let service: AlphaSpaceService;
  let mockPrisma: MockPrismaClient;
  let mockCacheService: MockCacheService;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();
    mockCacheService = mock<AlphaSpaceCacheService>();

    const module = await Test.createTestingModule({
      providers: [
        AlphaSpaceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AlphaSpaceCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AlphaSpaceService>(AlphaSpaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCard", () => {
    it("should create card successfully with valid data", async () => {
      // Arrange
      const testCardData = {
        customer_id: "test-customer-id",
        company_id: "test-company-id",
        brand: "VISA",
        amount: 50,
      };

      mockPrisma.card.create.mockResolvedValue(mockCardEntity);

      // Act
      const result = await service.createCard(testCardData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.card).toBeDefined();
      expect(mockPrisma.card.create).toHaveBeenCalledTimes(1);
    });

    it("should handle AlphaSpace API errors gracefully", async () => {
      // Arrange
      mockPrisma.card.create.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(service.createCard(testCardData)).rejects.toThrow(
        "Failed to save card information"
      );

      expect(mockPrisma.card.create).toHaveBeenCalledTimes(1);
    });

    it("should validate company permissions", async () => {
      // Arrange
      const unauthorizedData = {
        ...testCardData,
        company_id: "invalid-company",
      };

      // Mock validation failure
      jest
        .spyOn(service as any, "validateCompanyPermissions")
        .mockRejectedValue(new ForbiddenException("Company access denied"));

      // Act & Assert
      await expect(service.createCard(unauthorizedData)).rejects.toThrow(
        "Company access denied"
      );
    });
  });

  describe("Authentication", () => {
    it("should authenticate successfully with valid credentials", async () => {
      // Mock successful authentication
      jest.spyOn(service as any, "authenticateWithPassword").mockResolvedValue({
        access_token: "test-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
      });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe("AlphaSpace connection successful");
    });

    it("should handle authentication failures", async () => {
      jest
        .spyOn(service as any, "authenticateWithPassword")
        .mockRejectedValue(new Error("Invalid credentials"));

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Connection failed");
    });
  });
});
```

This adaptation strategy ensures that the proven MONIX AlphaSpace implementation is successfully integrated into WAVLET with enhanced error handling, multi-tenant support, caching, monitoring, and comprehensive testing while maintaining backward compatibility with existing Maplerad APIs.
