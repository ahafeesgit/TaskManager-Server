# 🔌 API Guide

This guide covers the comprehensive REST API design including versioning, documentation, validation, rate limiting, and best practices for building scalable APIs.

## Overview

The API system provides:

- **RESTful API Design** with proper HTTP methods and status codes
- **API Versioning** for backward compatibility
- **OpenAPI/Swagger Documentation** for interactive API docs
- **Request/Response Validation** with DTOs and decorators
- **Rate Limiting** for API protection
- **Pagination** for large datasets
- **Error Handling** with consistent error responses

## API Architecture

```
📁 API Structure
src/
├── common/
│   ├── decorators/           # Custom decorators
│   │   ├── api-response.decorator.ts
│   │   ├── pagination.decorator.ts
│   │   └── rate-limit.decorator.ts
│   ├── dto/                  # Common DTOs
│   │   ├── pagination.dto.ts
│   │   └── response.dto.ts
│   ├── filters/              # Exception filters
│   │   ├── all-exceptions.filter.ts
│   │   └── validation.filter.ts
│   ├── guards/               # Route guards
│   │   ├── api-key.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/         # Response interceptors
│   │   ├── response.interceptor.ts
│   │   └── logging.interceptor.ts
│   └── pipes/                # Validation pipes
│       ├── validation.pipe.ts
│       └── parse-uuid.pipe.ts
├── auth/                     # Authentication endpoints
├── users/                    # User management endpoints
├── tasks/                    # Task management endpoints
└── projects/                 # Project management endpoints

docs/
├── api/
│   ├── openapi.yaml         # OpenAPI specification
│   ├── postman-collection.json
│   └── examples/            # API examples
```

## API Versioning Strategy

### Version Structure

```
/api/v1/users          # Version 1
/api/v2/users          # Version 2 (future)
```

### Version Module Configuration

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    // Version 1 modules
    UsersModule,
    AuthModule,
    TasksModule,
    ProjectsModule,

    // API routing with versioning
    RouterModule.register([
      {
        path: 'api/v1',
        children: [
          { path: 'auth', module: AuthModule },
          { path: 'users', module: UsersModule },
          { path: 'tasks', module: TasksModule },
          { path: 'projects', module: ProjectsModule },
        ],
      },
    ]),
  ],
})
export class AppModule {}
```

### Version-specific Controllers

```typescript
// src/users/v1/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users v1')
@Controller()
export class UsersV1Controller {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

## Request/Response DTOs

### Base Response DTO

```typescript
// src/common/dto/response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
  @ApiProperty({ description: 'Response status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId: string;

  constructor(data: T, message: string = 'Success') {
    this.success = true;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.requestId = Math.random().toString(36).substr(2, 9);
  }
}

export class PaginatedResponseDto<T> extends BaseResponseDto<T[]> {
  @ApiProperty({ description: 'Pagination information' })
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };

  constructor(
    data: T[],
    pagination: { total: number; page: number; limit: number; pages: number },
    message: string = 'Data retrieved successfully',
  ) {
    super(data, message);
    this.pagination = pagination;
  }
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Error status' })
  success: boolean = false;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error code' })
  error: string;

  @ApiProperty({ description: 'Error details', required: false })
  details?: any;

  @ApiProperty({ description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId: string;

  constructor(message: string, error: string, details?: any) {
    this.message = message;
    this.error = error;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = Math.random().toString(36).substr(2, 9);
  }
}
```

### Pagination DTO

```typescript
// src/common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export class SortDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
  })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginationWithSortDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

### User DTOs

```typescript
// src/users/dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name: string;

  @ApiProperty({
    description:
      'User password (8-50 characters, must contain letters and numbers)',
    example: 'SecurePass123',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @ApiPropertyOptional({
    description: 'User bio/description',
    example: 'Software developer with 5 years of experience',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'User location',
    example: 'San Francisco, CA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Location must not exceed 100 characters' })
  location?: string;

  @ApiPropertyOptional({
    description: 'User website URL',
    example: 'https://johndoe.com',
  })
  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\/.+/, { message: 'Website must be a valid URL' })
  website?: string;
}

// src/users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {}

// src/users/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User role', enum: Role })
  role: Role;

