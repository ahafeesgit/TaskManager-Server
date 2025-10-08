# Interceptors Module Integration Guide

This guide provides step-by-step instructions for integrating the Interceptors module into a new NestJS project.

## Prerequisites

- NestJS project (v10+)
- TypeScript configured
- Basic understanding of NestJS interceptors

## Step-by-Step Integration

### Step 1: Copy Module Files

Copy the entire `interceptors` folder to your project:

```
src/common/interceptors/
├── constants/
│   └── interceptor.constants.ts
├── interfaces/
│   └── interceptor.interface.ts
├── interceptors/
│   ├── error.interceptor.ts
│   ├── logging.interceptor.ts
│   ├── response.interceptor.ts
│   ├── timeout.interceptor.ts
│   └── transform.interceptor.ts
├── interceptors.module.ts
├── index.ts
├── INTEGRATION.md
└── README.md
```

### Step 2: Install Dependencies

The module requires these NestJS core packages (usually already installed):

```bash
npm install @nestjs/common rxjs
```

If you want configuration support:

```bash
npm install @nestjs/config
```

### Step 3: Environment Configuration

Add these variables to your `.env` file:

```env
# Interceptors Configuration
ENABLE_RESPONSE_INTERCEPTOR=true
ENABLE_LOGGING_INTERCEPTOR=true
ENABLE_TIMEOUT_INTERCEPTOR=true
ENABLE_TRANSFORM_INTERCEPTOR=true
ENABLE_ERROR_INTERCEPTOR=true

# Response Interceptor
RESPONSE_SUCCESS_MESSAGE=Request successful
INCLUDE_TIMESTAMP=true
INCLUDE_REQUEST_ID=true

# Logging Interceptor
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_LEVEL=info
SANITIZE_LOGS=true
LOG_RESPONSE_BODY=false

# Timeout Interceptor
DEFAULT_TIMEOUT_MS=30000
API_TIMEOUT_MS=10000
AUTH_TIMEOUT_MS=5000

# Transform Interceptor
REMOVE_SENSITIVE_FIELDS=true
AUTO_TYPE_CONVERSION=true
MAX_TRANSFORM_DEPTH=10

# Error Interceptor
MAX_REQUEST_SIZE=10485760
SHOW_STACK_TRACES=false
ERROR_LOG_LEVEL=error
```

### Step 4: Import the Module

#### Option 1: Global Import (Recommended)

Add to your main `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InterceptorsModule } from './common/interceptors';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    InterceptorsModule,
    // ... your other modules
  ],
})
export class AppModule {}
```

#### Option 2: Feature Module Import

Import in specific feature modules:

```typescript
import { Module } from '@nestjs/common';
import { InterceptorsModule } from '../common/interceptors';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [InterceptorsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### Step 5: Verify Integration

1. **Test Basic Response Format**

   ```bash
   curl http://localhost:3000/api/test
   ```

   Expected response:

   ```json
   {
     "success": true,
     "message": "Request successful",
     "data": {...},
     "meta": {
       "timestamp": "2023-10-07T10:30:00Z",
       "requestId": "req-12345"
     }
   }
   ```

2. **Check Logs**
   Look for structured log entries:

   ```
   [2023-10-07T10:30:00Z] INFO: Request GET /api/test completed in 45ms
   ```

3. **Test Error Handling**
   Trigger an error and verify standardized error response:
   ```json
   {
     "success": false,
     "message": "Internal server error",
     "error": {
       "code": "INTERNAL_ERROR",
       "message": "Something went wrong"
     }
   }
   ```

## Configuration Examples

### Development Environment

```env
# Enhanced logging for development
LOG_LEVEL=debug
LOG_RESPONSE_BODY=true
SHOW_STACK_TRACES=true

# Longer timeouts for debugging
DEFAULT_TIMEOUT_MS=60000
API_TIMEOUT_MS=30000
```

### Production Environment

```env
# Security-focused production settings
LOG_LEVEL=warn
LOG_RESPONSE_BODY=false
SHOW_STACK_TRACES=false
SANITIZE_LOGS=true
REMOVE_SENSITIVE_FIELDS=true

# Aggressive timeouts for performance
DEFAULT_TIMEOUT_MS=15000
API_TIMEOUT_MS=5000
```

### High-Traffic Environment

```env
# Minimal logging for performance
ENABLE_LOGGING_INTERCEPTOR=false
ENABLE_TRANSFORM_INTERCEPTOR=false

