# 📋 Template Usage Guide

This guide provides comprehensive instructions for using this TaskManager Server as a template for your own projects, including customization, extension, and best practices.

## Overview

This template provides:

- **Complete NestJS Application** with modern architecture
- **Production-Ready Configuration** with Docker, CI/CD, and monitoring
- **Comprehensive Documentation** for all major concepts
- **Modular Structure** for easy customization and extension
- **Best Practices Implementation** for security, performance, and maintainability
- **Testing Framework** with unit, integration, and e2e tests

## Getting Started

### 1. Repository Setup

#### Option A: Use as GitHub Template

```bash
# 1. Click "Use this template" on GitHub
# 2. Create your new repository
# 3. Clone your new repository
git clone https://github.com/yourusername/your-project-name.git
cd your-project-name
```

#### Option B: Fork and Customize

```bash
# 1. Fork the repository
# 2. Clone your fork
git clone https://github.com/yourusername/TaskManager-Server.git
cd TaskManager-Server

# 3. Add upstream remote for updates
git remote add upstream https://github.com/original-owner/TaskManager-Server.git
```

#### Option C: Download and Setup

```bash
# 1. Download the repository
wget https://github.com/original-owner/TaskManager-Server/archive/main.zip
unzip main.zip
cd TaskManager-Server-main

# 2. Initialize new git repository
rm -rf .git
git init
git add .
git commit -m "Initial commit from template"
```

### 2. Initial Configuration

#### Update Project Information

```bash
# Update package.json
npm install -g json
json -I -f package.json -e 'this.name="your-project-name"'
json -I -f package.json -e 'this.description="Your project description"'
json -I -f package.json -e 'this.author="Your Name <your.email@example.com>"'
json -I -f package.json -e 'this.repository.url="https://github.com/yourusername/your-project-name.git"'
```

#### Update Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Update with your values
nano .env
```

#### Update Docker Configuration

```bash
# Update docker-compose.yml
# Change container names, network names, and volume names
sed -i 's/taskmanager/your-project-name/g' docker-compose.yml
sed -i 's/TaskManager/YourProjectName/g' docker-compose.yml
```

#### Update Documentation

```bash
# Update README.md
sed -i 's/TaskManager/YourProjectName/g' README.md
sed -i 's/Task Manager/Your Project Name/g' README.md

# Update all documentation files
find docs/ -name "*.md" -exec sed -i 's/TaskManager/YourProjectName/g' {} \;
find docs/ -name "*.md" -exec sed -i 's/taskmanager/your-project-name/g' {} \;
```

## Customization Guide

### 1. Project Structure Customization

#### Renaming Core Modules

```bash
# Rename users module to customers (example)
mv src/users src/customers

# Update imports in all files
find src/ -name "*.ts" -exec sed -i 's/users/customers/g' {} \;
find src/ -name "*.ts" -exec sed -i 's/Users/Customers/g' {} \;
find src/ -name "*.ts" -exec sed -i 's/USER/CUSTOMER/g' {} \;
```

#### Adding New Modules

```bash
# Generate new module using NestJS CLI
npx nest generate module products
npx nest generate controller products
npx nest generate service products

# Add to app.module.ts
# Add routing configuration
# Add tests
```

### 2. Database Schema Customization

#### Updating Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Customize your models
model YourEntity {
  id        String   @id @default(cuid())
  name      String
  description String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Add your specific fields
  customField String?

  @@map("your_entities")
}

// Remove or modify existing models as needed
// model User { ... }  // Keep, modify, or remove
// model Task { ... }  // Keep, modify, or remove
```

#### Database Migration

```bash
# Generate and apply migration
npx prisma migrate dev --name "customize-schema"

# Generate new Prisma client
npx prisma generate

# Update services to use new schema
```

### 3. Authentication Customization

#### Custom User Fields

```typescript
// src/auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  // Add your custom fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['INDIVIDUAL', 'BUSINESS'])
  accountType?: string;
}
```

#### Custom Authentication Strategy

```typescript
// src/auth/strategies/custom.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';

@Injectable()
export class CustomAuthStrategy extends PassportStrategy(Strategy, 'custom') {
  constructor() {
    super();
  }

  async validate(request: any): Promise<any> {
    // Implement your custom authentication logic
    const token = request.headers['x-custom-token'];

    if (!token) {
      throw new UnauthorizedException('Custom token required');
    }

    // Validate token and return user
    const user = await this.validateCustomToken(token);
    return user;
  }

  private async validateCustomToken(token: string): Promise<any> {
    // Your custom token validation logic
    return null;
  }
}
```

