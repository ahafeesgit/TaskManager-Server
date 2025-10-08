# Enhanced Logging Module

A comprehensive, production-ready logging module for NestJS applications with advanced features like request correlation, data sanitization, and structured logging.

## Features

- 🚀 **Zero Dependencies Conflicts**: Built on top of Winston with additional enhancements
- 🔒 **Data Security**: Automatic sanitization of sensitive information (passwords, tokens, etc.)
- 📊 **Structured Logging**: Consistent log formats with metadata and correlation IDs
- 🎯 **Request Correlation**: Track requests across services with correlation IDs
- 📁 **File Rotation**: Daily log rotation with configurable retention policies
- 🔧 **Configurable**: Flexible configuration for different environments
- ⚡ **Performance Optimized**: Efficient logging with minimal overhead
- 📚 **Type Safe**: Full TypeScript support with comprehensive interfaces

## Quick Start

### 1. Copy the Logging Module

Copy the entire `logging/` folder to your project:

```
src/common/logging/
├── interfaces/
│   └── logging.interface.ts
├── services/
│   ├── log-formatter.service.ts
│   └── log-sanitizer.service.ts
├── logging.interceptor.ts
├── winston-logger.service.ts
├── logging.module.ts
└── index.ts
```

### 2. Complete Integration Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingModule, LoggingInterceptor } from './common/logging';

@Module({
  imports: [
    LoggingModule.forRootSimple(), // 🎯 CRITICAL: Must use .forRootSimple()
    // ... other modules
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // 🎯 CRITICAL: Manual registration required
    },
    // ... other providers
  ],
})
export class AppModule {}
```

> **⚠️ Important**: Both module import AND interceptor registration are required for full functionality.

### 3. Basic Setup (Module Only)

```typescript
// app.module.ts
import { LoggingModule } from './common/logging';

@Module({
  imports: [
    LoggingModule.forRootSimple(), // Service only, no HTTP request logging
    // ... other modules
  ],
})
export class AppModule {}
```

### 4. Advanced Setup with Configuration

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
      maxFileSize: '20m',
      maxFiles: '30d',
      enableQueryLogging: false, // Disable in production
      enableRequestLogging: true,
      sensitiveFields: ['password', 'token', 'secret', 'apiKey'],
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 4. Environment-based Configuration

```typescript
// app.module.ts
LoggingModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    level: configService.get('LOG_LEVEL', 'info'),
    enableFileLogging: configService.get('LOG_FILE_ENABLED') === 'true',
    enableQueryLogging: configService.get('LOG_DATABASE_QUERIES') === 'true',
    logDirectory: configService.get('LOG_DIRECTORY', 'logs'),
  }),
  inject: [ConfigService],
  imports: [ConfigModule],
});
```

## Usage Examples

### Basic Logging

```typescript
import { WinstonLoggerService } from './common/logging';

@Injectable()
export class UserService {
  constructor(private logger: WinstonLoggerService) {
    this.logger.setContext(UserService.name);
  }

