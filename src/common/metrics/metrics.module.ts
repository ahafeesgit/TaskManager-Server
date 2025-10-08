import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  MetricsService,
  METRICS_CONFIG,
  defaultMetricsConfig,
  createHttpRequestDurationProvider,
  createHttpRequestsTotalProvider,
  createActiveConnectionsProvider,
  createDatabaseConnectionsProvider,
  createErrorRateProvider,
  createMemoryUsageProvider,
  createDatabaseQueryDurationProvider,
  createBusinessEventsProvider,
  createPerformanceOperationsProvider,
} from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import type { MetricsConfig } from './interfaces/metrics.interface';

@Global()
@Module({})
export class MetricsModule {
  /**
   * Register metrics module with default configuration
   */
  static forRoot(config: Partial<MetricsConfig> = {}): DynamicModule {
    const mergedConfig: MetricsConfig = { ...defaultMetricsConfig, ...config };

    return {
      module: MetricsModule,
      imports: [
        PrometheusModule.register({
          defaultMetrics: {
            enabled: Boolean(
              mergedConfig.enableDefaultMetrics && mergedConfig.enabled,
            ),
            config: {
              // Optimize GC metrics buckets for better performance
              gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
              ...(mergedConfig.prefix && { prefix: mergedConfig.prefix }),
              ...(mergedConfig.defaultLabels && {
                labels: mergedConfig.defaultLabels,
              }),
            },
          },
        }),
      ],
      providers: [
        {
          provide: METRICS_CONFIG,
          useValue: mergedConfig,
        },
        // Core metrics providers
        createHttpRequestDurationProvider(mergedConfig),
        createHttpRequestsTotalProvider(mergedConfig),
        createActiveConnectionsProvider(mergedConfig),
        createDatabaseConnectionsProvider(mergedConfig),
        createErrorRateProvider(mergedConfig),
        createMemoryUsageProvider(mergedConfig),
        // Optional metrics providers
        ...(mergedConfig.enableDatabaseMetrics
          ? [createDatabaseQueryDurationProvider(mergedConfig)]
          : []),
        createBusinessEventsProvider(mergedConfig),
        createPerformanceOperationsProvider(mergedConfig),
        MetricsService,
        MetricsInterceptor,
      ],
      controllers: mergedConfig.enabled ? [MetricsController] : [],
      exports: [MetricsService, MetricsInterceptor, METRICS_CONFIG],
    };
  }

  /**
   * Register metrics module with async configuration
   */
  static forRootAsync(options: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<MetricsConfig> | MetricsConfig;
  }): DynamicModule {
    return {
      module: MetricsModule,
      imports: [
        PrometheusModule.registerAsync({
          imports: options.imports,
          inject: options.inject,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            const mergedConfig = { ...defaultMetricsConfig, ...config };

            return {
              defaultMetrics: {
                enabled: Boolean(
                  mergedConfig.enableDefaultMetrics && mergedConfig.enabled,
                ),
                config: {
                  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
                  ...(mergedConfig.prefix && { prefix: mergedConfig.prefix }),
                  ...(mergedConfig.defaultLabels && {
                    labels: mergedConfig.defaultLabels,
                  }),
                },
              },
            };
          },
        }),
        ...(options.imports || []),
      ],
      providers: [
        {
          provide: METRICS_CONFIG,
          inject: options.inject || [],
          useFactory: options.useFactory,
        },
        {
          provide: 'METRICS_PROVIDERS',
          inject: [METRICS_CONFIG],
          useFactory: (config: MetricsConfig) => {
            const mergedConfig = { ...defaultMetricsConfig, ...config };
            return [
              createHttpRequestDurationProvider(mergedConfig),
              createHttpRequestsTotalProvider(mergedConfig),
              createActiveConnectionsProvider(mergedConfig),
              createDatabaseConnectionsProvider(mergedConfig),
              createErrorRateProvider(mergedConfig),
              createMemoryUsageProvider(mergedConfig),
              ...(mergedConfig.enableDatabaseMetrics
                ? [createDatabaseQueryDurationProvider(mergedConfig)]
                : []),
              createBusinessEventsProvider(mergedConfig),
              createPerformanceOperationsProvider(mergedConfig),
            ];
          },
        },
        MetricsService,
        MetricsInterceptor,
      ],
      controllers: [MetricsController],
      exports: [MetricsService, MetricsInterceptor, METRICS_CONFIG],
    };
  }

  /**
   * Simple configuration using default values
   */
  static forRootSimple(): DynamicModule {
    const config: MetricsConfig = {
      enabled: process.env.METRICS_ENABLED !== 'false',
      enableDefaultMetrics: process.env.METRICS_DEFAULT_ENABLED !== 'false',
      enableHttpMetrics: process.env.METRICS_HTTP_ENABLED !== 'false',
      enableDatabaseMetrics: process.env.METRICS_DATABASE_ENABLED === 'true',
      enableMemoryMonitoring: process.env.METRICS_MEMORY_ENABLED === 'true',
      memoryMonitoringInterval: parseInt(
        process.env.METRICS_MEMORY_INTERVAL || '30',
        10,
      ),
      prefix: process.env.METRICS_PREFIX,
      defaultLabels: {
        service: process.env.APP_NAME || 'nestjs-app',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    return MetricsModule.forRoot(config);
  }
}
