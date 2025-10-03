# 📊 Monitoring Guide

This guide covers the comprehensive monitoring and observability system including Prometheus metrics, health checks, performance monitoring, and alerting.

## Overview

The monitoring system provides:

- **Prometheus Metrics** for application and system monitoring
- **Health Checks** for service availability monitoring
- **Performance Metrics** for request/response monitoring
- **Custom Metrics** for business logic monitoring
- **Alerting Integration** for proactive issue detection
- **Dashboard Integration** for visual monitoring

## Architecture

```
📁 Monitoring Structure
src/common/monitoring/
├── metrics.service.ts         # Prometheus metrics service
├── metrics.controller.ts      # Metrics endpoint
├── health.controller.ts       # Health check endpoints
├── performance.interceptor.ts # Request performance tracking
└── monitoring.module.ts       # Monitoring module

monitoring/
├── prometheus.yml             # Prometheus configuration
├── grafana/                   # Grafana dashboards
│   ├── app-dashboard.json     # Application dashboard
│   └── infrastructure.json   # Infrastructure dashboard
└── alerts/                    # Alert rules
    ├── app-alerts.yml         # Application alerts
    └── infra-alerts.yml       # Infrastructure alerts
```

## Prometheus Metrics

### Metrics Service

```typescript
// src/common/monitoring/metrics.service.ts
import { Injectable } from '@nestjs/common';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private activeConnections: Gauge<string>;
  private databaseConnections: Gauge<string>;
  private customMetrics: Map<string, any> = new Map();

  constructor() {
    // Enable default metrics (CPU, Memory, etc.)
    collectDefaultMetrics({ register });

    // HTTP Request Counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    // HTTP Request Duration
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    // Active Connections
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [register],
    });

    // Database Connections
    this.databaseConnections = new Gauge({
      name: 'database_connections',
      help: 'Number of active database connections',
      labelNames: ['state'],
      registers: [register],
    });
  }

  // Record HTTP request
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });

    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
      },
      duration / 1000, // Convert to seconds
    );
  }

  // Update active connections
  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  // Update database connections
  setDatabaseConnections(active: number, idle: number): void {
    this.databaseConnections.set({ state: 'active' }, active);
    this.databaseConnections.set({ state: 'idle' }, idle);
  }

  // Custom business metrics
  incrementCustomCounter(
    name: string,
    labels: Record<string, string> = {},
  ): void {
    if (!this.customMetrics.has(name)) {
      const counter = new Counter({
        name: `custom_${name}_total`,
        help: `Custom counter for ${name}`,
        labelNames: Object.keys(labels),
        registers: [register],
      });
      this.customMetrics.set(name, counter);
    }

    const metric = this.customMetrics.get(name);
    metric.inc(labels);
  }

  recordCustomHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ): void {
    if (!this.customMetrics.has(name)) {
      const histogram = new Histogram({
        name: `custom_${name}_duration`,
        help: `Custom histogram for ${name}`,
        labelNames: Object.keys(labels),
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
        registers: [register],
      });
      this.customMetrics.set(name, histogram);
    }

    const metric = this.customMetrics.get(name);
    metric.observe(labels, value);
  }

  setCustomGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {},
  ): void {
    if (!this.customMetrics.has(name)) {
      const gauge = new Gauge({
        name: `custom_${name}_value`,
        help: `Custom gauge for ${name}`,
        labelNames: Object.keys(labels),
        registers: [register],
      });
      this.customMetrics.set(name, gauge);
    }

    const metric = this.customMetrics.get(name);
    metric.set(labels, value);
  }

  // Get all metrics
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Clear all metrics (for testing)
  clearMetrics(): void {
    register.clear();
    this.customMetrics.clear();
  }
}
```

### Metrics Controller

```typescript
// src/common/monitoring/metrics.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
```

### Performance Interceptor

```typescript
// src/common/monitoring/performance.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const route = this.getRoute(request);

        this.metricsService.recordHttpRequest(
          request.method,
          route,
          response.statusCode,
          duration,
        );

        // Record slow requests
        if (duration > 1000) {
          this.metricsService.incrementCustomCounter('slow_requests', {
            method: request.method,
            route,
          });
        }
      }),
    );
  }

  private getRoute(request: any): string {
    return request.route?.path || request.url;
  }
}
```

## Health Checks

### Health Controller

