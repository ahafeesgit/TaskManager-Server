# Enhanced Metrics Module

A comprehensive, production-ready metrics collection module for NestJS applications with Prometheus integration, performance monitoring, and business intelligence tracking.

## Features

- 🚀 **Zero Configuration**: Works out of the box with sensible defaults
- 📊 **Prometheus Integration**: Native Prometheus metrics with @willsoto/nestjs-prometheus
- 🎯 **HTTP Request Tracking**: Automatic request duration, count, and error rate monitoring
- 🔧 **Configurable**: Flexible configuration for different environments and use cases
- 📈 **Business Metrics**: Track custom business events and performance operations
- 🗄️ **Database Monitoring**: Optional database query performance tracking
- 💾 **Memory Monitoring**: Real-time memory usage tracking with configurable intervals
- 🏷️ **Smart Labeling**: Automatic route normalization to prevent high cardinality
- 🛡️ **Production Ready**: Optimized for minimal performance impact
- 📚 **Type Safe**: Full TypeScript support with comprehensive interfaces

## Quick Start

### 1. Copy the Metrics Module

Copy the entire `metrics/` folder to your project:

```
src/common/metrics/
├── interfaces/
│   └── metrics.interface.ts
├── metrics.controller.ts
├── metrics.interceptor.ts
├── metrics.service.ts
├── metrics.module.ts
└── index.ts
```

### 2. Install Required Dependencies

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

### 3. Complete Integration Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule, MetricsInterceptor } from './common/metrics';

@Module({
  imports: [
    MetricsModule.forRootSimple(), // 🎯 CRITICAL: Must use .forRootSimple()
    // ... other modules
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor, // 🎯 CRITICAL: Enables HTTP request tracking
    },
    // ... other providers
  ],
})
export class AppModule {}
```

> **⚠️ Important**: Both module import AND interceptor registration are required for HTTP metrics.

### 4. Basic Setup (Module Only)

```typescript
// app.module.ts
import { MetricsModule } from './common/metrics';

@Module({
  imports: [
    MetricsModule.forRootSimple(), // Service only, no HTTP tracking
    // ... other modules
  ],
})
export class AppModule {}
```

### 5. Manual HTTP Request Tracking Setup

```typescript
// app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './common/metrics';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
```

## Configuration Options

### Simple Setup (Environment Variables)

```bash
# .env
METRICS_ENABLED=true                    # Enable/disable metrics
METRICS_DEFAULT_ENABLED=true           # Enable default Prometheus metrics
METRICS_HTTP_ENABLED=true              # Enable HTTP request metrics
METRICS_DATABASE_ENABLED=false         # Enable database query metrics
METRICS_MEMORY_ENABLED=false           # Enable memory monitoring
METRICS_MEMORY_INTERVAL=30             # Memory monitoring interval (seconds)
METRICS_PREFIX=myapp                   # Prefix for all metrics
APP_NAME=My App                        # Service name label
APP_VERSION=1.0.0                      # Version label
```

### Advanced Configuration

```typescript
// app.module.ts
import { MetricsModule } from './common/metrics';

