# Health Check Module

A comprehensive, reusable health check module for NestJS applications that provides production-ready health monitoring with zero external dependencies.

## Features

- 🚀 **Zero Dependencies**: No external packages required (works without @nestjs/terminus)
- 🔧 **Database Agnostic**: Supports Prisma, TypeORM, Mongoose, or any database service
- 📊 **Built-in Indicators**: Memory, Disk, and Database health checks
- 🎯 **Kubernetes Ready**: Provides `/health/ready` and `/health/live` endpoints
- 🔌 **Extensible**: Easy to add custom health checks
- ⚡ **Performance Optimized**: Parallel execution and efficient resource monitoring
- 📚 **Well Documented**: Comprehensive API documentation with Swagger
- 🔒 **Security Ready**: Public endpoints with authentication bypass decorator

## Quick Start

### 1. Copy the Health Module

Copy the entire `health/` folder to your project:

```
src/common/health/
├── controllers/
│   └── health.controller.ts
├── decorators/
│   └── public.decorator.ts
├── indicators/
│   ├── database-health.service.ts
│   ├── disk-health.service.ts
│   └── memory-health.service.ts
├── interfaces/
│   └── health-check.interface.ts
├── services/
│   └── health.service.ts
├── health.module.ts
├── index.ts
└── README.md
```

### 2. Basic Setup (No Database)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { HealthModule } from './common/health';

@Module({
  imports: [
    HealthModule.forRootSimple(), // Simple setup without database
    // ... other modules
  ],
})
export class AppModule {}
```

### 3. Setup with Database (Prisma Example)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { HealthModule } from './common/health';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    HealthModule.forRoot({
      databaseService: PrismaService, // Your database service
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 4. Setup with Custom Database Service

```typescript
// For any database service
HealthModule.forRoot({
  databaseService: {
    ping: async () => {
      // Your custom ping logic
      return true;
    },
  },
});

// For services with query methods
HealthModule.forRoot({
  databaseService: {
    query: async (sql: string) => {
      // Your database query method
      return await yourDb.query(sql);
    },
  },
});
```

## Available Endpoints

Once imported, the following endpoints are available:

### `GET /health`

Comprehensive health check of all components:

```json
{
  "status": "ok",
  "timestamp": "2025-10-08T10:00:00.000Z",
  "uptime": 3600,
  "info": {
    "memory": { "status": "up", "heapUsed": "45MB" },
    "disk": { "status": "up", "usedPercent": "65%" },
    "database": { "status": "up", "connected": true }
  }
}
```

### `GET /health/ready`

Kubernetes readiness probe (checks critical services):

```json
{
  "status": "ok",
  "timestamp": "2025-10-08T10:00:00.000Z",
  "uptime": 3600,
  "info": {
    "database": { "status": "up" }
  }
}
```

### `GET /health/live`

Kubernetes liveness probe (simple alive check):

```json
{
  "status": "ok",
  "timestamp": "2025-10-08T10:00:00.000Z",
  "uptime": 3600,
  "info": {
    "application": { "status": "up" }
  }
}
```

### `GET /health/info`

Application runtime information:

```json
{
  "pid": 12345,
  "uptime": 3600,
  "version": "v18.17.0",
  "platform": "linux",
  "arch": "x64",
  "nodeEnv": "production",
  "memory": {
    "heapUsed": 45,
    "heapTotal": 60,
    "rss": 120,
    "external": 5
  }
}
```

## Configuration Options

### Module Options

```typescript
interface HealthModuleOptions {
  databaseService?: DatabaseService; // Your database service
  enableController?: boolean; // Enable/disable endpoints (default: true)
  routePrefix?: string; // Custom route prefix (default: 'health')
}
```

### Database Service Interface

Your database service should implement at least one of these methods:

```typescript
interface DatabaseService {
  $queryRaw?: (
    query: TemplateStringsArray | string,
    ...args: any[]
  ) => Promise<any>; // Prisma
  query?: (text: string, params?: any[]) => Promise<any>; // PostgreSQL/MySQL
  ping?: () => Promise<boolean>; // Custom ping
  isConnected?: () => boolean; // Connection status
}
```

## Custom Health Checks

Add custom health checks for your specific services:

```typescript
// In your service
import { HealthService } from './common/health';

@Injectable()
export class AppService {
  constructor(private healthService: HealthService) {
    // Add custom health check
    this.healthService.addHealthCheck({
      name: 'redis',
      check: async () => {
        try {
          await this.redisClient.ping();
          return { status: 'up', responseTime: '2ms' };
        } catch (error) {
          return { status: 'down', error: error.message };
        }
      },
    });
  }
}
```

## Database Integration Examples

### Prisma

```typescript
HealthModule.forRoot({
  databaseService: prismaService, // PrismaService instance
});
```

### TypeORM

```typescript
HealthModule.forRoot({
  databaseService: {
    query: (sql: string) => dataSource.query(sql),
  },
});
```

### Mongoose

```typescript
HealthModule.forRoot({
  databaseService: {
    ping: async () => mongoose.connection.readyState === 1,
  },
});
```

### Custom Database

```typescript
HealthModule.forRoot({
  databaseService: {
    ping: async () => {
      try {
        await yourCustomDb.testConnection();
        return true;
      } catch {
        return false;
      }
    },
  },
});
```

## Kubernetes Configuration

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: your-app:latest
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

### Health Check Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: your-app-health
spec:
  selector:
    app: your-app
  ports:
    - port: 3000
      targetPort: 3000
```

