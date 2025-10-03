# 🧪 Testing Guide

This guide covers the comprehensive testing infrastructure including unit tests, integration tests, e2e tests, and test automation with Jest and TestContainers.

## Overview

The testing system provides:

- **Unit Testing** with Jest for isolated component testing
- **Integration Testing** for testing component interactions
- **End-to-End Testing** for complete workflow validation
- **Test Containers** for database integration testing
- **Test Coverage** reporting and thresholds
- **CI/CD Integration** for automated testing
- **Mock Utilities** for external dependencies

## Testing Strategy

```
📁 Testing Structure
test/
├── app.e2e-spec.ts           # E2E tests
├── jest-e2e.json             # E2E Jest config
├── fixtures/                 # Test data
│   ├── users.fixture.ts      # User test data
│   └── auth.fixture.ts       # Auth test data
└── utils/                    # Test utilities
    ├── test-db.util.ts       # Database utilities
    ├── test-auth.util.ts     # Auth utilities
    └── mock.util.ts          # Mock utilities

src/**/*.spec.ts              # Unit/Integration tests
jest.config.js                # Main Jest config
jest-integration.config.js    # Integration config
```

## Test Types

### 1. Unit Tests

- **Purpose**: Test individual components in isolation
- **Scope**: Single functions, methods, or classes
- **Dependencies**: Mocked external dependencies
- **Speed**: Very fast (< 1ms per test)

### 2. Integration Tests

- **Purpose**: Test component interactions
- **Scope**: Multiple components working together
- **Dependencies**: Real database with test containers
- **Speed**: Fast (< 100ms per test)

### 3. End-to-End Tests

- **Purpose**: Test complete user workflows
- **Scope**: Full application stack
- **Dependencies**: Real services and database
- **Speed**: Slow (< 5s per test)

## Configuration Files

### Main Jest Configuration

```javascript
// jest.config.js
module.exports = {
  displayName: 'Unit Tests',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage/unit',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/utils/jest.setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};
```

### Integration Test Configuration

```javascript
// jest-integration.config.js
module.exports = {
  displayName: 'Integration Tests',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/utils/integration.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Prevent database conflicts
};
```

### E2E Test Configuration

```javascript
// test/jest-e2e.json
{
  "displayName": "E2E Tests",
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "setupFilesAfterEnv": ["<rootDir>/test/utils/e2e.setup.ts"],
  "testTimeout": 60000
}
```

## Test Utilities

### Database Testing Utilities

```typescript
// test/utils/test-db.util.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

export class TestDatabaseUtil {
  private static container: StartedTestContainer;
  private static prismaService: PrismaService;

  static async setupTestDatabase(): Promise<void> {
    // Start PostgreSQL test container
    this.container = await new GenericContainer('postgres:15')
      .withEnvironment({
        POSTGRES_DB: 'test_db',
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_password',
      })
      .withExposedPorts(5432)
      .start();

    const port = this.container.getMappedPort(5432);
    process.env.DATABASE_URL = `postgresql://test_user:test_password@localhost:${port}/test_db`;

    // Initialize Prisma
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    this.prismaService = moduleRef.get<PrismaService>(PrismaService);
    await this.prismaService.$connect();
  }

  static async cleanDatabase(): Promise<void> {
    // Clean all tables
    const tablenames = await this.prismaService.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        await this.prismaService.$executeRawUnsafe(
          `TRUNCATE TABLE "public"."${tablename}" CASCADE;`,
        );
      }
    }
  }

  static async teardownTestDatabase(): Promise<void> {
    await this.prismaService?.$disconnect();
    await this.container?.stop();
  }
}
```

### Authentication Testing Utilities

```typescript
// test/utils/test-auth.util.ts
import { JwtService } from '@nestjs/jwt';
import { User, Role } from '@prisma/client';

export class TestAuthUtil {
  private jwtService: JwtService;

  constructor() {
    this.jwtService = new JwtService({
      secret: 'test-secret',
      signOptions: { expiresIn: '1h' },
    });
  }

  createTestUser(overrides: Partial<User> = {}): User {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      password: '$2b$10$hashed.password',
      role: Role.USER,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  generateTestToken(user: Partial<User>): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  createAuthHeader(user: Partial<User>): { Authorization: string } {
    const token = this.generateTestToken(user);
    return { Authorization: `Bearer ${token}` };
  }
}
```

### Mock Utilities

```typescript
// test/utils/mock.util.ts
export class MockUtil {
  static createMockRequest(overrides: any = {}): any {
    return {
      headers: {},
      body: {},
      params: {},
      query: {},
      user: null,
      ip: '127.0.0.1',
      ...overrides,
    };
  }

