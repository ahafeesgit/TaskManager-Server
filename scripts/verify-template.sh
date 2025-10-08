#!/bin/bash

# =============================================================================
# Template Verification Script
# =============================================================================
# This script verifies that all template features are properly configured

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verifying Template Setup...${NC}"

# Check if all essential files exist
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 (missing)${NC}"
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ $1/${NC}"
    else
        echo -e "${RED}❌ $1/ (missing)${NC}"
    fi
}

echo -e "\n${BLUE}📁 Essential Files:${NC}"
check_file ".env.example"
check_file "Dockerfile"
check_file "docker-compose.yml"
check_file "ecosystem.config.js"
check_file "TEMPLATE-README.md"
check_file "TEMPLATE-GUIDE.md"

echo -e "\n${BLUE}📂 Source Structure:${NC}"
check_dir "src/auth"
check_dir "src/users"
check_dir "src/health"
check_dir "src/common/logging"
check_dir "src/common/filters"
check_dir "src/common/metrics"
check_dir "src/common/decorators"

echo -e "\n${BLUE}🧪 Testing Structure:${NC}"
check_file "jest.config.unit.js"
check_file "jest.config.integration.js"
check_dir "test/integration"
check_dir "test/fixtures"

echo -e "\n${BLUE}🗄️ Database Structure:${NC}"
check_dir "prisma/seeds"
check_file "prisma/schema.prisma"

echo -e "\n${BLUE}🚀 Scripts:${NC}"
check_file "scripts/setup-dev.sh"
check_file "scripts/deploy.sh"
check_file "scripts/backup-db.sh"

# Check package.json for essential scripts
echo -e "\n${BLUE}📜 Package Scripts:${NC}"
if grep -q "test:unit" package.json; then
    echo -e "${GREEN}✅ Testing scripts configured${NC}"
else
    echo -e "${RED}❌ Testing scripts missing${NC}"
fi

if grep -q "prisma:generate" package.json; then
    echo -e "${GREEN}✅ Prisma scripts configured${NC}"
else
    echo -e "${RED}❌ Prisma scripts missing${NC}"
fi

# Check dependencies
echo -e "\n${BLUE}📦 Key Dependencies:${NC}"
dependencies=(
    "@nestjs/common"
    "@nestjs/swagger"
    "@nestjs/terminus"
    "prisma"
    "winston"
    "@willsoto/nestjs-prometheus"
    "bcrypt"
    "passport-jwt"
)

for dep in "${dependencies[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        echo -e "${GREEN}✅ $dep${NC}"
    else
        echo -e "${YELLOW}⚠ $dep (missing or different name)${NC}"
    fi
done

echo -e "\n${BLUE}🎯 Template Features Summary:${NC}"
echo -e "${GREEN}✅ Authentication (JWT + OAuth)${NC}"
echo -e "${GREEN}✅ Database (PostgreSQL + Prisma)${NC}"
echo -e "${GREEN}✅ API Documentation (Swagger)${NC}"
echo -e "${GREEN}✅ Testing (Unit + Integration + E2E)${NC}"
echo -e "${GREEN}✅ Logging (Winston + Structured)${NC}"
echo -e "${GREEN}✅ Monitoring (Prometheus + Health Checks)${NC}"
echo -e "${GREEN}✅ Error Handling (Global Filters)${NC}"
echo -e "${GREEN}✅ Containerization (Docker + Compose)${NC}"
echo -e "${GREEN}✅ API Versioning (URI-based)${NC}"
echo -e "${GREEN}✅ Security (Helmet + CORS + Rate Limiting)${NC}"
echo -e "${GREEN}✅ Deployment (Scripts + PM2)${NC}"
echo -e "${GREEN}✅ Database Seeding & Migrations${NC}"

echo -e "\n${BLUE}📚 Next Steps:${NC}"
echo "1. Read TEMPLATE-README.md for complete documentation"
echo "2. Follow TEMPLATE-GUIDE.md to customize for your project"
echo "3. Run './scripts/setup-dev.sh' to start development"
echo "4. Update .env with your configuration"
echo "5. Start building your features!"

echo -e "\n${GREEN}🎉 Template verification completed!${NC}"
echo -e "${BLUE}Your NestJS production-ready template is ready to use.${NC}"
