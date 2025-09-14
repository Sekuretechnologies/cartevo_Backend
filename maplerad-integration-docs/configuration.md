# Maplerad Integration Configuration Documentation

## Overview

This document provides comprehensive configuration details for the Maplerad integration, including environment variables, database setup, API configuration, and deployment considerations.

## Environment Variables

### Required Environment Variables

Add these variables to your `.env` file:

```env
# Maplerad API Configuration
MAPLERAD_BASE_URL=https://api.maplerad.com/v1
MAPLERAD_SECRET_KEY=your_maplerad_secret_key_here

# Maplerad Fees (USD)
MAPLERAD_CARD_CREATION_FEE=2
MAPLERAD_CARD_FUNDING_FEE=0
MAPLERAD_CARD_WITHDRAWAL_FEE=0

# Optional: Webhook Configuration
MAPLERAD_WEBHOOK_SECRET=your_webhook_secret_here
```

### Environment Variable Details

#### MAPLERAD_BASE_URL

- **Description**: Base URL for Maplerad API
- **Type**: string
- **Default**: `https://api.maplerad.com/v1`
- **Production**: `https://api.maplerad.com/v1`
- **Sandbox**: `https://sandbox.maplerad.com/v1`

#### MAPLERAD_SECRET_KEY

- **Description**: API key for authenticating with Maplerad
- **Type**: string
- **Security**: Store securely, never commit to version control
- **Source**: Obtained from Maplerad dashboard

#### MAPLERAD_CARD_CREATION_FEE

- **Description**: Fee charged for card creation (USD)
- **Type**: number
- **Default**: 2
- **Range**: 0-10

#### MAPLERAD_CARD_FUNDING_FEE

- **Description**: Fee charged for funding operations (USD)
- **Type**: number
- **Default**: 0
- **Range**: 0-5

#### MAPLERAD_CARD_WITHDRAWAL_FEE

- **Description**: Fee charged for withdrawal operations (USD)
- **Type**: number
- **Default**: 0
- **Range**: 0-5

#### MAPLERAD_WEBHOOK_SECRET (Optional)

- **Description**: Secret for webhook signature verification
- **Type**: string
- **Security**: Store securely
- **Default**: None (webhooks disabled if not set)

## Database Configuration

### Prisma Schema Updates

Ensure your `schema.prisma` includes the necessary fields for Maplerad integration:

```prisma
model Customer {
  id                    String   @id @default(cuid())
  // ... existing fields
  maplerad_customer_id  String?  // Add this field
  // ... existing fields
}

model Card {
  id                    String   @id @default(cuid())
  // ... existing fields
  provider_card_id      String?  // Maplerad card ID
  provider              String   // Encrypted provider name
  // ... existing fields
}

model Transaction {
  id                    String   @id @default(cuid())
  // ... existing fields
  order_id              String?  // Maplerad transaction ID
  // ... existing fields
}
```

### Database Migration

Run the following commands to update your database:

```bash
# Generate migration
npx prisma migrate dev --name add_maplerad_fields

# Apply migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## API Configuration

### Rate Limiting

Configure rate limiting for Maplerad endpoints:

```typescript
// In your app.module.ts or main.ts
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // Time window in seconds
      limit: 100, // Max requests per window
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

### CORS Configuration

Configure CORS for Maplerad webhooks:

```typescript
// In main.ts
app.enableCors({
  origin: [
    "https://api.maplerad.com",
    "https://sandbox.maplerad.com",
    process.env.FRONTEND_URL,
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});
```

## Webhook Configuration

### Webhook Endpoint Setup

Configure the webhook endpoint in your Maplerad dashboard:

```typescript
// Webhook URL
const WEBHOOK_URL = `${process.env.BASE_URL}/webhook/maplerad`;

// Example: https://api.yourapp.com/webhook/maplerad
```

### Webhook Events to Subscribe

Subscribe to these events in your Maplerad dashboard:

```json
{
  "events": [
    "transaction.created",
    "authorization.declined",
    "authorization.code",
    "transaction.refund",
    "card.updated",
    "card.terminated"
  ]
}
```

### Webhook Security

Implement webhook signature verification:

```typescript
// In webhook service
import * as crypto from 'crypto';

private verifyWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.MAPLERAD_WEBHOOK_SECRET!)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Module Configuration

### MapleradModule Setup

Ensure the MapleradModule is properly imported:

```typescript
// In app.module.ts
import { MapleradModule } from "./modules/maplerad/maplerad.module";

@Module({
  imports: [
    // ... other modules
    MapleradModule,
  ],
})
export class AppModule {}
```

### Service Dependencies

Configure service dependencies:

```typescript
// In maplerad.module.ts
import { CardIssuanceService } from "../../services/card/maplerad/services/cardIssuanceService";

@Module({
  providers: [
    MapleradService,
    CardIssuanceService, // Ensure this is available
  ],
  exports: [MapleradService],
})
export class MapleradModule {}
```

## Security Configuration

### API Key Management

```typescript
// Secure API key storage
import * as AWS from "aws-sdk";

export class ConfigService {
  async getMapleradSecretKey(): Promise<string> {
    if (process.env.NODE_ENV === "production") {
      // Fetch from AWS Secrets Manager
      const secretsManager = new AWS.SecretsManager();
      const secret = await secretsManager
        .getSecretValue({
          SecretId: "maplerad/api-key",
        })
        .promise();

      return JSON.parse(secret.SecretString!).apiKey;
    }

    return process.env.MAPLERAD_SECRET_KEY!;
  }
}
```

### Data Encryption

Configure encryption for sensitive data:

```typescript
// In encryption utility
import * as jwt from "jsonwebtoken";

