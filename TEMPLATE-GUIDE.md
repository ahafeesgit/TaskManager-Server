# Template Usage Guide

This guide helps you convert this TaskManager-Server into a generic template for your new projects.

## 🔄 Converting to Template

### 1. Repository Setup

```bash
# Create new repository from this template
gh repo create your-new-project --template ahafeesgit/TaskManager-Server

# Or clone and push to new repository
git clone https://github.com/ahafeesgit/TaskManager-Server.git your-new-project
cd your-new-project
git remote set-url origin https://github.com/yourusername/your-new-project.git
```

### 2. Project Customization

#### Update package.json

```json
{
  "name": "your-project-name",
  "description": "Your project description",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/your-new-project.git"
  }
}
```

#### Update environment files

- Copy `.env.example` to `.env`
- Update database name and credentials
- Generate new JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

#### Update Docker configuration

In `docker-compose.yml`:

```yaml
services:
  app:
    container_name: your-app-name
  db:
    environment:
      POSTGRES_DB: your_db_name
```

### 3. Domain-Specific Changes

#### Remove TaskManager-specific code

1. Update Prisma schema for your domain:

   ```prisma
   // Remove or modify User model based on your needs
   model YourDomainModel {
     id String @id @default(uuid())
     // Add your fields
   }
   ```

2. Update or remove existing modules:
   - Keep `auth/`, `users/`, `health/`, `prisma/` if needed
   - Remove task-specific modules
   - Add your domain modules

3. Update API documentation:
   - Change Swagger title and description in `main.ts`
   - Update controller tags and descriptions

#### Update seeding data

In `prisma/seeds/seed.ts`:

```typescript
// Replace with your domain-specific seed data
const sampleData = {
  // Your entities
};
```

### 4. Clean Up Task-Specific References

#### Files to review and update:

- [ ] `README.md` - Replace with your project description
- [ ] `TaskManager Requirement.md` - Remove or replace
- [ ] Database schema in `prisma/schema.prisma`
- [ ] Seed files in `prisma/seeds/`
- [ ] Test fixtures in `test/fixtures/`

#### Search and replace:

```bash
# Replace references to TaskManager
grep -r "TaskManager\|task-logger\|task_logger" src/ --exclude-dir=node_modules
# Update these references to your domain
```

### 5. Project-Specific Setup

#### Add your modules

```bash
# Generate new modules for your domain
nest g module products
nest g controller products
nest g service products

# Or use the template structure as reference
```

#### Update Prisma schema

```prisma
// Example for e-commerce
model Product {
  id          String   @id @default(uuid())
  name        String
  price       Decimal
  category    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Order {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  products    Product[]
  total       Decimal
  status      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 🎯 Template Features You Get

### ✅ Out-of-the-box Features

- **Authentication & Authorization**: JWT + Google OAuth
- **Database Integration**: PostgreSQL + Prisma ORM
- **API Documentation**: Swagger/OpenAPI
- **Testing Framework**: Jest with unit/integration/e2e tests
- **Logging System**: Winston with file rotation
- **Monitoring**: Prometheus metrics + health checks
- **Error Handling**: Global exception filters
- **Security**: Helmet, CORS, rate limiting
- **Containerization**: Docker + Docker Compose
- **Process Management**: PM2 configuration
- **Deployment Scripts**: Automated deployment
- **API Versioning**: URI-based versioning
- **Database Seeding**: Sample data scripts

### 🛠️ Ready-to-use Utilities

- **Custom Decorators**: `@ApiController()` for versioned endpoints
- **Exception Filters**: Automatic error formatting
- **Logging Service**: Structured logging with context
- **Metrics Collection**: HTTP requests, database connections
- **Health Checks**: Liveness, readiness, and detailed health
- **Validation**: Request/response validation with class-validator

## 🚀 Quick Development Guide

### 1. Start with Authentication

The template includes a complete authentication system:

- User registration/login
- JWT token handling
- Google OAuth integration
- Role-based access control

Customize the User model and add your specific roles.

### 2. Add Your Business Logic

```typescript
// Example: Add a products module
@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal')
  price: number;
}

@Controller('products')
@ApiTags('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  async findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }
}
```

### 3. Leverage Built-in Features

```typescript
// Use logging
constructor(private logger: WinstonLoggerService) {}

doSomething() {
  this.logger.log('Operation started', 'ProductService');
}

// Use metrics
constructor(private metrics: MetricsService) {}

processOrder() {
  // Your logic
  this.metrics.recordHttpRequest('POST', '/orders', 201, 150);
}
```

## 📋 Customization Checklist

### Initial Setup

- [ ] Update package.json metadata
- [ ] Change project name and description
- [ ] Update repository URLs
- [ ] Generate new JWT secret
- [ ] Configure database credentials

### Domain Customization

- [ ] Update Prisma schema for your domain
- [ ] Modify User model or add your entities
- [ ] Update seed data
- [ ] Remove task-specific references
- [ ] Add your business modules

### Configuration

- [ ] Update environment variables
- [ ] Configure OAuth providers (if needed)
- [ ] Set up monitoring endpoints
- [ ] Configure CORS origins
- [ ] Update Docker configurations

### Testing

- [ ] Update test fixtures with your data
- [ ] Add tests for your new modules
- [ ] Configure test database
- [ ] Update integration tests

### Documentation

- [ ] Update README.md
- [ ] Add API documentation
- [ ] Update Swagger descriptions
- [ ] Document your specific endpoints

### Deployment

- [ ] Update deployment scripts
- [ ] Configure production environment
- [ ] Set up monitoring and alerting
- [ ] Configure backup procedures

## 🎉 Next Steps

1. **Follow the setup guide** in the main README
2. **Run the development setup**: `./scripts/setup-dev.sh`
3. **Start adding your features** using the existing structure as reference
4. **Test thoroughly** using the provided testing framework
5. **Deploy with confidence** using the automated scripts

## 💡 Tips for Success

### Development Best Practices

- **Start small**: Begin with one module and expand
- **Follow patterns**: Use existing modules as templates
- **Test early**: Write tests as you develop
- **Document**: Update API docs and README

### Production Readiness

- **Environment management**: Use proper env files for each stage
- **Security**: Review security checklist in main README
- **Monitoring**: Set up alerts for health checks and metrics
- **Backup**: Regular database backups

### Maintenance

- **Dependencies**: Regular `npm audit` and updates
- **Logs**: Monitor application logs for issues
- **Performance**: Use metrics to identify bottlenecks
- **Documentation**: Keep docs updated as features evolve

---

Need help? Check the troubleshooting section in the main README or open an issue!