  async createUser(userData: CreateUserDto) {
    this.logger.log('Creating new user', { userId: userData.email });

    try {
      const user = await this.userRepository.save(userData);
      this.logger.log('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.logError(error, 'UserService.createUser');
      throw error;
    }
  }
}
```

### Enhanced Logging Methods

```typescript
// Event logging
this.logger.logEvent('user_registered', {
  userId: user.id,
  plan: user.plan,
});

// Performance monitoring
const startTime = Date.now();
await this.expensiveOperation();
this.logger.logPerformance('expensive_operation', Date.now() - startTime);

// Security events
this.logger.logSecurity(
  'failed_login_attempt',
  {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  },
  'warn',
);

// User actions (automatically sanitized)
this.logger.logUserAction(user.id, 'profile_updated', {
  changes: updatedFields,
  password: 'secret123', // This will be automatically redacted
});

// Memory monitoring
this.logger.logMemoryUsage('after_bulk_operation');
```

### Correlation ID Support

```typescript
// Automatic correlation ID in interceptor
// Or manual correlation ID usage
const correlationId = this.formatter.generateCorrelationId();
const correlatedLogger = this.logger.withCorrelationId(correlationId);

correlatedLogger.log('Starting payment process');
correlatedLogger.log('Payment validated');
correlatedLogger.log('Payment completed');
```

### Child Loggers

```typescript
// Create child logger with specific context
const childLogger = this.logger.createChildLogger('PaymentProcessor');
childLogger.log('Processing payment'); // Will include PaymentProcessor context
```

## Configuration Options

### LoggingConfig Interface

```typescript
interface LoggingConfig {
  level?: string; // 'error' | 'warn' | 'info' | 'debug'
  enableFileLogging?: boolean; // Enable file output
  enableConsoleLogging?: boolean; // Enable console output
  logDirectory?: string; // Directory for log files
  maxFileSize?: string; // Max file size before rotation
  maxFiles?: string; // Retention period
  enableQueryLogging?: boolean; // Log database queries
  enableRequestLogging?: boolean; // Log HTTP requests
  sensitiveFields?: string[]; // Additional sensitive field names
}
```

### Environment Variables

```bash
# Basic configuration
LOG_LEVEL=info                    # error, warn, info, debug
LOG_FILE_ENABLED=true            # Enable file logging
LOG_DATABASE_QUERIES=false       # Log database queries (dev only)
LOG_DIRECTORY=logs               # Log file directory

# Advanced configuration
NODE_ENV=production              # Affects default behavior
```

## Security Features

### Automatic Data Sanitization

The logging module automatically sanitizes sensitive information:

```typescript
// Input
logger.log('User login', {
  email: 'user@example.com',
  password: 'secret123',
  token: 'jwt-token-here',
  apiKey: 'sk-1234567890'
});

// Logged (sanitized)
{
  "email": "us**@example.com",
  "password": "[REDACTED]",
  "token": "[REDACTED]",
  "apiKey": "[REDACTED]"
}
```

### Sensitive Patterns Detected

- Passwords, tokens, secrets, API keys
- Email addresses (partially masked)
- Phone numbers, credit cards, SSNs
- Long strings (>50 chars) that might contain sensitive data
- UUIDs that might be sensitive identifiers

### SQL Query Sanitization

```typescript
// Raw query with sensitive data
const query = `SELECT * FROM users WHERE email = 'user@example.com' AND password = 'secret123'`;

// Sanitized for logging
// SELECT * FROM users WHERE email = '[EMAIL_REDACTED]' AND password = '[PASSWORD_REDACTED]'
```

## Log Formats and Structure

### Request Logs

```json
{
  "level": "info",
  "message": "HTTP Request",
  "type": "http_request",
  "method": "POST",
  "url": "/api/v1/users",
  "statusCode": 201,
  "responseTime": "145ms",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "userId": "user-123",
  "correlationId": "1633024800000-abc123def",
  "timestamp": "2025-10-08T10:00:00.000Z"
}
```

### Error Logs

```json
{
  "level": "error",
  "message": "Database connection failed",
  "type": "error",
  "name": "ConnectionError",
  "stack": "Error: Database connection failed\n    at ...",
  "context": "UserService",
  "userId": "user-123",
  "timestamp": "2025-10-08T10:00:00.000Z"
}
```

### Database Logs

```json
{
  "level": "debug",
  "message": "Database Query",
  "type": "database_query",
  "operation": "SELECT",
  "duration": "23ms",
  "query": "SELECT id, email FROM users WHERE id = '[UUID_REDACTED]'",
  "timestamp": "2025-10-08T10:00:00.000Z"
}
```

## Production Considerations

### Performance Optimization

- **Lazy Loading**: Services are only instantiated when needed
- **Efficient Sanitization**: Regex patterns are pre-compiled
- **Memory Management**: Large objects are truncated automatically
- **File Rotation**: Prevents disk space issues with automatic cleanup

### Security Best Practices

- **No Sensitive Data**: Automatic sanitization prevents data leaks
- **Query Logging**: Disabled by default in production
- **Log Retention**: Configurable retention policies
- **Access Control**: Log files should have restricted permissions

### Monitoring Integration

```typescript
// Export logs to monitoring systems
const logData = {
  level: 'error',
  service: 'user-service',
  error: sanitizedError,
  correlationId: request.correlationId,
};

// Send to monitoring service
await this.monitoringService.sendLog(logData);
```

## File Structure and Rotation

### Log Files Created

```
logs/
├── combined-2025-10-08.log      # All logs
├── error-2025-10-08.log         # Error logs only
├── exceptions-2025-10-08.log    # Unhandled exceptions
└── rejections-2025-10-08.log    # Unhandled promise rejections
```

### Rotation Configuration

- **Daily Rotation**: New file each day
- **Size Limits**: Rotate when file exceeds max size
- **Compression**: Old files are automatically gzipped
- **Retention**: Automatic cleanup after retention period

## Migration from Basic Winston

### Before (Basic Winston)

```typescript
const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

logger.info('User created', { userId: '123' });
```

### After (Enhanced Logging Module)

```typescript
@Injectable()
export class UserService {
  constructor(private logger: WinstonLoggerService) {}

