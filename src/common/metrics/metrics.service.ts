import { Injectable } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
  InjectMetric,
} from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge, register } from 'prom-client';

export const HTTP_REQUEST_DURATION = 'http_request_duration_seconds';
export const HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const ACTIVE_CONNECTIONS = 'active_connections';
export const DATABASE_CONNECTIONS = 'database_connections';

// Create metric providers
export const httpRequestDurationProvider = makeHistogramProvider({
  name: HTTP_REQUEST_DURATION,
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  // Optimized buckets for typical web application response times
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestsTotalProvider = makeCounterProvider({
  name: HTTP_REQUESTS_TOTAL,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const activeConnectionsProvider = makeGaugeProvider({
  name: ACTIVE_CONNECTIONS,
  help: 'Number of active connections',
});

export const databaseConnectionsProvider = makeGaugeProvider({
  name: DATABASE_CONNECTIONS,
  help: 'Number of database connections',
});

// Additional performance and error tracking metrics
export const ERROR_RATE = 'http_requests_errors_total';
export const MEMORY_USAGE = 'memory_usage_bytes';

export const errorRateProvider = makeCounterProvider({
  name: ERROR_RATE,
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
});

export const memoryUsageProvider = makeGaugeProvider({
  name: MEMORY_USAGE,
  help: 'Memory usage in bytes',
  labelNames: ['type'], // heap_used, heap_total, rss, external
});

@Injectable()
export class MetricsService {
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
  ) {
    // Start memory monitoring (low frequency to minimize impact)
    this.startMemoryMonitoring();
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    const labels = {
      method: method.toLowerCase(),
      route,
      status_code: statusCode.toString(),
    };

    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
    this.httpRequestsTotal.inc(labels);
  }

  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  setDatabaseConnections(count: number): void {
    this.databaseConnections.set(count);
  }

  async getMetrics(): Promise<string> {
    try {
      return await register.metrics();
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      // Return a safe fallback value; Prometheus expects a 200 with text/plain, even if empty or error
      return '# Error: Failed to collect metrics\n';
    }
  }

  clearMetrics(): void {
    register.clear();
  }

  // Record HTTP errors for error rate tracking
  recordHttpError(
    method: string,
    route: string,
    statusCode: number,
    errorType: string = 'unknown',
  ): void {
    const labels = {
      method: method.toLowerCase(),
      route,
      status_code: statusCode.toString(),
      error_type: errorType,
    };

    this.errorRate.inc(labels);
  }

  // Memory monitoring with minimal performance impact
  private startMemoryMonitoring(): void {
    // Only monitor in production or when explicitly enabled
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.METRICS_MEMORY_MONITORING !== 'true'
    ) {
      return;
    }

    // Monitor memory every 30 seconds to minimize performance impact
    setInterval(() => {
      try {
        const memUsage = process.memoryUsage();

        this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
        this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
        this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
        this.memoryUsage.set({ type: 'external' }, memUsage.external);
      } catch (error) {
        // Silently fail to avoid affecting application performance
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn('Memory monitoring failed:', errorMessage);
      }
    }, 30000); // 30 seconds interval
  }

  // Get comprehensive metrics summary for debugging
  getMetricsSummary(): {
    httpRequests: number;
    activeConnections: number;
    databaseConnections: number;
    memoryMB: number;
  } {
    const memUsage = process.memoryUsage();

    // Type-safe access to metric internal values for debugging
    let httpRequests = 0;
    let activeConnections = 0;
    let databaseConnections = 0;

    try {
      // Safe access to internal metric values (these are implementation details)
      const totalCounter = this.httpRequestsTotal as unknown as {
        _values?: Map<string, number>;
      };
      httpRequests = totalCounter._values?.size || 0;

      const activeGauge = this.activeConnections as unknown as {
        _value?: number;
      };
      activeConnections = activeGauge._value || 0;

      const dbGauge = this.databaseConnections as unknown as {
        _value?: number;
      };
      databaseConnections = dbGauge._value || 0;
    } catch {
      // If internal structure changes, gracefully fall back to 0 values
      // This is for debugging only, so failures are acceptable
    }

    return {
      httpRequests,
      activeConnections,
      databaseConnections,
      memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    };
  }
}
