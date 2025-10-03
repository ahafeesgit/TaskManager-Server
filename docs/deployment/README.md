# 🚀 Deployment Guide

This guide covers comprehensive deployment strategies including local development, staging, and production environments with CI/CD pipelines, monitoring, and scaling considerations.

## Overview

The deployment system provides:

- **Multi-environment Support** (development, staging, production)
- **CI/CD Pipelines** with GitHub Actions
- **Docker Containerization** for consistent deployments
- **Infrastructure as Code** with Terraform (optional)
- **Health Monitoring** and alerting
- **Automated Rollbacks** for failed deployments
- **Scaling Strategies** for high availability

## Deployment Architecture

```
📁 Deployment Structure
deployment/
├── docker/                    # Docker configurations
│   ├── Dockerfile.prod       # Production Dockerfile
│   ├── docker-compose.prod.yml
│   └── nginx.prod.conf       # Production nginx config
├── k8s/                      # Kubernetes manifests
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── configmap.yaml
├── terraform/                # Infrastructure as Code
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── scripts/                  # Deployment scripts
│   ├── deploy.sh            # Main deployment script
│   ├── health-check.sh      # Health check script
│   └── rollback.sh          # Rollback script
└── environments/            # Environment configs
    ├── development.env
    ├── staging.env
    └── production.env

.github/workflows/           # CI/CD pipelines
├── ci.yml                  # Continuous integration
├── deploy-staging.yml      # Staging deployment
└── deploy-production.yml   # Production deployment
```

## Environment Configuration

### Development Environment

```bash
# deployment/environments/development.env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/taskmanager_dev
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-dev-jwt-secret
JWT_REFRESH_SECRET=your-dev-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Monitoring
PROMETHEUS_ENABLED=true
HEALTH_CHECK_TIMEOUT=5000

# File Storage
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
```

### Staging Environment

```bash
# deployment/environments/staging.env
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://staging_user:password@staging-db:5432/taskmanager_staging
REDIS_URL=redis://staging-redis:6379

# Authentication
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# External Services
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}

# Monitoring
PROMETHEUS_ENABLED=true
SENTRY_DSN=${SENTRY_DSN}

# Security
CORS_ORIGIN=https://staging.taskmanager.com
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

### Production Environment

```bash
# deployment/environments/production.env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database
DATABASE_URL=${DATABASE_URL}
DATABASE_SSL=true
DATABASE_MAX_CONNECTIONS=20

# Redis
REDIS_URL=${REDIS_URL}
REDIS_MAX_CONNECTIONS=10

# Authentication
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# External Services
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}

# Monitoring
PROMETHEUS_ENABLED=true
SENTRY_DSN=${SENTRY_DSN}
DATADOG_API_KEY=${DATADOG_API_KEY}

# Security
CORS_ORIGIN=https://taskmanager.com,https://www.taskmanager.com
HELMET_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=50

# Performance
CLUSTER_MODE=true
CLUSTER_WORKERS=0  # Use all CPU cores
COMPRESSION_ENABLED=true

# SSL
SSL_CERT_PATH=/etc/ssl/certs/taskmanager.com.pem
SSL_KEY_PATH=/etc/ssl/private/taskmanager.com.key
```

## Docker Production Setup

### Production Dockerfile

```dockerfile
# deployment/docker/Dockerfile.prod
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Create required directories
RUN mkdir -p logs uploads && chown -R nestjs:nodejs logs uploads

USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node dist/health-check.js || exit 1

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/main.js"]
```

### Production Docker Compose

```yaml
# deployment/docker/docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: ../../
      dockerfile: deployment/docker/Dockerfile.prod
    container_name: taskmanager-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - ../environments/production.env
    volumes:
      - app-logs:/app/logs
      - app-uploads:/app/uploads
    depends_on:
      - postgres
      - redis
    networks:
      - app-network
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  nginx:
    image: nginx:alpine
    container_name: taskmanager-nginx
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - app-uploads:/var/www/uploads:ro
    depends_on:
      - app
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    container_name: taskmanager-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: taskmanager
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres-init:/docker-entrypoint-initdb.d
    networks:
      - app-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d taskmanager']
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: taskmanager-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - app-network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    container_name: taskmanager-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    volumes:
      - ../monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - '9090:9090'
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    container_name: taskmanager-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ../monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    ports:
      - '3001:3000'
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:
  app-logs:
  app-uploads:

