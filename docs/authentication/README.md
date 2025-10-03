# 🔐 Authentication Guide

This guide covers the complete authentication and authorization system implemented in the NestJS application.

## Overview

The authentication system provides:

- **JWT-based authentication** with access and refresh tokens
- **Google OAuth integration** for social login
- **Role-based access control (RBAC)** for authorization
- **Password security** with bcrypt hashing
- **Session management** with token refresh

## Architecture

```
📁 Authentication Structure
src/auth/
├── auth.controller.ts         # Authentication endpoints
├── auth.service.ts           # Authentication business logic
├── auth.module.ts            # Authentication module
├── jwt.strategy.ts           # JWT validation strategy
├── jwt-auth.guard.ts         # JWT authentication guard
└── google.strategy.ts        # Google OAuth strategy (optional)

src/users/
├── users.controller.ts       # User management endpoints
├── users.service.ts         # User business logic
└── users.module.ts          # User module
```

## Features

### Core Authentication

- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- Token refresh mechanism

### Social Authentication

- Google OAuth 2.0 integration
- Automatic user creation for OAuth users
- Linking OAuth accounts to existing users

### Authorization

- Role-based access control
- Protected routes with guards
- Fine-grained permissions

## User Model

### Database Schema (Prisma)

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  password    String?  // nullable for Google-only users
  googleId    String?  @unique
  name        String?
  role        String   // 'admin' | 'task_logger' | 'project_owner'
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### User Roles

| Role              | Description          | Permissions                      |
| ----------------- | -------------------- | -------------------------------- |
| **admin**         | System administrator | Full access to all resources     |
| **project_owner** | Project manager      | Manage projects and team members |
| **task_logger**   | Regular user         | Basic task management            |

## API Endpoints

### Authentication Endpoints

#### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "task_logger",
    "isActive": true
  },
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here"
}
```

#### Login User

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "task_logger"
  },
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here"
}
```

#### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer jwt_token_here
```

**Response:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "task_logger",
  "isActive": true
}
```

#### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token_here"
}
```

### Google OAuth

#### Initiate Google Login

```http
GET /api/v1/auth/google
```

Redirects to Google OAuth consent screen.

#### Google OAuth Callback

```http
GET /api/v1/auth/google/callback
```

Handles Google OAuth callback and returns JWT tokens.

## Implementation Details

### JWT Strategy

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

### Authentication Guard

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
```

### Role-based Authorization

```typescript
// roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}
```

### Usage in Controllers

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Roles('admin')
  async findAll() {
    // Only admins can access this endpoint
  }

  @Get('me')
  async getProfile(@Request() req) {
    // Any authenticated user can access
    return req.user;
  }
}
```

## Security Features

### Password Security

```typescript
// Password hashing
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Password verification
const isPasswordValid = await bcrypt.compare(password, user.password);
```

### JWT Configuration

```typescript
// JWT token generation
const payload = {
  email: user.email,
  sub: user.id,
  role: user.role,
};

const access_token = this.jwtService.sign(payload, {
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
});

const refresh_token = this.jwtService.sign(payload, {
  expiresIn: '7d',
});
```

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET="your-256-bit-secret-key"
JWT_EXPIRES_IN="15m"
BCRYPT_SALT_ROUNDS=10

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Google OAuth Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Set authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`

### 2. Environment Configuration

```bash
GOOGLE_CLIENT_ID="your-google-client-id.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Implementation

```typescript
// google.strategy.ts
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const { name, emails, id } = profile;

    return {
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      googleId: id,
    };
  }
}
```

## Testing Authentication

### Unit Tests

```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should generate JWT token on successful login', async () => {
    const result = await service.login(mockUser);
    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('user');
  });
});
```

### Integration Tests

```typescript
// auth.e2e-spec.ts
describe('Authentication (e2e)', () => {
  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
        expect(res.body.user.email).toBe('test@example.com');
      });
  });

  it('/auth/me (GET) should require authentication', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
```

## Error Handling

### Common Error Responses

```json
// Invalid credentials
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}

// Email already exists
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}

// Invalid token
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}

// Insufficient permissions
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

## Best Practices

### Security

- Use strong JWT secrets (256-bit minimum)
- Implement token refresh mechanism
- Set appropriate token expiration times
- Hash passwords with sufficient salt rounds
- Validate and sanitize all inputs

### Performance

- Cache user roles and permissions
- Use efficient database queries
- Implement rate limiting on auth endpoints
- Consider using Redis for session storage

### Monitoring

- Log authentication attempts
- Monitor failed login attempts
- Track token refresh patterns
- Set up alerts for suspicious activity

## Migration and Seeding

### Default Users

The system creates default users during seeding:

```typescript
// prisma/seeds/seed.ts
const defaultUsers = [
  {
    email: 'admin@example.com',
    password: await bcrypt.hash('admin123', 10),
    name: 'Administrator',
    role: 'admin',
  },
  {
    email: 'user@example.com',
    password: await bcrypt.hash('user123', 10),
    name: 'Regular User',
    role: 'task_logger',
  },
];
```

### Database Migration

```bash
# Create user table
npx prisma migrate dev --name add_user_model

# Generate Prisma client
npx prisma generate

# Seed default data
npm run db:seed
```

## Troubleshooting

### Common Issues

#### JWT Token Issues

```bash
# Check token validity
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/auth/me

# Verify JWT secret is set
echo $JWT_SECRET
```

#### Google OAuth Issues

```bash
# Verify environment variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Check redirect URI configuration
# Must match exactly in Google Cloud Console
```

#### Database Connection

```bash
# Test database connection
npm run prisma:studio

# Check user table
npx prisma db seed
```

---

**Next Steps:**

- Review [API Guide](../api/) for endpoint documentation
- Check [Error Handling](../error-handling/) for error management
- See [Testing Guide](../testing/) for authentication testing strategies
