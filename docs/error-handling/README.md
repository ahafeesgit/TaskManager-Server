# ⚠️ Error Handling Guide

This guide covers comprehensive error handling strategies including global exception filters, custom error types, logging, monitoring, and recovery mechanisms.

## Overview

The error handling system provides:

- **Global Exception Filters** for consistent error responses
- **Custom Error Classes** for specific error types
- **Error Logging and Monitoring** for debugging and alerting
- **Graceful Error Recovery** for better user experience
- **Validation Error Handling** with detailed feedback
- **Database Error Handling** with proper error mapping
- **Circuit Breaker Pattern** for external service failures

## Error Handling Architecture

```
📁 Error Handling Structure
src/common/
├── exceptions/              # Custom exception classes
│   ├── base.exception.ts    # Base exception class
│   ├── business.exception.ts # Business logic errors
│   ├── validation.exception.ts # Validation errors
│   └── external.exception.ts # External service errors
├── filters/                 # Exception filters
│   ├── all-exceptions.filter.ts
│   ├── http-exception.filter.ts
│   ├── prisma-exception.filter.ts
│   └── validation-exception.filter.ts
├── interceptors/            # Error interceptors
│   ├── error-logging.interceptor.ts
│   └── error-transform.interceptor.ts
├── middleware/              # Error middleware
│   ├── error-handler.middleware.ts
│   └── request-context.middleware.ts
└── utils/                   # Error utilities
    ├── error-mapper.util.ts
    ├── error-reporter.util.ts
    └── circuit-breaker.util.ts
```

## Custom Exception Classes

### Base Exception Class

```typescript
// src/common/exceptions/base.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  timestamp?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseException extends HttpException {
  public readonly errorCode: string;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    errorCode: string,
    statusCode: HttpStatus,
    context: ErrorContext = {},
    isOperational = true,
  ) {
    super(
      {
        message,
        errorCode,
        statusCode,
        timestamp: new Date().toISOString(),
        ...context,
      },
      statusCode,
    );

    this.errorCode = errorCode;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context,
    };
    this.isOperational = isOperational;

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      statusCode: this.getStatus(),
      context: this.context,
      isOperational: this.isOperational,
    };
  }
}
```

### Business Logic Exceptions

```typescript
// src/common/exceptions/business.exception.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorContext } from './base.exception';

export class BusinessException extends BaseException {
  constructor(message: string, errorCode: string, context: ErrorContext = {}) {
    super(message, errorCode, HttpStatus.BAD_REQUEST, context);
  }
}

export class ResourceNotFoundException extends BaseException {
  constructor(
    resource: string,
    identifier: string,
    context: ErrorContext = {},
  ) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { resource, identifier, ...context },
    );
  }
}

export class DuplicateResourceException extends BaseException {
  constructor(
    resource: string,
    field: string,
    value: string,
    context: ErrorContext = {},
  ) {
    super(
      `${resource} with ${field} '${value}' already exists`,
      'DUPLICATE_RESOURCE',
      HttpStatus.CONFLICT,
      { resource, field, value, ...context },
    );
  }
}

export class InsufficientPermissionsException extends BaseException {
  constructor(requiredPermission: string, context: ErrorContext = {}) {
    super(
      `Insufficient permissions. Required: ${requiredPermission}`,
      'INSUFFICIENT_PERMISSIONS',
      HttpStatus.FORBIDDEN,
      { requiredPermission, ...context },
    );
  }
}

export class RateLimitExceededException extends BaseException {
  constructor(limit: number, windowMs: number, context: ErrorContext = {}) {
    super(
      `Rate limit exceeded. Maximum ${limit} requests per ${windowMs}ms`,
      'RATE_LIMIT_EXCEEDED',
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, windowMs, ...context },
    );
  }
}

export class ExternalServiceException extends BaseException {
  constructor(
    serviceName: string,
    operation: string,
    context: ErrorContext = {},
  ) {
    super(
      `External service '${serviceName}' failed during operation '${operation}'`,
      'EXTERNAL_SERVICE_ERROR',
      HttpStatus.BAD_GATEWAY,
      { serviceName, operation, ...context },
    );
  }
}
```