networks:
  app-network:
    driver: bridge
```

### Production Nginx Configuration

```nginx
# deployment/docker/nginx.prod.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream
    upstream app {
        server app:3000;
        keepalive 32;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name taskmanager.com www.taskmanager.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name taskmanager.com www.taskmanager.com;

        # SSL configuration
        ssl_certificate /etc/ssl/certs/taskmanager.com.pem;
        ssl_certificate_key /etc/ssl/private/taskmanager.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API routes
        location /api {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Authentication routes with stricter rate limiting
        location /auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://app;
            access_log off;
        }

        # Metrics (restricted access)
        location /metrics {
            allow 10.0.0.0/8;
            allow 172.16.0.0/12;
            allow 192.168.0.0/16;
            deny all;
            proxy_pass http://app;
        }

        # Static files
        location /uploads {
            alias /var/www/uploads;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Favicon
        location = /favicon.ico {
            access_log off;
            return 404;
        }
    }
}
```

## CI/CD Pipelines

### GitHub Actions - CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Run Tests
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
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test:cov
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Run e2e tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

      - name: Upload test coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  security:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [test, security]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: deployment/docker/Dockerfile.prod
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Staging Deployment Pipeline

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.8.0
        with:
          ssh-private-key: ${{ secrets.STAGING_SSH_KEY }}

      - name: Deploy to staging server
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }} << 'EOF'
            cd /opt/taskmanager
            
            # Pull latest code
            git pull origin develop
            
            # Update environment variables
            cp deployment/environments/staging.env .env
            
            # Pull latest Docker images
            docker-compose -f deployment/docker/docker-compose.prod.yml pull
            
            # Run database migrations
            docker-compose -f deployment/docker/docker-compose.prod.yml run --rm app npx prisma migrate deploy
            
            # Restart services
            docker-compose -f deployment/docker/docker-compose.prod.yml up -d
            
            # Wait for health check
            sleep 30
            
            # Verify deployment
            curl -f http://localhost/health || exit 1
          EOF

      - name: Run smoke tests
        run: |
          # Run basic smoke tests against staging
          curl -f https://staging.taskmanager.com/health
          curl -f https://staging.taskmanager.com/api/v1/auth/health

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          text: 'Staging deployment completed successfully'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        if: always()
```

