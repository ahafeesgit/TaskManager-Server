import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { LoggingInterceptorConfig } from './interfaces/interceptor.interface';
import {
  INTERCEPTOR_CONFIG,
  DEFAULT_INTERCEPTOR_CONFIG,
  SENSITIVE_FIELDS,
  METHODS_WITHOUT_BODY,
} from './constants';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    @Optional()
    @Inject(INTERCEPTOR_CONFIG)
    private readonly config: LoggingInterceptorConfig = DEFAULT_INTERCEPTOR_CONFIG.logging,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (this.config?.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, body, query, params, headers, user } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const ip = this.getClientIp(request);
    const correlationId = this.getCorrelationId(request);

    // Skip excluded routes
    if (this.isExcludedRoute(url)) {
      return next.handle();
    }

    const startTime = Date.now();

    // Log request
    if (this.config?.logRequests !== false) {
      const requestLog: any = {
        type: 'HTTP_REQUEST',
        method,
        url,
        correlationId,
        timestamp: new Date().toISOString(),
        ip,
        userAgent,
      };

      // Add query parameters if enabled
      if (this.config?.logQueryParams && Object.keys(query || {}).length > 0) {
        requestLog.query = this.sanitizeData(query);
      }

      // Add request parameters
      if (Object.keys(params || {}).length > 0) {
        requestLog.params = this.sanitizeData(params);
      }

      // Add request body if method supports it
      if (!METHODS_WITHOUT_BODY.includes(method?.toUpperCase()) && body) {
        requestLog.body = this.sanitizeData(body);
      }

      // Add headers if enabled
      if (this.config?.logHeaders) {
        requestLog.headers = this.sanitizeHeaders(headers);
      }

      // Add user information if enabled and available
      if (this.config?.logUserInfo && user) {
        requestLog.user = {
          id: user.id || user.sub,
          email: user.email,
          role: user.role,
        };
      }

      this.logger.log(requestLog);
    }

    return next.handle().pipe(
      tap((responseData) => {
        const duration = Date.now() - startTime;

        // Log successful response
        if (this.config?.logResponses !== false) {
          const responseLog: any = {
            type: 'HTTP_RESPONSE',
            method,
            url,
            statusCode: response.statusCode,
            correlationId,
            timestamp: new Date().toISOString(),
          };

          // Add performance metrics if enabled
          if (this.config?.includePerformanceMetrics) {
            responseLog.performance = {
              duration: `${duration}ms`,
              memoryUsage: this.getMemoryUsage(),
            };
          }

          // Add response data if enabled (be careful in production)
          if (this.config?.logResponses && responseData) {
            const sanitizedResponse = this.sanitizeData(responseData);
            const responseStr = JSON.stringify(sanitizedResponse);

            responseLog.responseSize = responseStr.length;

            // Only log response data if it's within size limit
            if (responseStr.length <= (this.config?.maxBodyLength || 1000)) {
              responseLog.data = sanitizedResponse;
            } else {
              responseLog.data = '[RESPONSE_TOO_LARGE]';
            }
          }

          this.logger.log(responseLog);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        const errorLog: any = {
          type: 'HTTP_ERROR',
          method,
          url,
          statusCode: error.status || error.statusCode || 500,
          correlationId,
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`,
          error: {
            name: error.name || 'UnknownError',
            message: error.message || 'An unknown error occurred',
          },
        };

        // Add user context if available
        if (user) {
          errorLog.user = {
            id: user.id || user.sub,
            email: user.email,
          };
        }

        // Add stack trace in development
        if (process.env.NODE_ENV === 'development' && error.stack) {
          errorLog.error.stack = error.stack;
        }

        // Add validation errors if available
        if (error.response?.message && Array.isArray(error.response.message)) {
          errorLog.error.validationErrors = error.response.message;
        }

        this.logger.error(errorLog);

        return throwError(() => error);
      }),
    );
  }

  /**
   * Sanitize sensitive data from objects
   */
  private sanitizeData(data: any): any {
    if (!this.config?.sanitizeData) {
      return data;
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();

      // Check if field is sensitive
      if (SENSITIVE_FIELDS.some((field) => keyLower.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize HTTP headers
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized: any = {};
    const headersToLog = [
      'content-type',
      'content-length',
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'connection',
      'host',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip',
      'x-correlation-id',
      'x-request-id',
      'x-trace-id',
    ];

    for (const [key, value] of Object.entries(headers)) {
      const keyLower = key.toLowerCase();

      if (headersToLog.includes(keyLower)) {
        sanitized[key] = value;
      } else if (
        keyLower.includes('auth') ||
        keyLower.includes('token') ||
        keyLower.includes('key')
      ) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Check if route should be excluded from logging
   */
  private isExcludedRoute(url: string): boolean {
    const defaultExcluded = DEFAULT_INTERCEPTOR_CONFIG.logging.excludeRoutes;
    const configExcluded = this.config?.excludeRoutes || [];
    const allExcluded = [...defaultExcluded, ...configExcluded];

    return allExcluded.some((excluded) => url.includes(excluded));
  }

  /**
   * Get client IP address from request
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

  /**
   * Get or generate correlation ID
   */
  private getCorrelationId(request: any): string {
    return (
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      request.headers['x-trace-id'] ||
      this.generateCorrelationId()
    );
  }

  /**
   * Generate a correlation ID
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `corr_${timestamp}_${random}`;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): any {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    };
  }
}
