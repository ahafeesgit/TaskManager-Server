/\*\*

- Example: How to use the Health Module in a new NestJS project
-
- This file demonstrates different ways to integrate the health module
- Copy the entire /src/common/health folder to your new project and use one of these patterns
-
- Note: This file is for documentation purposes and contains example code
  \*/

/_ eslint-disable @typescript-eslint/no-unused-vars _/

// Example imports (adjust paths based on your project structure)
// import { Module } from '@nestjs/common';
// import { HealthModule } from './common/health';

// ============================================================================
// Example 1: Simple setup without database
// ============================================================================
@Module({
imports: [
HealthModule.forRootSimple(),
// ... your other modules
],
})
export class SimpleAppModule {}

// ============================================================================
// Example 2: With Prisma database
// ============================================================================
import { PrismaService } from './prisma/prisma.service';

@Module({
imports: [
HealthModule.forRoot({
databaseServiceToken: PrismaService,
}),
// ... your other modules
],
})
export class PrismaAppModule {}

// ============================================================================
// Example 3: With TypeORM database
// ============================================================================
import { DataSource } from 'typeorm';

@Module({
imports: [
HealthModule.forRoot({
databaseServiceToken: DataSource,
}),
// ... your other modules
],
})
export class TypeORMAppModule {}

// ============================================================================
// Example 4: With custom database service
// ============================================================================
import { Injectable } from '@nestjs/common';
import { DatabaseService } from './common/health';

@Injectable()
export class CustomDbService implements DatabaseService {
async ping(): Promise<boolean> {
try {
// Your custom database ping logic
await this.yourCustomDb.testConnection();
return true;
} catch {
return false;
}
}
}

@Module({
providers: [CustomDbService],
imports: [
HealthModule.forRoot({
databaseServiceToken: CustomDbService,
}),
],
})
export class CustomAppModule {}

// ============================================================================
// Example 5: Adding custom health checks
// ============================================================================
import { Injectable, OnModuleInit } from '@nestjs/common';
import { HealthService } from './common/health';

@Injectable()
export class AppService implements OnModuleInit {
constructor(private healthService: HealthService) {}

onModuleInit() {
// Add Redis health check
this.healthService.addHealthCheck({
name: 'redis',
check: async () => {
try {
await this.redisClient.ping();
return { status: 'up', responseTime: '2ms' };
} catch (error) {
return { status: 'down', error: error.message };
}
}
});

    // Add external API health check
    this.healthService.addHealthCheck({
      name: 'external_api',
      check: async () => {
        try {
          const response = await fetch('https://api.example.com/health');
          return {
            status: response.ok ? 'up' : 'down',
            statusCode: response.status
          };
        } catch (error) {
          return { status: 'down', error: error.message };
        }
      }
    });

}
}

// ============================================================================
// Example 6: Using in microservices
// ============================================================================
@Module({
imports: [
// Only include health service, no controller
HealthModule.forRoot({
enableController: false,
databaseServiceToken: PrismaService,
}),
],
providers: [
{
provide: 'HEALTH_CHECK',
useFactory: (healthService: HealthService) => {
return () => healthService.check();
},
inject: [HealthService],
},
],
})
export class MicroserviceModule {}

// ============================================================================
// Available Endpoints after installation:
// ============================================================================
/\*\*

- GET /health - Comprehensive health check
- GET /health/ready - Kubernetes readiness probe
- GET /health/live - Kubernetes liveness probe
- GET /health/info - Application information
  \*/

// ============================================================================
// Container Health Check Example:
// ============================================================================
/\*\*

- Health endpoints can be used with any container orchestration:
- - /health/live - Basic liveness check
- - /health/ready - Readiness check with dependencies
- - /health - Comprehensive health status
- - /health/info - Application runtime information
    \*/

// ============================================================================
// Kubernetes Health Check Example:
// ============================================================================
/\*\*

- livenessProbe:
- httpGet:
-     path: /health/live
-     port: 3000
- initialDelaySeconds: 30
- periodSeconds: 30
-
- readinessProbe:
- httpGet:
-     path: /health/ready
-     port: 3000
- initialDelaySeconds: 5
- periodSeconds: 10
  \*/