@Module({
  imports: [
    MetricsModule.forRoot({
      enabled: true,
      enableDefaultMetrics: true,
      enableHttpMetrics: true,
      enableDatabaseMetrics: false, // Disable in production for security
      enableMemoryMonitoring: true,
      memoryMonitoringInterval: 30, // seconds
      prefix: 'myapp',
      defaultLabels: {
        service: 'user-service',
        version: '1.0.0',
        environment: 'production',
      },
      excludedRoutes: ['/metrics', '/health', '/docs'],
      enableErrorTracking: true,
      responseTimeBuckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
      maxRouteLength: 100,
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
// app.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetricsModule } from './common/metrics';

@Module({
  imports: [
    MetricsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        enabled: configService.get('METRICS_ENABLED', true),
        enableDatabaseMetrics: configService.get('NODE_ENV') === 'development',
        defaultLabels: {
          service: configService.get('SERVICE_NAME', 'api'),
          version: configService.get('APP_VERSION', '1.0.0'),
          environment: configService.get('NODE_ENV', 'development'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Usage Examples

### Basic Service Integration

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from './common/metrics';

@Injectable()
export class UserService {
  constructor(private metrics: MetricsService) {}

  async createUser(userData: CreateUserDto) {
    const startTime = Date.now();

    try {
      const user = await this.userRepository.save(userData);

      // Record successful business event
      this.metrics.recordBusinessEvent({
        eventName: 'user_created',
        eventType: 'user_action',
        userId: user.id,
        metadata: { plan: user.plan, source: 'api' },
        timestamp: new Date(),
      });

      return user;
    } catch (error) {
      throw error;
    } finally {
      // Record performance metrics
      this.metrics.recordPerformanceOperation({
        operationName: 'create_user',
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
      });
    }
  }
}
```

### Database Query Tracking

```typescript
@Injectable()
export class DatabaseService {
  constructor(private metrics: MetricsService) {}

  async executeQuery(sql: string, params?: any[]) {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await this.database.query(sql, params);
      success = true;
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Track database performance
      this.metrics.recordDatabaseQuery({
        operation: this.getOperationType(sql), // SELECT, INSERT, UPDATE, DELETE
        table: this.extractTableName(sql),
        duration: Date.now() - startTime,
        success,
        timestamp: new Date(),
      });
    }
  }
}
```

### Business Intelligence Tracking

```typescript
@Injectable()
export class OrderService {
  constructor(private metrics: MetricsService) {}

  async processPayment(orderId: string, amount: number) {
    // Track business metrics
    this.metrics.recordBusinessEvent({
      eventName: 'payment_processed',
      eventType: 'business_process',
      metadata: {
        amount: amount.toString(),
        currency: 'USD',
        orderId,
      },
      timestamp: new Date(),
    });
  }

  async trackUserBehavior(userId: string, action: string) {
    this.metrics.recordBusinessEvent({
      eventName: action,
      eventType: 'user_action',
      userId,
      timestamp: new Date(),
    });
  }
}
```

### Custom Child Service

```typescript
@Injectable()
export class PaymentService {
  private paymentMetrics: MetricsService;

  constructor(metricsService: MetricsService) {
    // Create child service with payment-specific labels
    this.paymentMetrics = metricsService.createChildService({
      component: 'payment-processor',
      version: '2.0.0',
    });
  }

  async processPayment() {
    // All metrics from this service will include payment-specific labels
    this.paymentMetrics.recordPerformanceOperation({
      operationName: 'stripe_charge',
      duration: 250,
      success: true,
      timestamp: new Date(),
    });
  }
}
```

## Metrics Endpoints

### Prometheus Metrics

```bash
# Standard Prometheus metrics endpoint
GET /metrics

# Response (Prometheus format)
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="get",route="/api/users",status_code="200",le="0.005"} 145
http_request_duration_seconds_bucket{method="get",route="/api/users",status_code="200",le="0.01"} 200
http_request_duration_seconds_sum{method="get",route="/api/users",status_code="200"} 45.2
http_request_duration_seconds_count{method="get",route="/api/users",status_code="200"} 1250

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="get",route="/api/users",status_code="200"} 1250
```

### Debug Summary (Development Only)

```bash
# Human-readable metrics summary
GET /metrics/summary

{
  "timestamp": "2025-10-08T10:00:00.000Z",
  "environment": "development",
  "totalRequests": 1250,
  "activeConnections": 5,
  "databaseConnections": 3,
  "memoryUsageMB": 145,
  "uptimeSeconds": 3600,
  "errorRate": 0.02
}
```

## Available Metrics

### HTTP Metrics (Automatic)

| Metric Name                     | Type      | Description      | Labels                                 |
| ------------------------------- | --------- | ---------------- | -------------------------------------- |
| `http_request_duration_seconds` | Histogram | Request duration | method, route, status_code             |
| `http_requests_total`           | Counter   | Total requests   | method, route, status_code             |
| `http_requests_errors_total`    | Counter   | Total errors     | method, route, status_code, error_type |

### System Metrics

| Metric Name            | Type  | Description             | Labels                                      |
| ---------------------- | ----- | ----------------------- | ------------------------------------------- |
| `active_connections`   | Gauge | Active HTTP connections | -                                           |
| `database_connections` | Gauge | Database connections    | -                                           |
| `memory_usage_bytes`   | Gauge | Memory usage            | type (heap_used, heap_total, rss, external) |

### Database Metrics (Optional)

| Metric Name                       | Type      | Description    | Labels                    |
| --------------------------------- | --------- | -------------- | ------------------------- |
| `database_query_duration_seconds` | Histogram | Query duration | operation, table, success |

### Business Metrics (Custom)

| Metric Name                               | Type      | Description        | Labels                  |
| ----------------------------------------- | --------- | ------------------ | ----------------------- |
| `business_events_total`                   | Counter   | Business events    | event_name, event_type  |
| `performance_operations_duration_seconds` | Histogram | Operation duration | operation_name, success |

## Prometheus Integration

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nestjs-app'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 15s
    metrics_path: /metrics
```

### Grafana Dashboard Queries

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate percentage
(rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m])) * 100

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage trend
memory_usage_bytes{type="heap_used"}
```

### Sample Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "NestJS Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time P95",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

## Production Considerations

### Performance Impact

- **HTTP Interceptor**: ~0.1ms overhead per request
- **Memory Monitoring**: Configurable interval (default: 30s)
- **Metric Storage**: Uses efficient Prometheus client with automatic cleanup
- **Route Normalization**: Prevents metric explosion with smart path normalization

### Security Best Practices

- **Database Metrics**: Disabled by default in production
- **Excluded Routes**: Automatically excludes `/metrics` and `/health`
- **Sensitive Data**: No sensitive information exposed in metrics
- **Access Control**: Secure `/metrics` endpoint with proper authentication

### Scaling Considerations

```typescript
// High-traffic optimization
MetricsModule.forRoot({
  enableMemoryMonitoring: false, // Disable for high-traffic apps
  memoryMonitoringInterval: 60, // Increase interval
  responseTimeBuckets: [0.1, 0.5, 1, 5], // Fewer buckets
  maxRouteLength: 50, // Shorter route normalization
});
```

### Environment-Specific Settings

```typescript
// Production configuration
const productionConfig: MetricsConfig = {
  enabled: true,
  enableDefaultMetrics: true,
  enableHttpMetrics: true,
  enableDatabaseMetrics: false, // Security: disabled in production
  enableMemoryMonitoring: false, // Performance: disabled for high traffic
  enableErrorTracking: true,
  excludedRoutes: ['/metrics', '/health', '/docs', '/admin'],
  defaultLabels: {
    service: process.env.SERVICE_NAME,
    version: process.env.APP_VERSION,
    environment: 'production',
    region: process.env.AWS_REGION,
  },
};
```

## Alerting Rules

### Prometheus Alerting Rules

```yaml
# alerts.yml
groups:
  - name: nestjs-app
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: (rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m])) * 100 > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate detected'

      # Slow response times
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: '95th percentile response time above 2 seconds'

      # High memory usage
      - alert: HighMemoryUsage
        expr: memory_usage_bytes{type="heap_used"} / memory_usage_bytes{type="heap_total"} > 0.8
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: 'Memory usage above 80%'
```

## Testing

### Unit Tests

```typescript
describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService(/* mock dependencies */);
  });

  it('should record HTTP request metrics', () => {
    const httpData: HttpMetricsData = {
      method: 'GET',
      route: '/api/users',
      statusCode: 200,
      duration: 150,
      timestamp: new Date(),
    };

    expect(() => service.recordHttpRequest(httpData)).not.toThrow();
  });

  it('should normalize routes correctly', () => {
    const result = service['normalizeRoute']('/api/users/123/orders/456');
    expect(result).toBe('/api/users/:id/orders/:id');
  });
});
```

### Integration Tests

```typescript
describe('Metrics Integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [MetricsModule.forRoot({ enabled: true })],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should expose metrics endpoint', async () => {
    return request(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('http_requests_total');
        expect(res.text).toContain('http_request_duration_seconds');
      });
  });
});
```

## Troubleshooting

### Common Issues

1. **Metrics endpoint returns 404**

   ```typescript
   // Ensure MetricsModule is imported
   @Module({
     imports: [MetricsModule.forRootSimple()],
   })
   ```

2. **No HTTP metrics collected**

   ```typescript
   // Add the interceptor
   {
     provide: APP_INTERCEPTOR,
     useClass: MetricsInterceptor,
   }
   ```

3. **High memory usage**

   ```bash
   # Disable memory monitoring
   METRICS_MEMORY_ENABLED=false
   ```

4. **Too many metric labels (high cardinality)**
   ```typescript
   // Configure shorter routes and exclusions
   {
     maxRouteLength: 50,
     excludedRoutes: ['/api/uploads/*', '/static/*'],
   }
   ```

### Performance Debugging

```typescript
// Check metrics summary
const summary = metricsService.getMetricsSummary();
console.log('Metrics Summary:', summary);

