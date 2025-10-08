# Scripts Documentation

This directory contains various shell scripts to help with development, deployment, and maintenance of the TaskManager-Server application.

## 📋 Table of Contents

- [Available Scripts](#available-scripts)
- [Prerequisites](#prerequisites)
- [How to Run Scripts](#how-to-run-scripts)
- [Script Details](#script-details)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## 🚀 Available Scripts

| Script                                     | Purpose                        | Usage                               |
| ------------------------------------------ | ------------------------------ | ----------------------------------- |
| [`setup-dev.sh`](#setup-devsh)             | Set up development environment | `./scripts/setup-dev.sh`            |
| [`ci-check.sh`](#ci-checksh)               | Run local CI checks            | `./scripts/ci-check.sh`             |
| [`deploy.sh`](#deploysh)                   | Deploy to production/staging   | `./scripts/deploy.sh [environment]` |
| [`backup-db.sh`](#backup-dbsh)             | Backup PostgreSQL database     | `./scripts/backup-db.sh`            |
| [`verify-template.sh`](#verify-templatesh) | Verify template setup          | `./scripts/verify-template.sh`      |

## 📋 Prerequisites

Before running these scripts, ensure you have:

- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **PostgreSQL** (for database operations)
- **Git** (for version control)
- **Docker** (optional, for containerized deployments)
- **PM2** (optional, for production deployment)

### macOS/Linux Requirements

```bash
# Install required tools
brew install postgresql  # macOS
sudo apt-get install postgresql-client  # Ubuntu/Debian

# Install PM2 globally (optional)
npm install -g pm2
```

## 🏃‍♂️ How to Run Scripts

### Method 1: Direct Execution (Recommended)

```bash
# Make script executable (first time only)
chmod +x scripts/setup-dev.sh

# Run the script
./scripts/setup-dev.sh
```

### Method 2: Using Bash

```bash
bash scripts/setup-dev.sh
```

### Method 3: Using npm scripts (where available)

```bash
npm run ci:check  # Runs ci-check.sh
```

## 📖 Script Details

### `setup-dev.sh`

**Purpose**: Initializes the development environment with all necessary dependencies and configurations.

**What it does**:

- ✅ Creates `.env` file from `.env.example` if it doesn't exist
- ✅ Installs npm dependencies
- ✅ Generates Prisma client
- ✅ Runs database migrations
- ✅ Optionally seeds the database
- ✅ Creates necessary directories (`logs`, `uploads`)

**Usage**:

```bash
./scripts/setup-dev.sh
```

**Interactive prompts**:

- Database seeding confirmation

---

### `ci-check.sh`

**Purpose**: Runs continuous integration checks locally before pushing to repository.

**What it does**:

- ✅ Displays environment information (Node.js, npm versions)
- ✅ Runs ESLint for code quality
- ✅ Builds the project
- ✅ Performs security audit

**Usage**:

```bash
./scripts/ci-check.sh

# Or via npm
npm run ci:check
```

**Exit codes**:

- `0`: All checks passed
- `1`: One or more checks failed

---

### `deploy.sh`

**Purpose**: Handles deployment to production or staging environments.

**What it does**:

- ✅ Loads environment-specific configuration
- ✅ Installs production dependencies
- ✅ Generates Prisma client
- ✅ Runs database migrations
- ✅ Builds the application
- ✅ Runs tests (non-production environments)
- ✅ Starts application with PM2 or directly
- ✅ Performs health check

**Usage**:

```bash
# Deploy to production (default)
./scripts/deploy.sh

# Deploy to specific environment
./scripts/deploy.sh staging
./scripts/deploy.sh production
```

**Requirements**:

- Environment file (`.env.production`, `.env.staging`, etc.)
- PM2 installed globally (recommended)

---

### `backup-db.sh`

**Purpose**: Creates compressed backups of the PostgreSQL database.

**What it does**:

- ✅ Extracts database connection info from `DATABASE_URL`
- ✅ Creates timestamped SQL backup
- ✅ Compresses backup with gzip
- ✅ Cleans up backups older than 7 days

**Usage**:

```bash
./scripts/backup-db.sh
```

**Output location**: `./backups/backup_[dbname]_[timestamp].sql.gz`

**Requirements**:

- `pg_dump` utility installed
- Valid `DATABASE_URL` in `.env`
- Database credentials

---

### `verify-template.sh`

**Purpose**: Verifies that all template components are properly configured.

**What it does**:

- ✅ Checks for essential files and directories
- ✅ Verifies package.json scripts
- ✅ Confirms key dependencies
- ✅ Displays feature summary

**Usage**:

```bash
./scripts/verify-template.sh
```

**Use cases**:

- After initial template setup
- Before starting development
- Troubleshooting missing components

## 🔧 Environment Variables

Most scripts require environment variables defined in `.env` files:

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Application
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-secret-key
```

### Environment-Specific Files

- `.env` - Development (local)
- `.env.production` - Production deployment
- `.env.staging` - Staging deployment
- `.env.test` - Testing environment

## 🐛 Troubleshooting

### Common Issues

#### Permission Denied

```bash
# Make script executable
chmod +x scripts/script-name.sh
```

#### Database Connection Issues

```bash
# Check PostgreSQL is running
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Test connection
psql $DATABASE_URL
```

#### Missing Dependencies

```bash
# Install missing packages
npm install

# Regenerate Prisma client
npm run prisma:generate
```

#### Environment Variables Not Loading

```bash
# Check .env file exists
ls -la .env

# Verify format (no spaces around =)
KEY=value  # ✅ Correct
KEY = value  # ❌ Incorrect
```

### Script-Specific Troubleshooting

#### `deploy.sh` fails

1. Ensure environment file exists (`.env.production`)
2. Check PM2 is installed: `pm2 --version`
3. Verify database connectivity
4. Check application health endpoint

#### `backup-db.sh` fails

1. Install PostgreSQL client tools
2. Verify `DATABASE_URL` format
3. Check database permissions
4. Ensure `backups/` directory is writable

#### `setup-dev.sh` fails

1. Check Node.js version: `node --version`
2. Verify npm permissions
3. Ensure PostgreSQL is running
4. Check `.env.example` exists

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🤝 Contributing

When adding new scripts:

1. Follow the existing script structure
2. Include proper error handling (`set -e`)
3. Add colored output for better UX
4. Update this README with script documentation
5. Test on both macOS and Linux

---

_For more information about the TaskManager-Server project, see the main README.md file._
