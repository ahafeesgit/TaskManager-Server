# NestJS Interceptors Module

A comprehensive, production-ready interceptor system for NestJS applications that handles cross-cutting concerns including response transformation, logging, timeouts, data transformation, and error handling.

## Overview

The Interceptors module provides five specialized interceptors that work together to create a robust HTTP request/response processing pipeline:

1. **ErrorInterceptor** - Global error handling with standardized responses
2. **TransformInterceptor** - Data sanitization and transformation
3. **ResponseInterceptor** - Consistent API response formatting
4. **LoggingInterceptor** - Request/response logging with security
5. **TimeoutInterceptor** - Request timeout management

## Features

- 🔒 **Security-First**: Automatic sanitization of sensitive data
- 🚀 **Performance**: Configurable timeouts and efficient processing
- 📊 **Monitoring**: Comprehensive logging with structured output
- 🔄 **Standardization**: Consistent API response formats
- ⚙️ **Configurable**: Environment-based configuration
- 🏗️ **Modular**: Easy to integrate into any NestJS project

## Interceptor Order & Flow

The interceptors are executed in the following order:

1. **ErrorInterceptor** (First) - Catches all exceptions
2. **TransformInterceptor** - Transforms and sanitizes data
3. **ResponseInterceptor** - Formats standardized responses
4. **LoggingInterceptor** - Logs requests and responses
5. **TimeoutInterceptor** (Last) - Applies request timeouts

## Interceptor Details

### 1. ErrorInterceptor

Provides global error handling with standardized error responses.

**Features:**

- Converts all exceptions to standard format
- Validates request data size
- Security-aware error messages
- Stack trace control for different environments

**Configuration:**

```env
ENABLE_ERROR_INTERCEPTOR=true
MAX_REQUEST_SIZE=10485760  # 10MB
SHOW_STACK_TRACES=false
ERROR_LOG_LEVEL=error
```

### 2. TransformInterceptor

Handles data transformation and sanitization.

**Features:**

- Removes sensitive fields from responses
- Converts data types (string to number, etc.)
- Handles circular references
- Configurable transformation rules

**Configuration:**

```env
ENABLE_TRANSFORM_INTERCEPTOR=true
REMOVE_SENSITIVE_FIELDS=true
AUTO_TYPE_CONVERSION=true
MAX_TRANSFORM_DEPTH=10
```

### 3. ResponseInterceptor

Standardizes API response format across all endpoints.

**Features:**

- Consistent response structure
- Automatic success status handling
- Pagination metadata support
- Custom headers management

**Configuration:**

```env
ENABLE_RESPONSE_INTERCEPTOR=true
RESPONSE_SUCCESS_MESSAGE=Request successful
INCLUDE_TIMESTAMP=true
INCLUDE_REQUEST_ID=true
```

**Response Format:**

```json
{
  "success": true,
  "message": "Request successful",
  "data": {...},
  "meta": {
    "timestamp": "2023-10-07T10:30:00Z",
    "requestId": "req-12345",
    "pagination": {...}
  }
}
```

### 4. LoggingInterceptor

Comprehensive request/response logging with security considerations.

**Features:**

- Request/response timing
- Sanitized parameter logging
- Route pattern matching
- Configurable log levels

**Configuration:**

```env
ENABLE_LOGGING_INTERCEPTOR=true
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_LEVEL=info
SANITIZE_LOGS=true
LOG_RESPONSE_BODY=false
```

### 5. TimeoutInterceptor

Prevents long-running requests with configurable timeouts.

**Features:**

- Route-specific timeout configuration
- Graceful timeout handling
- Custom timeout messages
- Performance monitoring

**Configuration:**

```env
ENABLE_TIMEOUT_INTERCEPTOR=true
DEFAULT_TIMEOUT_MS=30000     # 30 seconds
API_TIMEOUT_MS=10000         # 10 seconds for /api routes
AUTH_TIMEOUT_MS=5000         # 5 seconds for /auth routes
```

## Installation & Setup

1. Copy the entire `interceptors` folder to your project's `src/common/` directory
2. Install required dependencies:

   ```bash
   npm install @nestjs/common rxjs
   ```

3. Add environment variables to your `.env` file:

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

