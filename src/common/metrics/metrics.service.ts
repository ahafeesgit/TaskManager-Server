import { Injectable, Inject, Optional, OnModuleDestroy } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
  InjectMetric,
} from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge, register } from 'prom-client';
import type {
  MetricsConfig,
  MetricsSummary,
  HttpMetricsData,
  ErrorMetricsData,
  DatabaseMetricsData,
  MemoryMetricsData,
  PerformanceMetrics,
  BusinessEventMetrics,
} from './interfaces/metrics.interface';

// Metric names constants
export const HTTP_REQUEST_DURATION = 'http_request_duration_seconds';
export const HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const ACTIVE_CONNECTIONS = 'active_connections';
export const DATABASE_CONNECTIONS = 'database_connections';
export const ERROR_RATE = 'http_requests_errors_total';
export const MEMORY_USAGE = 'memory_usage_bytes';
export const DATABASE_QUERY_DURATION = 'database_query_duration_seconds';
export const BUSINESS_EVENTS_TOTAL = 'business_events_total';
export const PERFORMANCE_OPERATIONS_DURATION =
  'performance_operations_duration_seconds';

// Configuration token
export const METRICS_CONFIG = 'METRICS_CONFIG';

// Default configuration
export const defaultMetricsConfig: MetricsConfig = {
  enabled: true,
  enableDefaultMetrics: true,
  enableHttpMetrics: true,
  enableDatabaseMetrics: false, // Disabled by default for security
  enableMemoryMonitoring: false, // Disabled by default for performance
  memoryMonitoringInterval: 30, // seconds
  responseTimeBuckets: [
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
  ],
  maxRouteLength: 100,
  excludedRoutes: ['/metrics', '/health'],
  enableErrorTracking: true,
};

// Create metric providers with factory functions
export const createHttpRequestDurationProvider = (config: MetricsConfig = {}) =>
  makeHistogramProvider({
    name: config.prefix
      ? `${config.prefix}_${HTTP_REQUEST_DURATION}`
      : HTTP_REQUEST_DURATION,
    help: 'Duration of HTTP requests in seconds',
    labelNames: [
      'method',
      'route',
      'status_code',
      ...(config.defaultLabels ? Object.keys(config.defaultLabels) : []),
    ],
    buckets:
      config.responseTimeBuckets || defaultMetricsConfig.responseTimeBuckets,
  });

export const createHttpRequestsTotalProvider = (config: MetricsConfig = {}) =>
  makeCounterProvider({
    name: config.prefix
      ? `${config.prefix}_${HTTP_REQUESTS_TOTAL}`
      : HTTP_REQUESTS_TOTAL,
    help: 'Total number of HTTP requests',
    labelNames: [
      'method',
      'route',
      'status_code',
      ...(config.defaultLabels ? Object.keys(config.defaultLabels) : []),
    ],
  });

export const createActiveConnectionsProvider = (config: MetricsConfig = {}) =>
  makeGaugeProvider({
    name: config.prefix
      ? `${config.prefix}_${ACTIVE_CONNECTIONS}`
      : ACTIVE_CONNECTIONS,
    help: 'Number of active connections',
    labelNames: config.defaultLabels ? Object.keys(config.defaultLabels) : [],
  });

export const createDatabaseConnectionsProvider = (config: MetricsConfig = {}) =>
  makeGaugeProvider({
    name: config.prefix
      ? `${config.prefix}_${DATABASE_CONNECTIONS}`
      : DATABASE_CONNECTIONS,
    help: 'Number of database connections',
    labelNames: config.defaultLabels ? Object.keys(config.defaultLabels) : [],
  });

export const createErrorRateProvider = (config: MetricsConfig = {}) =>
  makeCounterProvider({
    name: config.prefix ? `${config.prefix}_${ERROR_RATE}` : ERROR_RATE,
    help: 'Total number of HTTP request errors',
    labelNames: [
      'method',
      'route',
      'status_code',
      'error_type',
      ...(config.defaultLabels ? Object.keys(config.defaultLabels) : []),
    ],
  });

