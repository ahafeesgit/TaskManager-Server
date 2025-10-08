import { Module, Global } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  MetricsService,
  httpRequestDurationProvider,
  httpRequestsTotalProvider,
  activeConnectionsProvider,
  databaseConnectionsProvider,
  errorRateProvider,
  memoryUsageProvider,
} from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: process.env.METRICS_ENABLED !== 'false',
        config: {
          // Optimize GC metrics buckets for better performance
          gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        },
      },
    }),
  ],
  providers: [
    MetricsService,
    MetricsInterceptor,
    httpRequestDurationProvider,
    httpRequestsTotalProvider,
    activeConnectionsProvider,
    databaseConnectionsProvider,
    errorRateProvider,
    memoryUsageProvider,
  ],
  controllers: [MetricsController],
  exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule {}
