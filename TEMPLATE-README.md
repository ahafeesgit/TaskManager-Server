# 🚀 NestJS Production-Ready Template

A comprehensive, production-ready NestJS template with enterprise-grade features including authentication, database integration, monitoring, logging, testing, and deployment automation.

## ✨ Features

### 🔧 Core Features

- **NestJS Framework**: Latest version with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Passport with Google OAuth support
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Validation**: Request/response validation with class-validator
- **Security**: Helmet, CORS, rate limiting, and throttling

### 🏗️ Architecture & Quality

- **API Versioning**: URI-based versioning strategy
- **Error Handling**: Global exception filters with detailed error responses
- **Logging**: Structured logging with Winston (file rotation, multiple levels)
- **Testing**: Unit, integration, and e2e testing with Jest
- **Monitoring**: Prometheus metrics and health checks
- **Code Quality**: ESLint, Prettier, and TypeScript strict mode

### 🚀 DevOps & Deployment

- **Containerization**: Docker & Docker Compose with multi-stage builds
- **Process Management**: PM2 configuration for production
- **CI/CD**: GitHub Actions workflows (optional)
- **Database**: Migration scripts and seeding
- **Scripts**: Automated deployment and backup scripts

## 🛠️ Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 13+
- Docker (optional)
- PM2 (optional, for production)

### 1. Setup Development Environment

```bash
# Clone and setup
git clone <your-repo-url>
cd your-project-name

# Run setup script
./scripts/setup-dev.sh

# Or manually:
npm install
cp .env.example .env
# Update .env with your configuration
npm run prisma:migrate
npm run db:seed
```

### 2. Start Development Server

```bash
npm run start:dev
```

Visit:

- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## 📁 Project Structure

```
src/
├── auth/                 # Authentication module
├── users/               # User management module
├── health/              # Health check endpoints
├── prisma/              # Database service
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── filters/         # Exception filters
│   ├── logging/         # Winston logging service
│   └── metrics/         # Prometheus metrics
├── app.module.ts        # Root module
└── main.ts             # Application entry point

prisma/
├── schema.prisma        # Database schema
├── migrations/          # Database migrations
└── seeds/              # Database seeding scripts

scripts/
├── setup-dev.sh        # Development setup
├── deploy.sh           # Production deployment
├── backup-db.sh        # Database backup
└── ci-check.sh         # CI pipeline script

docker/
├── Dockerfile          # Production container
├── docker-compose.yml  # Multi-service setup
└── .dockerignore       # Docker ignore rules
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required Variables

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-super-secret-jwt-key"
```

#### Optional Features

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"
CORS_CREDENTIALS=true
```

See `.env.example` for all available options.

## 📊 Available Scripts

### Development

```bash
npm run start:dev         # Start development server with hot reload
npm run start:debug       # Start with debug mode
npm run prisma:studio     # Open Prisma Studio
```

### Testing

```bash
npm run test              # Run unit tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests
npm run test:e2e          # Run end-to-end tests
npm run test:all          # Run all tests
npm run test:cov          # Run with coverage
```

### Database

```bash
npm run prisma:migrate    # Run database migrations
npm run prisma:generate   # Generate Prisma client
npm run db:seed           # Seed database with sample data
npm run db:cleanup        # Clean database
```

### Production

```bash
npm run build             # Build for production
npm run start:prod        # Start production server
npm run lint              # Lint code
npm run ci:check          # Run CI checks
```

## 🐳 Docker Deployment

### Development with Docker

```bash
# Start all services
docker-compose --profile development up -d

# View logs
docker-compose logs -f app

# Access database admin
open http://localhost:8080  # Adminer
```

### Production with Docker

```bash
# Build and start
docker-compose --profile production up -d

# With custom environment
cp .env.docker.example .env.docker
# Update .env.docker
docker-compose --env-file .env.docker up -d
```

## 🚀 Production Deployment

### Manual Deployment

```bash
# Using deployment script
./scripts/deploy.sh production

