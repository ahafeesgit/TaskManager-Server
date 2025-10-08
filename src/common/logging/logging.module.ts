import { Module, Global, DynamicModule } from '@nestjs/common';
import { WinstonLoggerService } from './winston-logger.service';
import { LoggingInterceptor } from './logging.interceptor';
import { LogSanitizerService } from './services/log-sanitizer.service';
import { LogFormatterService } from './services/log-formatter.service';
import type { LoggingConfig } from './interfaces/logging.interface';

@Global()
@Module({})
export class LoggingModule {
  /**
   * Create LoggingModule with configuration
   */
  static forRoot(config?: LoggingConfig): DynamicModule {
    const providers = [
      {
        provide: 'LOGGING_CONFIG',
        useValue: config,
      },
      {
        provide: WinstonLoggerService,
        useFactory: (loggingConfig?: LoggingConfig) => {
          return new WinstonLoggerService(loggingConfig);
        },
        inject: ['LOGGING_CONFIG'],
      },
      LoggingInterceptor,
      LogSanitizerService,
      LogFormatterService,
    ];

    return {
      module: LoggingModule,
      providers,
      exports: [
        WinstonLoggerService,
        LoggingInterceptor,
        LogSanitizerService,
        LogFormatterService,
      ],
    };
  }

  /**
   * Create LoggingModule with default configuration
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => LoggingConfig | Promise<LoggingConfig>;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: LoggingModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'LOGGING_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: WinstonLoggerService,
          useFactory: (config: LoggingConfig) => {
            return new WinstonLoggerService(config);
          },
          inject: ['LOGGING_CONFIG'],
        },
        LoggingInterceptor,
        LogSanitizerService,
        LogFormatterService,
      ],
      exports: [
        WinstonLoggerService,
        LoggingInterceptor,
        LogSanitizerService,
        LogFormatterService,
      ],
    };
  }

  /**
   * Simple module with default configuration
   */
  static forRootSimple(): DynamicModule {
    return {
      module: LoggingModule,
      providers: [
        {
          provide: 'LOGGING_CONFIG',
          useValue: undefined, // No config for simple setup
        },
        {
          provide: WinstonLoggerService,
          useFactory: () => {
            return new WinstonLoggerService();
          },
        },
        {
          provide: LogSanitizerService,
          useFactory: () => {
            return new LogSanitizerService(); // No config for simple setup
          },
        },
        LoggingInterceptor,
        LogFormatterService,
      ],
      exports: [
        WinstonLoggerService,
        LoggingInterceptor,
        LogSanitizerService,
        LogFormatterService,
      ],
    };
  }
}