  static createMockResponse(): any {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };
    return res;
  }

  static createMockLogger(): any {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  }
}
```

## Test Fixtures

### User Fixtures

```typescript
// test/fixtures/users.fixture.ts
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { User, Role } from '@prisma/client';

export const userFixtures = {
  validCreateUserDto: (): CreateUserDto => ({
    email: 'newuser@example.com',
    name: 'New User',
    password: 'SecurePass123!',
  }),

  adminUser: (): Partial<User> => ({
    id: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    role: Role.ADMIN,
    isActive: true,
    emailVerified: true,
  }),

  regularUser: (): Partial<User> => ({
    id: 'regular-user-id',
    email: 'user@example.com',
    name: 'Regular User',
    role: Role.USER,
    isActive: true,
    emailVerified: true,
  }),

  inactiveUser: (): Partial<User> => ({
    id: 'inactive-user-id',
    email: 'inactive@example.com',
    name: 'Inactive User',
    role: Role.USER,
    isActive: false,
    emailVerified: false,
  }),
};
```

### Authentication Fixtures

```typescript
// test/fixtures/auth.fixture.ts
export const authFixtures = {
  validLoginDto: () => ({
    email: 'user@example.com',
    password: 'SecurePass123!',
  }),

  invalidLoginDto: () => ({
    email: 'invalid@example.com',
    password: 'wrongpassword',
  }),

  validRegisterDto: () => ({
    email: 'newuser@example.com',
    name: 'New User',
    password: 'SecurePass123!',
  }),

  invalidRegisterDto: () => ({
    email: 'invalid-email',
    name: '',
    password: '123',
  }),
};
```

## Unit Testing Examples

### Service Unit Tests

```typescript
// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WinstonLoggerService } from '@/common/logging';
import { userFixtures } from '@test/fixtures/users.fixture';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<WinstonLoggerService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WinstonLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
    logger = module.get(WinstonLoggerService);
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createUserDto = userFixtures.validCreateUserDto();
      const expectedUser = userFixtures.regularUser();

      prismaService.user.create.mockResolvedValue(expectedUser as any);

      const result = await service.create(createUserDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createUserDto.email,
          name: createUserDto.name,
          password: expect.any(String), // Hashed password
        }),
      });

      expect(result).toEqual(expectedUser);
      expect(logger.log).toHaveBeenCalledWith(
        'Creating new user',
        'UsersService',
      );
    });

    it('should throw error if email already exists', async () => {
      const createUserDto = userFixtures.validCreateUserDto();

      prismaService.user.create.mockRejectedValue(
        new Error('Email already exists'),
      );

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Email already exists',
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'user@example.com';
      const expectedUser = userFixtures.regularUser();

      prismaService.user.findUnique.mockResolvedValue(expectedUser as any);

      const result = await service.findByEmail(email);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual(expectedUser);
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';

      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });
});
```

### Controller Unit Tests

```typescript
// src/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { userFixtures } from '@test/fixtures/users.fixture';
import { MockUtil } from '@test/utils/mock.util';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = userFixtures.validCreateUserDto();
      const expectedUser = userFixtures.regularUser();

      service.create.mockResolvedValue(expectedUser as any);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const users = [userFixtures.regularUser(), userFixtures.adminUser()];
      service.findAll.mockResolvedValue(users as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });
});
```

## Integration Testing Examples

### Database Integration Tests

```typescript
// src/users/users.service.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { TestDatabaseUtil } from '@test/utils/test-db.util';
import { userFixtures } from '@test/fixtures/users.fixture';

