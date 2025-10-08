# Complete Modules Integration Guide

This guide shows how to integrate multiple modules (Health, Logging, Metrics, Interceptors) into a single NestJS project.

## Prerequisites

Install required dependencies:
```bash
# Core NestJS dependencies (usually already installed)
npm install @nestjs/common @nestjs/core rxjs

# Metrics dependencies  
npm install @willsoto/nestjs-prometheus prom-client

# Logging dependencies (built-in)
npm install winston winston-daily-rotate-file

# Configuration (recommended)
npm install @nestjs/config
```

## Complete Integration Example

Here's how to integrate all modules in your `app.module.ts`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Import all modules
import { HealthModule } from './common/health';
import { LoggingModule, LoggingInterceptor } from './common/logging';
import { MetricsModule, MetricsInterceptor } from './common/metrics';
import { InterceptorsModule } from './common/interceptors';

// Import other modules
import { YourFeatureModule } from './your-feature/your-feature.module';

@Module({
  imports: [
    // Configuration (always first)
    ConfigModule.forRoot({ isGlobal: true }),
    
    // Common modules - CRITICAL: Must use .forRootSimple()
    HealthModule.forRootSimple(),
    LoggingModule.forRootSimple(),
    MetricsModule.forRootSimple(),
    InterceptorsModule, // This module handles its own registration
    
    // Your feature modules
    YourFeatureModule,
  ],
  providers: [
    // Global interceptors - Order matters!
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Logging first
    },
    {
      provide: APP_INTERCEPTOR, 
      useClass: MetricsInterceptor, // Metrics second
    },
    // Note: InterceptorsModule handles its own interceptor registration
  ],
})
export class AppModule {}
```

## Module-by-Module Integration

### 1. Health Module

```typescript
// Simple setup - no additional configuration needed
imports: [
  HealthModule.forRootSimple(), // Provides /health, /health/ready, /health/live endpoints
]
```

**Endpoints available:**
- `GET /health` - Comprehensive health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe  
- `GET /health/info` - Application info

### 2. Logging Module

```typescript
// Module import
imports: [
  LoggingModule.forRootSimple(), // Provides WinstonLoggerService
]

// Interceptor registration (for HTTP request logging)
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor,
  },
]
```

**Features enabled:**
- Structured logging with Winston
- Automatic log sanitization
- HTTP request/response logging
- Performance monitoring

### 3. Metrics Module

```typescript
// Module import  
imports: [
  MetricsModule.forRootSimple(), // Provides MetricsService + Prometheus
]

// Interceptor registration (for HTTP metrics)
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: MetricsInterceptor,
  },
]
```

**Endpoints available:**
- `GET /metrics` - Prometheus metrics
- `GET /metrics/summary` - Metrics summary

### 4. Interceptors Module

```typescript
// Module import (handles its own interceptor registration)
imports: [
  InterceptorsModule, // Provides response formatting, timeouts, etc.
]
```

**Features enabled:**
- Standardized API responses
- Request timeouts
- Data transformation
- Error handling

## Environment Configuration

Create a `.env` file with these optional configurations:

```env
# Health Module
HEALTH_DATABASE_ENABLED=true
HEALTH_MEMORY_ENABLED=true
HEALTH_DISK_ENABLED=true

# Logging Module  
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_DIRECTORY=logs

# Metrics Module
METRICS_ENABLED=true
METRICS_HTTP_ENABLED=true
METRICS_DATABASE_ENABLED=false
METRICS_PREFIX=myapp

# Interceptors Module
ENABLE_RESPONSE_INTERCEPTOR=true
ENABLE_LOGGING_INTERCEPTOR=true
ENABLE_TIMEOUT_INTERCEPTOR=true
DEFAULT_TIMEOUT_MS=30000
```

## Verification Steps

After integration, verify everything works:

### 1. Build the application
```bash
npm run build
```

### 2. Start the application  
```bash
npm run start:dev
```

### 3. Test key endpoints
```bash
# Health check
curl http://localhost:3000/health

# Metrics
curl http://localhost:3000/metrics

# Your API endpoint (should have standardized response format)
curl http://localhost:3000/your-endpoint
```

## Common Integration Issues

### ❌ Module Import Errors

**Issue**: `Nest can't resolve dependencies`  
**Cause**: Importing module without `.forRootSimple()`  
**Solution**: Always use the factory method:

```typescript
// Wrong ❌
imports: [HealthModule, LoggingModule, MetricsModule]

// Correct ✅  
imports: [
  HealthModule.forRootSimple(),
  LoggingModule.forRootSimple(), 
  MetricsModule.forRootSimple(),
]
```

### ❌ Missing Features

**Issue**: HTTP logging/metrics not working  
**Cause**: Forgot to register interceptors  
**Solution**: Add interceptors to providers:

```typescript
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor, // For HTTP logging
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: MetricsInterceptor, // For HTTP metrics
  },
]
```

### ❌ Dependency Issues

**Issue**: `Cannot find module '@willsoto/nestjs-prometheus'`  
**Cause**: Missing metrics dependencies  
**Solution**: Install required packages:

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

## Module Combinations

You can use any combination of modules:

### Minimal Setup (Health + Logging)
```typescript
imports: [
  HealthModule.forRootSimple(),
  LoggingModule.forRootSimple(),
]
```

### Monitoring Setup (Health + Metrics)  
```typescript
imports: [
  HealthModule.forRootSimple(),
  MetricsModule.forRootSimple(), 
]
providers: [
  { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
]
```

### Complete Setup (All Modules)
```typescript
imports: [
  HealthModule.forRootSimple(),
  LoggingModule.forRootSimple(),
  MetricsModule.forRootSimple(),
  InterceptorsModule,
]
providers: [
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
]
```

## Next Steps

1. **Copy the modules** to your project's `src/common/` directory
2. **Install dependencies** using the commands above
3. **Follow the complete integration example** in your `app.module.ts`
4. **Add environment variables** to your `.env` file
5. **Test the integration** using the verification steps
6. **Customize configuration** as needed for your specific use case

## Support

If you encounter issues:

1. Check the individual module's `INTEGRATION.md` files
2. Verify all dependencies are installed
3. Ensure you're using `.forRootSimple()` for module imports
4. Check that interceptors are registered in providers
5. Review the troubleshooting sections in each module's documentation

This integration pattern has been tested and works reliably across multiple NestJS projects. Follow the examples exactly for the best results.