  createUser() {
    this.logger.logEvent('user_created', { userId: '123' });
  }
}
```

## Integration with Other Modules

### With Health Module

```typescript
// Health checks can use structured logging
this.logger.logEvent('health_check_failed', {
  component: 'database',
  error: error.message,
});
```

### With Metrics Module

```typescript
// Performance metrics integration
this.logger.logPerformance('api_response_time', responseTime);
```

### With Authentication

```typescript
// Security event logging
this.logger.logSecurity(
  'authentication_failed',
  {
    userId: user.id,
    reason: 'invalid_credentials',
  },
  'warn',
);
```

## Troubleshooting

### Common Issues

1. **File Permission Errors**

   ```bash
   # Ensure log directory has write permissions
   chmod 755 logs/
   ```

2. **Memory Usage**

   ```typescript
   // Monitor memory usage
   this.logger.logMemoryUsage();
   ```

3. **Log File Size**
   ```typescript
   // Adjust rotation settings
   LoggingModule.forRoot({
     maxFileSize: '10m',  // Smaller files
     maxFiles: '7d'       # Shorter retention
   })
   ```

## Testing

### Unit Tests

```typescript
describe('WinstonLoggerService', () => {
  let service: WinstonLoggerService;

  beforeEach(() => {
    service = new WinstonLoggerService({
      enableFileLogging: false,
      enableConsoleLogging: false,
    });
  });

  it('should sanitize sensitive data', () => {
    const spy = jest.spyOn(service['winston'], 'info');
    service.log('Test', { password: 'secret' });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        password: '[REDACTED]',
      }),
    );
  });
});
```

### Integration Tests

```typescript
describe('Logging Integration', () => {
  it('should log requests with correlation ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/test')
      .expect(200);

    // Verify log entry was created
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
      }),
    );
  });
});
```

## Advanced Features

### Custom Log Formatters

```typescript
// Extend the formatter service
class CustomLogFormatterService extends LogFormatterService {
  formatCustomEvent(data: any) {
    return {
      ...this.formatEventLog('custom_event', data),
      customField: 'value',
    };
  }
}
```

### Custom Sanitizers

```typescript
// Add custom sanitization rules
const customConfig: LoggingConfig = {
  sensitiveFields: [
    ...defaultFields,
    'socialSecurityNumber',
    'creditCardNumber',
  ],
};
```

### Log Streaming

```typescript
// Stream logs to external services
const customTransport = new winston.transports.Stream({
  stream: externalLogStream,
});
```

This enhanced logging module provides enterprise-grade logging capabilities while maintaining ease of use and strong security practices. It can be easily copied to other NestJS projects and configured for different environments.