### Production Deployment Pipeline

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true
        default: 'latest'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.8.0
        with:
          ssh-private-key: ${{ secrets.PRODUCTION_SSH_KEY }}

      - name: Create deployment
        id: deployment
        uses: actions/github-script@v7
        with:
          script: |
            const deployment = await github.rest.repos.createDeployment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.ref,
              environment: 'production',
              description: 'Production deployment',
              auto_merge: false
            });
            return deployment.data.id;

      - name: Blue-Green Deployment
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} << 'EOF'
            cd /opt/taskmanager
            
            # Backup current version
            docker tag taskmanager-app:latest taskmanager-app:backup-$(date +%Y%m%d_%H%M%S)
            
            # Pull latest code
            git pull origin main
            
            # Update environment variables
            cp deployment/environments/production.env .env
            
            # Pull latest Docker images
            docker-compose -f deployment/docker/docker-compose.prod.yml pull
            
            # Run database migrations
            docker-compose -f deployment/docker/docker-compose.prod.yml run --rm app npx prisma migrate deploy
            
            # Start new containers (blue-green deployment)
            docker-compose -f deployment/docker/docker-compose.prod.yml up -d --scale app=2
            
            # Wait for new containers to be healthy
            sleep 60
            
            # Health check new containers
            docker-compose -f deployment/docker/docker-compose.prod.yml exec -T app curl -f http://localhost:3000/health
            
            # Stop old containers
            docker-compose -f deployment/docker/docker-compose.prod.yml up -d --scale app=1
            
            # Final health check
            curl -f https://taskmanager.com/health || exit 1
          EOF

      - name: Update deployment status (success)
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: ${{ steps.deployment.outputs.result }},
              state: 'success',
              description: 'Deployment successful',
              environment_url: 'https://taskmanager.com'
            });

      - name: Update deployment status (failure)
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.createDeploymentStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              deployment_id: ${{ steps.deployment.outputs.result }},
              state: 'failure',
              description: 'Deployment failed'
            });

      - name: Rollback on failure
        if: failure()
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} << 'EOF'
            cd /opt/taskmanager
            ./deployment/scripts/rollback.sh
          EOF

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          text: ${{ job.status == 'success' && 'Production deployment completed successfully ✅' || 'Production deployment failed ❌' }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        if: always()
```

## Deployment Scripts

### Main Deployment Script

```bash
#!/bin/bash
# deployment/scripts/deploy.sh

set -e

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
COMPOSE_FILE="deployment/docker/docker-compose.prod.yml"
ENV_FILE="deployment/environments/${ENVIRONMENT}.env"

echo "🚀 Starting deployment to ${ENVIRONMENT}"
echo "Version: ${VERSION}"
echo "Compose file: ${COMPOSE_FILE}"
echo "Environment file: ${ENV_FILE}"

# Validate environment
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Environment file not found: $ENV_FILE"
  exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if required environment variables are set
required_vars=("DATABASE_URL" "JWT_SECRET" "REDIS_URL")
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Required environment variable not set: $var"
    exit 1
  fi
done

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose is not installed"
  exit 1
fi

# Backup current deployment
echo "💾 Creating backup..."
if docker ps -q -f name=taskmanager-app &> /dev/null; then
  docker tag taskmanager-app:latest "taskmanager-app:backup-$(date +%Y%m%d_%H%M%S)"
  echo "✅ Backup created"
fi

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f "$COMPOSE_FILE" pull

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy

# Deploy application
echo "🔄 Deploying application..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
echo "🏥 Running health checks..."
if ! ./deployment/scripts/health-check.sh; then
  echo "❌ Health check failed, rolling back..."
  ./deployment/scripts/rollback.sh
  exit 1
fi

# Post-deployment tasks
echo "🧹 Running post-deployment tasks..."

# Clean up old Docker images
docker image prune -f

# Update monitoring dashboards
if [[ "$ENVIRONMENT" == "production" ]]; then
  echo "📊 Updating monitoring dashboards..."
  # Add dashboard update logic here
fi

echo "✅ Deployment to ${ENVIRONMENT} completed successfully!"

# Send notification
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"✅ Deployment to ${ENVIRONMENT} completed successfully\"}" \
    "$SLACK_WEBHOOK_URL"
fi
```

### Health Check Script

```bash
#!/bin/bash
# deployment/scripts/health-check.sh

set -e

# Configuration
MAX_ATTEMPTS=30
SLEEP_INTERVAL=10
BASE_URL=${BASE_URL:-http://localhost:3000}

echo "🏥 Starting health checks for ${BASE_URL}"

# Check if services are running
echo "📋 Checking if services are running..."
if ! docker ps | grep -q taskmanager-app; then
  echo "❌ Application container is not running"
  exit 1
fi

if ! docker ps | grep -q taskmanager-postgres; then
  echo "❌ Database container is not running"
  exit 1
fi

if ! docker ps | grep -q taskmanager-redis; then
  echo "❌ Redis container is not running"
  exit 1
fi

echo "✅ All containers are running"

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
attempt=1
while [[ $attempt -le $MAX_ATTEMPTS ]]; do
  echo "Attempt $attempt/$MAX_ATTEMPTS: Checking ${BASE_URL}/health"

  if curl -f -s "${BASE_URL}/health" > /dev/null; then
    echo "✅ Application health check passed"
    break
  fi

  if [[ $attempt -eq $MAX_ATTEMPTS ]]; then
    echo "❌ Application health check failed after $MAX_ATTEMPTS attempts"
    exit 1
  fi

  echo "⏳ Waiting ${SLEEP_INTERVAL} seconds before next attempt..."
  sleep $SLEEP_INTERVAL
  ((attempt++))
done

# Detailed health checks
echo "🔍 Running detailed health checks..."

# Database health check
if ! curl -f -s "${BASE_URL}/health/database" > /dev/null; then
  echo "❌ Database health check failed"
  exit 1
fi
echo "✅ Database health check passed"

# Memory health check
if ! curl -f -s "${BASE_URL}/health/memory" > /dev/null; then
  echo "❌ Memory health check failed"
  exit 1
fi
echo "✅ Memory health check passed"

# Disk health check
if ! curl -f -s "${BASE_URL}/health/disk" > /dev/null; then
  echo "❌ Disk health check failed"
  exit 1
fi
echo "✅ Disk health check passed"

# API functionality test
echo "🔧 Testing API functionality..."
if ! curl -f -s "${BASE_URL}/api/v1/health" > /dev/null; then
  echo "❌ API health check failed"
  exit 1
fi
echo "✅ API health check passed"

# Metrics endpoint
if ! curl -f -s "${BASE_URL}/metrics" > /dev/null; then
  echo "⚠️ Metrics endpoint not available (may be restricted)"
else
  echo "✅ Metrics endpoint accessible"
fi

echo "🎉 All health checks passed successfully!"
```

### Rollback Script

```bash
#!/bin/bash
# deployment/scripts/rollback.sh

set -e

echo "🔄 Starting rollback process..."

# Find the latest backup
BACKUP_IMAGE=$(docker images taskmanager-app --format "table {{.Tag}}" | grep backup | head -1)

if [[ -z "$BACKUP_IMAGE" ]]; then
  echo "❌ No backup image found for rollback"
  exit 1
fi

echo "📦 Rolling back to: taskmanager-app:${BACKUP_IMAGE}"

# Stop current containers
echo "🛑 Stopping current containers..."
docker-compose -f deployment/docker/docker-compose.prod.yml down

# Restore backup image
echo "🔄 Restoring backup image..."
docker tag "taskmanager-app:${BACKUP_IMAGE}" taskmanager-app:latest

# Start containers with backup
echo "🚀 Starting containers with backup..."
docker-compose -f deployment/docker/docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Running health check on rolled back version..."
if ./deployment/scripts/health-check.sh; then
  echo "✅ Rollback completed successfully"
else
  echo "❌ Rollback failed - manual intervention required"
  exit 1
fi

# Notify rollback
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ Rollback completed - restored to ${BACKUP_IMAGE}\"}" \
    "$SLACK_WEBHOOK_URL"
fi
```

## Kubernetes Deployment

### Namespace

```yaml
# deployment/k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: taskmanager
  labels:
    name: taskmanager
    environment: production
```

### ConfigMap

```yaml
# deployment/k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: taskmanager-config
  namespace: taskmanager
data:
  NODE_ENV: 'production'
  PORT: '3000'
  LOG_LEVEL: 'info'
  PROMETHEUS_ENABLED: 'true'
  COMPRESSION_ENABLED: 'true'
  CORS_ORIGIN: 'https://taskmanager.com,https://www.taskmanager.com'
```

### Secret

```yaml
# deployment/k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: taskmanager-secrets
  namespace: taskmanager
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  JWT_REFRESH_SECRET: <base64-encoded-refresh-secret>
  REDIS_URL: <base64-encoded-redis-url>
  GOOGLE_CLIENT_SECRET: <base64-encoded-google-secret>
```

### Deployment

```yaml
# deployment/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: taskmanager-app
  namespace: taskmanager
  labels:
    app: taskmanager
    component: app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: taskmanager
      component: app
  template:
    metadata:
      labels:
        app: taskmanager
        component: app
    spec:
      containers:
        - name: app
          image: ghcr.io/your-org/taskmanager:latest
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: NODE_ENV
              value: 'production'
          envFrom:
            - configMapRef:
                name: taskmanager-config
            - secretRef:
                name: taskmanager-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 60
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          volumeMounts:
            - name: uploads
              mountPath: /app/uploads
            - name: logs
              mountPath: /app/logs
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: taskmanager-uploads
        - name: logs
          persistentVolumeClaim:
            claimName: taskmanager-logs
```

### Service

```yaml
# deployment/k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: taskmanager-app-service
  namespace: taskmanager
  labels:
    app: taskmanager
    component: app
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
      name: http
  selector:
    app: taskmanager
    component: app
```

### Ingress

```yaml
# deployment/k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: taskmanager-ingress
  namespace: taskmanager
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/rate-limit: '100'
    nginx.ingress.kubernetes.io/rate-limit-window: '1m'
spec:
  tls:
    - hosts:
        - taskmanager.com
        - www.taskmanager.com
      secretName: taskmanager-tls
  rules:
    - host: taskmanager.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: taskmanager-app-service
                port:
                  number: 80
    - host: www.taskmanager.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: taskmanager-app-service
                port:
                  number: 80
```

## Infrastructure as Code (Terraform)

### Main Configuration

```hcl
# deployment/terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "taskmanager-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "taskmanager-vpc"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "taskmanager-public-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "taskmanager-private-${count.index + 1}"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "taskmanager-igw"
    Environment = var.environment
  }
}

