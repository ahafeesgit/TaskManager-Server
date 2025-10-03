# 🐳 Docker Guide

This guide covers Docker containerization, orchestration, and deployment strategies for the NestJS application.

## Overview

Docker provides containerization for consistent development and production environments. This setup includes:

- **Multi-stage Dockerfile** for optimized production builds
- **Docker Compose** for local development and production orchestration
- **Health checks** for container monitoring
- **Security best practices** with non-root users

## Files Structure

```
📁 Docker Configuration
├── Dockerfile                 # Production container definition
├── docker-compose.yml         # Multi-service orchestration
├── .dockerignore              # Files to exclude from build
├── .env.docker.example        # Docker environment template
└── nginx/
    ├── nginx.conf             # Reverse proxy configuration
    └── ssl/                   # SSL certificates (production)
```

## Dockerfile Explanation

### Multi-stage Build Strategy

Our Dockerfile uses three stages for optimal image size and security:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
# Only installs production dependencies and generates Prisma client

# Stage 2: Build
FROM node:20-alpine AS build
# Installs all dependencies, builds the application

# Stage 3: Production
FROM node:20-alpine AS production
# Copies only necessary files, runs as non-root user
```

### Security Features

- **Non-root user**: Runs as `nestjs` user (UID 1001)
- **Minimal base image**: Uses Alpine Linux for smaller attack surface
- **Signal handling**: Uses dumb-init for proper process management
- **Health checks**: Built-in container health monitoring

### Build Process

1. **Dependencies stage**: Installs only production dependencies
2. **Build stage**: Compiles TypeScript and builds the application
3. **Production stage**: Creates final lightweight image

## Docker Compose

### Services Overview

| Service     | Purpose             | Port   | Health Check   |
| ----------- | ------------------- | ------ | -------------- |
| **app**     | NestJS application  | 3000   | HTTP /health   |
| **db**      | PostgreSQL database | 5432   | pg_isready     |
| **redis**   | Cache & sessions    | 6379   | redis-cli ping |
| **nginx**   | Reverse proxy       | 80/443 | -              |
| **adminer** | DB admin (dev only) | 8080   | -              |

### Profiles

#### Development Profile

```bash
docker-compose --profile development up -d
```

Includes: app, db, redis, adminer

#### Production Profile

```bash
docker-compose --profile production up -d
```

Includes: app, db, redis, nginx

## Quick Start

### 1. Development Setup

```bash
# Clone repository
git clone <repo-url>
cd your-project

# Copy environment file
cp .env.docker.example .env.docker

# Edit environment variables
vim .env.docker

# Start all services
docker-compose --profile development up -d
```

### 2. Production Setup

```bash
# Build and start production services
docker-compose --profile production up -d

# Or with custom environment
docker-compose --env-file .env.production up -d
```

### 3. Check Status

```bash
# View logs
docker-compose logs -f app

# Check health
curl http://localhost:3000/health

# View all containers
docker-compose ps
```

## Environment Configuration

### Development Environment (.env.docker)

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=app_db
DB_USER=postgres
DB_PASSWORD=development_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=development-jwt-secret
```

### Production Environment

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (use strong passwords)
DB_PASSWORD=super-secure-production-password

# Redis
REDIS_PASSWORD=redis-production-password

# JWT (generate strong secret)
JWT_SECRET=production-jwt-secret-256-bit-random

# Monitoring
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true
```

## Common Commands

### Build and Run

```bash
# Build application image
docker build -t your-app-name .

# Run container
docker run -p 3000:3000 your-app-name

# Build with Docker Compose
docker-compose build

# Start services
docker-compose up -d

# Rebuild and start
docker-compose up -d --build
```

### Maintenance

```bash
# View logs
docker-compose logs -f [service-name]

# Execute commands in container
docker-compose exec app npm run prisma:migrate

# Scale services
docker-compose up -d --scale app=3

# Update single service
docker-compose up -d --no-deps app

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Database Operations