describe('UsersService Integration', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    await TestDatabaseUtil.setupTestDatabase();
  });

  afterAll(async () => {
    await TestDatabaseUtil.teardownTestDatabase();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    await TestDatabaseUtil.cleanDatabase();
  });

  describe('Database Operations', () => {
    it('should create and retrieve user from database', async () => {
      const createUserDto = userFixtures.validCreateUserDto();

      const createdUser = await service.create(createUserDto);

      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(createUserDto.email);
      expect(createdUser.name).toBe(createUserDto.name);

      const retrievedUser = await service.findByEmail(createUserDto.email);
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should update user in database', async () => {
      const createUserDto = userFixtures.validCreateUserDto();
      const createdUser = await service.create(createUserDto);

      const updateData = { name: 'Updated Name' };
      const updatedUser = await service.update(createdUser.id, updateData);

      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.email).toBe(createdUser.email);
    });

    it('should delete user from database', async () => {
      const createUserDto = userFixtures.validCreateUserDto();
      const createdUser = await service.create(createUserDto);

      await service.remove(createdUser.id);

      const deletedUser = await service.findOne(createdUser.id);
      expect(deletedUser).toBeNull();
    });
  });
});
```

## End-to-End Testing Examples

### API E2E Tests

```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { TestDatabaseUtil } from '@test/utils/test-db.util';
import { TestAuthUtil } from '@test/utils/test-auth.util';
import { userFixtures, authFixtures } from '@test/fixtures';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let authUtil: TestAuthUtil;

  beforeAll(async () => {
    await TestDatabaseUtil.setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authUtil = new TestAuthUtil();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await TestDatabaseUtil.teardownTestDatabase();
  });

  beforeEach(async () => {
    await TestDatabaseUtil.cleanDatabase();
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const registerDto = authFixtures.validRegisterDto();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(registerDto.email);
    });

    it('should login with valid credentials', async () => {
      // First register a user
      const registerDto = authFixtures.validRegisterDto();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      // Then login
      const loginDto = {
        email: registerDto.email,
        password: registerDto.password,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(loginDto.email);
    });

    it('should reject invalid credentials', async () => {
      const loginDto = authFixtures.invalidLoginDto();

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      const user = userFixtures.regularUser();
      const authHeader = authUtil.createAuthHeader(user);

      await request(app.getHttpServer())
        .get('/users/profile')
        .set(authHeader)
        .expect(200);
    });

    it('should reject access without token', async () => {
      await request(app.getHttpServer()).get('/users/profile').expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('CRUD Operations', () => {
    let authHeader: any;

    beforeEach(async () => {
      const adminUser = userFixtures.adminUser();
      authHeader = authUtil.createAuthHeader(adminUser);
    });

    it('should create, read, update, delete user', async () => {
      const createDto = userFixtures.validCreateUserDto();

      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set(authHeader)
        .send(createDto)
        .expect(201);

      const userId = createResponse.body.id;

      // Read
      const readResponse = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set(authHeader)
        .expect(200);

      expect(readResponse.body.email).toBe(createDto.email);

      // Update
      const updateDto = { name: 'Updated Name' };
      const updateResponse = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set(authHeader)
        .send(updateDto)
        .expect(200);

      expect(updateResponse.body.name).toBe(updateDto.name);

      // Delete
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set(authHeader)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set(authHeader)
        .expect(404);
    });
  });
});
```

## Test Coverage

### Coverage Configuration

```javascript
// jest.config.js coverage settings
module.exports = {
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    './src/users/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
};
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:cov

# View HTML coverage report
open coverage/lcov-report/index.html

# Coverage summary
==============================================================
=============================== Coverage summary ===============================
Statements   : 85.5% ( 123/144 )
Branches     : 78.2% ( 43/55 )
Functions    : 88.9% ( 40/45 )
Lines        : 85.1% ( 120/141 )
================================================================================
```

## Test Commands

### Available Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:integration": "jest --config ./jest-integration.config.js",
    "test:unit": "jest --testPathIgnorePatterns=integration",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### Running Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test users.service.spec.ts

# Run tests with coverage
npm run test:cov

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run all test suites
npm run test:all

# Debug tests
npm run test:debug
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:cov

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run e2e tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Best Practices

### Test Organization

- Keep tests close to source code
- Use descriptive test names
- Group related tests with `describe` blocks
- Use `beforeEach`/`afterEach` for setup/cleanup

### Test Data Management

- Use fixtures for consistent test data
- Clean database between tests
- Use factories for dynamic test data
- Avoid test data dependencies

### Mocking Strategy

- Mock external dependencies
- Use real database for integration tests
- Mock time-sensitive operations
- Keep mocks simple and focused

### Performance

- Run unit tests in parallel
- Run integration tests sequentially
- Use test containers for isolation
- Optimize test database operations

## Troubleshooting

### Common Issues

#### Tests Timing Out

```bash
# Increase timeout
jest.setTimeout(30000);

# Or in configuration
{
  "testTimeout": 30000
}
```

#### Database Connection Issues

```bash
# Check database URL
echo $DATABASE_URL

# Verify container is running
docker ps | grep postgres

# Check migrations
npx prisma migrate status
```

#### Memory Issues

```bash
# Increase Node.js memory
node --max-old-space-size=4096 node_modules/.bin/jest

# Run tests with limited workers
jest --maxWorkers=2
```

---

**Next Steps:**

- Review [Monitoring Guide](../monitoring/) for test metrics
- Check [Docker Guide](../docker/) for test containerization
- See [Deployment Guide](../deployment/) for testing in production
