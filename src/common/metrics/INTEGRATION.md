# Quick Start: Enhanced Metrics Module Integration

## Copy to Your Project

```bash
# Copy the entire metrics folder
cp -r src/common/metrics /path/to/your-project/src/common/
```

## Install Dependencies

```bash
# Required dependencies
npm install @willsoto/nestjs-prometheus prom-client

# Optional: For configuration management
npm install @nestjs/config
```

## Integration Options

### Option 1: Simple Setup (Recommended for most projects)

```typescript
// app.module.ts
import { MetricsModule } from './common/metrics';

@Module({
  imports: [
    MetricsModule.forRootSimple(), // Uses environment variables
    // ... your other modules
  ],
})
export class AppModule {}
```

### Option 2: Custom Configuration

```typescript
// app.module.ts
import { MetricsModule } from './common/metrics';

@Module({
  imports: [
    MetricsModule.forRoot({
      enabled: true,
      enableHttpMetrics: true,
      enableDatabaseMetrics: false, // Important: disable in production
      enableMemoryMonitoring: true,
      memoryMonitoringInterval: 30, // seconds
      defaultLabels: {
        service: 'my-service',
        version: '1.0.0',
        environment: 'production',
      },
      excludedRoutes: ['/metrics', '/health', '/docs'],
    }),
  ],
})
export class AppModule {}
```

### Option 3: Environment-based Configuration

```typescript
// app.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetricsModule } from './common/metrics';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        enabled: configService.get('METRICS_ENABLED', 'true') === 'true',
        enableDatabaseMetrics: configService.get('NODE_ENV') === 'development',
        defaultLabels: {
          service: configService.get('APP_NAME', 'nestjs-app'),
          version: configService.get('APP_VERSION', '1.0.0'),
          environment: configService.get('NODE_ENV', 'development'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Environment Variables

```bash
# .env file
METRICS_ENABLED=true                    # Enable/disable metrics collection
METRICS_DEFAULT_ENABLED=true           # Enable default Prometheus metrics
METRICS_HTTP_ENABLED=true              # Enable HTTP request metrics
METRICS_DATABASE_ENABLED=false         # Enable database query metrics
METRICS_MEMORY_ENABLED=false           # Enable memory monitoring
METRICS_MEMORY_INTERVAL=30             # Memory monitoring interval (seconds)
METRICS_PREFIX=myapp                   # Prefix for all metrics
APP_NAME=My Application                 # Service name for labels
APP_VERSION=1.0.0                      # Version for labels
```

## Complete Integration Example

Here's the complete setup showing both module import AND interceptor registration:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsModule, MetricsInterceptor } from './common/metrics';

@Module({
  imports: [
    MetricsModule.forRootSimple(), // 🎯 CRITICAL: Must use .forRootSimple()
    // ... your other modules
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor, // 🎯 CRITICAL: Manual registration required
    },
    // ... your other providers
  ],
})
export class AppModule {}
```

## ⚠️ Important Integration Notes

1. **Always use `.forRootSimple()`** - Don't import `MetricsModule` directly
2. **Manual interceptor registration required** - The module exports the interceptor but doesn't register it globally
3. **Prometheus dependency required** - Install `@willsoto/nestjs-prometheus prom-client`

## 🚨 Common Integration Issues & Solutions

### Issue: "Nest can't resolve dependencies of MetricsInterceptor"

**Cause**: `MetricsModule` imported without `.forRootSimple()`  
**Solution**:

```typescript
// ❌ Wrong
imports: [MetricsModule];

// ✅ Correct
imports: [MetricsModule.forRootSimple()];
```

### Issue: "Nest can't resolve dependencies of MetricsService"

**Cause**: Missing Prometheus metric providers  
**Solution**: Use `.forRootSimple()` which registers all providers correctly

### Issue: HTTP metrics not being collected

**Cause**: Missing interceptor registration  
**Solution**: Add `MetricsInterceptor` as `APP_INTERCEPTOR` provider

### Issue: "Cannot find module '@willsoto/nestjs-prometheus'"

**Cause**: Missing required dependencies  
**Solution**: `npm install @willsoto/nestjs-prometheus prom-client`

## Usage in Services

### Basic Metrics Tracking

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from './common/metrics';

@Injectable()
export class UserService {
  constructor(private metrics: MetricsService) {}

