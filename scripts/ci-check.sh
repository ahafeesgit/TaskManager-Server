#!/bin/bash
set -e  # Exit on any error

echo "🚀 Local CI Security Pipeline"
echo "=============================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to run step
run_step() {
    echo -e "${YELLOW}$1${NC}"
    if eval "$2"; then
        echo -e "${GREEN}✅ $1 - PASSED${NC}"
    else
        echo -e "${RED}❌ $1 - FAILED${NC}"
        exit 1
    fi
    echo ""
}

# Show Node.js version
echo -e "${BLUE}📋 Environment Info:${NC}"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# Run all CI steps
run_step "ESLint Check" "npm run lint"
run_step "Build Project" "npm run build"
run_step "Security Audit" "npm audit --audit-level=high"

echo -e "${GREEN}🎉 All CI checks passed locally!${NC}"
echo -e "${BLUE}Your code is ready for CI pipeline!${NC}"