### 4. API Customization

#### Custom Response Format

```typescript
// src/common/interceptors/custom-response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class CustomResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        // Your custom response format
        success: true,
        data: data,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          // Add your custom metadata
        },
      })),
    );
  }
}
```

#### Custom Validation Rules

```typescript
// src/common/validators/custom.validator.ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isCustomFormat', async: false })
export class IsCustomFormatConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // Implement your custom validation logic
    return typeof value === 'string' && /^[A-Z]{2,3}-\d{4,6}$/.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Value must be in format XXX-1234';
  }
}

// Usage decorator
export function IsCustomFormat(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCustomFormatConstraint,
    });
  };
}
```

### 5. Feature Extension

#### Adding Real-time Features

```typescript
// src/websocket/websocket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('custom-event')
  handleCustomEvent(client: Socket, payload: any): void {
    // Handle your custom real-time events
    this.server.emit('custom-response', payload);
  }
}
```

#### Adding File Upload

```typescript
// src/common/modules/file-upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(
            null,
            file.fieldname + '-' + uniqueSuffix + extname(file.originalname),
          );
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx)$/)) {
          return callback(
            new Error('Only image and document files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  exports: [MulterModule],
})
export class FileUploadModule {}
```

#### Adding Caching

```typescript
// src/common/modules/cache.module.ts
import { Module, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        password: configService.get('REDIS_PASSWORD'),
        ttl: 300, // 5 minutes default
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class CustomCacheModule {}
```

## Environment-Specific Customization

### Development Environment

```typescript
// config/development.ts
export default {
  database: {
    url: process.env.DATABASE_URL,
    logging: true,
    synchronize: false, // Use migrations instead
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h',
  },
  logging: {
    level: 'debug',
    prettyPrint: true,
  },
  // Your custom development settings
  features: {
    enableDebugMode: true,
    enableMockData: true,
    enableTestingEndpoints: true,
  },
};
```

### Production Environment

```typescript
// config/production.ts
export default {
  database: {
    url: process.env.DATABASE_URL,
    logging: false,
    ssl: true,
    connectionPool: {
      min: 2,
      max: 10,
    },
  },
  redis: {
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: 3,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '15m',
  },
  logging: {
    level: 'warn',
    prettyPrint: false,
  },
  // Your custom production settings
  features: {
    enableDebugMode: false,
    enableMockData: false,
    enableTestingEndpoints: false,
  },
  monitoring: {
    enabled: true,
    datadogApiKey: process.env.DATADOG_API_KEY,
    sentryDsn: process.env.SENTRY_DSN,
  },
};
```

## Testing Customization

### Custom Test Setup

```typescript
// test/setup.ts
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export class TestSetup {
  static async createTestingModule() {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        // Mock Prisma service for testing
      })
      .compile();

    return moduleRef;
  }

  static async setupTestDatabase() {
    // Your custom test database setup
  }

  static async cleanupTestDatabase() {
    // Your custom test database cleanup
  }
}
```

### Custom Test Utilities

```typescript
// test/utils/test-helpers.ts
export class TestHelpers {
  static createMockUser(overrides = {}) {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      ...overrides,
    };
  }

  static createMockRequest(user = null, overrides = {}) {
    return {
      user,
      headers: {},
      query: {},
      params: {},
      body: {},
      ...overrides,
    };
  }

  static expectError(result: any, errorCode: string) {
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(errorCode);
  }
}
```

## Deployment Customization

### Custom Docker Configuration

```dockerfile
# docker/Dockerfile.custom
FROM node:18-alpine AS base

# Add your custom system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev

# Custom build steps
FROM base AS builder
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Add your custom build steps here
RUN npm run custom:build

# Production image
FROM base AS runner
WORKDIR /app

# Add your custom runtime dependencies
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Custom startup script
COPY scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

USER node

EXPOSE 3000

CMD ["./start.sh"]
```

### Custom CI/CD Pipeline

```yaml
# .github/workflows/custom-ci.yml
name: Custom CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  # Add your custom environment variables

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db

      # Add your custom steps here
      - name: Custom lint rules
        run: npm run lint:custom

      - name: Custom tests
        run: npm run test:custom
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Build application
        run: npm run build

      - name: Custom security scan
        run: npm run security:scan

  deploy:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      # Add your custom deployment steps
      - name: Deploy to custom environment
        run: ./scripts/deploy-custom.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          CUSTOM_ENV: ${{ secrets.CUSTOM_ENV }}
```