export const createMemoryUsageProvider = (config: MetricsConfig = {}) =>
  makeGaugeProvider({
    name: config.prefix ? `${config.prefix}_${MEMORY_USAGE}` : MEMORY_USAGE,
    help: 'Memory usage in bytes',
    labelNames: [
      'type',
      ...(config.defaultLabels ? Object.keys(config.defaultLabels) : []),
    ], // heap_used, heap_total, rss, external
  });

export const createDatabaseQueryDurationProvider = (
  config: MetricsConfig = {},
) =>
  makeHistogramProvider({
    name: config.prefix
      ? `${config.prefix}_${DATABASE_QUERY_DURATION}`
      : DATABASE_QUERY_DURATION,
    help: 'Duration of database queries in seconds',
    labelNames: [
      'operation',
      'table',
      'success',
      ...(config.defaultLabels ? Object.keys(config.defaultLabels) : []),
    ],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });

export const createBusinessEventsProvider = (config: MetricsConfig = {}) =>
  makeCounterProvider({
    name: config.prefix
      ? `${config.prefix}_${BUSINESS_EVENTS_TOTAL}`
      : BUSINESS_EVENTS_TOTAL,
    help: 'Total number of business events',
    labelNames: [
      'event_name',
      'event_type',
      ...(config.defaultLabels ? Object.keys(config.defaultLabels) : []),
    ],
  });

