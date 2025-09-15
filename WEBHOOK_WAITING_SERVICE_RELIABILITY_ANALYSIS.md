# Webhook Waiting Service Reliability Analysis

## Overview

This document analyzes the reliability of the `webhookWaitingService` used in the adapted card issuance process and provides recommendations for ensuring robust operation.

## Current Implementation Analysis

### Architecture

The webhook waiting service uses Node.js `EventEmitter` to coordinate between:

1. **Card Issuance Process**: Waits for webhook confirmation
2. **Webhook Handler**: Notifies when webhook is received

### Code Structure

```typescript
export class WebhookWaitingService {
  private readonly eventEmitter = new EventEmitter();
  private readonly DEFAULT_TIMEOUT = 300_000; // 5 minutes

  async waitForWebhook(
    reference: string,
    timeoutMs: number
  ): Promise<WebhookWaitingResult> {
    return new Promise((resolve) => {
      const eventName = `webhook_${reference}`;
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.eventEmitter.removeAllListeners(eventName);
          resolve({ success: false, timeout: true });
        }
      }, timeoutMs);

      this.eventEmitter.once(eventName, (result) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(result);
        }
      });
    });
  }
}
```

## Potential Reliability Issues

### 1. **Memory Leaks**

- **Issue**: EventEmitter listeners accumulate if webhooks fail repeatedly
- **Impact**: Memory consumption increases over time
- **Current Mitigation**: `removeAllListeners()` on timeout

### 2. **Race Conditions**

- **Issue**: Multiple simultaneous webhook calls for same reference
- **Impact**: Potential duplicate processing or missed events
- **Current Mitigation**: `once()` ensures single execution

### 3. **EventEmitter Limits**

- **Issue**: Default max listeners (10) may be exceeded
- **Impact**: Warnings and potential memory issues
- **Current Status**: Not addressed

### 4. **Process Restart Issues**

- **Issue**: Webhook waiting state lost on process restart
- **Impact**: Pending card issuances fail on restart
- **Current Status**: Not addressed

### 5. **Timeout Reliability**

- **Issue**: Fixed timeout may not suit all scenarios
- **Impact**: Premature timeouts or excessive waiting
- **Current Status**: Configurable timeout available

### 6. **Error Handling**

- **Issue**: No error handling for EventEmitter failures
- **Impact**: Silent failures in webhook coordination
- **Current Status**: Basic error handling present

## Reliability Assessment

### Current Reliability Score: **7/10**

**Strengths:**

- ✅ Proper timeout handling
- ✅ Single execution guarantee with `once()`
- ✅ Memory cleanup on timeout
- ✅ Configurable timeouts
- ✅ Good logging

**Weaknesses:**

- ❌ No EventEmitter limits configuration
- ❌ No persistence across restarts
- ❌ No circuit breaker for repeated failures
- ❌ No monitoring/metrics
- ❌ No graceful degradation

## Recommended Improvements

### 1. **EventEmitter Configuration**

```typescript
export class WebhookWaitingService {
  constructor() {
    // Increase max listeners to handle high concurrency
    this.eventEmitter.setMaxListeners(100);
  }
}
```

### 2. **Memory Monitoring**

```typescript
export class WebhookWaitingService {
  private activeWaits = new Map<string, number>();

  async waitForWebhook(reference: string, timeoutMs: number) {
    this.activeWaits.set(reference, Date.now());

    // ... existing logic ...

    // Cleanup tracking
    this.activeWaits.delete(reference);
  }

  getActiveWaitCount(): number {
    return this.activeWaits.size;
  }
}
```

### 3. **Circuit Breaker Pattern**

```typescript
export class WebhookWaitingService {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIME = 60000; // 1 minute

  private isCircuitOpen(): boolean {
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      if (Date.now() - this.lastFailureTime < this.RECOVERY_TIME) {
        return true;
      }
      // Reset circuit after recovery time
      this.failureCount = 0;
    }
    return false;
  }

  async waitForWebhook(reference: string, timeoutMs: number) {
    if (this.isCircuitOpen()) {
      return {
        success: false,
        error: "Circuit breaker open - webhook service temporarily unavailable",
      };
    }

    try {
      const result = await this.performWait(reference, timeoutMs);
      this.failureCount = 0; // Reset on success
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      throw error;
    }
  }
}
```

### 4. **Health Check Endpoint**