export const encryptSensitiveData = (data: string): string => {
  return jwt.sign({ data }, process.env.ENCRYPTION_SECRET!, {
    expiresIn: "never", // Data should remain encrypted indefinitely
  });
};

export const decryptSensitiveData = (token: string): string => {
  const decoded = jwt.verify(token, process.env.ENCRYPTION_SECRET!) as any;
  return decoded.data;
};
```

## Monitoring Configuration

### Logging Setup

Configure structured logging:

```typescript
// In main.ts or app.module.ts
import * as winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: "maplerad-error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "maplerad-combined.log" }),
  ],
});

// Use logger in services
logger.info("Maplerad card created", { cardId, customerId });
```

### Health Check Configuration

```typescript
// Health check endpoint
@Get('/health/maplerad')
async getMapleradHealth(): Promise<any> {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      maplerad_api: await this.checkMapleradApi(),
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    }
  };

  return health;
}
```

## Performance Configuration

### Connection Pooling

Configure database connection pooling:

```typescript
// In app.module.ts
import { PrismaModule } from "./modules/prisma/prisma.module";

@Module({
  imports: [
    PrismaModule.forRoot({
      log: ["query", "info", "warn", "error"],
      errorFormat: "pretty",
    }),
  ],
})
export class AppModule {}
```

### Caching Configuration

Set up Redis caching:

```typescript
// In app.module.ts
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      ttl: 300, // 5 minutes default TTL
    }),
  ],
})
export class AppModule {}
```

## Deployment Configuration

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health/maplerad || exit 1

# Start application
CMD ["npm", "run", "start:prod"]
```

### Environment-Specific Configuration

```typescript
// config/production.ts
export const productionConfig = {
  maplerad: {
    baseUrl: "https://api.maplerad.com/v1",
    timeout: 30000,
    retries: 3,
  },
  database: {
    maxConnections: 20,
    idleTimeoutMillis: 30000,
  },
  cache: {
    ttl: 3600, // 1 hour
    maxItems: 10000,
  },
};

// config/development.ts
export const developmentConfig = {
  maplerad: {
    baseUrl: "https://sandbox.maplerad.com/v1",
    timeout: 60000,
    retries: 1,
  },
  database: {
    maxConnections: 5,
    idleTimeoutMillis: 60000,
  },
  cache: {
    ttl: 300, // 5 minutes
    maxItems: 1000,
  },
};
```

## Testing Configuration

### Test Environment Setup

```typescript
// test/setup.ts
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";

export const createTestModule = async (): Promise<TestingModule> => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        envFilePath: ".env.test",
        isGlobal: true,
      }),
      // ... other test imports
    ],
  }).compile();
};
```

### Mock Configuration

```typescript
// test/mocks/maplerad.mock.ts
export const mockMapleradConfig = {
  baseUrl: "https://api.mocklerad.com/v1",
  secretKey: "mock_secret_key",
  fees: {
    creation: 0,
    funding: 0,
    withdrawal: 0,
  },
};

export const mockMapleradApi = {
  createCard: jest.fn().mockResolvedValue({
    id: "card_mock_123",
    status: "active",
    balance: 100,
  }),
  fundCard: jest.fn().mockResolvedValue({
    success: true,
    transactionId: "txn_mock_456",
  }),
};
```

## Backup and Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash

# Database backup
pg_dump -U $DB_USER -h $DB_HOST -d $DB_NAME > maplerad_backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to S3
aws s3 cp maplerad_backup_*.sql s3://your-backup-bucket/maplerad/

# Clean up old backups (keep last 30 days)
find . -name "maplerad_backup_*.sql" -mtime +30 -delete
```

### Configuration Backup

```typescript
// Configuration backup
export class ConfigBackupService {
  async backupConfiguration(): Promise<void> {
    const config = {
      maplerad: {
        baseUrl: process.env.MAPLERAD_BASE_URL,
        fees: {
          creation: process.env.MAPLERAD_CARD_CREATION_FEE,
          funding: process.env.MAPLERAD_CARD_FUNDING_FEE,
          withdrawal: process.env.MAPLERAD_CARD_WITHDRAWAL_FEE,
        },
      },
      timestamp: new Date().toISOString(),
    };

    await this.saveToBackup(config);
  }
}
```

## Troubleshooting Configuration

### Debug Mode

Enable debug logging:

```typescript
// In main.ts
if (process.env.NODE_ENV === "development") {
  app.useLogger(["log", "error", "warn", "debug", "verbose"]);
}
```

### Configuration Validation

```typescript
// Validate configuration on startup
export class ConfigValidator {
  static validate(): void {
    const required = [
      "MAPLERAD_BASE_URL",
      "MAPLERAD_SECRET_KEY",
      "DATABASE_URL",
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }

    // Validate URLs
    if (!this.isValidUrl(process.env.MAPLERAD_BASE_URL!)) {
      throw new Error("Invalid MAPLERAD_BASE_URL");
    }
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Version Management

### Configuration Versioning

```typescript
// config/version.ts
export const CONFIG_VERSION = "1.2.0";

export const validateConfigVersion = (): void => {
  const currentVersion = process.env.CONFIG_VERSION;

  if (currentVersion !== CONFIG_VERSION) {
    console.warn(
      `Config version mismatch. Expected: ${CONFIG_VERSION}, Got: ${currentVersion}`
    );
    console.warn("Please update your environment configuration");
  }
};
```

This comprehensive configuration documentation ensures proper setup, security, and maintainability of the Maplerad integration across different environments.
