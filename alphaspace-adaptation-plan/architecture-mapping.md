# Architecture Mapping: WAVLET vs MONIX AlphaSpace

## Overview

This document outlines the key architectural differences between the WAVLET project and MONIX AlphaSpace implementation, and how to map the proven MONIX code to work within WAVLET's existing structure.

## Core Architectural Differences

### Database Layer

| Aspect         | MONIX              | WAVLET            | Mapping Strategy                  |
| -------------- | ------------------ | ----------------- | --------------------------------- |
| **ORM**        | TypeORM            | Prisma            | Convert entities to Prisma schema |
| **Connection** | Direct TypeORM     | Prisma Client     | Dependency injection              |
| **Migrations** | TypeORM migrations | Prisma migrations | Schema updates                    |
| **Models**     | Entity classes     | Prisma generated  | Complete API changes              |

### Service Layer

| Aspect             | MONIX                 | WAVLET                | Mapping Strategy                   |
| ------------------ | --------------------- | --------------------- | ---------------------------------- |
| **DI Pattern**     | `@InjectRepository()` | Constructor injection | Update constructor signatures      |
| **Logger**         | Winston               | NestJS Logger         | Replace with `Logger` class        |
| **Config**         | ConfigService         | Environment           | Direct env access                  |
| **Error Handling** | Custom exceptions     | NestJS exceptions     | Map to `BadRequestException`, etc. |

### Module Structure

| Aspect          | MONIX               | WAVLET                    | Mapping Strategy      |
| --------------- | ------------------- | ------------------------- | --------------------- |
| **Structure**   | `src/modules/card/` | `src/modules/alphaspace/` | New module directory  |
| **Controllers** | Direct exports      | `@Controller()`           | Keep similar patterns |
| **Services**    | `@Injectable()`     | `@Injectable()`           | Compatible            |
| **DTOs**        | Class validation    | Class validation          | Reuse MONIX DTOs      |

## Detailed Component Mapping

### 1. Authentication System

**MONIX Implementation:**

```typescript
// TypeORM-based user loading
const user = await this.userRepository.findOne({
  where: { id: userId },
  relations: ["company"],
});

// Winston logging
this.logger.info("User authenticated", { userId });
```

**WAVLET Implementation:**

```typescript
// Prisma-based user loading
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  include: { company: true },
});

// NestJS logging
this.logger.log("✅ User authenticated", {
  userId,
  companyId: user.company.id,
});
```

**Key Changes:**

- Replace `this.userRepository.findOne()` with `this.prisma.user.findUnique()`
- Change `relations: ['company']` to `include: { company: true }`
- Replace `this.logger.info()` with `this.logger.log()`

### 2. Business Logic Adaptation

**Card Status Management:**

**MONIX:**

```typescript
// TypeORM enum mapping
card.status = CardStatus.ACTIVE;
await this.cardRepository.save(card);
```

**WAVLET:**

```typescript
// Prisma enum handling
await this.prisma.card.update({
  where: { id: card.id },
  data: { status: CardStatus.ACTIVE },
});
```

**Transaction Records:**

**MONIX:**

```typescript
const transaction = this.transactionRepository.create({
  amount: amount,
  card: card,
  status: TransactionStatus.SUCCESS,
});
await this.transactionRepository.save(transaction);
```

**WAVLET:**

```typescript
await this.prisma.transaction.create({
  data: {
    amount: amount,
    card_id: card.id,
    status: TransactionStatus.SUCCESS,
  },
});
```

### 3. Error Handling Patterns

**Exception Types:**

| MONIX                 | WAVLET                | Reason                 |
| --------------------- | --------------------- | ---------------------- |
| `BadRequestException` | `BadRequestException` | Compatible             |
| `NotFoundException`   | `NotFoundException`   | Compatible             |
| `ForbiddenException`  | `ForbiddenException`  | Compatible             |
| `CustomError`         | `BadRequestException` | Map to NestJS standard |

**Error Enrichment:**

**MONIX:**

```typescript
catch (error) {
  this.logger.error('Operation failed', {
    error: error.message,
    userId
  });
  throw new BadRequestException('Operation failed');
}
```

**WAVLET:**

```typescript
catch (error: any) {
  this.logger.error('❌ WAVLET OPERATION - Failed', {
    error: error.message,
    userId,
    operation: 'card_creation',
    timestamp: new Date().toISOString()
  });
  throw new BadRequestException('Operation failed');
}
```

