# Nginx Configuration Guide

## Overview

The `nginx/` folder contains the Nginx reverse proxy configuration for the TaskManager Server application. Nginx acts as a web server and reverse proxy that sits in front of your NestJS application, providing enhanced performance, security, and scalability.

## What is Nginx?

Nginx (pronounced "engine-x") is a high-performance HTTP server and reverse proxy that handles incoming requests and forwards them to your application. In this project, Nginx serves as:

- **Reverse Proxy**: Routes requests to the NestJS application
- **Load Balancer**: Can distribute requests across multiple app instances
- **Security Layer**: Adds security headers and rate limiting
- **SSL Termination**: Handles HTTPS certificates and encryption
- **Static File Server**: Can serve static assets efficiently

## Why Use Nginx?

### 1. **Performance Benefits**
- **Static File Serving**: Nginx serves static files much faster than Node.js
- **Connection Handling**: Better at handling many concurrent connections
- **Caching**: Can cache responses to reduce server load
- **Compression**: Built-in gzip compression for responses

### 2. **Security Features**
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Security Headers**: Adds important security headers automatically
- **SSL/TLS**: Handles HTTPS encryption efficiently
- **Request Filtering**: Can filter malicious requests before they reach your app

### 3. **Scalability**
- **Load Balancing**: Distribute requests across multiple app instances
- **Health Checks**: Monitors backend server health
- **Failover**: Automatic failover to healthy servers
- **Zero-Downtime Deployments**: Rolling updates without service interruption

### 4. **Production Readiness**
- **Logging**: Comprehensive access and error logging
- **Monitoring**: Built-in status monitoring
- **Resource Efficiency**: Lower memory and CPU usage
- **Stability**: Battle-tested in production environments

## Configuration Files

### `/nginx/nginx.conf`

This is the main Nginx configuration file that defines:

```nginx
# Core configuration sections:

events {
    worker_connections 1024;  # Max concurrent connections per worker
}

http {
    # Upstream definition - your NestJS app
    upstream nestjs_app {
        server app:3000;  # Docker service name and port
    }

    # Rate limiting configuration
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    # ... other security headers

    # Server block - HTTP configuration
    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://nestjs_app;
            # Proxy headers for proper request forwarding
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            # ... other proxy headers

            # Apply rate limiting
            limit_req zone=api burst=20 nodelay;
        }
    }
}
```

### Key Configuration Features:

1. **Rate Limiting**
   - Limits requests to 10 per second per IP
   - Allows bursts up to 20 requests
   - Prevents API abuse and DoS attacks

2. **Security Headers**
   - `X-Frame-Options`: Prevents clickjacking
   - `X-Content-Type-Options`: Prevents MIME type sniffing
   - `X-XSS-Protection`: Enables XSS filtering
   - `Strict-Transport-Security`: Enforces HTTPS

3. **Health Check Endpoint**
   - Special handling for `/health` endpoint
   - Disables access logging for health checks
   - Improves monitoring efficiency

4. **HTTPS Ready**
   - Commented SSL configuration for production
   - Certificate paths configured
   - HTTP/2 support enabled

## How to Use

### 1. Development Environment

For development, you typically don't need Nginx as your NestJS app can handle requests directly:

```bash
# Run without Nginx (development)
npm run start:dev
# Your app will be available at http://localhost:3000
```

### 2. Docker Development with Nginx

To test with Nginx in development:

```bash
# Run with Nginx profile
docker-compose --profile development up -d

# Or specifically include nginx service
docker-compose up -d app db redis nginx
```

Your application will be available at:
- **http://localhost** (Nginx proxy)
- **http://localhost:3000** (Direct NestJS app access)

### 3. Production Deployment

For production, Nginx is highly recommended:

```bash
# Production deployment with Nginx
docker-compose --profile production up -d
```

This will:
- Start your NestJS app on port 3000 (internal)
- Start Nginx on port 80 (HTTP) and 443 (HTTPS)
- Route all traffic through Nginx

### 4. SSL/HTTPS Configuration

For production with HTTPS:

1. **Obtain SSL Certificates**:
   ```bash
   # Create SSL directory
   mkdir -p nginx/ssl
   
   # Place your certificates
   # nginx/ssl/cert.pem (certificate)
   # nginx/ssl/key.pem (private key)
   ```

