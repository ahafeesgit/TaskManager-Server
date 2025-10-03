#!/bin/bash

# =============================================================================
# Development Setup Script
# =============================================================================
# This script sets up the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

echo -e "${BLUE}🔧 Setting up development environment...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_step "Created .env file. Please update it with your configuration."
    else
        print_error ".env.example file not found!"
        exit 1
    fi
fi

# Install dependencies
print_step "Installing dependencies..."
npm install

# Generate Prisma client
print_step "Generating Prisma client..."
npm run prisma:generate

# Check if database is accessible and run migrations
print_step "Checking database connection and running migrations..."
if npm run prisma:migrate > /dev/null 2>&1; then
    print_step "Database migrations completed successfully."
else
    print_warning "Database migrations failed. Please ensure your database is running and DATABASE_URL is correct."
    print_warning "You can run 'npm run prisma:migrate' manually after setting up the database."
fi

# Seed the database (optional)
read -p "Do you want to seed the database with sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Seeding database..."
    npm run db:seed
fi

# Create logs directory
print_step "Creating logs directory..."
mkdir -p logs

# Create uploads directory
print_step "Creating uploads directory..."
mkdir -p uploads

echo -e "${GREEN}✅ Development environment setup completed!${NC}"
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Update the .env file with your configuration"
echo "2. Ensure your database is running"
echo "3. Run 'npm run start:dev' to start the development server"
echo "4. Visit http://localhost:3000/api for Swagger documentation"