export const createPerformanceOperationsProvider = (
  config: MetricsConfig = {},
) =>
  makeHistogramProvider({
    name: config.prefix
      ? `${config.prefix}_${PERFORMANCE_OPERATIONS_DURATION}`
      : PERFORMANCE_OPERATIONS_DURATION,
    help: 'Duration of performance-tracked operations in seconds',
    labelNames: [
      'operation_name',
      'success',
      ...(config.defaultLabels ? Object.keys(config.defaultLabels) : []),
    ],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

// Convenience exports for backward compatibility
export const httpRequestDurationProvider = createHttpRequestDurationProvider();
export const httpRequestsTotalProvider = createHttpRequestsTotalProvider();
export const activeConnectionsProvider = createActiveConnectionsProvider();
export const databaseConnectionsProvider = createDatabaseConnectionsProvider();
export const errorRateProvider = createErrorRateProvider();
export const memoryUsageProvider = createMemoryUsageProvider();

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private memoryMonitoringInterval: NodeJS.Timeout | null = null;
  private requestCount = 0;
  private errorCount = 0;

  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION)
    private readonly httpRequestDuration: Histogram<string>,
    @InjectMetric(HTTP_REQUESTS_TOTAL)
    private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric(ACTIVE_CONNECTIONS)
    private readonly activeConnections: Gauge<string>,
    @InjectMetric(DATABASE_CONNECTIONS)
    private readonly databaseConnections: Gauge<string>,
    @InjectMetric(ERROR_RATE)
    private readonly errorRate: Counter<string>,
    @InjectMetric(MEMORY_USAGE)
    private readonly memoryUsage: Gauge<string>,
    @Optional()
    @InjectMetric(DATABASE_QUERY_DURATION)
    private readonly databaseQueryDuration?: Histogram<string>,
    @Optional()
    @InjectMetric(BUSINESS_EVENTS_TOTAL)
    private readonly businessEventsTotal?: Counter<string>,
    @Optional()
    @InjectMetric(PERFORMANCE_OPERATIONS_DURATION)
    private readonly performanceOperationsDuration?: Histogram<string>,
    @Optional()
    @Inject(METRICS_CONFIG)
    private readonly config: MetricsConfig = defaultMetricsConfig,
  ) {
    // Merge with default config
    this.config = { ...defaultMetricsConfig, ...config };

    // Start monitoring based on configuration
    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(data: HttpMetricsData): void;
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void;
  recordHttpRequest(
    methodOrData: string | HttpMetricsData,
    route?: string,
    statusCode?: number,
    duration?: number,
  ): void {
    if (!this.config.enableHttpMetrics) return;

    let data: HttpMetricsData;
    if (typeof methodOrData === 'string') {
      data = {
        method: methodOrData,
        route: route!,
        statusCode: statusCode!,
        duration: duration!,
        timestamp: new Date(),
      };
    } else {
      data = methodOrData;
    }

    // Skip excluded routes
    if (
      this.config.excludedRoutes?.some((excluded) =>
        data.route.includes(excluded),
      )
    ) {
      return;
    }

    // Normalize route to prevent high cardinality
    const normalizedRoute = this.normalizeRoute(data.route);

    const labels: Record<string, string> = {
      method: data.method.toLowerCase(),
      route: normalizedRoute,
      status_code: data.statusCode.toString(),
      ...this.config.defaultLabels,
    };

    // Convert duration to seconds for Prometheus
    const durationSeconds = data.duration / 1000;

    try {
      this.httpRequestDuration.observe(labels, durationSeconds);
      this.httpRequestsTotal.inc(labels);
      this.requestCount++;

      // Track errors
      if (data.statusCode >= 400) {
        this.errorCount++;
      }
    } catch (error) {
      // Silently fail to prevent affecting application performance
      console.warn('Failed to record HTTP metrics:', error);
    }
  }

  /**
   * Normalize route path to prevent high cardinality metrics
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
        .substring(0, this.config.maxRouteLength || 100)
    );
  }

  /**
   * Connection management
   */
  incrementActiveConnections(): void {
    try {
      const labels = this.config.defaultLabels || {};
      this.activeConnections.inc(labels);
    } catch (error) {
      console.warn('Failed to increment active connections:', error);
    }
  }

  decrementActiveConnections(): void {
    try {
      const labels = this.config.defaultLabels || {};
      this.activeConnections.dec(labels);
    } catch (error) {
      console.warn('Failed to decrement active connections:', error);
    }
  }

  setDatabaseConnections(count: number): void {
    try {
      const labels = this.config.defaultLabels || {};
      this.databaseConnections.set(labels, count);
    } catch (error) {
      console.warn('Failed to set database connections:', error);
    }
  }

  /**
   * Get Prometheus metrics
   */
  async getMetrics(): Promise<string> {
    if (!this.config.enabled) {
      return '# Metrics disabled\n';
    }

    try {
      return await register.metrics();
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      // Return a safe fallback value; Prometheus expects a 200 with text/plain, even if empty or error
      return '# Error: Failed to collect metrics\n';
    }
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    register.clear();
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Record HTTP error metrics
   */
  recordHttpError(data: ErrorMetricsData): void;
  recordHttpError(
    method: string,
    route: string,
    statusCode: number,
    errorType?: string,
  ): void;
  recordHttpError(
    methodOrData: string | ErrorMetricsData,
    route?: string,
    statusCode?: number,
    errorType: string = 'unknown',
  ): void {
    if (!this.config.enableErrorTracking) return;

    let data: ErrorMetricsData;
    if (typeof methodOrData === 'string') {
      data = {
        method: methodOrData,
        route: route!,
        statusCode: statusCode!,
        errorType,
        timestamp: new Date(),
      };
    } else {
      data = methodOrData;
    }

    const normalizedRoute = this.normalizeRoute(data.route);
    const labels: Record<string, string> = {
      method: data.method.toLowerCase(),
      route: normalizedRoute,
      status_code: data.statusCode.toString(),
      error_type: data.errorType,
      ...this.config.defaultLabels,
    };

    try {
      this.errorRate.inc(labels);
      this.errorCount++;
    } catch (error) {
      console.warn('Failed to record error metrics:', error);
    }
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseQuery(data: DatabaseMetricsData): void {
    if (!this.config.enableDatabaseMetrics || !this.databaseQueryDuration)
      return;

    const labels: Record<string, string> = {
      operation: data.operation.toLowerCase(),
      table: data.table || 'unknown',
      success: data.success.toString(),
      ...this.config.defaultLabels,
    };

    try {
      this.databaseQueryDuration.observe(labels, data.duration / 1000); // Convert to seconds
    } catch (error) {
      console.warn('Failed to record database metrics:', error);
    }
  }

  /**
   * Record business event metrics
   */
  recordBusinessEvent(data: BusinessEventMetrics): void {
    if (!this.businessEventsTotal) return;

    const labels: Record<string, string> = {
      event_name: data.eventName,
      event_type: data.eventType,
      ...this.config.defaultLabels,
    };

    try {
      this.businessEventsTotal.inc(labels);
    } catch (error) {
      console.warn('Failed to record business event metrics:', error);
    }
  }

  /**
   * Record performance operation metrics
   */
  recordPerformanceOperation(data: PerformanceMetrics): void {
    if (!this.performanceOperationsDuration) return;

    const labels: Record<string, string> = {
      operation_name: data.operationName,
      success: data.success.toString(),
      ...this.config.defaultLabels,
    };

    try {
      this.performanceOperationsDuration.observe(labels, data.duration / 1000); // Convert to seconds
    } catch (error) {
      console.warn('Failed to record performance metrics:', error);
    }
  }

  /**
   * Update memory usage metrics
   */
  updateMemoryMetrics(data?: MemoryMetricsData): void {
    if (!this.config.enableMemoryMonitoring) return;

    const memoryData = data || {
      ...process.memoryUsage(),
      timestamp: new Date(),
    };

    const baseLabels = this.config.defaultLabels || {};

    try {
      this.memoryUsage.set(
        { ...baseLabels, type: 'heap_used' },
        memoryData.heapUsed,
      );
      this.memoryUsage.set(
        { ...baseLabels, type: 'heap_total' },
        memoryData.heapTotal,
      );
      this.memoryUsage.set({ ...baseLabels, type: 'rss' }, memoryData.rss);
      this.memoryUsage.set(
        { ...baseLabels, type: 'external' },
        memoryData.external,
      );
    } catch (error) {
      console.warn('Failed to update memory metrics:', error);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (!this.config.enableMemoryMonitoring) return;

    const intervalMs = (this.config.memoryMonitoringInterval || 30) * 1000;

    this.memoryMonitoringInterval = setInterval(() => {
      this.updateMemoryMetrics();
    }, intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
    }
  }

  /**
   * Cleanup resources when service is destroyed
   */
  onModuleDestroy(): void {
    this.stopMemoryMonitoring();
  }

  /**
   * Get comprehensive metrics summary for debugging and monitoring
   */
  getMetricsSummary(): MetricsSummary {
    const memUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      totalRequests: this.requestCount,
      activeConnections: 0, // This would need to be tracked separately
      databaseConnections: 0, // This would need to be tracked separately
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      errorRate:
        this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): MetricsConfig {
    return { ...this.config };
  }

  /**
   * Check if metrics are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled || false;
  }

  /**
   * Create a child metrics service with additional default labels
   */
  createChildService(additionalLabels: Record<string, string>): MetricsService {
    const childConfig: MetricsConfig = {
      ...this.config,
      defaultLabels: {
        ...this.config.defaultLabels,
        ...additionalLabels,
      },
    };

    // Return a new instance with merged labels
    // Note: This is a simplified implementation - in practice you might want
    // to create a proper child service with dependency injection
    return new MetricsService(
      this.httpRequestDuration,
      this.httpRequestsTotal,
      this.activeConnections,
      this.databaseConnections,
      this.errorRate,
      this.memoryUsage,
      this.databaseQueryDuration,
      this.businessEventsTotal,
      this.performanceOperationsDuration,
      childConfig,
    );
  }
}