# Only essential interceptors
ENABLE_RESPONSE_INTERCEPTOR=true
ENABLE_ERROR_INTERCEPTOR=true
ENABLE_TIMEOUT_INTERCEPTOR=true
```

## Advanced Integration Scenarios

### Scenario 1: Existing Interceptors

If you already have interceptors, you can:

1. **Replace existing interceptors** by removing them and using this module
2. **Combine interceptors** by adjusting execution order
3. **Selective usage** by disabling conflicting interceptors

Example with existing auth interceptor:

```typescript
@Module({
  imports: [InterceptorsModule],
  providers: [
    // Disable logging interceptor to avoid conflicts
    {
      provide: 'ENABLE_LOGGING_INTERCEPTOR',
      useValue: false,
    },
    // Keep your existing auth interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
  ],
})
export class AppModule {}
```

### Scenario 2: Microservices

For microservices architecture:

```typescript
// Each microservice can have its own configuration
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.SERVICE_NAME}`,
    }),
    InterceptorsModule,
  ],
})
export class MicroserviceModule {}
```

### Scenario 3: API Gateway Integration

When using with API Gateway:

```env
# Shorter timeouts since gateway handles overall timeout
DEFAULT_TIMEOUT_MS=5000
API_TIMEOUT_MS=3000

# Less verbose logging since gateway logs requests
LOG_REQUESTS=false
LOG_RESPONSES=true
```

## Testing Integration

### Unit Testing

Mock the interceptors for unit tests:

```typescript
import { Test } from '@nestjs/testing';
import { InterceptorsModule } from './common/interceptors';

describe('AppController', () => {
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [InterceptorsModule],
      controllers: [AppController],
    })
      .overrideProvider('CONFIG_SERVICE')
      .useValue({
        get: jest.fn().mockImplementation((key) => {
          // Mock config values for testing
          const config = {
            ENABLE_RESPONSE_INTERCEPTOR: 'true',
            ENABLE_LOGGING_INTERCEPTOR: 'false', // Disable in tests
          };
          return config[key];
        }),
      })
      .compile();
  });
});
```

### Integration Testing

Test the complete flow:

```typescript
describe('Interceptors Integration', () => {
  it('should format response correctly', async () => {
    const response = await request(app.getHttpServer())
      .get('/test')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
  });

  it('should handle timeouts', async () => {
    // Mock a slow endpoint
    const response = await request(app.getHttpServer())
      .get('/slow-endpoint')
      .expect(408); // Timeout

    expect(response.body.message).toContain('timeout');
  });
});
```

## Troubleshooting Integration Issues

### Issue 1: Module Not Loading

**Symptom**: Interceptors not working
**Solution**: Check module import order

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(), // Must be first
    InterceptorsModule, // Then interceptors
    // Other modules...
  ],
})
export class AppModule {}
```

### Issue 2: Environment Variables Not Loading

**Symptom**: Default values being used
**Solution**: Verify ConfigModule setup

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
});
```

### Issue 3: Interceptor Conflicts

**Symptom**: Unexpected behavior or errors
**Solution**: Check interceptor execution order

- Disable conflicting interceptors via environment variables
- Adjust execution order by modifying `interceptors.module.ts`

### Issue 4: Performance Issues

**Symptom**: Slow response times
**Solution**: Optimize configuration

```env
# Disable non-essential interceptors
ENABLE_LOGGING_INTERCEPTOR=false
ENABLE_TRANSFORM_INTERCEPTOR=false

# Reduce timeout values
DEFAULT_TIMEOUT_MS=10000
```

## Migration from Existing Interceptors

### Step 1: Inventory Current Interceptors

List your current interceptors:

```bash
find src -name "*.interceptor.ts" -type f
```

### Step 2: Map Functionality

Compare existing functionality with this module:

- **Response formatting** → Use ResponseInterceptor
- **Error handling** → Use ErrorInterceptor
- **Logging** → Use LoggingInterceptor
- **Timeouts** → Use TimeoutInterceptor
- **Data transformation** → Use TransformInterceptor

### Step 3: Gradual Migration

1. Install the module alongside existing interceptors
2. Disable overlapping functionality: `ENABLE_RESPONSE_INTERCEPTOR=false`
3. Test one interceptor at a time
4. Remove old interceptors once verified
5. Enable all module interceptors

### Step 4: Configuration Migration

Map your existing configuration to environment variables:

```typescript
// Old configuration
const config = {
  timeout: 30000,
  enableLogging: true,
};

// New environment variables
TIMEOUT_MS = 30000;
ENABLE_LOGGING_INTERCEPTOR = true;
```

## Best Practices

1. **Start Simple**: Enable one interceptor at a time during integration
2. **Environment-Specific**: Use different configurations per environment
3. **Monitor Performance**: Watch response times after integration
4. **Security First**: Always enable sanitization in production
5. **Log Management**: Configure appropriate log levels for each environment
6. **Testing**: Include interceptor behavior in your test suite

## Support

If you encounter issues during integration:

1. **Check Configuration**: Verify all environment variables are set
2. **Review Logs**: Look for startup errors or warnings
3. **Test Incrementally**: Enable interceptors one by one
4. **Consult README**: Reference the main README.md for detailed documentation

This integration guide should help you successfully add the Interceptors module to any NestJS project!
