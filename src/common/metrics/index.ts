// Main module exports
export { MetricsModule } from './metrics.module';
export { MetricsService, METRICS_CONFIG } from './metrics.service';
export { MetricsInterceptor } from './metrics.interceptor';
export { MetricsController } from './metrics.controller';

// Interface exports
export type {
  MetricsConfig,
  MetricsSummary,
  HttpMetricsData,
  ErrorMetricsData,
  DatabaseMetricsData,
  MemoryMetricsData,
  PerformanceMetrics,
  BusinessEventMetrics,
} from './interfaces/metrics.interface';
