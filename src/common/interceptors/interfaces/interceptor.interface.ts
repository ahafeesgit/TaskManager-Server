/**
 * Configuration interface for the Interceptors Module
 */
export interface InterceptorConfig {
  /** Response transformation interceptor configuration */
  response?: ResponseInterceptorConfig;

  /** HTTP request/response logging interceptor configuration */
  logging?: LoggingInterceptorConfig;

  /** Request timeout interceptor configuration */
  timeout?: TimeoutInterceptorConfig;

  /** Data transformation interceptor configuration */
  transform?: TransformInterceptorConfig;

  /** Error handling interceptor configuration */
  error?: ErrorInterceptorConfig;
}

/**
 * Response Interceptor Configuration
 * Controls how API responses are standardized and formatted
 */
export interface ResponseInterceptorConfig {
  /** Enable/disable the response interceptor */
  enabled?: boolean;

  /** Include timestamp in responses */
  includeTimestamp?: boolean;

  /** Include request ID for tracing */
  includeRequestId?: boolean;

  /** Routes to exclude from response transformation */
  excludeRoutes?: string[];

  /** Custom success message to include */
  customSuccessMessage?: string;

  /** Include server information in response */
  includeServerInfo?: boolean;

  /** Wrap single values in data property */
  wrapSingleValues?: boolean;
}

/**
 * Logging Interceptor Configuration
 * Controls what gets logged for requests and responses
 */
export interface LoggingInterceptorConfig {
  /** Enable/disable the logging interceptor */
  enabled?: boolean;

  /** Log incoming requests */
  logRequests?: boolean;

  /** Log outgoing responses */
  logResponses?: boolean;

  /** Sanitize sensitive data in logs */
  sanitizeData?: boolean;

  /** Routes to exclude from logging */
  excludeRoutes?: string[];

  /** Maximum request/response body length to log */
  maxBodyLength?: number;

  /** Log request headers */
  logHeaders?: boolean;

  /** Log query parameters */
  logQueryParams?: boolean;

  /** Log user information if available */
  logUserInfo?: boolean;

  /** Include performance metrics in logs */
  includePerformanceMetrics?: boolean;
}

/**
 * Timeout Interceptor Configuration
 * Controls request timeout behavior
 */
export interface TimeoutInterceptorConfig {
  /** Enable/disable the timeout interceptor */
  enabled?: boolean;

  /** Default timeout in milliseconds */
  timeout?: number;

  /** Routes to exclude from timeout */
  excludeRoutes?: string[];

  /** Route-specific timeout configurations */
  routeTimeouts?: Record<string, number>;

  /** Custom timeout error message */
  timeoutMessage?: string;
}

/**
 * Cache Interceptor Configuration
 * Controls response caching behavior
 */
export interface CacheInterceptorConfig {
  /** Enable/disable the cache interceptor */
  enabled?: boolean;

  /** Default TTL in seconds */
  ttl?: number;

  /** Routes to include in caching */
  includeRoutes?: string[];

  /** Routes to exclude from caching */
  excludeRoutes?: string[];

  /** Custom cache key generator */
  keyGenerator?: (context: ExecutionContext) => string;

  /** Cache only successful responses */
  cacheOnlySuccess?: boolean;
}

/**
 * Transform Interceptor Configuration
 * Controls data transformation and sanitization
 */
export interface TransformInterceptorConfig {
  /** Enable/disable the transform interceptor */
  enabled?: boolean;

  /** Remove null values from responses */
  removeNullValues?: boolean;

  /** Remove undefined values from responses */
  removeUndefinedValues?: boolean;

  /** Trim whitespace from string values */
  trimStrings?: boolean;

  /** Convert email fields to lowercase */
  lowercaseEmails?: boolean;

  /** Convert date strings to ISO format */
  standardizeDates?: boolean;

  /** Remove empty objects and arrays */
  removeEmptyObjects?: boolean;

  /** Convert numeric strings to numbers */
  convertNumericStrings?: boolean;
}

/**
 * Error Interceptor Configuration
 * Controls error handling and transformation
 */
export interface ErrorInterceptorConfig {
  /** Enable/disable the error interceptor */
  enabled?: boolean;

  /** Include stack trace in error responses */
  includeStackTrace?: boolean;

  /** Log errors automatically */
  logErrors?: boolean;

  /** Custom error messages for specific error types */
  customErrorMessages?: Record<string, string>;

  /** Transform validation errors */
  transformValidationErrors?: boolean;

  /** Include error context information */
  includeErrorContext?: boolean;
}

/**
 * Standardized API Response Interface
 */
export interface ApiResponse<T = any> {
  /** Success status of the operation */
  success: boolean;

  /** HTTP status code */
  code: number;

  /** Response data */
  data: T;

  /** Array of messages (info, warnings, etc.) */
  messages: string[];

  /** Optional timestamp */
  timestamp?: string;

  /** Optional request ID for tracing */
  requestId?: string;

  /** Optional server information */
  server?: {
    name?: string;
    version?: string;
    environment?: string;
  };

  /** Optional pagination metadata */
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

/**
 * Error Response Interface
 */
export interface ErrorResponse {
  /** Always false for errors */
  success: false;

  /** HTTP status code */
  code: number;

  /** Error message */
  error: string;

  /** Detailed error information */
  details?: any;

  /** Error timestamp */
  timestamp: string;

  /** Request ID for tracing */
  requestId?: string;

  /** Stack trace (development only) */
  stack?: string;

  /** Validation errors (if applicable) */
  validationErrors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Pagination Data Interface
 */
export interface PaginatedData<T = any> {
  /** Array of items */
  items: T[];

  /** Current page number */
  page: number;

  /** Items per page */
  limit: number;

  /** Total number of items */
  total: number;

  /** Total number of pages */
  totalPages?: number;

  /** Whether there's a next page */
  hasNext?: boolean;

  /** Whether there's a previous page */
  hasPrev?: boolean;
}

/**
 * Execution Context from NestJS (for reference)
 */
export interface ExecutionContext {
  getClass(): any;
  getHandler(): any;
  getArgs(): any[];
  getArgByIndex(index: number): any;
  switchToRpc(): any;
  switchToHttp(): any;
  switchToWs(): any;
  getType(): string;
}