// Verify configuration
const config = metricsService.getConfig();
console.log('Metrics Config:', config);
```

## Migration from Basic Monitoring

### Before (Basic Monitoring)

```typescript
// Manual metrics tracking
const startTime = Date.now();
// ... operation
console.log(`Operation took: ${Date.now() - startTime}ms`);
```

### After (Enhanced Metrics Module)

```typescript
@Injectable()
export class MyService {
  constructor(private metrics: MetricsService) {}

  async operation() {
    const startTime = Date.now();

    try {
      // ... operation

      this.metrics.recordPerformanceOperation({
        operationName: 'my_operation',
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.metrics.recordPerformanceOperation({
        operationName: 'my_operation',
        duration: Date.now() - startTime,
        success: false,
        timestamp: new Date(),
      });
      throw error;
    }
  }
}
```

## Advanced Features

### Custom Metric Providers

```typescript
// Create custom metrics in your module
const customMetricProvider = makeCounterProvider({
  name: 'custom_events_total',
  help: 'Total custom events',
  labelNames: ['event_type', 'category'],
});

@Module({
  imports: [MetricsModule.forRootSimple()],
  providers: [customMetricProvider],
})
export class CustomModule {}
```

### Metric Aggregation

```typescript
@Injectable()
export class AggregationService {
  constructor(private metrics: MetricsService) {}

  // Aggregate metrics from multiple services
  async getServiceSummary() {
    const summary = this.metrics.getMetricsSummary();

    return {
      ...summary,
      customMetrics: await this.getCustomMetrics(),
      healthStatus: await this.getHealthStatus(),
    };
  }
}
```

This enhanced metrics module provides comprehensive monitoring capabilities that can be easily integrated into any NestJS project with minimal configuration. It's designed to scale from development to production environments while maintaining optimal performance.