## Best Practices for Template Usage

### 1. Code Organization

```
src/
├── modules/                  # Feature modules
│   ├── core/                # Core business logic
│   ├── shared/              # Shared components
│   └── features/            # Feature-specific modules
├── common/                  # Common utilities
├── config/                  # Configuration
└── database/               # Database-related code
```

### 2. Environment Management

```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
  },

  // Your custom configuration
  yourService: {
    apiKey: process.env.YOUR_SERVICE_API_KEY,
    baseUrl: process.env.YOUR_SERVICE_BASE_URL,
    timeout: parseInt(process.env.YOUR_SERVICE_TIMEOUT, 10) || 5000,
  },
});
```

### 3. Documentation Updates

```markdown
# docs/customization/README.md

# Your Project Customization Guide

## Overview

Brief description of your customizations and how they differ from the base template.

## Custom Features

- Feature 1: Description and usage
- Feature 2: Description and usage
- Feature 3: Description and usage

## Configuration

Custom configuration options and environment variables.

## API Changes

Document any changes to the API structure or endpoints.

## Deployment

Custom deployment procedures and requirements.
```

### 4. Version Management

```bash
# Keep track of template version
echo "1.0.0" > .template-version

# Update package.json with your version
npm version 1.0.0

# Tag your customized version
git tag v1.0.0-custom
git push origin v1.0.0-custom
```

## Maintenance and Updates

### Updating from Template

```bash
# If you used fork method
git fetch upstream
git checkout main
git merge upstream/main

# Resolve conflicts with your customizations
# Test thoroughly after updates
```

### Custom Update Strategy

```bash
# 1. Create update branch
git checkout -b update-from-template

# 2. Download latest template
wget https://github.com/original-owner/TaskManager-Server/archive/main.zip
unzip main.zip

# 3. Selectively apply updates
# Compare and merge changes that don't conflict with your customizations

# 4. Test and merge
npm test
git checkout main
git merge update-from-template
```

## Common Customization Patterns

### 1. Multi-Tenant Architecture

```typescript
// src/common/decorators/tenant.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant; // Set by tenant middleware
  },
);

// Usage in controllers
@Get()
async findAll(@Tenant() tenant: string) {
  return this.service.findAll(tenant);
}
```

### 2. Custom Business Logic

```typescript
// src/modules/custom-business/custom-business.service.ts
@Injectable()
export class CustomBusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async executeCustomBusinessLogic(data: any): Promise<any> {
    // Implement your specific business rules
    const config = this.configService.get('customBusiness');

    // Your custom logic here

    return result;
  }
}
```

### 3. Integration with External Services

```typescript
// src/integrations/external-service/external-service.module.ts
@Module({
  imports: [HttpModule],
  providers: [ExternalServiceClient],
  exports: [ExternalServiceClient],
})
export class ExternalServiceModule {}

// src/integrations/external-service/external-service.client.ts
@Injectable()
export class ExternalServiceClient {
  constructor(private readonly httpService: HttpService) {}

  async callExternalAPI(payload: any): Promise<any> {
    const response = await this.httpService
      .post('/api/endpoint', payload)
      .toPromise();

    return response.data;
  }
}
```

## Troubleshooting Customizations

### Common Issues

#### Module Import Errors

```bash
# Check circular dependencies
npm run build 2>&1 | grep -i circular

# Verify module exports
grep -r "export" src/modules/
```

#### Database Migration Issues

```bash
# Reset database for development
npx prisma migrate reset

# Generate new migration
npx prisma migrate dev --name "your-custom-changes"
```

#### Docker Build Failures

```bash
# Build with verbose output
docker build --no-cache --progress=plain -t your-app .

# Check specific layer
docker build --target=builder -t your-app-builder .
```

### Getting Help

1. **Check Documentation**: Review all docs in the `docs/` directory
2. **Search Issues**: Look for similar issues in the original repository
3. **Create Minimal Reproduction**: Isolate the problem in a minimal setup
4. **Ask for Help**: Create an issue with detailed information about your customization

---

**Next Steps:**

- Review [Development](../development/) for development workflow
- Check [Deployment](../deployment/) for production deployment
- See [API Guide](../api/) for API customization strategies