  @ApiProperty({ description: 'User active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @ApiPropertyOptional({ description: 'User bio' })
  bio?: string;

  @ApiPropertyOptional({ description: 'User location' })
  location?: string;

  @ApiPropertyOptional({ description: 'User website' })
  website?: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  avatar?: string;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Last login date' })
  lastLoginAt?: Date;
}
```

## Custom Decorators

### API Response Decorator

```typescript
// src/common/decorators/api-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import {
  BaseResponseDto,
  PaginatedResponseDto,
  ErrorResponseDto,
} from '../dto/response.dto';

export const ApiSuccessResponse = <T extends Type<any>>(
  dataType: T,
  description: string = 'Success',
) => {
  return applyDecorators(
    ApiExtraModels(BaseResponseDto, dataType),
    ApiResponse({
      status: 200,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(BaseResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(dataType) },
            },
          },
        ],
      },
    }),
  );
};

export const ApiPaginatedResponse = <T extends Type<any>>(
  dataType: T,
  description: string = 'Paginated data retrieved successfully',
) => {
  return applyDecorators(
    ApiExtraModels(PaginatedResponseDto, dataType),
    ApiResponse({
      status: 200,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataType) },
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiErrorResponse = (
  status: number,
  description: string,
  errorCode?: string,
) => {
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiResponse({
      status,
      description,
      schema: {
        $ref: getSchemaPath(ErrorResponseDto),
      },
    }),
  );
};

export const ApiStandardResponses = () => {
  return applyDecorators(
    ApiErrorResponse(400, 'Bad Request - Invalid input data'),
    ApiErrorResponse(401, 'Unauthorized - Authentication required'),
    ApiErrorResponse(403, 'Forbidden - Insufficient permissions'),
    ApiErrorResponse(500, 'Internal Server Error'),
  );
};
```

### Rate Limiting Decorator

```typescript
// src/common/decorators/rate-limit.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  points: number; // Number of requests
  duration: number; // Time window in seconds
  blockDuration?: number; // Block duration in seconds (default: same as duration)
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

// Usage examples:
// @RateLimit({ points: 5, duration: 60 }) // 5 requests per minute
// @RateLimit({ points: 100, duration: 3600 }) // 100 requests per hour
```

### Pagination Decorator

```typescript
// src/common/decorators/pagination.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationDto => {
    const request = ctx.switchToHttp().getRequest();
    const { page = 1, limit = 10 } = request.query;

    return {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      get skip() {
        return (this.page - 1) * this.limit;
      },
    };
  },
);

// Usage:
// async findAll(@Pagination() pagination: PaginationDto) { ... }
```

## Response Interceptor

### Global Response Formatting

```typescript
// src/common/interceptors/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto } from '../dto/response.dto';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, BaseResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // Don't wrap if data is already a BaseResponseDto
        if (data instanceof BaseResponseDto) {
          return data;
        }

        // Don't wrap certain responses (like health checks, metrics)
        const url = request.url;
        if (url.includes('/health') || url.includes('/metrics')) {
          return data;
        }

        // Create wrapped response
        const wrappedResponse = new BaseResponseDto(data);

        // Add request ID from headers if available
        if (request.headers['x-request-id']) {
          wrappedResponse.requestId = request.headers['x-request-id'];
        }

        return wrappedResponse;
      }),
    );
  }
}
```

## Validation and Error Handling

### Custom Validation Pipe

```typescript
// src/common/pipes/validation.pipe.ts
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors.map((error) => {
        return Object.values(error.constraints || {}).join(', ');
      });

      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
        statusCode: 400,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

### Global Exception Filter

```typescript
// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
        details = (exceptionResponse as any).details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse = new ErrorResponseDto(message, error, details);

    // Add request ID if available
    if (request.headers['x-request-id']) {
      errorResponse.requestId = request.headers['x-request-id'];
    }

    // Log error for monitoring
    console.error('Exception caught:', {
      timestamp: errorResponse.timestamp,
      requestId: errorResponse.requestId,
      method: request.method,
      url: request.url,
      status,
      error: exception,
    });

    response.status(status).json(errorResponse);
  }
}
```

