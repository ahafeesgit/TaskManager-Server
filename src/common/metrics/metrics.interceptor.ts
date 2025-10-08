import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Skip metrics collection for metrics endpoint to avoid recursion
    const request = context.switchToHttp().getRequest();
    if (request.url?.includes('/metrics')) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const startTime = process.hrtime.bigint(); // More precise timing

    return next.handle().pipe(
      tap(() => {
        // Use high-resolution time for better accuracy
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

        const { method, route } = request;
        const { statusCode } = response;

        // Normalize route path to avoid high cardinality
        const normalizedRoute = this.normalizeRoute(route?.path || request.url);

        this.metricsService.recordHttpRequest(
          method,
          normalizedRoute,
          statusCode,
          duration,
        );
      }),
      catchError((error) => {
        // Record error metrics
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;

        const { method, route } = request;
        const statusCode = response.statusCode || 500;
        const normalizedRoute = this.normalizeRoute(route?.path || request.url);

        this.metricsService.recordHttpRequest(
          method,
          normalizedRoute,
          statusCode,
          duration,
        );

        // Record error-specific metrics
        this.metricsService.recordHttpError(
          method,
          normalizedRoute,
          statusCode,
          error.name || 'UnknownError',
        );

        return throwError(() => error);
      }),
    );
  }

  /**
   * Normalize route paths to prevent high cardinality metrics
   * Replace dynamic segments with placeholders
   */
  private normalizeRoute(path: string): string {
    if (!path) return 'unknown';

    return (
      path
        // Replace UUIDs with placeholder
        .replace(
          /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
          '/:id',
        )
        // Replace numeric IDs with placeholder
        .replace(/\/\d+/g, '/:id')
        // Replace query parameters
        .replace(/\?.*$/, '')
        // Limit length to prevent memory issues
        .substring(0, 100)
    );
  }
}