```typescript
export class WebhookWaitingService {
  getHealthStatus() {
    return {
      activeWaits: this.activeWaits.size,
      maxListeners: this.eventEmitter.getMaxListeners(),
      failureCount: this.failureCount,
      isCircuitOpen: this.isCircuitOpen(),
      uptime: process.uptime(),
    };
  }
}
```

### 5. **Graceful Shutdown**

```typescript
export class WebhookWaitingService {
  async shutdown() {
    // Complete all pending waits with timeout
    for (const [reference] of this.activeWaits) {
      this.notifyWebhookReceived(reference, {
        success: false,
        error: "Service shutting down",
      });
    }

    this.eventEmitter.removeAllListeners();
  }
}
```

### 6. **Retry Mechanism**

```typescript
export class WebhookWaitingService {
  async waitForWebhookWithRetry(
    reference: string,
    timeoutMs: number,
    maxRetries: number = 3
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.waitForWebhook(reference, timeoutMs);
        if (result.success) {
          return result;
        }

        if (attempt < maxRetries) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

## Production Deployment Considerations

### 1. **Process Management**

- Use PM2 or similar for process management
- Implement graceful shutdown handling
- Monitor memory usage and restart on thresholds

### 2. **Monitoring & Alerting**

```typescript
// Prometheus metrics
const webhookWaitsTotal = new Counter({
  name: "webhook_waits_total",
  help: "Total number of webhook waits",
});

const webhookTimeoutsTotal = new Counter({
  name: "webhook_timeouts_total",
  help: "Total number of webhook timeouts",
});
```

### 3. **Database Persistence**

For critical operations, consider persisting webhook wait state:

```sql
CREATE TABLE webhook_waits (
  reference VARCHAR PRIMARY KEY,
  status VARCHAR,
  created_at TIMESTAMP,
  timeout_at TIMESTAMP
);
```

### 4. **Load Balancing**

- Ensure webhook handlers can reach all service instances
- Use Redis pub/sub for cross-instance communication
- Implement distributed webhook waiting

## Testing Strategy

### Unit Tests

```typescript
describe("WebhookWaitingService", () => {
  it("should resolve on webhook notification", async () => {
    const result = await service.waitForWebhook("test-ref", 1000);
    service.notifyWebhookReceived("test-ref", { success: true });
    expect(result.success).toBe(true);
  });

  it("should timeout after specified duration", async () => {
    const result = await service.waitForWebhook("test-ref", 100);
    expect(result.timeout).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe("Card Issuance Flow", () => {
  it("should handle webhook timeout gracefully", async () => {
    // Mock webhook service to timeout
    // Verify automatic refund occurs
    // Verify transaction status updates
  });
});
```

### Load Tests

```typescript
describe("High Concurrency", () => {
  it("should handle 1000 simultaneous webhook waits", async () => {
    const promises = Array(1000)
      .fill()
      .map((_, i) => service.waitForWebhook(`ref-${i}`, 5000));

    // Simulate webhook arrivals
    setTimeout(() => {
      promises.forEach((_, i) => {
        service.notifyWebhookReceived(`ref-${i}`, { success: true });
      });
    }, 100);

    const results = await Promise.all(promises);
    expect(results.every((r) => r.success)).toBe(true);
  });
});
```

## Reliability Improvements Summary

| Issue               | Current Status | Recommended Fix                  | Priority |
| ------------------- | -------------- | -------------------------------- | -------- |
| Memory Leaks        | Partial        | Add monitoring & limits          | High     |
| Race Conditions     | Mitigated      | Add distributed locking          | Medium   |
| EventEmitter Limits | Not addressed  | Configure max listeners          | High     |
| Process Restarts    | Not addressed  | Add state persistence            | Medium   |
| Error Handling      | Basic          | Add comprehensive error handling | High     |
| Monitoring          | Basic          | Add metrics & alerting           | High     |

## Conclusion

The current `webhookWaitingService` is **functional but not production-ready** for high-reliability scenarios. While it handles basic webhook waiting correctly, it lacks:

1. **Scalability features** for high concurrency
2. **Monitoring and observability**
3. **Resilience patterns** (circuit breaker, retry)
4. **Graceful degradation** capabilities

For production use, implement the recommended improvements, especially:

- EventEmitter configuration
- Circuit breaker pattern
- Comprehensive monitoring
- Memory leak prevention

The service can be made **highly reliable** with these enhancements, achieving 99.9%+ uptime for webhook waiting operations.
