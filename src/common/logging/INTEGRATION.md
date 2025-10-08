# Quick Start: Enhanced Logging Module Integration

## Copy to Your Project

```bash
# Copy the entire logging folder
cp -r src/common/logging /path/to/your-project/src/common/
```

## Integration Options

### Option 1: Simple Setup (Recommended for most projects)

```typescript
// app.module.ts
import { LoggingModule } from './common/logging';

@Module({
  imports: [
    LoggingModule.forRootSimple(),
    // ... your other modules
  ],
})
export class AppModule {}
```

### Option 2: Custom Configuration

```typescript
// app.module.ts
import { LoggingModule } from './common/logging';

@Module({
  imports: [
    LoggingModule.forRoot({
      level: 'info',
      enableFileLogging: true,
      enableConsoleLogging: true,
      logDirectory: 'logs',
      enableQueryLogging: false, // Important: disable in production
      sensitiveFields: ['password', 'token', 'secret', 'apiKey'],
    }),
  ],
})
export class AppModule {}
```

### Option 3: Environment-based Configuration

```typescript
// app.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule } from './common/logging';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        level: configService.get('LOG_LEVEL', 'info'),
        enableFileLogging: configService.get('LOG_FILE_ENABLED') === 'true',
        enableQueryLogging: configService.get('NODE_ENV') === 'development',
        logDirectory: configService.get('LOG_DIRECTORY', 'logs'),
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
  ],
})
export class AppModule {}
```

## Environment Variables

```bash
# .env file
LOG_LEVEL=info                    # error, warn, info, debug
LOG_FILE_ENABLED=true            # Enable file logging
LOG_DATABASE_QUERIES=false       # Log database queries (dev only)
LOG_DIRECTORY=logs               # Log file directory
```

## Usage in Services

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { WinstonLoggerService } from './common/logging';

@Injectable()
export class UserService {
  constructor(private logger: WinstonLoggerService) {
    this.logger.setContext(UserService.name);
  }

  async createUser(userData: any) {
    this.logger.log('Creating new user');

    try {
      const user = await this.userRepository.save(userData);
      this.logger.logEvent('user_created', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.logError(error, 'Failed to create user');
      throw error;
    }
  }
}
```

### Advanced Usage

```typescript
// Event logging with automatic data sanitization
this.logger.logEvent('payment_processed', {
  userId: user.id,
  amount: payment.amount,
  creditCard: '4111-1111-1111-1111', // Automatically sanitized
  apiKey: 'sk-test-123', // Automatically sanitized
});

// Performance monitoring
const startTime = Date.now();
await this.expensiveOperation();
this.logger.logPerformance('expensive_operation', Date.now() - startTime);

// Security events
this.logger.logSecurity(
  'failed_login',
  {
    ip: request.ip,
    attempts: failedAttempts,
  },
  'warn',
);

// User actions
this.logger.logUserAction(user.id, 'profile_updated', updatedData);
```

## Complete Integration Example

Here's the complete setup showing both module import AND interceptor registration:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingModule, LoggingInterceptor } from './common/logging';

@Module({
  imports: [
    LoggingModule.forRootSimple(), // 🎯 CRITICAL: Must use .forRootSimple()
    // ... your other modules
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // 🎯 CRITICAL: Manual registration required
    },
    // ... your other providers
  ],
})
export class AppModule {}
```

## ⚠️ Important Integration Notes

1. **Always use `.forRootSimple()`** - Don't import `LoggingModule` directly
2. **Manual interceptor registration required** - The module exports the interceptor but doesn't register it globally
3. **Order matters** - Import the module first, then register the interceptor

## 🚨 Common Integration Issues & Solutions

### Issue: "Nest can't resolve dependencies of LoggingInterceptor"
**Cause**: `LoggingModule` imported without `.forRootSimple()`  
**Solution**:
```typescript
// ❌ Wrong
imports: [LoggingModule]

// ✅ Correct  
imports: [LoggingModule.forRootSimple()]
```

### Issue: "Nest can't resolve dependencies of LogSanitizerService" 
**Cause**: Missing `LOGGING_CONFIG` provider in simple setup  
**Solution**: Use `.forRootSimple()` which handles this automatically

### Issue: HTTP requests not being logged
**Cause**: Missing interceptor registration  
**Solution**: Add `LoggingInterceptor` as `APP_INTERCEPTOR` provider

### Issue: Application won't start after adding logging
**Cause**: Incorrect module registration  
**Solution**: Follow the complete integration example above

## Log Output Examples

### Request Logs (Automatic)

```json
{
  "level": "info",
  "message": "HTTP Request",
  "type": "http_request",
  "method": "POST",
  "url": "/api/users",
  "statusCode": 201,
  "responseTime": "145ms",
  "correlationId": "1633024800000-abc123"
}
```

### Event Logs

```json
{
  "level": "info",
  "message": "Application Event",
  "type": "application_event",
  "event": "user_created",
  "data": { "userId": "user-123" }
}
```

### Error Logs

```json
{
  "level": "error",
  "message": "Database connection failed",
  "type": "error",
  "name": "ConnectionError",
  "context": "UserService"
}
```

## Security Features (Automatic)

✅ **Sensitive Data Sanitization**: Passwords, tokens, API keys automatically redacted
✅ **Email Masking**: `user@example.com` → `us**@example.com`
✅ **Query Sanitization**: SQL queries with sensitive data are cleaned
✅ **Header Sanitization**: Authorization headers automatically redacted
✅ **Long String Truncation**: Very long strings are truncated to prevent log bloat

## File Structure

After integration, your logs will be organized as:

```
logs/
├── combined-2025-10-08.log      # All logs
├── error-2025-10-08.log         # Error logs only
├── exceptions-2025-10-08.log    # Unhandled exceptions
└── rejections-2025-10-08.log    # Promise rejections
```

## Production Checklist

- ✅ Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` in production
- ✅ Set `LOG_DATABASE_QUERIES=false` in production
- ✅ Ensure log directory has proper write permissions
- ✅ Configure log rotation and retention policies
- ✅ Set up log monitoring and alerting
- ✅ Regular log cleanup to prevent disk space issues

## Quick Test

After integration, test your logging:

```bash
# Start your application
npm run start:dev

# Make a request to generate logs
curl http://localhost:3000/api/health

# Check console output and log files
cat logs/combined-$(date +%Y-%m-%d).log | tail -10
```

## Troubleshooting

### Issue: No log files created

**Solution**: Check directory permissions and `LOG_FILE_ENABLED=true`

### Issue: Sensitive data in logs

**Solution**: The module auto-sanitizes, but you can add custom sensitive fields:

```typescript
LoggingModule.forRoot({
  sensitiveFields: ['customSecretField', 'internalId'],
});
```

### Issue: Too many logs

**Solution**: Increase log level in production:

```bash
LOG_LEVEL=warn  # Only warnings and errors
```

That's it! Your enhanced logging module is ready for production use. 🚀