### 4. Configuration Management

**Environment Variables:**

**MONIX:**

```typescript
// ConfigService injection
constructor(private configService: ConfigService) {}

private get apiUrl(): string {
  return this.configService.get('ALPHASPACE_API_URL');
}
```

**WAVLET:**

```typescript
// Direct environment access
constructor(private alphaSpaceConfig: AlphaSpaceConfig) {}

private get apiUrl(): string {
  return this.alphaSpaceConfig.baseUrl;
}
```

**Configuration Object:**

```typescript
// WAVLET configuration class
export interface AlphaSpaceConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  environment: "test" | "live";
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  webhookSecret?: string;
}
```

## Database Schema Mapping

### Entity Relationships

**MONIX TypeORM Entities:**

```typescript
@Entity()
export class Card {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @Column()
  cardType: string; // 'alphaspce'

  @Column()
  midenCardId: string; // AlphaSpace card ID

  @ManyToOne(() => User)
  user: User;
}
```

**WAVLET Prisma Schema:**

```prisma
model Card {
  id                String   @id @default(cuid())
  userId            String
  company_id        String   // WAVLET addition
  provider          String   // 'alphaspce'
  provider_card_id  String   // AlphaSpace card ID

  user              User     @relation(fields: [userId], references: [id])

  @@map("cards")
}
```

### Migration Strategy

1. **Schema Extensions:**

   - Add `alphaspce` to CardProvider enum
   - Add AlphaSpace-specific fields
   - Add BalanceTransactionRecord model

2. **Data Migration:**

   - Update existing cards if needed
   - Create new enum values
   - Validate constraints

3. **Indexing:**
   - Add indexes for `provider_card_id`
   - Add compound indexes for queries

## Service Integration Patterns

### Dependency Injection Updates

**MONIX Dependencies:**

```typescript
constructor(
  @InjectRepository(CardEntity)
  private cardRepository: Repository<CardEntity>,
  @InjectRepository(TransactionEntity)
  private transactionRepository: Repository<TransactionEntity>,
  @Inject(WINSTON_LOGGER)
  private logger: Logger,
  private httpService: HttpService,
  private configService: ConfigService,
) {}
```

**WAVLET Dependencies:**

```typescript
constructor(
  private prisma: PrismaService,
  // WAVLET specific services
  private alphaSpaceCacheService: AlphaSpaceCacheService,
  private feeManagementService: FeeManagementService,
  private monitoringService: AlphaSpaceMonitoringService,
) {}

private readonly logger = new Logger(AlphaSpaceService.name);
```

### Method Signature Changes

**MONIX Method:**

```typescript
async createCard(cardData: CreateCardData): Promise<CardResult> {
  // Implementation
}
```

**WAVLET Method:**

```typescript
async createCard(cardData: WAVLETCreateCardData): Promise<WAVLETCardResult> {
  // 1. WAVLET validation
  await this.validateCompanyPermissions(cardData.company_id);

  // 2. Core MONIX logic (adapted)
  // 3. WAVLET formatting

  return this.mapToWAVLETFormat(result);
}
```

## API Compatibility Layer

### Controller Mapping

**MONIX Controller:**

```typescript
@Post()
async createCard(@Body() dto: CreateCardDto): Promise<CardResult> {
  return this.alphaSpaceService.createCard(dto);
}
```

**WAVLET Controller (Maplerad Compatible):**

```typescript
@Post()
async createCard(@Body() dto: CreateCardDto, @CurrentUser() user: any): Promise<CardResult> {
  // Add WAVLET multi-tenant support
  const alphaSpaceData = {
    ...dto,
    company_id: user.companyId // WAVLET addition
  };

  return this.alphaSpaceService.createCard(alphaSpaceData);
}
```

### Response Format Standardization

**MONIX Response:**

```typescript
return {
  success: true,
  data: cardData,
  fees: feeData,
};
```

**WAVLET Response (Maplerad Compatible):**

```typescript
return {
  success: true,
  data: {
    id: cardData.id,
    status: CardStatus.ACTIVE,
    // Map to Maplerad-compatible fields
    masked_pan: cardData.masked_pan,
    balance: cardData.balance,
  },
  metadata: {
    provider: "alphaspace",
    fees: feeData,
  },
};
```

## Testing Infrastructure Mapping

### Unit Testing Approach

**MONIX Testing:**