```typescript
// src/common/monitoring/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prisma: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check overall application health' })
  check() {
    return this.health.check([
      () => this.prisma.pingCheck('database', this.prismaService),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', threshold: 0.8 }),
    ]);
  }

  @Get('database')
  @HealthCheck()
  @ApiOperation({ summary: 'Check database health' })
  checkDatabase() {
    return this.health.check([
      () => this.prisma.pingCheck('database', this.prismaService),
    ]);
  }

  @Get('memory')
  @HealthCheck()
  @ApiOperation({ summary: 'Check memory usage' })
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 200 * 1024 * 1024),
    ]);
  }

  @Get('disk')
  @HealthCheck()
  @ApiOperation({ summary: 'Check disk usage' })
  checkDisk() {
    return this.health.check([
      () => this.disk.checkStorage('storage', { path: '/', threshold: 0.9 }),
    ]);
  }

  @Get('external')
  @HealthCheck()
  @ApiOperation({ summary: 'Check external service dependencies' })
  checkExternal() {
    return this.health.check([
      () => this.http.pingCheck('google', 'https://google.com'),
      // Add other external service checks here
    ]);
  }
}
```

### Custom Health Indicators

```typescript
// src/common/monitoring/custom-health.indicator.ts
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CustomHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async checkDatabaseConnections(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check active connections
      const result = await this.prismaService.$queryRaw<
        Array<{ count: number }>
      >`SELECT count(*) FROM pg_stat_activity WHERE state = 'active'`;

      const activeConnections = Number(result[0].count);
      const maxConnections = 100; // Configure based on your database

      const isHealthy = activeConnections < maxConnections * 0.8;

      const resultObject = this.getStatus(key, isHealthy, {
        activeConnections,
        maxConnections,
        usage: `${((activeConnections / maxConnections) * 100).toFixed(1)}%`,
      });

      if (isHealthy) {
        return resultObject;
      }

      throw new HealthCheckError('Database connections too high', resultObject);
    } catch (error) {
      throw new HealthCheckError('Database connection check failed', {
        [key]: {
          status: 'down',
          error: error.message,
        },
      });
    }
  }

  async checkResponseTime(key: string): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      // Perform a simple database query
      await this.prismaService.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - start;
      const threshold = 1000; // 1 second

      const isHealthy = responseTime < threshold;

      const resultObject = this.getStatus(key, isHealthy, {
        responseTime: `${responseTime}ms`,
        threshold: `${threshold}ms`,
      });

      if (isHealthy) {
        return resultObject;
      }

      throw new HealthCheckError('Response time too high', resultObject);
    } catch (error) {
      throw new HealthCheckError('Response time check failed', {
        [key]: {
          status: 'down',
          error: error.message,
        },
      });
    }
  }
}
```

## Application Metrics

### Business Metrics

```typescript
// src/common/monitoring/business-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BusinessMetricsService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly prismaService: PrismaService,
  ) {}

  // Record user registration
  recordUserRegistration(method: 'email' | 'google' | 'github'): void {
    this.metricsService.incrementCustomCounter('user_registrations', {
      method,
    });
  }

  // Record user login
  recordUserLogin(
    method: 'email' | 'google' | 'github',
    success: boolean,
  ): void {
    this.metricsService.incrementCustomCounter('user_logins', {
      method,
      success: success.toString(),
    });
  }

  // Record API usage
  recordApiUsage(endpoint: string, userId?: string): void {
    this.metricsService.incrementCustomCounter('api_usage', {
      endpoint,
      authenticated: userId ? 'true' : 'false',
    });
  }

  // Record error rates
  recordError(type: string, service: string): void {
    this.metricsService.incrementCustomCounter('application_errors', {
      type,
      service,
    });
  }

  // Record custom events
  recordCustomEvent(event: string, labels: Record<string, string> = {}): void {
    this.metricsService.incrementCustomCounter(
      `business_events_${event}`,
      labels,
    );
  }

  // Periodic metrics collection
  @Cron(CronExpression.EVERY_MINUTE)
  async collectPeriodicMetrics(): Promise<void> {
    try {
      // Total users
      const totalUsers = await this.prismaService.user.count();
      this.metricsService.setCustomGauge('total_users', totalUsers);

      // Active users (logged in last 24h)
      const activeUsers = await this.prismaService.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });
      this.metricsService.setCustomGauge('active_users', activeUsers);

      // New users today
      const newUsersToday = await this.prismaService.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      this.metricsService.setCustomGauge('new_users_today', newUsersToday);

      // Database size (approximation)
      const dbSizeResult = await this.prismaService.$queryRaw<
        Array<{ size: string }>
      >`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;

      if (dbSizeResult[0]?.size) {
        // Convert size to bytes for metric
        const sizeInBytes = this.parseSizeToBytes(dbSizeResult[0].size);
        this.metricsService.setCustomGauge('database_size_bytes', sizeInBytes);
      }
    } catch (error) {
      console.error('Error collecting periodic metrics:', error);
    }
  }

  private parseSizeToBytes(sizeString: string): number {
    const units = {
      B: 1,
      kB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
    };

    const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] as keyof typeof units;

    return Math.round(value * (units[unit] || 1));
  }
}
```

## Configuration

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alerts/app-alerts.yml'
  - 'alerts/infra-alerts.yml'

scrape_configs:
  - job_name: 'nestjs-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
    scrape_timeout: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Environment Variables

```bash
# Monitoring Configuration
MONITORING_ENABLED=true
METRICS_PATH=/metrics
HEALTH_CHECK_PATH=/health

