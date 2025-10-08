# TaskManager-Server Monitoring & Observability System

## 📋 Table of Contents

- [Overview](#overview)
- [Health Check System](#health-check-system)
- [Prometheus Metrics Collection](#prometheus-metrics-collection)
- [Integration Architecture](#integration-architecture)
- [Monitoring Endpoints](#monitoring-endpoints)
- [Performance Optimization](#performance-optimization)
- [Production Deployment](#production-deployment)
- [Alerting & Notifications](#alerting--notifications)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🎯 Overview

The TaskManager-Server implements a comprehensive monitoring and observability system combining **NestJS Terminus** for health checks and **@willsoto/nestjs-prometheus** for metrics collection. This dual approach provides both real-time health status and detailed performance metrics for production monitoring.

### Why This Approach?

- **🏥 Health Checks**: Immediate operational status for container orchestration
- **📊 Metrics**: Historical data for performance analysis and alerting
- **🔄 Integration**: Seamless integration with modern monitoring stacks
- **⚡ Performance**: Optimized for minimal application impact

## 🏥 Health Check System

### System Architecture

The health check system provides three distinct endpoints serving different operational needs:

```mermaid
graph TB
    A[Load Balancer] --> B{Health Check Type}
    B -->|Comprehensive| C[/health]
    B -->|Readiness| D[/health/ready]
    B -->|Liveness| E[/health/live]

    C --> F[Database Check]
    C --> G[Memory Check]
    C --> H[Disk Check]
    C --> I[All Dependencies]

    D --> F
    D --> J[Essential Services Only]

    E --> K[Basic Process Check]
    E --> L[No Dependencies]

    F --> M[Health Response]
    G --> M
    H --> M
    J --> N[Readiness Response]
    K --> O[Liveness Response]
```

### Health Check Endpoints

#### 1. Comprehensive Health Check (`GET /health`)

**Purpose**: Complete system health assessment including all critical dependencies

```typescript
@Get()
@HealthCheck()
check() {
  return this.health.check([
    // Database connectivity
    () => this.prismaHealth.pingCheck('database', this.prisma as PrismaClient),

    // Memory thresholds
    () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
    () => this.memory.checkRSS('memory_rss', 200 * 1024 * 1024),   // 200MB

    // Disk usage
    () => this.disk.checkStorage('storage', {
      path: '/',
      thresholdPercent: 0.9, // 90% threshold
    }),
  ]);
}
```

**Response Format**:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" },
    "storage": { "status": "up" }
  },
  "error": {},
  "details": {
    /* detailed status information */
  }
}
```

#### 2. Readiness Check (`GET /health/ready`)

**Purpose**: Determines if application can handle incoming requests

```typescript
@Get('ready')
@HealthCheck()
ready() {
  return this.health.check([
    () => this.prismaHealth.pingCheck('database', this.prisma as PrismaClient),
  ]);
}
```

**Use Cases**:

- Kubernetes readiness probes
- Load balancer health checks
- Blue-green deployment validation

#### 3. Liveness Check (`GET /health/live`)

**Purpose**: Basic availability check for container orchestration

```typescript
@Get('live')
liveness() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

**Features**:

- No external dependencies
- Minimal overhead
- Always responsive unless process crashed

## 📊 Prometheus Metrics Collection

### Implementation Overview

Uses `@willsoto/nestjs-prometheus` with performance optimizations for production monitoring:

```typescript
PrometheusModule.register({
  defaultMetrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    config: {
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    },
  },
});
```

### Metrics Categories

#### Core HTTP Metrics

- **`taskmanager_http_request_duration_seconds`** - Request duration histogram
- **`taskmanager_http_requests_total`** - Total HTTP requests counter
- **`taskmanager_http_requests_errors_total`** - HTTP error counter

#### Application Metrics

- **`taskmanager_active_connections`** - Active connections gauge
- **`taskmanager_database_connections`** - Database connections gauge
- **`taskmanager_memory_usage_bytes`** - Memory usage by type

#### System Metrics (Built-in)

- CPU usage, event loop lag, GC metrics, file descriptors, heap statistics

### Performance Optimizations

#### 1. High-Resolution Timing

```typescript
const startTime = process.hrtime.bigint();
// ... request processing ...
const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
```

#### 2. Route Normalization

```typescript
private normalizeRoute(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\?.*$/, '')
    .substring(0, 100);
}
```

**Benefits**:

- Prevents metric cardinality explosion
- Normalizes dynamic routes: `/users/123` → `/users/:id`
- Bounded memory usage

#### 3. Optimized Histogram Buckets

```typescript
buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
```

- Tailored for web application response times
- Better resolution for typical latencies

#### 4. Conditional Memory Monitoring

```typescript
private startMemoryMonitoring(): void {
  if (process.env.NODE_ENV !== 'production' && process.env.METRICS_MEMORY_MONITORING !== 'true') {
    return;
  }
  setInterval(() => { /* collect memory metrics */ }, 30000);
}
```

## 🔗 Integration Architecture

### System Integration Flow

```mermaid
graph LR
    A[HTTP Request] --> B[MetricsInterceptor]
    B --> C[Application Logic]
    C --> D[Response]
    D --> B
    B --> E[Record Metrics]

    F[Health Check Request] --> G[HealthController]
    G --> H[Health Indicators]
    H --> I[Database/Memory/Disk]
    I --> J[Health Response]

    K[Prometheus Scraper] --> L[/metrics endpoint]
    L --> M[Collected Metrics]

    N[Kubernetes] --> O[/health/ready]
    N --> P[/health/live]
```

### Module Dependencies

```typescript
@Module({
  imports: [
    // Health checks
    TerminusModule,

    // Metrics collection
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
    }),

    // Database integration
    PrismaModule,
  ],
  providers: [
    MetricsService,
    MetricsInterceptor,
    // Metric providers
    httpRequestDurationProvider,
    httpRequestsTotalProvider,
    errorRateProvider,
    memoryUsageProvider,
  ],
  controllers: [HealthController, MetricsController],
})
```

## 🌐 Monitoring Endpoints

### Endpoint Summary

| Endpoint           | Purpose              | Frequency | Use Case                    |
| ------------------ | -------------------- | --------- | --------------------------- |
| `/health`          | Comprehensive health | 30-60s    | Complete system status      |
| `/health/ready`    | Readiness check      | 10-30s    | Traffic routing decisions   |
| `/health/live`     | Liveness check       | 30-60s    | Container restart decisions |
| `/metrics`         | Prometheus metrics   | 15-30s    | Performance monitoring      |
| `/metrics/summary` | Debug summary        | Manual    | Development debugging       |

### Health Response Codes

- **200 OK**: All checks passed
- **503 Service Unavailable**: One or more checks failed

### Metrics Response Format

```
# HELP taskmanager_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE taskmanager_http_request_duration_seconds histogram
taskmanager_http_request_duration_seconds_bucket{method="get",route="/users/:id",status_code="200",le="0.005"} 45
taskmanager_http_request_duration_seconds_bucket{method="get",route="/users/:id",status_code="200",le="0.01"} 67
...
```

## ⚡ Performance Optimization

### Performance Impact Assessment

#### Memory Overhead

- **Base metrics**: ~2-5MB
- **Per normalized route**: ~50-100 bytes
- **Per request**: ~200 bytes (temporary)

#### CPU Overhead

- **Per request**: ~0.1-0.3ms additional latency
- **Background collection**: <1% CPU usage
- **Memory monitoring**: <0.1% CPU usage (30s intervals)

#### Network Overhead

- **Metrics endpoint**: ~10-50KB per scrape
- **Health endpoints**: ~1-5KB per check

### Optimization Strategies

#### 1. Metrics Endpoint Exclusion

```typescript
if (request.url?.includes('/metrics')) {
  return next.handle(); // Skip metrics collection to avoid recursion
}
```

#### 2. Error Handling Optimization

```typescript
catchError((error) => {
  // Record error metrics without affecting response time
  this.metricsService.recordHttpError(method, route, statusCode, error.name);
  return throwError(() => error);
});
```

#### 3. Async Health Checks

```typescript
async comprehensiveHealthCheck() {
  const checks = await Promise.allSettled([
    this.databaseCheck(),
    this.memoryCheck(),
    this.diskCheck(),
  ]);
  return this.aggregateResults(checks);
}
```

## 🚀 Production Deployment

### Kubernetes Configuration

#### Pod Health Probes

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: taskmanager
          image: taskmanager:latest
          ports:
            - containerPort: 3000

          # Liveness probe - restart if failing
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 60
            timeoutSeconds: 5
            failureThreshold: 3

          # Readiness probe - remove from service if failing
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 2
```

#### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: taskmanager-service
  annotations:
    prometheus.io/scrape: 'true'
    prometheus.io/path: '/metrics'
    prometheus.io/port: '3000'
spec:
  selector:
    app: taskmanager
  ports:
    - port: 3000
      targetPort: 3000
```

### Prometheus Configuration

#### Scrape Configuration

```yaml
scrape_configs:
  - job_name: 'taskmanager'
    static_configs:
      - targets: ['taskmanager:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s

  - job_name: 'taskmanager-health'
    static_configs:
      - targets: ['taskmanager:3000']
    metrics_path: '/health'
    scrape_interval: 30s
```

### Docker Health Checks

#### Dockerfile Configuration

```dockerfile
FROM node:18-alpine

# Application setup...

# Health check using the liveness endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/health-check.js || exit 1

# Alternative using curl
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:3000/health/live || exit 1

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## 🚨 Alerting & Notifications

### Prometheus Alerting Rules

#### Critical System Alerts

```yaml
groups:
  - name: taskmanager-critical
    rules:
      - alert: ApplicationDown
        expr: up{job="taskmanager"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'TaskManager application is down'
          description: 'TaskManager has been down for more than 1 minute'

      - alert: HighErrorRate
        expr: |
          (
            rate(taskmanager_http_requests_errors_total[5m]) /
            rate(taskmanager_http_requests_total[5m])
          ) * 100 > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }}% over the last 5 minutes'

      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(taskmanager_http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High response time'
          description: '95th percentile response time is {{ $value }}s'

      - alert: DatabaseUnhealthy
        expr: |
          (
            probe_success{job="taskmanager-health"} == 0
          ) or (
            absent(probe_success{job="taskmanager-health"})
          )
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'Database health check failing'
```

#### Resource Alerts

```yaml
- name: taskmanager-resources
  rules:
    - alert: HighMemoryUsage
      expr: taskmanager_memory_usage_bytes{type="heap_used"} > 134217728 # 128MB
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: 'High memory usage'
        description: 'Heap memory usage is {{ $value | humanize }}B'

    - alert: DatabaseConnectionPoolExhaustHigh
      expr: taskmanager_database_connections > 80
      for: 3m
      labels:
        severity: warning
      annotations:
        summary: 'Database connection pool usage high'
```

### Grafana Dashboards

#### Key Metrics Dashboard

```json
{
  "dashboard": {
    "title": "TaskManager Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(taskmanager_http_requests_total[1m]) * 60"
          }
        ]
      },
      {
        "title": "Response Time Percentiles",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(taskmanager_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(taskmanager_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(taskmanager_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(taskmanager_http_requests_errors_total[5m]) / rate(taskmanager_http_requests_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "taskmanager_memory_usage_bytes{type=\"heap_used\"}",
            "legendFormat": "Heap Used"
          },
          {
            "expr": "taskmanager_memory_usage_bytes{type=\"rss\"}",
            "legendFormat": "RSS"
          }
        ]
      }
    ]
  }
}
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Health Check Failures

**Database Health Check Failing**

```bash
# Check database connectivity
curl -X GET http://localhost:3000/health/ready

# Verify database status
docker exec -it postgres-container pg_isready

# Check connection pool
curl -X GET http://localhost:3000/metrics | grep database_connections
```

**Memory Health Check Failing**

```bash
# Check current memory usage
curl -X GET http://localhost:3000/health | jq '.details.memory_heap'

# Monitor memory over time
watch -n 5 'curl -s http://localhost:3000/metrics/summary | jq .memoryMB'

# Generate heap snapshot for analysis
node --inspect index.js
```

**Disk Health Check Failing**

```bash
# Check disk usage
df -h

# Find large files
du -sh /var/lib/docker/* | sort -rh | head -10

# Clean up Docker resources
docker system prune -f
```

#### 2. Metrics Collection Issues

**Missing Metrics**

```bash
# Verify metrics endpoint
curl -X GET http://localhost:3000/metrics

# Check specific metric
curl -X GET http://localhost:3000/metrics | grep http_requests_total

# Debug metrics collection
curl -X GET http://localhost:3000/metrics/summary
```

**High Cardinality Problems**

```bash
# Check route normalization
curl -X GET http://localhost:3000/metrics | grep -c "route="

# Monitor memory usage of metrics
curl -X GET http://localhost:3000/metrics/summary | jq .memoryMB
```

#### 3. Performance Issues

**Slow Health Check Response**

- Implement health check result caching
- Reduce check frequency for expensive operations
- Optimize database queries in health checks

**High Metrics Overhead**

- Verify route normalization is working
- Check histogram bucket configuration
- Monitor metrics collection frequency

### Debugging Commands

```bash
# Complete health status
curl -X GET http://localhost:3000/health | jq .

# Quick liveness check
curl -X GET http://localhost:3000/health/live

# Metrics summary (development only)
curl -X GET http://localhost:3000/metrics/summary | jq .

# Specific metric values
curl -X GET http://localhost:3000/metrics | grep "taskmanager_http_requests_total"

# Load test health endpoints
ab -n 100 -c 10 http://localhost:3000/health/live

# Monitor response times
siege -c 5 -t 30s http://localhost:3000/health/ready
```

## 📋 Best Practices

### 1. Health Check Thresholds

#### Memory Thresholds

- **Heap Memory**: 150MB (allows headroom for traffic spikes)
- **RSS Memory**: 200MB (includes non-heap memory)
- **Rationale**: Conservative limits prevent OOM while allowing normal operation

#### Disk Thresholds

- **Storage**: 90% usage threshold
- **Rationale**: Maintains space for logs, temporary files, emergency operations

#### Database Connectivity

- **Timeout**: Quick ping check for responsiveness
- **Connection Pooling**: Leverage existing Prisma connections

### 2. Metrics Best Practices

#### Label Design

- **Low Cardinality**: Use normalized routes, avoid user IDs
- **Consistent Naming**: Follow Prometheus naming conventions
- **Bounded Values**: Limit label value length and count

#### Performance Considerations

- **Efficient Collection**: Use high-resolution timing
- **Background Processing**: Collect expensive metrics asynchronously
- **Caching Strategy**: Cache health check results briefly

### 3. Production Configuration

#### Environment Variables

```bash
# Core configuration
NODE_ENV=production
METRICS_ENABLED=true
METRICS_MEMORY_MONITORING=true

# Health check thresholds
HEALTH_MEMORY_HEAP_THRESHOLD=157286400    # 150MB
HEALTH_MEMORY_RSS_THRESHOLD=209715200     # 200MB
HEALTH_DISK_THRESHOLD=0.9                 # 90%

# Monitoring intervals
METRICS_COLLECTION_INTERVAL=15000         # 15 seconds
HEALTH_CHECK_CACHE_TTL=10000             # 10 seconds
```

#### Security Considerations

- **Access Control**: Restrict metrics endpoints in production
- **Information Disclosure**: Avoid exposing sensitive data in metrics
- **Rate Limiting**: Protect health endpoints from abuse

### 4. Integration Testing

#### Health Check Tests

```typescript
describe('Health System (Integration)', () => {
  it('should return comprehensive health status', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('info');
    expect(response.body.info).toHaveProperty('database');
  });

  it('should validate memory thresholds', async () => {
    // Simulate high memory usage
    const largeBuffer = Buffer.alloc(160 * 1024 * 1024); // 160MB

    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(503);

    expect(response.body.error).toHaveProperty('memory_heap');
  });
});
```

#### Metrics Tests

```typescript
describe('Metrics Collection (Integration)', () => {
  it('should collect HTTP request metrics', async () => {
    // Make test requests
    await request(app.getHttpServer()).get('/users').expect(200);

    // Check metrics
    const metricsResponse = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(metricsResponse.text).toContain('taskmanager_http_requests_total');
    expect(metricsResponse.text).toContain('method="get"');
    expect(metricsResponse.text).toContain('route="/users"');
  });
});
```

### 5. Monitoring and Alerting Strategy

#### Alert Hierarchy

1. **Critical**: Application down, database unreachable
2. **Warning**: High error rate, high response time, resource limits
3. **Info**: Deployment events, configuration changes

#### Monitoring Frequency

- **Liveness**: 60 seconds (container orchestration)
- **Readiness**: 30 seconds (load balancer decisions)
- **Metrics**: 15 seconds (performance monitoring)
- **Comprehensive Health**: 60 seconds (complete system status)

## 🎯 Conclusion

The TaskManager-Server monitoring and observability system provides comprehensive coverage of both operational health and performance metrics. By combining NestJS Terminus health checks with optimized Prometheus metrics collection, the system supports:

- **🔄 Real-time Operations**: Immediate health status for orchestration decisions
- **📈 Performance Analysis**: Historical metrics data for optimization
- **🚨 Proactive Alerting**: Early warning system for potential issues
- **⚡ Production Ready**: Optimized for minimal performance impact

The implementation follows industry best practices for cloud-native applications while maintaining compatibility with modern monitoring stacks including Prometheus, Grafana, and Kubernetes.

Regular monitoring of the monitoring system itself ensures continued effectiveness as the application scales and evolves in production environments.