## Rate Limiting

### Rate Limiting Implementation

```typescript
// src/common/guards/rate-limit.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiters = new Map<string, RateLimiterMemory>();

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request, rateLimitOptions);

    const rateLimiter = this.getRateLimiter(key, rateLimitOptions);

    try {
      await rateLimiter.consume(this.getIdentifier(request));
      return true;
    } catch (rejRes) {
      const remainingPoints = rejRes.remainingPoints || 0;
      const msBeforeNext = rejRes.msBeforeNext || 1000;

      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          error: 'RATE_LIMIT_EXCEEDED',
          details: {
            remainingPoints,
            resetTime: new Date(Date.now() + msBeforeNext),
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getKey(request: any, options: RateLimitOptions): string {
    const route = request.route?.path || request.url;
    return `${route}:${options.points}:${options.duration}`;
  }

  private getRateLimiter(
    key: string,
    options: RateLimitOptions,
  ): RateLimiterMemory {
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(
        key,
        new RateLimiterMemory({
          points: options.points,
          duration: options.duration,
          blockDuration: options.blockDuration || options.duration,
        }),
      );
    }

    return this.rateLimiters.get(key)!;
  }

  private getIdentifier(request: any): string {
    return request.ip || request.connection.remoteAddress || 'unknown';
  }
}
```

## OpenAPI/Swagger Configuration

### Swagger Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('TaskManager API')
    .setDescription(
      'A comprehensive task management API with authentication, user management, and project collaboration features.',
    )
    .setVersion('1.0.0')
    .setContact(
      'TaskManager Team',
      'https://taskmanager.com',
      'support@taskmanager.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://staging.taskmanager.com', 'Staging server')
    .addServer('https://api.taskmanager.com', 'Production server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for external integrations',
      },
      'API-Key',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management operations')
    .addTag('Tasks', 'Task management operations')
    .addTag('Projects', 'Project management operations')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Serve Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'TaskManager API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: '/swagger-custom.js',
    customCssUrl: '/swagger-custom.css',
  });

  // Export OpenAPI spec as JSON
  const fs = require('fs');
  fs.writeFileSync(
    './docs/api/openapi.json',
    JSON.stringify(document, null, 2),
  );

  await app.listen(3000);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api/docs`);
}

bootstrap();
```

### Advanced Swagger Configuration

```typescript
// src/common/config/swagger.config.ts
import { DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('TaskManager API')
  .setDescription(
    `
    # TaskManager API

    A comprehensive REST API for task and project management.

    ## Features
    - 🔐 JWT Authentication with refresh tokens
    - 👥 User management with role-based access control
    - 📋 Task management with status tracking
    - 📁 Project collaboration and management
    - 📊 Health monitoring and metrics
    - 🔄 Real-time updates (coming soon)

    ## Authentication
    Most endpoints require authentication. Use the \`/auth/login\` endpoint to obtain a JWT token.

    ## Rate Limiting
    API endpoints are rate-limited to prevent abuse:
    - General endpoints: 100 requests per hour
    - Authentication endpoints: 5 requests per minute
    - Upload endpoints: 10 requests per minute

    ## Pagination
    List endpoints support pagination with \`page\` and \`limit\` query parameters.

    ## Error Handling
    All errors follow a consistent format with appropriate HTTP status codes.
  `,
  )
  .setVersion('1.0.0')
  .setTermsOfService('https://taskmanager.com/terms')
  .setContact(
    'TaskManager API Team',
    'https://taskmanager.com/contact',
    'api@taskmanager.com',
  )
  .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
  .addServer('http://localhost:3000', 'Local Development')
  .addServer('https://staging-api.taskmanager.com', 'Staging Environment')
  .addServer('https://api.taskmanager.com', 'Production Environment')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .addApiKey(
    {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
      description: 'API Key for external integrations',
    },
    'API-Key',
  )
  .build();

