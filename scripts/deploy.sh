#!/bin/bash

# =============================================================================
# Production Deployment Script
# =============================================================================
# This script handles the deployment of the application to production
# Usage: ./scripts/deploy.sh [environment]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 Starting deployment for ${ENVIRONMENT} environment...${NC}"

# Function to print colored output
print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if environment file exists
if [ ! -f ".env.${ENVIRONMENT}" ]; then
    print_error "Environment file .env.${ENVIRONMENT} not found!"
    exit 1
fi

# Load environment variables
print_step "Loading environment variables..."
export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)

# Install dependencies
print_step "Installing dependencies..."
npm ci --omit=dev

# Generate Prisma client
print_step "Generating Prisma client..."
npm run prisma:generate

# Run database migrations
print_step "Running database migrations..."
npm run prisma:deploy

# Build the application
print_step "Building application..."
npm run build

# Run tests (optional, comment out if not needed in production deployment)
if [ "$ENVIRONMENT" != "production" ]; then
    print_step "Running tests..."
    npm run test:unit
fi

# Start the application with PM2 (if PM2 is used)
if command -v pm2 &> /dev/null; then
    print_step "Starting application with PM2..."
    pm2 start ecosystem.config.js --env ${ENVIRONMENT}
    pm2 save
else
    print_warning "PM2 not found. Starting application directly..."
    npm run start:prod &
fi

# Health check
print_step "Performing health check..."
sleep 5  # Wait for application to start

if curl -f http://localhost:${PORT:-3000}/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deployment successful! Application is running at http://localhost:${PORT:-3000}${NC}"
else
    print_error "Health check failed. Please check the application logs."
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