### Validation Exceptions

```typescript
// src/common/exceptions/validation.exception.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorContext } from './base.exception';

export interface ValidationError {
  field: string;
  value: any;
  constraints: string[];
}

export class ValidationException extends BaseException {
  public readonly validationErrors: ValidationError[];

  constructor(validationErrors: ValidationError[], context: ErrorContext = {}) {
    const message = `Validation failed: ${validationErrors
      .map((error) => `${error.field} - ${error.constraints.join(', ')}`)
      .join('; ')}`;

    super(message, 'VALIDATION_ERROR', HttpStatus.BAD_REQUEST, context);

    this.validationErrors = validationErrors;
  }

  public getFieldErrors(): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};

    this.validationErrors.forEach((error) => {
      fieldErrors[error.field] = error.constraints;
    });

    return fieldErrors;
  }
}

export class InvalidFormatException extends BaseException {
  constructor(
    field: string,
    expectedFormat: string,
    receivedValue: any,
    context: ErrorContext = {},
  ) {
    super(
      `Invalid format for field '${field}'. Expected: ${expectedFormat}, Received: ${receivedValue}`,
      'INVALID_FORMAT',
      HttpStatus.BAD_REQUEST,
      { field, expectedFormat, receivedValue, ...context },
    );
  }
}

export class MissingRequiredFieldException extends BaseException {
  constructor(field: string, context: ErrorContext = {}) {
    super(
      `Required field '${field}' is missing`,
      'MISSING_REQUIRED_FIELD',
      HttpStatus.BAD_REQUEST,
      { field, ...context },
    );
  }
}
```

## Global Exception Filters

### All Exceptions Filter

```typescript
// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exceptions/base.exception';
import { ErrorReporter } from '../utils/error-reporter.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly errorReporter: ErrorReporter) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.createErrorResponse(exception, request);

    // Log the error
    this.logError(exception, request, errorResponse);

    // Report to monitoring services
    this.reportError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private createErrorResponse(exception: unknown, request: Request) {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = (request.headers['x-request-id'] as string) || 'unknown';

    if (exception instanceof BaseException) {
      return {
        success: false,
        statusCode: exception.getStatus(),
        errorCode: exception.errorCode,
        message: exception.message,
        context: exception.context,
        timestamp,
        path,
        method,
        requestId,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        success: false,
        statusCode: status,
        errorCode: this.getErrorCodeFromStatus(status),
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message || exception.message,
        details:
          typeof exceptionResponse === 'object' ? exceptionResponse : undefined,
        timestamp,
        path,
        method,
        requestId,
      };
    }

    // Unknown error
    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp,
      path,
      method,
      requestId,
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: any,
  ): void {
    const logContext = {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id,
      requestId: errorResponse.requestId,
      statusCode: errorResponse.statusCode,
    };

    if (exception instanceof BaseException && exception.isOperational) {
      this.logger.warn(`Operational error: ${exception.message}`, {
        ...logContext,
        errorCode: exception.errorCode,
        context: exception.context,
      });
    } else {
      this.logger.error(`Unexpected error: ${errorResponse.message}`, {
        ...logContext,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }
  }

  private reportError(
    exception: unknown,
    request: Request,
    errorResponse: any,
  ): void {
    // Only report non-operational errors to external monitoring
    if (!(exception instanceof BaseException && exception.isOperational)) {
      this.errorReporter.report(exception, {
        method: request.method,
        url: request.url,
        userId: (request as any).user?.id,
        requestId: errorResponse.requestId,
        statusCode: errorResponse.statusCode,
      });
    }
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusMap[status] || 'UNKNOWN_ERROR';
  }
}
```

### Database Exception Filter