# Or manually
npm ci --omit=dev
npm run build
npm run prisma:deploy
pm2 start ecosystem.config.js --env production
```

### Environment Setup

1. Create production environment file: `.env.production`
2. Set up PostgreSQL database
3. Configure reverse proxy (nginx)
4. Set up SSL certificates
5. Configure monitoring and alerting

## 🔍 Monitoring & Observability

### Health Checks

- **Liveness**: `GET /health/live` - App is running
- **Readiness**: `GET /health/ready` - App is ready to serve traffic
- **Full Health**: `GET /health` - Detailed health status

### Metrics

- **Prometheus Metrics**: `GET /metrics`
- **Custom Metrics**: HTTP requests, database connections, etc.
- **Default Metrics**: CPU, memory, process stats

### Logging

- **Structured Logging**: JSON format with context
- **Log Levels**: error, warn, info, debug, verbose
- **File Rotation**: Daily rotation with compression
- **Request Logging**: Automatic HTTP request logging

## 🧪 Testing Strategy

### Unit Tests

- **Location**: `src/**/*.spec.ts`
- **Coverage**: Aim for >80% code coverage
- **Mocking**: Mock external dependencies

### Integration Tests

- **Location**: `test/integration/**/*.spec.ts`
- **Database**: Uses test database with cleanup
- **TestContainers**: Optional PostgreSQL containers

### E2E Tests

- **Location**: `test/**/*.e2e-spec.ts`
- **Full Stack**: Tests complete user journeys
- **Test Data**: Uses fixtures and factories

## 🔒 Security Considerations

### Implemented Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: Request/response validation
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with configurable rounds

### Production Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Use environment variables for secrets
- [ ] Regular security audits (`npm audit`)
- [ ] Database connection encryption
- [ ] Implement proper logging and monitoring

## 🎯 API Versioning

### Strategy

- **URI Versioning**: `/api/v1/users`, `/api/v2/users`
- **Header Support**: `Accept-Version: v1`
- **Default Version**: v1
- **Backward Compatibility**: Maintain older versions

### Usage Example

```typescript
@ApiController('users', 'v1') // /api/v1/users
export class UsersV1Controller {}

@ApiController('users', 'v2') // /api/v2/users
export class UsersV2Controller {}
```

## 🤝 Contributing

### Code Style

- **Prettier**: Code formatting
- **ESLint**: Code linting
- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables, PascalCase for classes

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve database connection issue
docs: update API documentation
```

## 📝 Customization Guide

### Adding New Modules

1. Generate module: `nest g module feature-name`
2. Add to imports in `app.module.ts`
3. Create controller, service, and DTOs
4. Add tests and documentation

### Database Schema Changes

1. Update `prisma/schema.prisma`
2. Generate migration: `npm run prisma:migrate`
3. Update seed files if needed
4. Test migration and rollback procedures

### Custom Logging

```typescript
import { WinstonLoggerService } from '@/common/logging';

@Injectable()
export class MyService {
  constructor(private logger: WinstonLoggerService) {}

  doSomething() {
    this.logger.log('Action performed', 'MyService');
    this.logger.error('Error occurred', undefined, 'MyService');
  }
}
```

## 🆘 Troubleshooting

### Common Issues

#### Database Connection

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Reset database
npm run prisma:reset

# Regenerate client
npm run prisma:generate
```

#### Permission Issues

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix file permissions
sudo chown -R $USER:$USER .
```

#### Docker Issues

```bash
# Rebuild containers
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs app
```

### Performance Optimization

- **Database**: Add proper indexes, use connection pooling
- **Caching**: Implement Redis for frequently accessed data
- **Monitoring**: Set up APM tools (New Relic, DataDog)
- **Load Balancing**: Use nginx or cloud load balancers

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)

## 📄 License

This template is released under the MIT License. See [LICENSE](LICENSE) file for details.

---

**Happy Coding! 🎉**

For questions or issues, please open a GitHub issue or contact the development team.