```bash
# Run migrations
docker-compose exec app npm run prisma:migrate

# Seed database
docker-compose exec app npm run db:seed

# Access database
docker-compose exec db psql -U postgres -d app_db

# Backup database
docker-compose exec db pg_dump -U postgres app_db > backup.sql
```

## Volume Management

### Data Persistence

```yaml
volumes:
  postgres_data: # Database data
  redis_data: # Redis cache
  app_logs: # Application logs
  app_uploads: # File uploads
```

### Backup Strategy

```bash
# Backup volumes
docker run --rm -v postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres_backup.tar.gz /data

# Restore volumes
docker run --rm -v postgres_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/postgres_backup.tar.gz -C /
```

## Networking

### Internal Communication

Services communicate using service names:

- `app` connects to `db:5432`
- `app` connects to `redis:6379`
- `nginx` proxies to `app:3000`

### External Access

| Service  | Internal Port | External Port | Access           |
| -------- | ------------- | ------------- | ---------------- |
| App      | 3000          | 3000          | Direct           |
| Database | 5432          | 5432          | Development only |
| Redis    | 6379          | 6379          | Development only |
| Nginx    | 80/443        | 80/443        | Production       |
| Adminer  | 8080          | 8080          | Development only |

## Security Considerations

### Container Security

- **Non-root execution**: All containers run as non-root users
- **Read-only filesystem**: Where possible, use read-only containers
- **Resource limits**: Set CPU and memory limits
- **Network isolation**: Use custom networks

### Image Security

```dockerfile
# Security scanning
docker scan your-app-name

# Remove development dependencies
RUN npm ci --only=production

# Use specific versions
FROM node:20.17.0-alpine

# Create non-root user
RUN adduser -S nestjs -u 1001
USER nestjs
```

### Production Hardening

```yaml
# docker-compose.yml
services:
  app:
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp
```

## Health Checks

### Application Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1
```

### Service Health Checks

```yaml
# docker-compose.yml
healthcheck:
  test:
    [
      'CMD',
      'wget',
      '--no-verbose',
      '--tries=1',
      '--spider',
      'http://localhost:3000/health',
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Performance Optimization

### Build Optimization

- **Layer caching**: Order Dockerfile commands by change frequency
- **Multi-stage builds**: Reduce final image size
- **Node modules caching**: Cache npm install results

### Runtime Optimization

```yaml
# Resource limits
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check port usage
lsof -i :3000

# Kill process using port
sudo lsof -t -i tcp:3000 | xargs kill -9

# Use different port
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

#### Database Connection Issues

```bash
# Check database logs
docker-compose logs db

# Test connection
docker-compose exec app npm run prisma:studio

# Reset database
docker-compose down -v
docker-compose up -d db
```

#### Build Failures

```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache

# Check build context
docker build --progress=plain .
```

### Debug Mode

```bash
# Run with debug output
docker-compose --verbose up

# Inspect container
docker-compose exec app /bin/sh

# View container details
docker inspect container_name
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/docker.yml
- name: Build Docker image
  run: docker build -t ${{ secrets.REGISTRY_URL }}/app:${{ github.sha }} .

- name: Push to registry
  run: docker push ${{ secrets.REGISTRY_URL }}/app:${{ github.sha }}
```

### Registry Management

```bash
# Tag for registry
docker tag your-app-name registry.example.com/your-app-name:v1.0.0

# Push to registry
docker push registry.example.com/your-app-name:v1.0.0

# Pull in production
docker pull registry.example.com/your-app-name:v1.0.0
```

## Best Practices

### Development

- Use `.env.docker` for consistent environments
- Enable development profile for debugging tools
- Mount source code for hot reloading during development

### Production

- Use specific image tags, not `latest`
- Implement proper health checks
- Use secrets management for sensitive data
- Monitor resource usage and set limits

### Maintenance

- Regular image updates for security patches
- Automated backups of persistent volumes
- Log rotation and monitoring
- Regular cleanup of unused images and containers

---

**Next Steps:**

- Review [Deployment Guide](../deployment/) for production deployment
- Check [Monitoring Guide](../monitoring/) for observability setup
- See [Database Guide](../database/) for data management
