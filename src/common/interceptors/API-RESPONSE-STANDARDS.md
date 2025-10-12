# API Response Standards Guide

This document explains the standardized API response structure used by the Interceptors Module.

## Response Structure

All APIs using this interceptors module follow a consistent response format defined by the `ApiResponse<T>` interface:

```typescript
export interface ApiResponse<T = any> {
  success: boolean; // Operation success status
  code: number; // HTTP status code
  data: T | null; // Response data or null
  messages: string[]; // Array of messages (info, warnings, errors)
}
```

## Response Examples

### Successful Response

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "messages": []
}
```

### Error Response (404)

```json
{
  "success": false,
  "code": 404,
  "data": null,
  "messages": ["User not found"]
}
```

### List Response

```json
{
  "success": true,
  "code": 200,
  "data": {
    "items": [
      { "id": 1, "name": "Item 1" },
      { "id": 2, "name": "Item 2" }
    ]
  },
  "messages": []
}
```

### Paginated Response

```json
{
  "success": true,
  "code": 200,
  "data": {
    "items": [
      { "id": 1, "name": "Item 1" },
      { "id": 2, "name": "Item 2" }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 25,
      "totalPages": 3
    }
  },
  "messages": []
}
```

### Validation Error Response (400)

```json
{
  "success": false,
  "code": 400,
  "data": null,
  "messages": ["Email is required", "Password must be at least 8 characters"]
}
```

## Automatic Response Formatting

The `ResponseInterceptor` automatically formats all successful responses to follow this structure:

```typescript
// Your controller just returns the data
@Get()
async getUser(@Param('id') id: string) {
  return await this.userService.findById(id);
}

// ResponseInterceptor automatically wraps it:
// {
//   "success": true,
//   "code": 200,
//   "data": { ...user data... },
//   "messages": []
// }
```

## Integration with Your Project

### 1. Import the Interceptors Module

```typescript
import { InterceptorsModule } from './interceptors/interceptors.module';
import { ApiResponse } from './interceptors/interfaces/api-response.interface';

@Module({
  imports: [
    // Use simple configuration for clean API responses
    InterceptorsModule.forRootSimple({
      response: { enabled: true },
      logging: { enabled: true },
    }),
  ],
})
export class AppModule {}
```

### 2. Use in Controllers

```typescript
import {
  ApiResponse,
  ListResponse,
} from './interceptors/interfaces/api-response.interface';

@Controller('users')
export class UsersController {
  // Simple response - interceptor handles formatting
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return await this.userService.findById(id);
  }

  // Manual response with proper typing
  @Get()
  async getUsers(): Promise<ListResponse<User>> {
    const users = await this.userService.findAll();
    return {
      success: true,
      code: 200,
      data: { items: users },
      messages: [],
    };
  }
}
```

This module is completely self-contained and can be copied to any NestJS project!
