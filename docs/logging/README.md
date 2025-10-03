# 📝 Logging Guide

This guide covers the comprehensive logging system implemented with Winston, including structured logging, file rotation, and different log levels.

## Overview

The logging system provides:

- **Structured JSON logging** for easy parsing and analysis
- **Multiple log levels** (error, warn, info, debug, verbose)
- **File rotation** with automatic compression and cleanup
- **Context-aware logging** for better debugging
- **Request/response logging** for API monitoring
- **Environment-based configuration** for different deployment stages

## Architecture

```
📁 Logging Structure
src/common/logging/
├── winston-logger.service.ts  # Main logging service
├── logging.interceptor.ts     # HTTP request logging
├── logging.module.ts          # Logging module
└── index.ts                   # Exports

logs/                          # Log files (created automatically)
├── combined-YYYY-MM-DD.log    # All logs
├── error-YYYY-MM-DD.log       # Error logs only
├── exceptions-YYYY-MM-DD.log  # Uncaught exceptions
└── rejections-YYYY-MM-DD.log  # Unhandled promise rejections
```

## Features

### Log Levels

| Level       | Priority | Usage                  | Color  |
| ----------- | -------- | ---------------------- | ------ |
| **error**   | 0        | Error conditions       | Red    |
| **warn**    | 1        | Warning conditions     | Yellow |
| **info**    | 2        | Informational messages | Green  |
| **debug**   | 3        | Debug information      | Blue   |
| **verbose** | 4        | Verbose information    | Cyan   |

### Log Formats

#### Console Output (Development)

```
2025-09-19 10:30:45 info: [AuthService] User login successful
2025-09-19 10:30:46 error: [DatabaseService] Connection failed
```

#### JSON Output (Production)

```json
{
  "timestamp": "2025-09-19 10:30:45",
  "level": "info",
  "context": "AuthService",
  "message": "User login successful",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info                    # Minimum log level
LOG_FILE_ENABLED=true            # Enable file logging
LOG_FILE_PATH=./logs/app.log     # Log file location

# Development vs Production
NODE_ENV=development             # Enables colored console output
NODE_ENV=production              # JSON format for log aggregation
```

### Winston Configuration

```typescript
// winston-logger.service.ts
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(
    ({ timestamp, level, message, context, trace, ...meta }) => {
      const logObject: any = {
        timestamp,
        level,
        context,
        message,
        ...meta,
      };

      if (trace) {
        logObject.trace = trace;
      }

      return JSON.stringify(logObject);
    },
  ),
);
```

## Usage

### Basic Logging

```typescript
import { WinstonLoggerService } from '@/common/logging';

@Injectable()
export class UserService {
  constructor(private readonly logger: WinstonLoggerService) {}

  async createUser(userData: CreateUserDto) {
    this.logger.log('Creating new user', 'UserService');

    try {
      const user = await this.userRepository.create(userData);

      this.logger.log(
        `User created successfully: ${user.email}`,
        'UserService',
      );

      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, 'UserService');
      throw error;
    }
  }
}
```

### Contextual Logging

```typescript
// Add context for better debugging
this.logger.log('Processing payment', 'PaymentService');
this.logger.warn('Rate limit approaching', 'RateLimitService');
this.logger.error('Database connection failed', undefined, 'DatabaseService');
this.logger.debug('Cache hit for user data', 'CacheService');
this.logger.verbose('Detailed operation info', 'DetailedService');
```

### Structured Logging

```typescript
// Log with additional metadata
this.logger.logRequest(request, response, responseTime);
this.logger.logError(error, 'PaymentService');
this.logger.logDatabaseQuery(query, duration);

// Custom structured logs
this.logger.log('User action performed', {
  context: 'UserService',
  userId: user.id,
  action: 'profile_update',
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});
```

## HTTP Request Logging

### Automatic Request Logging

The logging interceptor automatically logs all HTTP requests:

```typescript
// logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.logRequest(request, response, responseTime);
      }),
    );
  }
}
```

### Request Log Format

```json
{
  "timestamp": "2025-09-19 10:30:45",
  "level": "info",
  "context": "HTTP",
  "message": "HTTP Request",
  "method": "POST",
  "url": "/api/v1/users",
  "statusCode": 201,
  "responseTime": "145ms",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

## File Rotation and Management

### Rotation Configuration

```typescript
// Daily rotation with compression
new winston.transports.DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m', // Rotate at 20MB
  maxFiles: '30d', // Keep 30 days
  zippedArchive: true, // Compress old files
});
```

### Log Files

| File Pattern                | Content             | Retention |
| --------------------------- | ------------------- | --------- |
| `combined-YYYY-MM-DD.log`   | All log levels      | 30 days   |
| `error-YYYY-MM-DD.log`      | Error level only    | 14 days   |
| `exceptions-YYYY-MM-DD.log` | Uncaught exceptions | 14 days   |
| `rejections-YYYY-MM-DD.log` | Promise rejections  | 14 days   |

### File Management Commands

```bash
# View recent logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Search logs
grep "ERROR" logs/error-*.log

