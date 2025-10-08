import {
  Module,
  DynamicModule,
  Global,
  Inject,
  Optional,
} from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';
import { MemoryHealthService } from './indicators/memory-health.service';
import { DiskHealthService } from './indicators/disk-health.service';
import {
  DatabaseHealthService,
  DatabaseService,
} from './indicators/database-health.service';

export interface HealthModuleOptions {
  /**
   * Database service token for dependency injection
   * Can be a class reference or string token
   */
  databaseServiceToken?: any;

  /**
   * Whether to include the health controller endpoints
   * Default: true
   */
  enableController?: boolean;

  /**
   * Custom route prefix for health endpoints
   * Default: 'health'
   */
  routePrefix?: string;
}

@Global()
@Module({})
export class HealthModule {
  /**
   * Create HealthModule with database service injection
   */
  static forRoot(options: HealthModuleOptions = {}): DynamicModule {
    const { databaseServiceToken, enableController = true } = options;

    const providers = [
      HealthService,
      MemoryHealthService,
      DiskHealthService,
      {
        provide: DatabaseHealthService,
        useFactory: (databaseService?: DatabaseService) => {
          return new DatabaseHealthService(databaseService);
        },
        inject: databaseServiceToken ? [databaseServiceToken] : [],
      },
    ];

    const controllers = enableController ? [HealthController] : [];

    return {
      module: HealthModule,
      controllers,
      providers,
      exports: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        DatabaseHealthService,
      ],
    };
  }

  /**
   * Create HealthModule for feature modules
   */
  static forFeature(): DynamicModule {
    return {
      module: HealthModule,
      providers: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        DatabaseHealthService,
      ],
      exports: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        DatabaseHealthService,
      ],
    };
  }

  /**
   * Create a simple HealthModule without database checks
   */
  static forRootSimple(): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        {
          provide: DatabaseHealthService,
          useFactory: () => new DatabaseHealthService(),
        },
      ],
      exports: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        DatabaseHealthService,
      ],
    };
  }

  /**
   * Create HealthModule with Prisma integration
   * Requires PrismaModule to be imported in the same module
   */
  static forRootWithPrisma(): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        {
          provide: DatabaseHealthService,
          useFactory: (prismaService?: any) => {
            return new DatabaseHealthService(prismaService);
          },
          inject: ['PrismaService'],
        },
      ],
      exports: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        DatabaseHealthService,
      ],
    };
  }

  /**
   * Create HealthModule that integrates with existing database service in the app
   * This method should be used when your database service is already provided globally
   */
  static forRootAsync(options: {
    useFactory: (databaseService?: any) => DatabaseService | undefined;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      module: HealthModule,
      imports: options.imports || [],
      controllers: [HealthController],
      providers: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        {
          provide: DatabaseHealthService,
          useFactory: (databaseService?: DatabaseService) => {
            return new DatabaseHealthService(databaseService);
          },
          inject: options.inject || [],
        },
      ],
      exports: [
        HealthService,
        MemoryHealthService,
        DiskHealthService,
        DatabaseHealthService,
      ],
    };
  }
}
