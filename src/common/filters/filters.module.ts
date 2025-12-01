import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { GlobalExceptionFilter } from './global-exception.filter';
import type { FilterConfig } from './interfaces/filter.interface';
import { FILTER_CONFIG, DEFAULT_FILTER_CONFIG } from './constants';

@Global()
@Module({})
export class FiltersModule {
  /**
   * Simple setup - just standardizes error responses
   */
  static forRootSimple(): DynamicModule {
    return {
      module: FiltersModule,
      providers: [
        {
          provide: FILTER_CONFIG,
          useValue: DEFAULT_FILTER_CONFIG,
        },
        GlobalExceptionFilter,
        {
          provide: APP_FILTER,
          useClass: GlobalExceptionFilter,
        } as any,
      ],
    };
  }

  /**
   * Configure with custom options
   */
  static forRoot(config: Partial<FilterConfig> = {}): DynamicModule {
    const mergedConfig = {
      ...DEFAULT_FILTER_CONFIG,
      ...config,
      exception: {
        ...DEFAULT_FILTER_CONFIG.exception,
        ...config.exception,
      },
    };

    return {
      module: FiltersModule,
      providers: [
        {
          provide: FILTER_CONFIG,
          useValue: mergedConfig,
        },
        GlobalExceptionFilter,
        {
          provide: APP_FILTER,
          useClass: GlobalExceptionFilter,
        } as any,
      ],
    };
  }
}