# RDS Database
resource "aws_db_instance" "postgres" {
  identifier = "taskmanager-${var.environment}"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_encrypted     = true

  db_name  = "taskmanager"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = var.db_backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = var.environment != "production"
  deletion_protection = var.environment == "production"

  tags = {
    Name        = "taskmanager-db"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "taskmanager-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "taskmanager-cluster"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "taskmanager-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"

  tags = {
    Name        = "taskmanager-alb"
    Environment = var.environment
  }
}
```

## Monitoring and Alerting

### Production Monitoring Setup

```yaml
# deployment/monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./alerts:/etc/prometheus/alerts:ro
      - prometheus-data:/prometheus
    ports:
      - '9090:9090'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_DOMAIN=${GRAFANA_DOMAIN}
      - GF_SMTP_ENABLED=true
      - GF_SMTP_HOST=${SMTP_HOST}
      - GF_SMTP_USER=${SMTP_USER}
      - GF_SMTP_PASSWORD=${SMTP_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - '3001:3000'
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-data:/alertmanager
    ports:
      - '9093:9093'
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - '9100:9100'
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:
  alertmanager-data:

networks:
  monitoring:
    driver: bridge
```

## Best Practices

### Security

- Use secrets management for sensitive data
- Implement proper RBAC in Kubernetes
- Regular security scans and updates
- Network segmentation and firewalls

### Performance

- Implement horizontal pod autoscaling
- Use connection pooling for databases
- Optimize Docker images for size
- Monitor resource usage continuously

### Reliability

- Implement circuit breakers
- Use health checks and readiness probes
- Plan for disaster recovery
- Regular backup testing

### Monitoring

- Set up comprehensive logging
- Implement distributed tracing
- Create meaningful alerts
- Monitor business metrics

## Troubleshooting

### Common Deployment Issues

#### Container Won't Start

```bash
# Check container logs
docker logs taskmanager-app

# Check container status
docker ps -a | grep taskmanager

# Check resource usage
docker stats
```

#### Database Connection Issues

```bash
# Test database connectivity
docker exec -it taskmanager-app npx prisma db ping

# Check database logs
docker logs taskmanager-postgres

# Verify database credentials
docker exec -it taskmanager-postgres psql -U $POSTGRES_USER -d taskmanager
```

#### High Resource Usage

```bash
# Monitor resource usage
docker stats
htop

# Check application metrics
curl http://localhost:3000/metrics | grep memory
curl http://localhost:3000/metrics | grep cpu
```

---

**Next Steps:**

- Review [Error Handling](../error-handling/) for production error management
- Check [API Guide](../api/) for API deployment considerations
- See [Template Usage](../template/) for using this as a template
