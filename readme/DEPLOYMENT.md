# Deployment Guide

## Production Deployment

### Prerequisites

- Node.js 18+ installed on server
- PostgreSQL database
- Domain name (optional)
- SSL certificate (recommended)

## Option 1: Traditional Server Deployment

### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/ahafeesgit/TaskManager-Server.git
cd TaskManager-Server

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Set up environment
cp .env.example .env
# Edit .env with production values
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 4. Start with PM2

```bash
# Start application
pm2 start dist/main.js --name "taskmanager-server"

# Save PM2 configuration
pm2 save

# Setup auto-restart on boot
pm2 startup
```

## Option 2: Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/taskmanager_db
      - JWT_SECRET=your-production-secret
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: taskmanager_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

volumes:
  postgres_data:
```

### 3. Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

## Option 3: Cloud Deployment (Heroku)

### 1. Heroku Setup

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name
```

### 2. Add PostgreSQL

```bash
# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev
```

### 3. Configure Environment

```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-production-secret
```

### 4. Deploy

```bash
# Add Heroku remote
git remote add heroku https://git.heroku.com/your-app-name.git

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

## Option 4: Cloud Deployment (AWS/DigitalOcean/etc.)

### 1. Server Setup

Similar to traditional server setup but using cloud instance.

### 2. Load Balancer (optional)

Set up load balancer for multiple instances.

### 3. Database

Use managed database service (AWS RDS, DigitalOcean Managed Database).

## Environment Variables

### Required Production Variables

```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=super-secure-random-string-min-32-chars
PORT=3000
```

### Optional Variables

```env
# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# SSL
FORCE_HTTPS=true
```

## SSL Certificate

### Using Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (add to crontab)
0 12 * * * /usr/bin/certbot renew --quiet
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart taskmanager-server
```

### Health Check Endpoint

Add a health check endpoint in your application:

```typescript
@Get('health')
healthCheck() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

## Backup Strategy

### Database Backup

```bash
# Create backup
pg_dump -U username -h hostname database_name > backup.sql

# Restore backup
psql -U username -h hostname database_name < backup.sql

# Automated daily backup (cron job)
0 2 * * * pg_dump -U username -h hostname database_name > /backups/db-$(date +\%Y\%m\%d).sql
```

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set strong JWT secret
- [ ] Enable CORS with specific origins
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Database connection encryption
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection (Helmet middleware)

## Performance Optimization

### Application Level

- Enable compression middleware
- Use connection pooling
- Implement caching where appropriate
- Optimize database queries

### Server Level

- Use PM2 cluster mode
- Set up load balancing
- Use CDN for static assets
- Enable gzip compression

## Troubleshooting

### Common Issues

1. **Database connection timeout**: Check network and credentials
2. **Memory issues**: Monitor and optimize queries
3. **High CPU usage**: Check for infinite loops or heavy operations
4. **SSL certificate errors**: Verify certificate installation

### Logs

```bash
# PM2 logs
pm2 logs taskmanager-server

# System logs
tail -f /var/log/syslog

# Nginx logs
tail -f /var/log/nginx/error.log
```
