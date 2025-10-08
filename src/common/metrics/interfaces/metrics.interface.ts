/**
 * Metrics Configuration Interface
 * Defines configuration options for the metrics module
 */
export interface MetricsConfig {
  /** Enable/disable metrics collection globally */
  enabled?: boolean;

  /** Enable default Prometheus metrics (process, GC, etc.) */
  enableDefaultMetrics?: boolean;

  /** Custom prefix for all metrics */
  prefix?: string;

  /** Enable HTTP request metrics collection */
  enableHttpMetrics?: boolean;

  /** Enable database metrics collection */
  enableDatabaseMetrics?: boolean;

  /** Enable memory monitoring */
  enableMemoryMonitoring?: boolean;

  /** Memory monitoring interval in seconds */
  memoryMonitoringInterval?: number;

  /** Custom labels to add to all metrics */
  defaultLabels?: Record<string, string>;

  /** Routes to exclude from metrics collection */
  excludedRoutes?: string[];

  /** Enable detailed error tracking */
  enableErrorTracking?: boolean;

  /** Custom response time buckets for histogram metrics */
  responseTimeBuckets?: number[];

  /** Maximum route path length to prevent high cardinality */
  maxRouteLength?: number;
}

/**
 * Metrics Summary for debugging and monitoring
 */
export interface MetricsSummary {
  /** Current timestamp */
  timestamp: string;

  /** Application environment */
  environment: string;

  /** Total HTTP requests processed */
  totalRequests: number;

  /** Current active connections */
  activeConnections: number;

  /** Current database connections */
  databaseConnections: number;

  /** Current memory usage in MB */
  memoryUsageMB: number;

  /** Application uptime in seconds */
  uptimeSeconds: number;

  /** Error rate (errors per total requests) */
  errorRate: number;
}

/**
 * HTTP Request Metrics Data
 */
export interface HttpMetricsData {
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: string;
  correlationId?: string;
}

/**
 * Error Metrics Data
 */
export interface ErrorMetricsData {
  method: string;
  route: string;
  statusCode: number;
  errorType: string;
  errorMessage?: string;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
}

/**
 * Database Metrics Data
 */
export interface DatabaseMetricsData {
  operation: string;
  table?: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Memory Metrics Data
 */
export interface MemoryMetricsData {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  timestamp: Date;
}

/**
 * Custom Metric Types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Custom Metric Definition
 */
export interface CustomMetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labelNames?: string[];
  buckets?: number[]; // For histogram metrics
}

/**
 * Performance Metrics for business logic tracking
 */
export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, string | number>;
  timestamp: Date;
}

/**
 * Business Event Metrics
 */
export interface BusinessEventMetrics {
  eventName: string;
  eventType: 'user_action' | 'system_event' | 'business_process';
  userId?: string;
  metadata?: Record<string, string | number>;
  timestamp: Date;
}