  async createUser(userData: any) {
    const startTime = Date.now();

    try {
      const user = await this.userRepository.save(userData);

      // Track business event
      this.metrics.recordBusinessEvent({
        eventName: 'user_created',
        eventType: 'user_action',
        userId: user.id,
        timestamp: new Date(),
      });

      return user;
    } finally {
      // Track performance
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

  async findUsers() {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await this.repository.find();
      success = true;
      return result;
    } finally {
      this.metrics.recordDatabaseQuery({
        operation: 'SELECT',
        table: 'users',
        duration: Date.now() - startTime,
        success,
        timestamp: new Date(),
      });
    }
  }
}
```

## Access Metrics

### Prometheus Format

```bash
# Get metrics in Prometheus format
curl http://localhost:3000/metrics

# Output:
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="get",route="/api/users",status_code="200",le="0.005"} 45
http_requests_total{method="get",route="/api/users",status_code="200"} 1250
```

### Debug Summary (Development)

```bash
# Get human-readable summary
curl http://localhost:3000/metrics/summary

{
  "timestamp": "2025-10-08T10:00:00.000Z",
  "environment": "development",
  "totalRequests": 1250,
  "memoryUsageMB": 145,
  "uptimeSeconds": 3600,
  "errorRate": 0.02
}
```

## Prometheus Integration

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'my-nestjs-app'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 15s
    metrics_path: /metrics
```

### Container Setup

For containerized deployments, ensure the metrics endpoint is accessible:

```yaml
# Example configuration for container orchestration
services:
  app:
    ports:
      - '3000:3000'
    environment:
      - METRICS_ENABLED=true

  prometheus:
    image: prom/prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Grafana Dashboard Queries

```promql
# Request rate (requests per second)
rate(http_requests_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate percentage
(rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m])) * 100

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
memory_usage_bytes{type="heap_used"}
```

## Production Checklist

- ✅ Set `METRICS_ENABLED=true` in production
- ✅ Set `METRICS_DATABASE_ENABLED=false` in production (security)
- ✅ Set `METRICS_MEMORY_ENABLED=false` for high-traffic apps (performance)
- ✅ Configure proper authentication for `/metrics` endpoint
- ✅ Set up Prometheus scraping (every 15-30 seconds)
- ✅ Configure Grafana dashboards and alerting
- ✅ Monitor metric cardinality to avoid memory issues
- ✅ Set up log retention and cleanup policies

## Environment-Specific Settings

### Development

```bash
METRICS_ENABLED=true
METRICS_DATABASE_ENABLED=true
METRICS_MEMORY_ENABLED=true
```

### Staging

```bash
METRICS_ENABLED=true
METRICS_DATABASE_ENABLED=false
METRICS_MEMORY_ENABLED=true
```

### Production

```bash
METRICS_ENABLED=true
METRICS_DATABASE_ENABLED=false
METRICS_MEMORY_ENABLED=false
```

## Quick Test

After integration, test your metrics:

```bash
# Start your application
npm run start:dev

# Make a few requests
curl http://localhost:3000/api/users
curl http://localhost:3000/api/orders

# Check metrics
curl http://localhost:3000/metrics | grep http_requests_total

# Check summary (development only)
curl http://localhost:3000/metrics/summary
```

## Troubleshooting

### Issue: Metrics endpoint returns 404

**Solution**: Ensure `MetricsModule` is imported in your app module

### Issue: No HTTP metrics collected

**Solution**: Add `MetricsInterceptor` to your providers

### Issue: High memory usage

**Solution**: Disable memory monitoring or increase interval:

```bash
METRICS_MEMORY_ENABLED=false
# OR
METRICS_MEMORY_INTERVAL=60
```

### Issue: Too many metric labels

**Solution**: Configure exclusions and shorter routes:

```typescript
MetricsModule.forRoot({
  excludedRoutes: ['/uploads/*', '/static/*'],
  maxRouteLength: 50,
});
```

## Alerting Setup (Bonus)

### Prometheus Alerting Rules

```yaml
# alerts.yml
groups:
  - name: api-alerts
    rules:
      - alert: HighErrorRate
        expr: (rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m])) * 100 > 5
        for: 5m
        annotations:
          summary: 'Error rate above 5%'

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        annotations:
          summary: '95th percentile response time above 2 seconds'
```

That's it! Your enhanced metrics module is ready for production use with comprehensive monitoring capabilities. 🚀

## Next Steps

1. **Set up Grafana dashboards** for visualization
2. **Configure alerting rules** for proactive monitoring
3. **Integrate with your CI/CD** for deployment metrics
4. **Add custom business metrics** specific to your domain
5. **Set up log correlation** with trace IDs
