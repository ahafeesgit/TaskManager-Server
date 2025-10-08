import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  BadRequestException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type {
  ErrorInterceptorConfig,
  ErrorResponse,
} from './interfaces/interceptor.interface';
import { INTERCEPTOR_CONFIG, DEFAULT_INTERCEPTOR_CONFIG } from './constants';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);

  constructor(
    @Optional()
    @Inject(INTERCEPTOR_CONFIG)
    private readonly config: ErrorInterceptorConfig = DEFAULT_INTERCEPTOR_CONFIG.error,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (this.config?.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      catchError((error: any) => {
        // Log error if configured
        if (this.config?.logErrors) {
          this.logError(error, request);
        }

        // Transform error to standardized format
        const transformedError = this.transformError(error, request);

        // Set response status code
        response.status(transformedError.code);

        return throwError(
          () => new HttpException(transformedError, transformedError.code),
        );
      }),
    );
  }

  /**
   * Transform error to standardized error response
   */
  private transformError(error: any, request: any): ErrorResponse {
    const timestamp = new Date().toISOString();
    const requestId = this.getRequestId(request);

    // Handle HTTP exceptions
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();

      let errorMessage = error.message;
      let details: any = null;
      let validationErrors: any = null;

      // Handle validation errors
      if (
        this.config?.transformValidationErrors &&
        typeof response === 'object' &&
        response &&
        'message' in response
      ) {
        if (Array.isArray(response.message)) {
          validationErrors = this.formatValidationErrors(response.message);
          errorMessage = 'Validation failed';
        } else if (typeof response.message === 'string') {
          errorMessage = response.message;
        }

        if ('error' in response && typeof response.error === 'string') {
          details = response.error;
        }
      }

      // Check for custom error messages
      const customMessage = this.getCustomErrorMessage(error.constructor.name);
      if (customMessage) {
        errorMessage = customMessage;
      }

      const errorResponse: ErrorResponse = {
        success: false,
        code: status,
        error: errorMessage,
        timestamp,
        requestId,
      };

      if (details) {
        errorResponse.details = details;
      }

      if (validationErrors) {
        errorResponse.validationErrors = validationErrors;
      }

      // Include stack trace in development
      if (
        this.config?.includeStackTrace &&
        process.env.NODE_ENV === 'development'
      ) {
        errorResponse.stack = error.stack;
      }

      // Include error context if configured
      if (this.config?.includeErrorContext) {
        errorResponse.details = {
          ...errorResponse.details,
          path: request.url,
          method: request.method,
          timestamp: timestamp,
        };
      }

      return errorResponse;
    }

    // Handle unknown errors
    const errorMessage =
      this.config?.customErrorMessages?.['UnknownError'] ||
      'An unexpected error occurred';

    const errorResponse: ErrorResponse = {
      success: false,
      code: 500,
      error: errorMessage,
      timestamp,
      requestId,
    };

    // Include original error message in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        originalMessage: error.message || 'Unknown error',
        errorType: error.constructor?.name || 'UnknownError',
      };

      if (this.config?.includeStackTrace && error.stack) {
        errorResponse.stack = error.stack;
      }
    }

    // Include error context if configured
    if (this.config?.includeErrorContext) {
      errorResponse.details = {
        ...errorResponse.details,
        path: request.url,
        method: request.method,
        timestamp: timestamp,
      };
    }

    return errorResponse;
  }

  /**
   * Format validation errors into a consistent structure
   */
  private formatValidationErrors(messages: any[]): Array<{
    field: string;
    message: string;
    value?: any;
  }> {
    return messages.map((msg) => {
      if (typeof msg === 'string') {
        // Try to parse validation error format like "field should not be empty"
        const match = msg.match(/^(\w+)\s+(.+)$/);
        if (match) {
          return {
            field: match[1],
            message: match[2],
          };
        }
        return {
          field: 'unknown',
          message: msg,
        };
      }

      if (typeof msg === 'object' && msg !== null) {
        return {
          field: msg.field || msg.property || 'unknown',
          message: msg.message || msg.error || 'Validation failed',
          value: msg.value,
        };
      }

      return {
        field: 'unknown',
        message: String(msg),
      };
    });
  }

  /**
   * Get custom error message for error type
   */
  private getCustomErrorMessage(errorType: string): string | null {
    if (!this.config?.customErrorMessages) {
      return null;
    }

    return this.config.customErrorMessages[errorType] || null;
  }

  /**
   * Log error with context information
   */
  private logError(error: any, request: any): void {
    const errorLog = {
      type: 'ERROR_INTERCEPTOR',
      timestamp: new Date().toISOString(),
      requestId: this.getRequestId(request),
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      error: {
        name: error.constructor?.name || 'UnknownError',
        message: error.message || 'Unknown error occurred',
        status: error.status || error.statusCode || 500,
      } as any,
      user: request.user
        ? {
            id: request.user.id || request.user.sub,
            email: request.user.email,
          }
        : null,
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      errorLog.error.stack = error.stack;
    }

    // Add validation details if available
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response && 'message' in response) {
        errorLog.error.validationErrors = response.message;
      }
    }

    this.logger.error(errorLog);
  }

  /**
   * Get request ID from headers
   */
  private getRequestId(request: any): string {
    return (
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      request.headers['x-trace-id'] ||
      `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
