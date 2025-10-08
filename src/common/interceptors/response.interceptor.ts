import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  ApiResponse,
  ResponseInterceptorConfig,
  PaginatedData,
} from './interfaces/interceptor.interface';
import { INTERCEPTOR_CONFIG, DEFAULT_INTERCEPTOR_CONFIG } from './constants';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(
    @Optional()
    @Inject(INTERCEPTOR_CONFIG)
    private readonly config: ResponseInterceptorConfig = DEFAULT_INTERCEPTOR_CONFIG.response,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // Skip if disabled
    if (this.config?.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode?: number }>();

    // Skip excluded routes
    const url = request.url || '';
    if (this.isExcludedRoute(url)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: T) => {
        const apiResponse: ApiResponse<T> = {
          success: true,
          code: response.statusCode ?? 200,
          data: this.processData(data),
          messages: this.config?.customSuccessMessage
            ? [this.config.customSuccessMessage]
            : [],
        };

        // Add timestamp if enabled
        if (this.config?.includeTimestamp) {
          apiResponse.timestamp = new Date().toISOString();
        }

        // Add request ID if enabled
        if (this.config?.includeRequestId) {
          apiResponse.requestId = this.extractRequestId(request);
        }

        // Add server information if enabled
        if (this.config?.includeServerInfo) {
          apiResponse.server = {
            name: process.env.APP_NAME || 'NestJS API',
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
          };
        }

        // Add pagination meta if data is paginated
        if (this.isPaginatedData(data)) {
          apiResponse.meta = this.createPaginationMeta(data as any);
        }

        return apiResponse;
      }),
    );
  }

  /**
   * Process response data based on configuration
   */
  private processData(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    // Wrap single values if configured (except for objects and arrays)
    if (this.config?.wrapSingleValues && !this.isComplexType(data)) {
      return data;
    }

    return data;
  }

  /**
   * Check if data is a complex type (object or array)
   */
  private isComplexType(data: any): boolean {
    return typeof data === 'object' && data !== null;
  }

  /**
   * Check if route should be excluded from response transformation
   */
  private isExcludedRoute(url: string): boolean {
    const defaultExcluded = DEFAULT_INTERCEPTOR_CONFIG.response.excludeRoutes;
    const configExcluded = this.config?.excludeRoutes || [];
    const allExcluded = [...defaultExcluded, ...configExcluded];

    return allExcluded.some((excluded) => url.includes(excluded));
  }

  /**
   * Check if data contains pagination information
   */
  private isPaginatedData(data: any): data is PaginatedData {
    return (
      data &&
      typeof data === 'object' &&
      'items' in data &&
      'page' in data &&
      'limit' in data &&
      'total' in data &&
      Array.isArray(data.items)
    );
  }

  /**
   * Create pagination metadata
   */
  private createPaginationMeta(data: PaginatedData): ApiResponse['meta'] {
    const totalPages = Math.ceil(data.total / data.limit);

    return {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages,
      hasNext: data.page < totalPages,
      hasPrev: data.page > 1,
    };
  }

  /**
   * Extract request ID from various sources
   */
  private extractRequestId(request: any): string {
    return (
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      request.headers['x-trace-id'] ||
      this.generateRequestId()
    );
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `req_${timestamp}_${random}`;
  }
}
