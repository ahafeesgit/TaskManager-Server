import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ResponseInterceptor } from './response.interceptor';
import { LoggingInterceptor } from './logging.interceptor';
import { TimeoutInterceptor } from './timeout.interceptor';
import { TransformInterceptor } from './transform.interceptor';
import { ErrorInterceptor } from './error.interceptor';

import type { InterceptorConfig } from './interfaces/interceptor.interface';
import { INTERCEPTOR_CONFIG, DEFAULT_INTERCEPTOR_CONFIG } from './constants';

@Global()
@Module({})
export class InterceptorsModule {
  /**
   * Configure interceptors with custom options
   */
  static forRoot(config: Partial<InterceptorConfig> = {}): DynamicModule {
    const mergedConfig = this.mergeWithDefaults(config);
    const providers: any[] = [];
    const interceptorProviders: any[] = [];

    // Configuration provider
    providers.push({
      provide: INTERCEPTOR_CONFIG,
      useValue: mergedConfig,
    });

    // Core interceptor services
    providers.push(
      ResponseInterceptor,
      LoggingInterceptor,
      TimeoutInterceptor,
      TransformInterceptor,
      ErrorInterceptor,
    );

    // Error Interceptor (should be first to catch all errors)
    if (mergedConfig.error?.enabled !== false) {
      interceptorProviders.push({
        provide: APP_INTERCEPTOR,
        useClass: ErrorInterceptor,
        multi: true,
      });
    }

    // Transform Interceptor (before response formatting)
    if (mergedConfig.transform?.enabled === true) {
      interceptorProviders.push({
        provide: APP_INTERCEPTOR,
        useClass: TransformInterceptor,
        multi: true,
      });
    }

    // Response Interceptor (format responses)
    if (mergedConfig.response?.enabled !== false) {
      interceptorProviders.push({
        provide: APP_INTERCEPTOR,
        useClass: ResponseInterceptor,
        multi: true,
      });
    }

    // Logging Interceptor (log requests/responses)
    if (mergedConfig.logging?.enabled !== false) {
      interceptorProviders.push({
        provide: APP_INTERCEPTOR,
        useClass: LoggingInterceptor,
        multi: true,
      });
    }

    // Timeout Interceptor (prevent hanging requests)
    if (mergedConfig.timeout?.enabled === true) {
      interceptorProviders.push({
        provide: APP_INTERCEPTOR,
        useClass: TimeoutInterceptor,
        multi: true,
      });
    }

    return {
      module: InterceptorsModule,
      providers: [...providers, ...interceptorProviders],
      exports: [
        ResponseInterceptor,
        LoggingInterceptor,
        TimeoutInterceptor,
        TransformInterceptor,
        ErrorInterceptor,
        INTERCEPTOR_CONFIG,
      ],
    };
  }