export const swaggerOptions: SwaggerDocumentOptions = {
  operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  deepScanRoutes: true,
  include: [],
  extraModels: [],
};
```

## API Examples

### Complete User Controller

```typescript
// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ParseUUIDPipe } from '@/common/pipes/parse-uuid.pipe';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-response.decorator';
import { Pagination } from '@/common/decorators/pagination.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Users')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiStandardResponses()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieve a paginated list of all users. Supports filtering and sorting.',
  })
  @ApiPaginatedResponse(UserResponseDto, 'Users retrieved successfully')
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @RateLimit({ points: 50, duration: 3600 }) // 50 requests per hour
  async findAll(
    @Pagination() pagination: PaginationDto,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.usersService.findAll({
      ...pagination,
      search,
      role,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their unique identifier.',
  })
  @ApiSuccessResponse(UserResponseDto, 'User found successfully')
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user account with the provided information.',
  })
  @ApiSuccessResponse(UserResponseDto, 'User created successfully')
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @RateLimit({ points: 5, duration: 300 }) // 5 requests per 5 minutes
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user',
    description: "Update an existing user's information.",
  })
  @ApiSuccessResponse(UserResponseDto, 'User updated successfully')
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'USER')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Soft delete a user account.',
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @RateLimit({ points: 10, duration: 3600 }) // 10 requests per hour
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/avatar')
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Upload a profile picture for the user.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @UseInterceptors(FileInterceptor('avatar'))
  @RateLimit({ points: 3, duration: 300 }) // 3 uploads per 5 minutes
  async uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(id, file);
  }

  @Get(':id/tasks')
  @ApiOperation({
    summary: 'Get user tasks',
    description: 'Retrieve all tasks assigned to a specific user.',
  })
  @ApiPaginatedResponse(Object, 'User tasks retrieved successfully')
  async getUserTasks(
    @Param('id', ParseUUIDPipe) id: string,
    @Pagination() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.usersService.getUserTasks(id, {
      ...pagination,
      status,
      priority,
    });
  }

  @Get(':id/projects')
  @ApiOperation({
    summary: 'Get user projects',
    description: 'Retrieve all projects where the user is a member.',
  })
  @ApiPaginatedResponse(Object, 'User projects retrieved successfully')
  async getUserProjects(
    @Param('id', ParseUUIDPipe) id: string,
    @Pagination() pagination: PaginationDto,
  ) {
    return this.usersService.getUserProjects(id, pagination);
  }
}
```

### Task Management Example

```typescript
// src/tasks/tasks.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-response.decorator';
import { Pagination } from '@/common/decorators/pagination.decorator';
import { CurrentUser } from '@/auth/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto } from './dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { User } from '@prisma/client';

@ApiTags('Tasks')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiStandardResponses()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get tasks',
    description:
      'Retrieve tasks with filtering, sorting, and pagination options.',
  })
  @ApiPaginatedResponse(TaskResponseDto, 'Tasks retrieved successfully')
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    description: 'Filter by assigned user',
  })
  @ApiQuery({
    name: 'dueBefore',
    required: false,
    description: 'Filter by due date',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title and description',
  })
  @RateLimit({ points: 100, duration: 3600 })
  async findAll(
    @CurrentUser() user: User,
    @Pagination() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('projectId') projectId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('dueBefore') dueBefore?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll(user.id, {
      ...pagination,
      status,
      priority,
      projectId,
      assignedTo,
      dueBefore: dueBefore ? new Date(dueBefore) : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task by ID',
    description: 'Retrieve a specific task with full details.',
  })
  @ApiSuccessResponse(TaskResponseDto, 'Task found successfully')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new task',
    description: 'Create a new task with the provided information.',
  })
  @ApiSuccessResponse(TaskResponseDto, 'Task created successfully')
  @RateLimit({ points: 20, duration: 3600 })
  async create(
    @CurrentUser() user: User,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(user.id, createTaskDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update task',
    description: "Update an existing task's information.",
  })
  @ApiSuccessResponse(TaskResponseDto, 'Task updated successfully')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.id, id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete task',
    description: 'Delete a task permanently.',
  })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tasksService.remove(user.id, id);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update task status',
    description: 'Update only the status of a task.',
  })
  @ApiSuccessResponse(TaskResponseDto, 'Task status updated successfully')
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.tasksService.updateStatus(user.id, id, status);
  }

  @Put(':id/assign')
  @ApiOperation({
    summary: 'Assign task to user',
    description: 'Assign or reassign a task to a specific user.',
  })
  @ApiSuccessResponse(TaskResponseDto, 'Task assigned successfully')
  async assignTask(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('assigneeId') assigneeId: string,
  ) {
    return this.tasksService.assignTask(user.id, id, assigneeId);
  }
}
```

## API Testing

### Postman Collection Generation

```typescript
// scripts/generate-postman.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';