```typescript
describe("AlphaSpaceService", () => {
  let service: AlphaSpaceService;
  let mockRepository: MockType<Repository<CardEntity>>;

  beforeEach(() => {
    service = new AlphaSpaceService(mockRepository, mockConfig);
  });
});
```

**WAVLET Testing:**

```typescript
describe("AlphaSpaceService", () => {
  let service: AlphaSpaceService;
  let mockPrisma: MockPrismaClient;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();

    const module = await Test.createTestingModule({
      providers: [
        AlphaSpaceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlphaSpaceService>(AlphaSpaceService);
  });
});
```

## Error Recovery Mapping

### Rollback Strategy

**MONIX Rollback:**

```typescript
// Basic rollback
await this.cardRepository.remove(card);
```

**WAVLET Rollback:**

```typescript
// Database transaction rollback
await this.prisma.$transaction(async (prisma) => {
  // Atomic rollback operations
  await prisma.card.delete({ where: { id: card.id } });
  await prisma.transaction.deleteMany({ where: { card_id: card.id } });
  await this.rollbackWalletBalance(amount);
});
```

## Performance Considerations

### Caching Strategy

**MONIX Caching:**

```typescript
// Basic cache usage
const cached = await this.cacheManager.get(`card:${cardId}`);
```

**WAVLET Caching:**

```typescript
// Enhanced Redis caching
await this.alphaSpaceCacheService.getCard(cardId);

// Cache invalidation with TTL
await this.alphaSpaceCacheService.setCard(card, 300); // 5 minutes
```

### Monitoring Integration

**MONIX Monitoring:**

```typescript
// Basic metrics
this.logger.info("API call completed", { duration, success });
```

**WAVLET Monitoring:**

```typescript
// Prometheus metrics
this.monitoringService.recordApiCall(endpoint, duration, success);
this.monitoringService.recordFeeCollection(amount, currency);
```

## Security Enhancements

### Multi-Tenant Isolation

**WAVLET Addition:**

```typescript
// All operations require company context
async validateCompanyAccess(cardId: string, companyId: string): Promise<void> {
  const card = await this.prisma.card.findFirst({
    where: {
      id: cardId,
      company_id: companyId // Security isolation
    }
  });

  if (!card) {
    throw new ForbiddenException('Card not found or access denied');
  }
}
```

### Webhook Security

**MONIX Webhook:**

```typescript
// Basic signature check
if (signature !== expectedSignature) {
  throw new Error("Invalid signature");
}
```

**WAVLET Webhook:**

```typescript
// HMAC validation with timestamp checks
await this.webhookSecurityService.validateWebhookSignature(
  payload,
  signature,
  timestamp,
  this.config.webhookSecret
);
```

## Deployment Architecture

### Environment Separation

**MONIX Environments:**

- Single deployment with environment flags

**WAVLET Environments:**

- Separate staging and production
- Feature flags for gradual rollout
- Blue-green deployment support

### Health Check Integration

**WAVLET Health Checks:**

```typescript
// src/modules/alphaspace/controllers/health.controller.ts
@Controller("health")
export class AlphaSpaceHealthController {
  @Get("alphaspace")
  async checkHealth() {
    return {
      status: "healthy",
      checks: {
        authentication: await this.checkAuth(),
        apiConnectivity: await this.checkAPI(),
        database: await this.checkDatabase(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
```

## Migration Checklist

### Phase 1: Foundation

- [ ] Create AlphaSpace module structure
- [ ] Set up environment configuration
- [ ] Update Prisma schema with AlphaSpace fields
- [ ] Create basic service skeleton

### Phase 2: Core Services

- [ ] Convert TypeORM queries to Prisma
- [ ] Update constructor dependencies
- [ ] Implement error recovery patterns
- [ ] Add WAVLET authentication guards

### Phase 3: Business Logic

- [ ] Integrate fee cascade system
- [ ] Implement multi-tenant isolation
- [ ] Add comprehensive logging
- [ ] Convert DTOs and validation

### Phase 4: Testing & Validation

- [ ] Create comprehensive test suite
- [ ] Set up integration testing
- [ ] Implement health checks
- [ ] Configure monitoring

### Phase 5: Production Ready

- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation completion
- [ ] Deployment procedures

This mapping document provides a comprehensive guide for adapting the sophisticated MONIX AlphaSpace implementation into WAVLET while preserving the proven architecture and enhancing it with WAVLET-specific requirements and best practices.
