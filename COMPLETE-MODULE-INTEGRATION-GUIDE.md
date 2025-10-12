# Complete Module Integration Guide

This guide shows how to integrate each individual module into a new NestJS project. Each module is completely self-contained and can be used independently.

## 📦 Available Modules

1. **Health Module** - Health checks and monitoring
2. **Logging Module** - Enhanced logging with sanitization
3. **Metrics Module** - Prometheus metrics collection  
4. **Interceptors Module** - API response standardization

## 🚀 Integration Steps for Each Module

### 1. Health Module

#### Copy Files
```bash
cp -r src/common/health/ /your-new-project/src/common/
```

#### Add to app.module.ts
```typescript
import { HealthModule } from './common/health';

@Module({
  imports: [
    // Simple setup
    HealthModule.forRootSimple(),
    
    // OR Custom setup
    HealthModule.forRoot({
      database: { enabled: true, timeout: 5000 },
      memory: { enabled: true, heapThreshold: 512 },
      disk: { enabled: true, threshold: 0.8 }
    })
  ]
})
export class AppModule {}
```

#### Endpoints Available
- `GET /health` - Overall health status
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

---

### 2. Logging Module

#### Copy Files
```bash
cp -r src/common/logging/ /your-new-project/src/common/
```

#### Add to app.module.ts
```typescript
import { LoggingModule } from './common/logging';

@Module({
  imports: [
    // Simple setup
    LoggingModule.forRootSimple(),
    
    // OR Custom setup
    LoggingModule.forRoot({
      sanitization: { enabled: true },
      fileLogging: { enabled: true, directory: './logs' },
      correlation: { enabled: true }
    })
  ]
})
export class AppModule {}
```

#### Features
- Automatic request correlation IDs
- Sensitive data sanitization
- File rotation and management
- Structured JSON logging

---

### 3. Metrics Module

#### Copy Files
```bash
cp -r src/common/metrics/ /your-new-project/src/common/
```

#### Install Dependencies
```bash
npm install @willsoto/nestjs-prometheus prom-client
```

#### Add to app.module.ts
```typescript
import { MetricsModule } from './common/metrics';

@Module({
  imports: [
    // Simple setup
    MetricsModule.forRootSimple(),
    
    // OR Custom setup
    MetricsModule.forRoot({
      http: { enabled: true, normalize: true },
      business: { enabled: true },
      database: { enabled: true }
    })
  ]
})
export class AppModule {}
```

#### Endpoints Available
- `GET /metrics` - Prometheus metrics endpoint
- `GET /metrics/summary` - Human-readable metrics (dev only)

---

### 4. Interceptors Module

#### Copy Files
```bash
cp -r src/common/interceptors/ /your-new-project/src/common/
```

#### Add to app.module.ts
```typescript
import { InterceptorsModule } from './common/interceptors';

@Module({
  imports: [
    // Simple setup - standardizes all API responses
    InterceptorsModule.forRootSimple(),
    
    // OR Custom setup
    InterceptorsModule.forRoot({
      response: {
        enabled: true,
        excludeRoutes: ['/health', '/metrics']
      }
    })
  ]
})
export class AppModule {}
```

#### Response Format
All your APIs will automatically return:
```json
{
  "success": true,
  "code": 200,
  "data": {...},
  "messages": []
}
```

---

## 🏗️ Complete Integration Example

Here's how to integrate ALL modules in a new project:

### 1. Copy All Modules
```bash
# Copy all modules at once
cp -r src/common/health/ /your-new-project/src/common/
cp -r src/common/logging/ /your-new-project/src/common/
cp -r src/common/metrics/ /your-new-project/src/common/
cp -r src/common/interceptors/ /your-new-project/src/common/
```

### 2. Install Dependencies (only for metrics)
```bash
npm install @willsoto/nestjs-prometheus prom-client
```

### 3. Complete app.module.ts
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Import all modules
import { HealthModule } from './common/health';
import { LoggingModule } from './common/logging';
import { MetricsModule } from './common/metrics';
import { InterceptorsModule } from './common/interceptors';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Health monitoring
    HealthModule.forRootSimple(),

    // Enhanced logging
    LoggingModule.forRootSimple(),

    // Metrics collection
    MetricsModule.forRootSimple(),

    // API response standardization
    InterceptorsModule.forRootSimple(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 4. Test Your Setup
```bash
npm run build
npm start

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

## ✅ Verification Checklist

For each module, verify:

- [ ] **Builds successfully** - `npm run build` passes
- [ ] **No external dependencies** - Module files don't import from outside
- [ ] **Documentation included** - README.md and integration docs present
- [ ] **Simple configuration** - `.forRootSimple()` method works
- [ ] **Type safety** - All interfaces and types included

## 🔧 Module-Specific Configuration

Each module supports both simple and advanced configuration:

### Simple Configuration (Recommended for new projects)
```typescript
HealthModule.forRootSimple()
LoggingModule.forRootSimple()
MetricsModule.forRootSimple()
InterceptorsModule.forRootSimple()
```

### Advanced Configuration (For specific requirements)
```typescript
HealthModule.forRoot({ /* custom config */ })
LoggingModule.forRoot({ /* custom config */ })
MetricsModule.forRoot({ /* custom config */ })
InterceptorsModule.forRoot({ /* custom config */ })
```

## 📖 Additional Documentation

Each module includes detailed documentation:
- `health/README.md` - Health check configuration and examples
- `logging/README.md` - Logging patterns and sanitization
- `metrics/README.md` - Metrics collection and Prometheus setup
- `interceptors/README.md` - Response standardization guide

**Each module is completely independent and can be used separately or together!**