async function generatePostmanCollection() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('TaskManager API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Convert OpenAPI to Postman collection
  const collection = {
    info: {
      name: 'TaskManager API',
      description: 'Generated from OpenAPI specification',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string',
      },
      {
        key: 'authToken',
        value: '',
        type: 'string',
      },
    ],
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{authToken}}',
          type: 'string',
        },
      ],
    },
    item: generatePostmanItems(document),
  };

  fs.writeFileSync(
    './docs/api/postman-collection.json',
    JSON.stringify(collection, null, 2),
  );

  console.log('Postman collection generated successfully!');
  await app.close();
}

function generatePostmanItems(document: any) {
  const items = [];

  for (const path in document.paths) {
    for (const method in document.paths[path]) {
      const operation = document.paths[path][method];

      items.push({
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
              type: 'text',
            },
          ],
          url: {
            raw: '{{baseUrl}}' + path,
            host: ['{{baseUrl}}'],
            path: path.split('/').filter(Boolean),
          },
          description: operation.description,
        },
      });
    }
  }

  return items;
}

generatePostmanCollection();
```

## API Performance Optimization

### Response Caching

```typescript
// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.getCacheKey(request);

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Return cached response if available
    if (this.cache.has(cacheKey)) {
      const cachedResponse = this.cache.get(cacheKey);

      // Check if cache is still valid (5 minutes)
      if (Date.now() - cachedResponse.timestamp < 5 * 60 * 1000) {
        return of(cachedResponse.data);
      } else {
        this.cache.delete(cacheKey);
      }
    }

    return next.handle().pipe(
      tap((response) => {
        this.cache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
        });
      }),
    );
  }

  private getCacheKey(request: any): string {
    return `${request.method}:${request.url}:${JSON.stringify(request.query)}`;
  }
}
```

### API Compression

```typescript
// src/main.ts - Add compression middleware
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable compression
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024, // Only compress responses larger than 1KB
    }),
  );

  await app.listen(3000);
}
```

## Best Practices

### API Design

- Use RESTful URLs and HTTP methods correctly
- Implement consistent naming conventions
- Provide comprehensive error messages
- Support pagination for list endpoints

### Security

- Implement proper authentication and authorization
- Use HTTPS in production
- Validate all input data
- Implement rate limiting

### Performance

- Use caching for frequently accessed data
- Implement response compression
- Optimize database queries
- Monitor API performance metrics

### Documentation

- Keep API documentation up to date
- Provide code examples
- Document error responses
- Include API versioning strategy

## Troubleshooting

### Common Issues

#### Swagger Not Loading

```bash
# Check if Swagger is properly configured
curl http://localhost:3000/api/docs-json

# Verify OpenAPI document
npm run swagger:generate
```

#### Validation Errors

```bash
# Check DTO validation rules
# Ensure class-validator decorators are properly applied
# Verify transformation pipes are configured
```

#### Rate Limiting Issues

```bash
# Check rate limit configuration
# Monitor rate limit headers in responses
# Verify IP identification logic
```

---

**Next Steps:**

- Review [Error Handling](../error-handling/) for comprehensive error management
- Check [Authentication](../authentication/) for API security
- See [Testing](../testing/) for API testing strategies
