import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import type { TimeoutInterceptorConfig } from './interfaces/interceptor.interface';
import {
  INTERCEPTOR_CONFIG,
  DEFAULT_INTERCEPTOR_CONFIG,
  COMMON_ROUTE_TIMEOUTS,
} from './constants';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  constructor(
    @Optional()
    @Inject(INTERCEPTOR_CONFIG)
    private readonly config: TimeoutInterceptorConfig = DEFAULT_INTERCEPTOR_CONFIG.timeout,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (this.config?.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Skip excluded routes
    if (this.isExcludedRoute(url)) {
      return next.handle();
    }

    // Determine timeout for this route
    const timeoutMs = this.getTimeoutForRoute(url);

    // Log timeout configuration for debugging
    this.logger.debug(`Setting timeout of ${timeoutMs}ms for ${method} ${url}`);

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          // Log timeout occurrence
          this.logger.warn({
            type: 'REQUEST_TIMEOUT',
            method,
            url,
            timeout: `${timeoutMs}ms`,
            timestamp: new Date().toISOString(),
            correlationId: request.headers['x-correlation-id'] || 'unknown',
          });

          const message =
            this.config?.timeoutMessage ||
            `Request timeout exceeded (${timeoutMs}ms)`;

          return throwError(() => new RequestTimeoutException(message));
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get timeout value for a specific route
   */
  private getTimeoutForRoute(url: string): number {
    // Check route-specific timeouts first
    if (this.config?.routeTimeouts) {
      for (const [routePattern, timeoutValue] of Object.entries(
        this.config.routeTimeouts,
      )) {
        if (url.includes(routePattern)) {
          return timeoutValue;
        }
      }
    }

    // Check common route timeouts
    for (const [routePattern, timeoutValue] of Object.entries(
      COMMON_ROUTE_TIMEOUTS,
    )) {
      if (url.includes(routePattern)) {
        return timeoutValue;
      }
    }

    // Return default timeout
    return this.config?.timeout || DEFAULT_INTERCEPTOR_CONFIG.timeout.timeout;
  }

  /**
   * Check if route should be excluded from timeout
   */
  private isExcludedRoute(url: string): boolean {
    const defaultExcluded = DEFAULT_INTERCEPTOR_CONFIG.timeout.excludeRoutes;
    const configExcluded = this.config?.excludeRoutes || [];
    const allExcluded = [...defaultExcluded, ...configExcluded];

    return allExcluded.some((excluded) => url.includes(excluded));
  }
}
