# Development Setup Guide

## Prerequisites

### Required Software

- **Node.js**: Version 18 or higher
- **npm**: Usually comes with Node.js
- **PostgreSQL**: Version 12 or higher
- **Git**: For version control

### Recommended Tools

- **VS Code**: With the following extensions:
  - ESLint
  - Prettier
  - Thunder Client (for API testing)
  - Prisma
- **Postman**: For API testing
- **pgAdmin**: PostgreSQL administration

## Database Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**

```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE taskmanager_db;

# Create user (optional)
CREATE USER taskmanager_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE taskmanager_db TO taskmanager_user;

# Exit psql
\q
```

### 3. Update Environment Variables

Update your `.env` file with the correct database credentials:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/taskmanager_db?schema=public"
```

## Development Workflow

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/ahafeesgit/TaskManager-Server.git
cd TaskManager-Server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

### 2. Daily Development

```bash
# Start development server
npm run start:dev

# In another terminal, run tests
npm run test:watch

# Check code quality
npm run lint
npm run format
```

### 3. Database Operations

```bash
# View database in browser
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (development only!)
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy
```

## Environment Configuration

### Development (.env)

```env
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/taskmanager_db?schema=public"
JWT_SECRET="dev-secret-key"
PORT=3000
```

### Production (.env.production)

```env
NODE_ENV=production
DATABASE_URL="your-production-database-url"
JWT_SECRET="super-secure-production-secret"
PORT=3000
```

## Code Quality

### ESLint Configuration

The project uses ESLint with TypeScript rules. Run:

```bash
npm run lint
```

### Prettier Configuration

Code formatting with Prettier:

```bash
npm run format
```

### Pre-commit Hooks (Optional)

Install husky for pre-commit hooks:

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Database

For testing, you might want a separate database:

```env
TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/taskmanager_test_db?schema=public"
```

## Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/main",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Debug Mode

Start the application in debug mode:

```bash
npm run start:debug
```

## Common Issues

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti :3000

# Kill the process
kill $(lsof -ti :3000)
```

### Database Connection Issues

1. Check PostgreSQL is running
2. Verify database credentials in `.env`
3. Ensure database exists
4. Check firewall settings

### Module Resolution Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```