```typescript
// src/common/filters/prisma-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

@Catch(PrismaClientKnownRequestError, PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: PrismaClientKnownRequestError | PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const errorResponse = this.createErrorResponse(exception);

    this.logger.error(`Database error: ${exception.message}`, {
      method: request.method,
      url: request.url,
      errorCode: errorResponse.errorCode,
      stack: exception.stack,
    });

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private createErrorResponse(
    exception: PrismaClientKnownRequestError | PrismaClientValidationError,
  ) {
    const timestamp = new Date().toISOString();
    const requestId = Math.random().toString(36).substr(2, 9);

    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handleKnownRequestError(exception, timestamp, requestId);
    }

    if (exception instanceof PrismaClientValidationError) {
      return {
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'DATABASE_VALIDATION_ERROR',
        message: 'Invalid data provided',
        details: this.parseValidationError(exception.message),
        timestamp,
        requestId,
      };
    }

    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'DATABASE_ERROR',
      message: 'Database operation failed',
      timestamp,
      requestId,
    };
  }

  private handleKnownRequestError(
    exception: PrismaClientKnownRequestError,
    timestamp: string,
    requestId: string,
  ) {
    switch (exception.code) {
      case 'P2002':
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists',
          details: {
            fields: exception.meta?.target,
          },
          timestamp,
          requestId,
        };

      case 'P2025':
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'RECORD_NOT_FOUND',
          message: 'Record not found',
          details: {
            cause: exception.meta?.cause,
          },
          timestamp,
          requestId,
        };

      case 'P2003':
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Referenced record does not exist',
          details: {
            field: exception.meta?.field_name,
          },
          timestamp,
          requestId,
        };

      case 'P2014':
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'INVALID_RELATION',
          message: 'Invalid relation in the data provided',
          details: {
            relation: exception.meta?.relation_name,
          },
          timestamp,
          requestId,
        };

      case 'P2034':
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'TRANSACTION_CONFLICT',
          message: 'Transaction failed due to a write conflict or deadlock',
          timestamp,
          requestId,
        };

      default:
        return {
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode: `PRISMA_${exception.code}`,
          message: 'Database operation failed',
          details: {
            prismaCode: exception.code,
            meta: exception.meta,
          },
          timestamp,
          requestId,
        };
    }
  }

  private parseValidationError(message: string): any {
    try {
      // Extract useful information from Prisma validation error message
      const lines = message.split('\n');
      const relevantLines = lines.filter(
        (line) =>
          line.includes('Argument') ||
          line.includes('Expected') ||
          line.includes('Received'),
      );

      return {
        validationErrors: relevantLines,
        originalMessage: message,
      };
    } catch {
      return { message };
    }
  }
}
```

### Validation Exception Filter

```typescript
// src/common/filters/validation-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const exceptionResponse = exception.getResponse() as any;

    // Check if this is a validation error from class-validator
    if (Array.isArray(exceptionResponse.message)) {
      const validationErrors = this.formatValidationErrors(
        exceptionResponse.message,
      );

      response.status(400).json({
        success: false,
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        validationErrors,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        requestId: request.headers['x-request-id'] || 'unknown',
      });
    } else {
      // Handle other bad request exceptions
      response.status(400).json({
        success: false,
        statusCode: 400,
        errorCode: 'BAD_REQUEST',
        message: exceptionResponse.message || exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        requestId: request.headers['x-request-id'] || 'unknown',
      });
    }
  }

  private formatValidationErrors(
    errors: ValidationError[],
  ): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    errors.forEach((error) => {
      if (error.constraints) {
        formattedErrors[error.property] = Object.values(error.constraints);
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatValidationErrors(error.children);
        Object.keys(nestedErrors).forEach((key) => {
          formattedErrors[`${error.property}.${key}`] = nestedErrors[key];
        });
      }
    });

    return formattedErrors;
  }
}
```

## Error Reporting and Monitoring

### Error Reporter Service

