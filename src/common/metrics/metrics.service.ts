import { Injectable } from '@nestjs/common';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestsTotal: Counter<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly databaseConnections: Gauge<string>;

  constructor() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics();

    // HTTP request duration histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    });

    // HTTP requests total counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Active connections gauge
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
    });

    // Database connections gauge
    this.databaseConnections = new Gauge({
      name: 'database_connections',
      help: 'Number of database connections',
    });
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
}
