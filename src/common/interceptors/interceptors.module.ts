import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ResponseInterceptor } from './response.interceptor';
import type { InterceptorConfig } from './interfaces/interceptor.interface';
import { INTERCEPTOR_CONFIG, DEFAULT_INTERCEPTOR_CONFIG } from './constants';

@Global()
@Module({})
export class InterceptorsModule {
  /**
   * Simple setup - just standardizes API responses
   */
  static forRootSimple(): DynamicModule {
    return {
      module: InterceptorsModule,
      providers: [
        {
          provide: INTERCEPTOR_CONFIG,
          useValue: DEFAULT_INTERCEPTOR_CONFIG,
        },
        ResponseInterceptor,
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        } as any,
      ],
    };
  }

  /**
   * Configure with custom options
   */
  static forRoot(config: Partial<InterceptorConfig> = {}): DynamicModule {
    const mergedConfig = {
      ...DEFAULT_INTERCEPTOR_CONFIG,
      ...config,
      response: {
        ...DEFAULT_INTERCEPTOR_CONFIG.response,
        ...config.response,
      },
    };

    return {
      module: InterceptorsModule,
      providers: [
        {
          provide: INTERCEPTOR_CONFIG,
          useValue: mergedConfig,
        },
        ResponseInterceptor,
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        } as any,
      ],
    };
  }
}