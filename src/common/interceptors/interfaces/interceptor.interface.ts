/**
 * Simple Interceptor Configuration
 * Just for standardizing API responses
 */
export interface InterceptorConfig {
  /** Response standardization interceptor */
  response?: ResponseInterceptorConfig;
}

/**
 * Response Interceptor Configuration
 * Standardizes all API responses to consistent format
 */
export interface ResponseInterceptorConfig {
  /** Enable/disable response standardization */
  enabled?: boolean;

  /** Routes to skip (like /health, /metrics) */
  excludeRoutes?: string[];
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
