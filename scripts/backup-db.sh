#!/bin/bash

# =============================================================================
# Database Backup Script
# =============================================================================
# This script creates a backup of the PostgreSQL database

set -e

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Extract database info from DATABASE_URL
DB_URL=${DATABASE_URL}
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DB_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo -e "${BLUE}📦 Starting database backup...${NC}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
echo -e "${GREEN}▶ Creating backup: $BACKUP_FILE${NC}"
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --create \
    > $BACKUP_FILE

# Compress backup
echo -e "${GREEN}▶ Compressing backup...${NC}"
gzip $BACKUP_FILE

echo -e "${GREEN}✅ Backup completed: ${BACKUP_FILE}.gz${NC}"

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
echo -e "${GREEN}▶ Cleaned old backups${NC}"