# Compress old logs manually
gzip logs/combined-2025-09-18.log

# Clean old logs (automated)
find logs/ -name "*.log.gz" -mtime +30 -delete
```

## Error Logging

### Exception Handling

```typescript
// Automatic exception logging
winston.createLogger({
  exceptionHandlers: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});
```

### Error Context

```typescript
// Rich error logging
try {
  await riskyOperation();
} catch (error) {
  this.logger.logError(error, 'PaymentService');

  // Additional context
  this.logger.error('Payment processing failed', {
    context: 'PaymentService',
    userId: user.id,
    amount: payment.amount,
    paymentId: payment.id,
    stack: error.stack,
  });
}
```

## Log Analysis

### JSON Log Parsing

```bash
# Extract errors from logs
cat logs/combined-*.log | jq 'select(.level=="error")'

# Find slow requests
cat logs/combined-*.log | jq 'select(.responseTime and (.responseTime | tonumber > 1000))'

# User activity
cat logs/combined-*.log | jq 'select(.userId=="specific-user-id")'
```

### Log Aggregation

#### ELK Stack Integration

```json
{
  "filebeat": {
    "inputs": [
      {
        "type": "log",
        "paths": ["./logs/*.log"],
        "fields": {
          "service": "nestjs-app",
          "environment": "production"
        }
      }
    ]
  }
}
```

#### Structured Queries

```javascript
// Elasticsearch query
{
  "query": {
    "bool": {
      "must": [
        { "match": { "level": "error" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

## Performance Considerations

### Asynchronous Logging

```typescript
// Non-blocking logging
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'app.log',
      handleExceptions: false, // Don't block on exceptions
      handleRejections: false, // Don't block on rejections
    }),
  ],
});
```

### Log Level Optimization

```typescript
// Environment-based log levels
const logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

// Conditional verbose logging
if (process.env.LOG_LEVEL === 'debug') {
  this.logger.debug('Detailed operation data', context);
}
```

## Monitoring and Alerting

### Log-based Metrics

```typescript
// Custom metrics from logs
this.logger.log('User action', {
  context: 'MetricsLogger',
  metric: 'user_login',
  value: 1,
  labels: {
    method: 'google_oauth',
    success: true,
  },
});
```

### Alert Triggers

```bash
# Monitor error rates
tail -f logs/error-*.log | grep -c "ERROR"

# Watch for specific patterns
tail -f logs/combined-*.log | grep "PAYMENT_FAILED"

# System health indicators
tail -f logs/combined-*.log | grep "DATABASE_CONNECTION"
```

## Testing Logging

### Unit Tests

```typescript
// logger.service.spec.ts
describe('WinstonLoggerService', () => {
  let service: WinstonLoggerService;
  let mockTransport: jest.Mock;

  beforeEach(() => {
    mockTransport = jest.fn();
    service = new WinstonLoggerService();
  });

  it('should log messages with context', () => {
    service.log('Test message', 'TestContext');

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Test message',
        context: 'TestContext',
      }),
    );
  });
});
```

### Integration Tests

```typescript
// Test log interceptor
it('should log HTTP requests', async () => {
  const response = await request(app.getHttpServer()).get('/users').expect(200);

  // Verify log entry was created
  const logs = await readLogFile();
  expect(logs).toContain('HTTP Request');
  expect(logs).toContain('GET /users');
});
```

## Best Practices

### Development

- Use appropriate log levels for different information types
- Include relevant context in all log messages
- Don't log sensitive information (passwords, tokens)
- Use structured logging for better searchability

### Production

- Set log level to `info` or `warn` to reduce noise
- Enable file logging with rotation
- Monitor log file sizes and disk usage
- Set up log aggregation and analysis tools

### Security

- Sanitize log inputs to prevent log injection
- Avoid logging personally identifiable information (PII)
- Implement log access controls
- Regular log retention policy compliance

## Troubleshooting

### Common Issues

#### Log Files Not Created

```bash
# Check directory permissions
ls -la logs/

# Create logs directory
mkdir -p logs
chmod 755 logs
```

#### High Disk Usage

```bash
# Check log file sizes
du -sh logs/*

# Manual cleanup
find logs/ -name "*.log" -mtime +7 -delete

# Configure retention
# Edit winston configuration maxFiles
```

#### Performance Issues

```bash
# Check log volume
wc -l logs/combined-*.log

# Reduce log level
export LOG_LEVEL=warn

# Disable file logging temporarily
export LOG_FILE_ENABLED=false
```

---

**Next Steps:**

- Review [Monitoring Guide](../monitoring/) for metrics and observability
- Check [Error Handling](../error-handling/) for error management
- See [Testing Guide](../testing/) for testing logging functionality