2. **Update Configuration**:
   Uncomment the HTTPS server block in `nginx/nginx.conf`:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       ssl_certificate /etc/nginx/ssl/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/key.pem;
       
       # ... rest of configuration
   }
   ```

3. **Update Docker Compose**:
   Ensure SSL volume is mounted:
   ```yaml
   volumes:
     - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
     - ./nginx/ssl:/etc/nginx/ssl:ro  # SSL certificates
   ```

## Configuration Customization

### Adding Custom Routes

To add special handling for specific routes:

```nginx
server {
    # ... existing configuration

    # API routes with stricter rate limiting
    location /api/ {
        proxy_pass http://nestjs_app;
        limit_req zone=api burst=10 nodelay;
        # ... proxy headers
    }

    # Static file serving
    location /static/ {
        root /var/www;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://nestjs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        # ... other headers
    }
}
```

### Adjusting Rate Limits

Modify rate limiting based on your needs:

```nginx
# More restrictive
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;

# Less restrictive
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;

# Different limits for different endpoints
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;  # Login endpoints
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;  # General API
```

### Load Balancing Multiple Instances

For scaling with multiple app instances:

```nginx
upstream nestjs_app {
    least_conn;  # Load balancing method
    server app1:3000 weight=3;
    server app2:3000 weight=2;
    server app3:3000 weight=1;
    
    # Health check
    keepalive 32;
}
```

## Monitoring and Logging

### Access Logs

Nginx access logs are available in the container:

```bash
# View Nginx access logs
docker-compose logs nginx

# Follow logs in real-time
docker-compose logs -f nginx
```

### Status Monitoring

Add status endpoint to monitor Nginx:

```nginx
server {
    listen 8080;
    server_name localhost;
    
    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

### Performance Metrics

Monitor key metrics:
- Request rate
- Response times
- Error rates
- Upstream server health
- Connection counts

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - NestJS app is not running
   - Wrong upstream configuration
   - Port conflicts

   ```bash
   # Check if NestJS app is running
   docker-compose ps
   
   # Check app logs
   docker-compose logs app
   ```

2. **Rate Limiting Too Strict**
   - Adjust rate limits in configuration
   - Check IP whitelisting if needed

3. **SSL Certificate Issues**
   - Verify certificate files exist
   - Check file permissions
   - Validate certificate chain

### Debug Mode

Enable debug logging:

```nginx
error_log /var/log/nginx/error.log debug;
```

## Security Best Practices

1. **Keep Nginx Updated**
   ```bash
   # Use latest stable version
   docker pull nginx:alpine
   ```

2. **Hide Version Information**
   ```nginx
   http {
       server_tokens off;
   }
   ```

3. **Implement Security Headers**
   ```nginx
   # Already included in our configuration
   add_header X-Frame-Options DENY;
   add_header X-Content-Type-Options nosniff;
   add_header Referrer-Policy strict-origin-when-cross-origin;
   ```

4. **Rate Limiting**
   - Monitor and adjust limits based on usage patterns
   - Consider different limits for authenticated users

5. **SSL Configuration**
   - Use strong cipher suites
   - Enable HSTS
   - Implement OCSP stapling

## Performance Optimization

1. **Worker Processes**
   ```nginx
   worker_processes auto;  # Use all CPU cores
   ```

2. **Connection Limits**
   ```nginx
   events {
       worker_connections 2048;  # Increase if needed
       use epoll;  # Linux optimization
   }
   ```

3. **Caching**
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;
   
   location /api/ {
       proxy_cache my_cache;
       proxy_cache_valid 200 1h;
   }
   ```

4. **Compression**
   ```nginx
   gzip on;
   gzip_types text/plain application/json application/javascript text/css;
   ```

## Integration with TaskManager Server

This Nginx configuration is specifically tailored for the TaskManager Server application:

- Routes to NestJS app running on port 3000
- Handles the `/health` endpoint for monitoring
- Provides security headers for API protection
- Implements rate limiting suitable for task management operations
- Ready for production deployment with HTTPS

The configuration works seamlessly with the Docker Compose setup and can be easily customized based on your specific requirements.