  /**
   * Configure interceptors using environment variables and ConfigService
   */
  static forRootAsync(): DynamicModule {
    return {
      module: InterceptorsModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: INTERCEPTOR_CONFIG,
          useFactory: (configService: ConfigService): InterceptorConfig => {
            return {
              response: {
                enabled:
                  configService.get('INTERCEPTOR_RESPONSE_ENABLED', 'true') ===
                  'true',
                includeTimestamp:
                  configService.get(
                    'INTERCEPTOR_RESPONSE_TIMESTAMP',
                    'false',
                  ) === 'true',
                includeRequestId:
                  configService.get(
                    'INTERCEPTOR_RESPONSE_REQUEST_ID',
                    'false',
                  ) === 'true',
                includeServerInfo:
                  configService.get(
                    'INTERCEPTOR_RESPONSE_SERVER_INFO',
                    'false',
                  ) === 'true',
                wrapSingleValues:
                  configService.get(
                    'INTERCEPTOR_RESPONSE_WRAP_VALUES',
                    'true',
                  ) === 'true',
                customSuccessMessage: configService.get(
                  'INTERCEPTOR_RESPONSE_SUCCESS_MESSAGE',
                ),
                excludeRoutes: configService
                  .get('INTERCEPTOR_RESPONSE_EXCLUDE_ROUTES', '')
                  .split(',')
                  .filter(Boolean),
              },
              logging: {
                enabled:
                  configService.get('INTERCEPTOR_LOGGING_ENABLED', 'true') ===
                  'true',
                logRequests:
                  configService.get('INTERCEPTOR_LOGGING_REQUESTS', 'true') ===
                  'true',
                logResponses:
                  configService.get(
                    'INTERCEPTOR_LOGGING_RESPONSES',
                    'false',
                  ) === 'true',
                sanitizeData:
                  configService.get('INTERCEPTOR_LOGGING_SANITIZE', 'true') ===
                  'true',
                logHeaders:
                  configService.get('INTERCEPTOR_LOGGING_HEADERS', 'false') ===
                  'true',
                logQueryParams:
                  configService.get(
                    'INTERCEPTOR_LOGGING_QUERY_PARAMS',
                    'true',
                  ) === 'true',
                logUserInfo:
                  configService.get('INTERCEPTOR_LOGGING_USER_INFO', 'true') ===
                  'true',
                includePerformanceMetrics:
                  configService.get(
                    'INTERCEPTOR_LOGGING_PERFORMANCE',
                    'true',
                  ) === 'true',
                maxBodyLength: parseInt(
                  configService.get(
                    'INTERCEPTOR_LOGGING_MAX_BODY_LENGTH',
                    '1000',
                  ),
                  10,
                ),
                excludeRoutes: configService
                  .get('INTERCEPTOR_LOGGING_EXCLUDE_ROUTES', '')
                  .split(',')
                  .filter(Boolean),
              },
              timeout: {
                enabled:
                  configService.get('INTERCEPTOR_TIMEOUT_ENABLED', 'false') ===
                  'true',
                timeout: parseInt(
                  configService.get('INTERCEPTOR_TIMEOUT_MS', '30000'),
                  10,
                ),
                timeoutMessage: configService.get(
                  'INTERCEPTOR_TIMEOUT_MESSAGE',
                ),
                excludeRoutes: configService
                  .get('INTERCEPTOR_TIMEOUT_EXCLUDE_ROUTES', '')
                  .split(',')
                  .filter(Boolean),
              },
              transform: {
                enabled:
                  configService.get(
                    'INTERCEPTOR_TRANSFORM_ENABLED',
                    'false',
                  ) === 'true',
                removeNullValues:
                  configService.get(
                    'INTERCEPTOR_TRANSFORM_REMOVE_NULL',
                    'false',
                  ) === 'true',
                removeUndefinedValues:
                  configService.get(
                    'INTERCEPTOR_TRANSFORM_REMOVE_UNDEFINED',
                    'false',
                  ) === 'true',
                trimStrings:
                  configService.get('INTERCEPTOR_TRANSFORM_TRIM', 'true') ===
                  'true',
                lowercaseEmails:
                  configService.get(
                    'INTERCEPTOR_TRANSFORM_LOWERCASE_EMAIL',
                    'true',
                  ) === 'true',
                standardizeDates:
                  configService.get(
                    'INTERCEPTOR_TRANSFORM_STANDARDIZE_DATES',
                    'true',
                  ) === 'true',
                removeEmptyObjects:
                  configService.get(
                    'INTERCEPTOR_TRANSFORM_REMOVE_EMPTY',
                    'false',
                  ) === 'true',
                convertNumericStrings:
                  configService.get(
                    'INTERCEPTOR_TRANSFORM_CONVERT_NUMBERS',
                    'false',
                  ) === 'true',
              },
              error: {
                enabled:
                  configService.get('INTERCEPTOR_ERROR_ENABLED', 'true') ===
                  'true',
                includeStackTrace:
                  configService.get(
                    'INTERCEPTOR_ERROR_STACK_TRACE',
                    'false',
                  ) === 'true',
                logErrors:
                  configService.get('INTERCEPTOR_ERROR_LOG_ERRORS', 'true') ===
                  'true',
                transformValidationErrors:
                  configService.get(
                    'INTERCEPTOR_ERROR_TRANSFORM_VALIDATION',
                    'true',
                  ) === 'true',
                includeErrorContext:
                  configService.get(
                    'INTERCEPTOR_ERROR_INCLUDE_CONTEXT',
                    'true',
                  ) === 'true',
              },
            };
          },
          inject: [ConfigService],
        },
        ResponseInterceptor,
        LoggingInterceptor,
        TimeoutInterceptor,
        TransformInterceptor,
        ErrorInterceptor,
        // Register interceptors in the correct order
        {
          provide: APP_INTERCEPTOR,
          useClass: ErrorInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: TransformInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: LoggingInterceptor,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: TimeoutInterceptor,
        },
      ],
      exports: [
        ResponseInterceptor,
        LoggingInterceptor,
        TimeoutInterceptor,
        TransformInterceptor,
        ErrorInterceptor,
        INTERCEPTOR_CONFIG,
      ],
    };
  }

  /**
   * Simple setup with sensible defaults for most applications
   */
  static forRootSimple(): DynamicModule {
    return this.forRoot({
      response: {
        enabled: true,
        includeTimestamp: false,
        includeRequestId: false,
        includeServerInfo: false,
        wrapSingleValues: true,
      },
      logging: {
        enabled: true,
        logRequests: true,
        logResponses: false, // Security: don't log response data by default
        sanitizeData: true,
        logHeaders: false,
        logQueryParams: true,
        logUserInfo: true,
        includePerformanceMetrics: true,
        maxBodyLength: 1000,
      },
      timeout: {
        enabled: false, // Disabled by default to avoid unexpected timeouts
      },
      transform: {
        enabled: false, // Disabled by default to avoid unexpected data changes
      },
      error: {
        enabled: true,
        includeStackTrace: false, // Security: don't include stack traces by default
        logErrors: true,
        transformValidationErrors: true,
        includeErrorContext: true,
      },
    });
  }

  /**
   * Development-friendly configuration with extra logging and debugging
   */
  static forRootDevelopment(): DynamicModule {
    return this.forRoot({
      response: {
        enabled: true,
        includeTimestamp: true,
        includeRequestId: true,
        includeServerInfo: true,
        wrapSingleValues: true,
      },
      logging: {
        enabled: true,
        logRequests: true,
        logResponses: true, // Enable response logging in development
        sanitizeData: true,
        logHeaders: true,
        logQueryParams: true,
        logUserInfo: true,
        includePerformanceMetrics: true,
        maxBodyLength: 5000, // Larger body length for development
      },
      timeout: {
        enabled: true,
        timeout: 60000, // 1 minute timeout for development
      },
      transform: {
        enabled: true,
        removeNullValues: false,
        removeUndefinedValues: false,
        trimStrings: true,
        lowercaseEmails: true,
        standardizeDates: true,
        removeEmptyObjects: false,
        convertNumericStrings: false,
      },
      error: {
        enabled: true,
        includeStackTrace: true, // Include stack traces in development
        logErrors: true,
        transformValidationErrors: true,
        includeErrorContext: true,
      },
    });
  }

  /**
   * Production-optimized configuration with minimal logging and maximum security
   */
  static forRootProduction(): DynamicModule {
    return this.forRoot({
      response: {
        enabled: true,
        includeTimestamp: false,
        includeRequestId: true, // Useful for production debugging
        includeServerInfo: false,
        wrapSingleValues: true,
      },
      logging: {
        enabled: true,
        logRequests: true,
        logResponses: false, // Never log responses in production
        sanitizeData: true,
        logHeaders: false,
        logQueryParams: false, // Minimal logging in production
        logUserInfo: false, // Privacy: don't log user info in production
        includePerformanceMetrics: false,
        maxBodyLength: 0, // No body logging in production
      },
      timeout: {
        enabled: true,
        timeout: 30000, // 30 seconds timeout
      },
      transform: {
        enabled: false, // Disabled in production for performance
      },
      error: {
        enabled: true,
        includeStackTrace: false, // Security: never include stack traces in production
        logErrors: true,
        transformValidationErrors: true,
        includeErrorContext: false, // Minimal context in production
      },
    });
  }

  /**
   * Merge user config with defaults
   */
  private static mergeWithDefaults(
    config: Partial<InterceptorConfig>,
  ): InterceptorConfig {
    return {
      response: { ...DEFAULT_INTERCEPTOR_CONFIG.response, ...config.response },
      logging: { ...DEFAULT_INTERCEPTOR_CONFIG.logging, ...config.logging },
      timeout: { ...DEFAULT_INTERCEPTOR_CONFIG.timeout, ...config.timeout },
      transform: {
        ...DEFAULT_INTERCEPTOR_CONFIG.transform,
        ...config.transform,
      },
      error: { ...DEFAULT_INTERCEPTOR_CONFIG.error, ...config.error },
    };
  }
}
