import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './common/health';
import { LoggingModule, LoggingInterceptor } from './common/logging';
import { FiltersModule } from './common/filters';
import { MetricsModule, MetricsInterceptor } from './common/metrics';
import { InterceptorsModule } from './common/interceptors';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '10'),
      },
    ]),
    // Modular common modules - each handles its own registration
    HealthModule.forRootSimple(),
    LoggingModule.forRootSimple(),
    MetricsModule.forRootSimple(),
    InterceptorsModule.forRootSimple(),
    FiltersModule.forRootSimple(),

    // Feature modules
    AuthModule,
    UsersModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // Note: Individual interceptors for logging and metrics
    // The modules handle their own filter/interceptor registration
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