# Prometheus Configuration
PROMETHEUS_URL=http://prometheus:9090
PROMETHEUS_JOB=nestjs-app

# Alerting Configuration
ALERTMANAGER_URL=http://alertmanager:9093
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Alert Rules

### Application Alerts

```yaml
# monitoring/alerts/app-alerts.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors per second'

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High response time detected'
          description: '95th percentile response time is {{ $value }}s'

      - alert: DatabaseConnectionsHigh
        expr: database_connections{state="active"} > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High database connection usage'
          description: 'Active database connections: {{ $value }}'

      - alert: MemoryUsageHigh
        expr: process_resident_memory_bytes / 1024 / 1024 > 512
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is {{ $value }}MB'

      - alert: ApplicationDown
        expr: up{job="nestjs-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Application is down'
          description: 'The NestJS application is not responding'
```

### Infrastructure Alerts

```yaml
# monitoring/alerts/infra-alerts.yml
groups:
  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High CPU usage'
          description: 'CPU usage is {{ $value }}%'

      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High disk usage'
          description: 'Disk usage is {{ $value }}%'

      - alert: DatabaseDown
        expr: up{job="postgres-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Database is down'
          description: 'PostgreSQL database is not responding'
```

## Grafana Dashboards

### Application Dashboard

```json
{
  "dashboard": {
    "title": "NestJS Application Dashboard",
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
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          },
          {
            "expr": "rate(http_requests_total{status_code=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "custom_active_users_value",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

## Usage Examples

### Recording Custom Metrics

```typescript
// In your service
@Injectable()
export class UserService {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    private readonly metricsService: MetricsService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const startTime = Date.now();

    try {
      const user = await this.userRepository.create(createUserDto);

      // Record successful registration
      this.businessMetrics.recordUserRegistration('email');

      // Record operation duration
      const duration = Date.now() - startTime;
      this.metricsService.recordCustomHistogram('user_creation', duration, {
        method: 'email',
        success: 'true',
      });

      return user;
    } catch (error) {
      // Record error
      this.businessMetrics.recordError('user_creation_failed', 'UserService');

      // Record operation duration (even for failures)
      const duration = Date.now() - startTime;
      this.metricsService.recordCustomHistogram('user_creation', duration, {
        method: 'email',
        success: 'false',
      });

      throw error;
    }
  }
}
```

### Monitoring Authentication

```typescript
// In auth service
@Injectable()
export class AuthService {
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const startTime = Date.now();

    try {
      const user = await this.validateUser(loginDto);
      const tokens = await this.generateTokens(user);

      // Record successful login
      this.businessMetrics.recordUserLogin('email', true);

      return tokens;
    } catch (error) {
      // Record failed login
      this.businessMetrics.recordUserLogin('email', false);

      throw error;
    }
  }
}
```

## Monitoring Commands

### Development

```bash
# Start Prometheus locally
docker run -p 9090:9090 -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus

# Start Grafana locally
docker run -p 3001:3000 grafana/grafana

# View metrics endpoint
curl http://localhost:3000/metrics

# Check health endpoint
curl http://localhost:3000/health
```

### Production

```bash
# View metrics
curl https://api.yourapp.com/metrics

# Check health
curl https://api.yourapp.com/health

# Test alerting
curl -X POST https://api.yourapp.com/test-error-endpoint
```

## Best Practices

### Metric Design

- Use meaningful metric names
- Include relevant labels for filtering
- Avoid high cardinality labels
- Use appropriate metric types

### Performance

- Limit metric collection frequency
- Use sampling for high-volume metrics
- Implement metric caching where appropriate
- Monitor metric collection overhead

### Security

- Secure metrics endpoints
- Sanitize metric labels
- Avoid exposing sensitive data in metrics
- Implement proper access controls

### Alerting

- Set appropriate thresholds
- Avoid alert fatigue
- Include actionable information
- Test alert rules regularly

## Troubleshooting

### Common Issues

#### Metrics Not Appearing

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics | grep your_metric

# Verify Prometheus scraping
curl http://localhost:9090/api/v1/targets

# Check for errors in logs
docker logs prometheus
```

#### High Memory Usage

```bash
# Check metric cardinality
curl http://localhost:9090/api/v1/label/__name__/values

# Identify high cardinality metrics
prometheus_tsdb_head_series

# Reduce label cardinality
# Remove or consolidate high cardinality labels
```

#### Alert Not Firing

```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Test alert expression
curl 'http://localhost:9090/api/v1/query?query=your_alert_expression'

# Check Alertmanager
curl http://localhost:9093/api/v1/alerts
```

---

**Next Steps:**

- Review [Deployment Guide](../deployment/) for production monitoring
- Check [Logging Guide](../logging/) for log-based metrics
- See [Error Handling](../error-handling/) for error monitoring
