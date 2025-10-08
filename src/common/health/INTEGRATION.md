# Quick Start Guide: Copy Health Module to Your Project

## Step-by-Step Integration

### 1. Copy Files

Copy the entire `health/` folder to your project:

```bash
# From TaskManager-Server project
cp -r src/common/health /path/to/your-project/src/common/
```

### 2. Choose Integration Method

#### Option A: Simple (No Database)

```typescript
// app.module.ts
import { HealthModule } from './common/health';

@Module({
  imports: [
    HealthModule.forRootSimple(),
    // ... your modules
  ],
})
export class AppModule {}
```

#### Option B: With Prisma

```typescript
// app.module.ts
import { HealthModule } from './common/health';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule.forRootAsync({
      useFactory: (prismaService) => prismaService,
      inject: [PrismaService],
      imports: [PrismaModule],
    }),
    // ... your modules
  ],
})
export class AppModule {}
```

#### Option C: With TypeORM

```typescript
// app.module.ts
import { HealthModule } from './common/health';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      /* config */
    }),
    HealthModule.forRoot({
      databaseServiceToken: DataSource,
    }),
    // ... your modules
  ],
})
export class AppModule {}
```

### 3. Handle Authentication (If Needed)

If your app has global authentication guards, you need to handle the `@Public()` decorator:

#### Option A: Create a Global Auth Guard that Respects @Public()

```typescript
// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './common/health/decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip authentication for health endpoints
    }

    // Your normal auth logic here
    return this.validateToken(context);
  }

  private validateToken(context: ExecutionContext): boolean {
    // Your authentication logic
    return true;
  }
}
```

#### Option B: Exclude Health Routes from Auth

```typescript
// app.module.ts
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (reflector) => new AuthGuard(reflector),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
```

### 4. Test Your Integration

Start your application and test the endpoints:

```bash
# Test liveness (should always return 200)
curl http://localhost:3000/health/live

# Test readiness (checks database if configured)
curl http://localhost:3000/health/ready

# Test comprehensive health
curl http://localhost:3000/health

# Test app info
curl http://localhost:3000/health/info
```

### 5. Add Custom Health Checks (Optional)

```typescript
// app.service.ts or any service
import { HealthService } from './common/health';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private healthService: HealthService) {}

  onModuleInit() {
    // Add Redis check
    this.healthService.addHealthCheck({
      name: 'redis',
      check: async () => {
        try {
          await this.redisClient.ping();
          return { status: 'up' };
        } catch (error) {
          return { status: 'down', error: error.message };
        }
      },
    });

    // Add external service check
    this.healthService.addHealthCheck({
      name: 'external_api',
      check: async () => {
        try {
          const response = await fetch('https://api.example.com/health');
          return { status: response.ok ? 'up' : 'down' };
        } catch {
          return { status: 'down' };
        }
      },
    });
  }
}
```

## Container Integration

### Health Check Endpoints

The health module provides standard endpoints that work with any container orchestration system:

- **`GET /health/live`** - Liveness probe
- **`GET /health/ready`** - Readiness probe
- **`GET /health`** - Comprehensive health check

### Monitoring Integration

These endpoints can be used with:

````

## Kubernetes Integration

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: your-app:latest
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
````

## Troubleshooting

### Common Issues

1. **Health endpoints return 401/403**
   - Ensure `@Public()` decorator is handled by your auth system
   - Or exclude `/health/*` routes from authentication

2. **Database health check fails**
   - Verify your database service is properly injected
   - Check if the service implements the expected interface methods

3. **Memory/Disk checks not working**
   - These should work on all platforms, but may return limited info on some systems
   - The module gracefully degrades if system info is unavailable

### Debug Mode

Add debug logging to see what's happening:

```typescript
// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  const healthService = app.get(HealthService);

  setInterval(async () => {
    const health = await healthService.check();
    console.log('Health Status:', JSON.stringify(health, null, 2));
  }, 30000);
}
```

## That's It! 🎉

Your health module is now ready for production use with:

- ✅ Container-ready health checks
- ✅ Database monitoring
- ✅ Memory and disk monitoring
- ✅ Custom health checks support
- ✅ Container orchestration integration
- ✅ Zero external dependencies