```typescript
// src/common/utils/error-reporter.util.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ErrorContext {
  method?: string;
  url?: string;
  userId?: string;
  requestId?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  correlationId?: string;
  [key: string]: any;
}

@Injectable()
export class ErrorReporter {
  private readonly logger = new Logger(ErrorReporter.name);

  constructor(private readonly configService: ConfigService) {}

  async report(error: unknown, context: ErrorContext = {}): Promise<void> {
    try {
      // Report to multiple monitoring services
      await Promise.allSettled([
        this.reportToSentry(error, context),
        this.reportToDatadog(error, context),
        this.reportToSlack(error, context),
        this.reportToEmail(error, context),
      ]);
    } catch (reportingError) {
      this.logger.error('Failed to report error to monitoring services', {
        originalError: error,
        reportingError,
        context,
      });
    }
  }

  private async reportToSentry(
    error: unknown,
    context: ErrorContext,
  ): Promise<void> {
    const sentryDsn = this.configService.get('SENTRY_DSN');
    if (!sentryDsn) return;

    try {
      // Sentry reporting logic
      const Sentry = require('@sentry/node');

      Sentry.withScope((scope) => {
        scope.setContext('request', context);
        scope.setTag('environment', this.configService.get('NODE_ENV'));

        if (context.userId) {
          scope.setUser({ id: context.userId });
        }

        if (context.requestId) {
          scope.setTag('requestId', context.requestId);
        }

        Sentry.captureException(error);
      });
    } catch (sentryError) {
      this.logger.warn('Failed to report to Sentry', sentryError);
    }
  }

  private async reportToDatadog(
    error: unknown,
    context: ErrorContext,
  ): Promise<void> {
    const datadogApiKey = this.configService.get('DATADOG_API_KEY');
    if (!datadogApiKey) return;

    try {
      // Datadog reporting logic
      const tracer = require('dd-trace');

      tracer.dogstatsd.increment('error.count', 1, {
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        status_code: context.statusCode?.toString() || 'unknown',
        method: context.method || 'unknown',
        environment: this.configService.get('NODE_ENV'),
      });

      tracer.scope().active()?.setTag('error', true);
      tracer.scope().active()?.addTags(context);
    } catch (datadogError) {
      this.logger.warn('Failed to report to Datadog', datadogError);
    }
  }

  private async reportToSlack(
    error: unknown,
    context: ErrorContext,
  ): Promise<void> {
    const slackWebhook = this.configService.get('SLACK_ERROR_WEBHOOK');
    if (!slackWebhook) return;

    try {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const environment = this.configService.get('NODE_ENV');

      // Only report critical errors to Slack in production
      if (
        environment === 'production' &&
        context.statusCode &&
        context.statusCode >= 500
      ) {
        const payload = {
          text: `🚨 Critical Error in ${environment}`,
          attachments: [
            {
              color: 'danger',
              fields: [
                { title: 'Error', value: errorMessage, short: false },
                {
                  title: 'URL',
                  value: `${context.method} ${context.url}`,
                  short: true,
                },
                {
                  title: 'Status Code',
                  value: context.statusCode?.toString(),
                  short: true,
                },
                { title: 'Request ID', value: context.requestId, short: true },
                {
                  title: 'User ID',
                  value: context.userId || 'Anonymous',
                  short: true,
                },
                {
                  title: 'Timestamp',
                  value: new Date().toISOString(),
                  short: true,
                },
              ],
            },
          ],
        };

        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (slackError) {
      this.logger.warn('Failed to report to Slack', slackError);
    }
  }

  private async reportToEmail(
    error: unknown,
    context: ErrorContext,
  ): Promise<void> {
    const adminEmail = this.configService.get('ADMIN_EMAIL');
    const smtpConfig = this.configService.get('SMTP_CONFIG');

    if (!adminEmail || !smtpConfig) return;

    try {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const environment = this.configService.get('NODE_ENV');

      // Only send email for critical production errors
      if (
        environment === 'production' &&
        context.statusCode &&
        context.statusCode >= 500
      ) {
        const emailContent = `
          <h2>Critical Error Report</h2>
          <p><strong>Environment:</strong> ${environment}</p>
          <p><strong>Error:</strong> ${errorMessage}</p>
          <p><strong>URL:</strong> ${context.method} ${context.url}</p>
          <p><strong>Status Code:</strong> ${context.statusCode}</p>
          <p><strong>Request ID:</strong> ${context.requestId}</p>
          <p><strong>User ID:</strong> ${context.userId || 'Anonymous'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Stack Trace:</strong></p>
          <pre>${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
        `;

        // Email sending logic would go here
        // await this.emailService.send({
        //   to: adminEmail,
        //   subject: `Critical Error - ${environment}`,
        //   html: emailContent,
        // });
      }
    } catch (emailError) {
      this.logger.warn('Failed to send error email', emailError);
    }
  }
}
```

## Circuit Breaker Pattern

### Circuit Breaker Implementation

```typescript
// src/common/utils/circuit-breaker.util.ts
import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
  fallbackFunction?: () => any;
}

@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttempt: number | null = null;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      if (this.shouldAttemptReset()) {
        this.setState(CircuitState.HALF_OPEN);
      } else {
        return this.fallback();
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttempt !== null && Date.now() >= this.nextAttempt;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.setState(CircuitState.CLOSED);
    this.logger.debug(`Circuit breaker '${this.name}' reset to CLOSED state`);
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.setState(CircuitState.OPEN);
      this.nextAttempt = Date.now() + this.options.timeout;

      this.logger.warn(
        `Circuit breaker '${this.name}' opened after ${this.failureCount} failures`,
      );
    }
  }

  private setState(state: CircuitState): void {
    this.state = state;
  }

  private fallback(): any {
    if (this.options.fallbackFunction) {
      this.logger.debug(`Using fallback for circuit breaker '${this.name}'`);
      return this.options.fallbackFunction();
    }

    throw new Error(
      `Circuit breaker '${this.name}' is open. Service temporarily unavailable.`,
    );
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.setState(CircuitState.CLOSED);
    this.logger.info(`Circuit breaker '${this.name}' manually reset`);
  }
}

// Circuit Breaker Service for managing multiple circuit breakers
@Injectable()
export class CircuitBreakerService {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  getCircuitBreaker(
    name: string,
    options: CircuitBreakerOptions,
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, options));
    }

    return this.circuitBreakers.get(name)!;
  }

  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return this.circuitBreakers;
  }

  resetAll(): void {
    this.circuitBreakers.forEach((breaker) => breaker.reset());
  }
}
```

## Error Recovery Strategies

### Retry Mechanism

```typescript
// src/common/utils/retry.util.ts
import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryCondition?: (error: any) => boolean;
}

@Injectable()
export class RetryUtil {
  private readonly logger = new Logger(RetryUtil.name);

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
    operationName?: string,
  ): Promise<T> {
    let attempt = 1;
    let delay = options.delayMs;

    while (attempt <= options.maxAttempts) {
      try {
        const result = await operation();

        if (attempt > 1) {
          this.logger.log(
            `Operation '${operationName}' succeeded on attempt ${attempt}`,
          );
        }

        return result;
      } catch (error) {
        const shouldRetry = this.shouldRetry(error, attempt, options);

        if (!shouldRetry) {
          this.logger.error(
            `Operation '${operationName}' failed permanently after ${attempt} attempts`,
            error,
          );
          throw error;
        }

        this.logger.warn(
          `Operation '${operationName}' failed on attempt ${attempt}/${options.maxAttempts}. Retrying in ${delay}ms`,
          { error: error.message },
        );

        await this.sleep(delay);

        // Calculate next delay with backoff
        if (options.backoffMultiplier) {
          delay = Math.min(
            delay * options.backoffMultiplier,
            options.maxDelayMs || delay * 10,
          );
        }

        attempt++;
      }
    }

    throw new Error(`Operation failed after ${options.maxAttempts} attempts`);
  }

  private shouldRetry(
    error: any,
    attempt: number,
    options: RetryOptions,
  ): boolean {
    if (attempt >= options.maxAttempts) {
      return false;
    }

    if (options.retryCondition) {
      return options.retryCondition(error);
    }

    // Default retry condition: retry on network errors and 5xx status codes
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return true;
    }

    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Graceful Degradation

```typescript
// src/common/utils/graceful-degradation.util.ts
import { Injectable, Logger } from '@nestjs/common';

export interface DegradationOptions {
  enableCache?: boolean;
  cacheTtl?: number;
  fallbackValue?: any;
  enablePartialResponse?: boolean;
}

@Injectable()
export class GracefulDegradationUtil {
  private readonly logger = new Logger(GracefulDegradationUtil.name);
  private cache = new Map<string, { value: any; expires: number }>();

  async executeWithDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    options: DegradationOptions = {},
    cacheKey?: string,
  ): Promise<T> {
    try {
      // Try primary operation
      const result = await primaryOperation();

      // Cache successful result
      if (options.enableCache && cacheKey) {
        this.setCacheValue(cacheKey, result, options.cacheTtl || 300000); // 5 min default
      }

      return result;
    } catch (primaryError) {
      this.logger.warn('Primary operation failed, attempting degradation', {
        error: primaryError.message,
        cacheKey,
      });

      // Try cached value
      if (options.enableCache && cacheKey) {
        const cachedValue = this.getCacheValue(cacheKey);
        if (cachedValue !== null) {
          this.logger.info('Returning cached value for degraded service');
          return cachedValue;
        }
      }

      // Try fallback operation
      if (fallbackOperation) {
        try {
          const fallbackResult = await fallbackOperation();
          this.logger.info('Fallback operation succeeded');
          return fallbackResult;
        } catch (fallbackError) {
          this.logger.error('Fallback operation also failed', fallbackError);
        }
      }

      // Return fallback value if available
      if (options.fallbackValue !== undefined) {
        this.logger.info('Returning configured fallback value');
        return options.fallbackValue;
      }

      // If partial response is enabled, return empty data structure
      if (options.enablePartialResponse) {
        this.logger.info('Returning partial response');
        return this.getPartialResponse<T>();
      }

      // Re-throw original error if no degradation options work
      throw primaryError;
    }
  }

  private setCacheValue(key: string, value: any, ttl: number): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  private getCacheValue(key: string): any {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  private getPartialResponse<T>(): T {
    // Return appropriate empty structure based on expected type
    return {} as T;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

## Error Handling in Services

### Service Error Handling Example

```typescript
// src/users/users.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  BusinessException,
} from '@/common/exceptions/business.exception';
import { RetryUtil } from '@/common/utils/retry.util';
import { CircuitBreakerService } from '@/common/utils/circuit-breaker.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retryUtil: RetryUtil,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async findOne(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new ResourceNotFoundException('User', id, { userId: id });
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to find user with id: ${id}`, error);
      throw error;
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new DuplicateResourceException(
          'User',
          'email',
          createUserDto.email,
          { email: createUserDto.email },
        );
      }

      const user = await this.prisma.user.create({
        data: createUserDto,
      });

      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  async sendWelcomeEmail(userId: string): Promise<void> {
    const circuitBreaker = this.circuitBreakerService.getCircuitBreaker(
      'email-service',
      {
        failureThreshold: 5,
        timeout: 30000,
        monitoringPeriod: 60000,
        fallbackFunction: () => this.queueEmailForLater(userId),
      },
    );

    try {
      await circuitBreaker.execute(async () => {
        return this.retryUtil.executeWithRetry(
          () => this.emailService.sendWelcomeEmail(userId),
          {
            maxAttempts: 3,
            delayMs: 1000,
            backoffMultiplier: 2,
            retryCondition: (error) => error.status >= 500,
          },
          'send-welcome-email',
        );
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send welcome email to user: ${userId}`,
        error,
      );
      // Don't throw error for non-critical operations
    }
  }

  private async queueEmailForLater(userId: string): Promise<void> {
    // Queue email for later processing
    this.logger.info(`Queuing welcome email for later: ${userId}`);
    // Implementation would add to a job queue
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.findOne(id);

      // Business rule: Cannot delete user with active projects
      const activeProjects = await this.prisma.project.count({
        where: {
          members: {
            some: {
              userId: id,
              role: 'OWNER',
            },
          },
        },
      });

      if (activeProjects > 0) {
        throw new BusinessException(
          'Cannot delete user with active projects as owner',
          'USER_HAS_ACTIVE_PROJECTS',
          { userId: id, activeProjects },
        );
      }

      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(`User deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${id}`, error);
      throw error;
    }
  }
}
```

## Error Monitoring Dashboard

### Health Check with Error Metrics

```typescript
// src/common/monitoring/error-health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CircuitBreakerService } from '../utils/circuit-breaker.util';
import { ErrorReporter } from '../utils/error-reporter.util';

@ApiTags('Health')
@Controller('health')
export class ErrorHealthController {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  @Get('errors')
  @ApiOperation({ summary: 'Get error health metrics' })
  async getErrorHealth() {
    const circuitBreakers = this.circuitBreakerService.getAllCircuitBreakers();
    const circuitBreakerStatus: Record<string, any> = {};

    circuitBreakers.forEach((breaker, name) => {
      circuitBreakerStatus[name] = {
        state: breaker.getState(),
        failureCount: breaker.getFailureCount(),
      };
    });

    return {
      timestamp: new Date().toISOString(),
      circuitBreakers: circuitBreakerStatus,
      errorReportingEnabled: true,
      status: 'healthy',
    };
  }

  @Get('errors/reset')
  @ApiOperation({ summary: 'Reset all circuit breakers' })
  async resetCircuitBreakers() {
    this.circuitBreakerService.resetAll();

    return {
      message: 'All circuit breakers reset successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
```

## Best Practices

### Error Handling Guidelines

1. **Fail Fast**: Detect and report errors as early as possible
2. **Consistent Error Format**: Use standardized error response structure
3. **Meaningful Error Messages**: Provide clear, actionable error messages
4. **Error Classification**: Distinguish between operational and programming errors
5. **Graceful Degradation**: Provide fallbacks for non-critical operations

### Logging Best Practices

1. **Structured Logging**: Use consistent log format with relevant context
2. **Log Levels**: Use appropriate log levels (error, warn, info, debug)
3. **Sensitive Data**: Never log passwords, tokens, or PII
4. **Request Correlation**: Include request IDs for tracing
5. **Performance Impact**: Minimize logging overhead

### Monitoring Best Practices

1. **Alert Thresholds**: Set appropriate alert thresholds to avoid noise
2. **Error Grouping**: Group similar errors to reduce alert fatigue
3. **Escalation Policies**: Define clear escalation procedures
4. **Regular Review**: Regularly review and update error handling strategies
5. **Post-Mortem Analysis**: Conduct post-mortem analysis for critical incidents

## Troubleshooting

### Common Issues

#### Error Filter Not Working

```typescript
// Ensure filters are registered in correct order
app.useGlobalFilters(
  new AllExceptionsFilter(errorReporter),
  new PrismaExceptionFilter(),
  new ValidationExceptionFilter(),
);
```

#### Circuit Breaker Not Triggering

```typescript
// Check failure threshold and timeout configuration
const circuitBreaker = circuitBreakerService.getCircuitBreaker('service-name', {
  failureThreshold: 3, // Lower threshold for testing
  timeout: 5000, // Shorter timeout for testing
  monitoringPeriod: 60000,
});
```

#### Missing Error Context

```typescript
// Ensure request context middleware is properly configured
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuid();
  next();
});
```

---

**Next Steps:**

- Review [Template Usage](../template/) for implementing error handling
- Check [Monitoring](../monitoring/) for error metrics and alerting
- See [Logging](../logging/) for comprehensive error logging strategies
