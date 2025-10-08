import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { MetricsService, METRICS_CONFIG } from './metrics.service';
import type {
  MetricsConfig,
  HttpMetricsData,
  ErrorMetricsData,
} from './interfaces/metrics.interface';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    private readonly metricsService: MetricsService,
    @Optional()
    @Inject(METRICS_CONFIG)
    private readonly config?: MetricsConfig,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Skip if metrics are disabled
    if (
      !this.metricsService.isEnabled() ||
      this.config?.enableHttpMetrics === false
    ) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip metrics collection for excluded routes
    const url = request.url || '';
    if (this.isExcludedRoute(url)) {
      return next.handle();
    }

    const startTime = process.hrtime.bigint();

    // Extract additional context
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      this.generateCorrelationId();

    const userId = request.user?.id || request.user?.sub;
    const userAgent = request.headers['user-agent'];
    const ip = this.getClientIp(request);

    // Increment active connections
    this.metricsService.incrementActiveConnections();

    return next.handle().pipe(
      tap(() => {
        // Successful request
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

        const httpData: HttpMetricsData = {
          method: request.method || 'unknown',
          route: this.getRoutePath(request),
          statusCode: response.statusCode || 200,
          duration,
          timestamp: new Date(),
          userAgent,
          ip,
          userId,
          correlationId,
        };

        this.metricsService.recordHttpRequest(httpData);
        this.metricsService.decrementActiveConnections();
      }),
      catchError((error: unknown) => {
        // Error request
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;
        const statusCode = response.statusCode || 500;

        // Record the request metrics
        const httpData: HttpMetricsData = {
          method: request.method || 'unknown',
          route: this.getRoutePath(request),
          statusCode,
          duration,
          timestamp: new Date(),
          userAgent,
          ip,
          userId,
          correlationId,
        };

        this.metricsService.recordHttpRequest(httpData);

        // Record error-specific metrics
        const errorData: ErrorMetricsData = {
          method: request.method || 'unknown',
          route: this.getRoutePath(request),
          statusCode,
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          userId,
          correlationId,
        };

        this.metricsService.recordHttpError(errorData);
        this.metricsService.decrementActiveConnections();

        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if route should be excluded from metrics
   */
  private isExcludedRoute(url: string): boolean {
    const defaultExcluded = ['/metrics', '/health'];
    const configExcluded = this.config?.excludedRoutes || [];
    const allExcluded = [...defaultExcluded, ...configExcluded];

    return allExcluded.some((excluded) => url.includes(excluded));
  }

  /**
   * Get route path from request
   */
  private getRoutePath(request: any): string {
    return request.route?.path || request.url || 'unknown';
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: any): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      'unknown'
    );
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
