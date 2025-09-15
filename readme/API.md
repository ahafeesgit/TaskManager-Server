# API Documentation

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "task_logger"
}
```

**Response:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "task_logger",
  "isActive": true,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Login User

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "task_logger"
  }
}
```

### Get Profile

**GET** `/auth/me`

Get current user profile (requires authentication).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "task_logger"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["Validation error messages"],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```
