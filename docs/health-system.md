# Health Check System Documentation

## Overview

The TaskManager-Server includes a comprehensive, reusable health check module located in `src/common/health/`. This module provides production-ready health monitoring with zero external dependencies.

## Key Features

- ✅ **Zero Dependencies**: No @nestjs/terminus required
- ✅ **Database Agnostic**: Works with Prisma, TypeORM, Mongoose, or any database service
- ✅ **Kubernetes Ready**: Built-in liveness and readiness probes
- ✅ **Performance Optimized**: Parallel execution, efficient resource monitoring
- ✅ **Reusable Module**: Copy-paste ready for other NestJS projects

## Health Endpoints

### Available Endpoints

| Endpoint                   | Purpose                    | Use Case                            |
| -------------------------- | -------------------------- | ----------------------------------- |
| `GET /api/v1/health`       | Comprehensive health check | Monitoring systems, detailed status |
| `GET /api/v1/health/ready` | Readiness probe            | Kubernetes, load balancers          |
| `GET /api/v1/health/live`  | Liveness probe             | Kubernetes, basic uptime            |
| `GET /api/v1/health/info`  | Application info           | Runtime statistics                  |

### Health Check Components

1. **Memory Monitoring**
   - Heap memory usage (150MB threshold)
   - RSS memory usage (200MB threshold)
   - Detailed memory statistics

2. **Disk Space Monitoring**
   - Disk usage monitoring (90% threshold)
   - Cross-platform compatibility
   - Graceful degradation if unavailable

3. **Database Health** (Optional)
   - Connection ping tests
   - Database-agnostic implementation
   - Configurable via dependency injection

4. **Application Health**
   - Process uptime tracking
   - Basic liveness verification
   - Runtime information

## Implementation Details

### Current Integration

The health module is integrated in `src/app.module.ts`:

```typescript
import { HealthModule } from './common/health';

@Module({
  imports: [
    HealthModule.forRootSimple(), // Simple setup without database checks
    // ... other modules
  ],
})
export class AppModule {}
```

### Module Structure

```
src/common/health/
├── controllers/
│   └── health.controller.ts          # REST endpoints
├── decorators/
│   └── public.decorator.ts           # Authentication bypass
├── indicators/
│   ├── database-health.service.ts    # Database connectivity
│   ├── disk-health.service.ts        # Disk space monitoring
│   └── memory-health.service.ts      # Memory usage monitoring
├── interfaces/
│   └── health-check.interface.ts     # Type definitions
├── services/
│   └── health.service.ts             # Core health logic
├── health.module.ts                  # Module configuration
├── index.ts                          # Exports
├── README.md                         # Complete documentation
├── INTEGRATION.md                    # Quick start guide
└── examples/
    └── usage-examples.md             # Integration examples
```

## Testing

### Manual Testing

```bash
# Test liveness (should always return 200)
curl http://localhost:3000/api/v1/health/live

# Test readiness (checks database if configured)
curl http://localhost:3000/api/v1/health/ready

# Test comprehensive health
curl http://localhost:3000/api/v1/health

# Test application info
curl http://localhost:3000/api/v1/health/info
```

### Example Response

```json
{
  "status": "ok",
  "timestamp": "2025-10-08T10:00:00.000Z",
  "uptime": 3600,
  "info": {
    "memory": {
      "status": "up",
      "heapUsed": "45MB",
      "rss": "120MB"
    },
    "disk": {
      "status": "up",
      "usedPercent": "65%"
    }
  }
}
```

## Container Integration

The health endpoints are designed for container orchestration platforms:

## Kubernetes Integration

Ready for Kubernetes liveness and readiness probes:

```yaml
# deployment.yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
```

## Benefits Over Previous Implementation

### Old Implementation (Terminus-based)

- ❌ Required @nestjs/terminus dependency
- ❌ More complex configuration
- ❌ Less flexibility for custom checks
- ❌ Harder to reuse across projects

### New Implementation (Custom Module)

- ✅ Zero external dependencies
- ✅ Simple, flexible configuration
- ✅ Easy to add custom health checks
- ✅ Copy-paste ready for other projects
- ✅ Better performance (parallel execution)
- ✅ More comprehensive documentation

## Adding Custom Health Checks

You can easily extend the health system:

```typescript
// In any service
constructor(private healthService: HealthService) {}

onModuleInit() {
  this.healthService.addHealthCheck({
    name: 'redis',
    check: async () => {
      try {
        await this.redisClient.ping();
        return { status: 'up' };
      } catch (error) {
        return { status: 'down', error: error.message };
      }
    }
  });
}
```

## Documentation References

For complete documentation and integration guides, see:

- **`src/common/health/README.md`** - Complete API and configuration documentation
- **`src/common/health/INTEGRATION.md`** - Quick start guide for other projects
- **`src/common/health/examples/usage-examples.md`** - Code examples and patterns

## Migration Notes

If upgrading from the previous Terminus-based implementation:

1. **Remove Dependencies**: Uninstall @nestjs/terminus if not used elsewhere
2. **Update Imports**: Change health module imports to use the new module
3. **Update Tests**: Health endpoint responses may have different structure
4. **Configuration**: Much simpler configuration options available

The new health module provides all the same functionality with better performance and easier maintenance.