4. Import the module in your main application module:

   ```typescript
   import { Module } from '@nestjs/common';
   import { InterceptorsModule } from './common/interceptors/interceptors.module';

   @Module({
     imports: [
       InterceptorsModule,
       // ... other modules
     ],
   })
   export class AppModule {}
   ```

## Usage Examples

### Basic Usage

The interceptors work automatically once imported. No additional setup required.

### Custom Configuration

You can override default configurations using environment variables:

```env
# Disable specific interceptors
ENABLE_LOGGING_INTERCEPTOR=false

# Custom timeout for specific routes
API_TIMEOUT_MS=15000

# Enhanced security
REMOVE_SENSITIVE_FIELDS=true
SANITIZE_LOGS=true
```

### Controller Integration

The interceptors work with any NestJS controller:

```typescript
@Controller('users')
export class UsersController {
  @Get()
  async findAll() {
    // Response will be automatically:
    // - Logged (LoggingInterceptor)
    // - Formatted (ResponseInterceptor)
    // - Timed out if too slow (TimeoutInterceptor)
    // - Sanitized (TransformInterceptor)
    // - Error handled (ErrorInterceptor)
    return { users: [...] };
  }
}
```

## Configuration Reference

| Variable                       | Default    | Description                          |
| ------------------------------ | ---------- | ------------------------------------ |
| `ENABLE_RESPONSE_INTERCEPTOR`  | `true`     | Enable response formatting           |
| `ENABLE_LOGGING_INTERCEPTOR`   | `true`     | Enable request/response logging      |
| `ENABLE_TIMEOUT_INTERCEPTOR`   | `true`     | Enable request timeouts              |
| `ENABLE_TRANSFORM_INTERCEPTOR` | `true`     | Enable data transformation           |
| `ENABLE_ERROR_INTERCEPTOR`     | `true`     | Enable error handling                |
| `DEFAULT_TIMEOUT_MS`           | `30000`    | Default timeout in milliseconds      |
| `LOG_LEVEL`                    | `info`     | Logging level                        |
| `MAX_REQUEST_SIZE`             | `10485760` | Maximum request size (bytes)         |
| `REMOVE_SENSITIVE_FIELDS`      | `true`     | Remove sensitive data from responses |

## Security Features

- **Sensitive Data Removal**: Automatically removes passwords, tokens, and secrets
- **Request Size Validation**: Prevents oversized requests
- **Log Sanitization**: Removes sensitive information from logs
- **Stack Trace Control**: Hides stack traces in production
- **Input Validation**: Validates request structure and size

## Performance Considerations

- **Timeout Management**: Prevents resource exhaustion from long requests
- **Efficient Processing**: Minimal overhead per request
- **Configurable Features**: Disable unused interceptors for better performance
- **Memory Management**: Handles large responses efficiently

## Troubleshooting

### Common Issues

1. **Interceptors not working**: Ensure the module is imported in your app module
2. **Timeouts too aggressive**: Increase timeout values in environment variables
3. **Logs too verbose**: Adjust `LOG_LEVEL` or disable response body logging
4. **Sensitive data exposed**: Enable `REMOVE_SENSITIVE_FIELDS` and `SANITIZE_LOGS`

### Environment Variables Not Loading

Ensure you have a proper configuration module:

```typescript
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), InterceptorsModule],
})
export class AppModule {}
```

## Advanced Usage

### Custom Error Handling

Override error messages by setting environment variables:

```env
ERROR_LOG_LEVEL=warn
SHOW_STACK_TRACES=true  # Only in development
```

### Route-Specific Configuration

Configure different timeouts for different route patterns:

```env
API_TIMEOUT_MS=10000      # /api/* routes
AUTH_TIMEOUT_MS=5000      # /auth/* routes
UPLOAD_TIMEOUT_MS=60000   # /upload/* routes
```

### Logging Configuration

Fine-tune logging behavior:

```env
LOG_REQUESTS=true
LOG_RESPONSES=true
LOG_RESPONSE_BODY=false   # Don't log response bodies for privacy
SANITIZE_LOGS=true        # Remove sensitive data from logs
```

## Dependencies

This module requires:

- `@nestjs/common` (^10.0.0)
- `rxjs` (^7.8.0)

No external dependencies required - fully self-contained!

## License

This module is designed to be copy-paste ready for any NestJS project. Use freely in your applications.