## Container Integration

### Health Check Endpoints

- **`/health/live`** - Liveness probe (basic app health)
- **`/health/ready`** - Readiness probe (app ready to serve traffic)
- **`/health`** - Comprehensive health check with detailed status
- **`/health/info`** - Application runtime information

## Performance Considerations

### Optimized for Production

- **Parallel Execution**: All health checks run concurrently
- **Efficient Memory Monitoring**: Uses `process.memoryUsage()` directly
- **Smart Disk Checking**: Falls back gracefully if disk stats unavailable
- **Database Pooling**: Reuses existing database connections
- **No Blocking Operations**: All checks are async and non-blocking

### Resource Thresholds (Default)

- **Memory Heap**: 150MB threshold
- **Memory RSS**: 200MB threshold
- **Disk Usage**: 90% threshold
- **Response Time**: Sub-10ms for most checks

### Customizing Thresholds

```typescript
// Custom memory thresholds
const memoryHealth = new MemoryHealthService();
await memoryHealth.checkHeapMemory(200 * 1024 * 1024); // 200MB

// Custom disk threshold
const diskHealth = new DiskHealthService();
await diskHealth.checkDiskSpace('/', 0.8); // 80% threshold
```

## Monitoring Integration

### Prometheus Metrics

The health data can be easily exported to Prometheus:

```typescript
// Custom metrics service
@Injectable()
export class MetricsService {
  constructor(private healthService: HealthService) {}

  async getHealthMetrics() {
    const health = await this.healthService.check();
    return {
      health_status: health.status === 'ok' ? 1 : 0,
      uptime_seconds: health.uptime,
      // ... convert health data to metrics
    };
  }
}
```

### Logging Integration

```typescript
// Log health check results
@Injectable()
export class HealthLogger {
  constructor(
    private healthService: HealthService,
    private logger: Logger,
  ) {}

  async logHealth() {
    const health = await this.healthService.check();
    if (health.status === 'error') {
      this.logger.error('Health check failed', health.error);
    } else {
      this.logger.log('Health check passed', health.info);
    }
  }
}
```

## Error Handling

The module handles errors gracefully:

- **Network Issues**: Database unreachable → status: 'down'
- **Memory Pressure**: High memory usage → detailed metrics in response
- **Disk Full**: Disk space critical → status: 'down' with details
- **Service Unavailable**: External services down → isolated failure reporting
- **Timeout Issues**: Slow responses → does not block other checks

## Testing

### Unit Tests Example

```typescript
describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        DatabaseHealthService,
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should return healthy status', async () => {
    const result = await service.livenessCheck();
    expect(result.status).toBe('ok');
  });
});
```

### Integration Tests

```typescript
describe('Health Controller (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule.forRootSimple()],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBeDefined();
      });
  });
});
```

## Migration from @nestjs/terminus

If migrating from @nestjs/terminus:

### Before (terminus)

```typescript
@Get()
@HealthCheck()
check() {
  return this.health.check([
    () => this.prismaHealth.pingCheck('database', this.prisma),
    () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
  ]);
}
```

### After (this module)

```typescript
@Get()
async check() {
  return this.healthService.check();
}
```

The new module is simpler and requires less boilerplate while providing the same functionality.

## Troubleshooting

### Common Issues

1. **Database Health Check Fails**

   ```typescript
   // Ensure your service implements the interface
   class MyDbService implements DatabaseService {
     async ping() {
       return true;
     }
   }
   ```

2. **Memory Thresholds Too Low**

   ```typescript
   // Adjust thresholds in the service
   await memoryHealth.checkHeapMemory(500 * 1024 * 1024); // 500MB
   ```

3. **Disk Check Not Working**
   - On some systems, disk checks may not be available
   - The module gracefully falls back to healthy status

4. **Authentication Issues**
   - Ensure `@Public()` decorator is working in your auth setup
   - Health endpoints should bypass authentication

### Debug Mode

Enable detailed logging:

```typescript
// Add to your main.ts or module
if (process.env.NODE_ENV === 'development') {
  const healthService = app.get(HealthService);

  // Log health status every 30 seconds
  setInterval(async () => {
    const health = await healthService.check();
    console.log('Health Status:', JSON.stringify(health, null, 2));
  }, 30000);
}
```

## License

This health check module is designed to be framework and license agnostic. Copy and modify as needed for your projects.
