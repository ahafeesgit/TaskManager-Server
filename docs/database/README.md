# 🗄️ Database Guide

This guide covers the comprehensive database setup using PostgreSQL with Prisma ORM, including migrations, seeding, backup strategies, and performance optimization.

## Overview

The database system provides:

- **PostgreSQL Database** for reliable data storage
- **Prisma ORM** for type-safe database access
- **Migration System** for schema version control
- **Seeding Scripts** for initial data setup
- **Backup Strategies** for data protection
- **Performance Optimization** for efficient queries

## Architecture

```
📁 Database Structure
prisma/
├── schema.prisma              # Main schema definition
├── migrations/                # Migration history
│   ├── migration_lock.toml    # Migration lock file
│   └── 20240914144705_init/   # Individual migrations
│       └── migration.sql
└── seed/                      # Seeding scripts
    ├── seed.ts               # Main seed script
    ├── cleanup.ts            # Cleanup script
    └── fixtures/             # Seed data
        ├── users.json        # User fixtures
        └── roles.json        # Role fixtures

src/prisma/
├── prisma.module.ts          # Prisma module
├── prisma.service.ts         # Prisma service
└── prisma.service.spec.ts    # Tests

scripts/
├── backup-db.sh              # Database backup
├── restore-db.sh             # Database restore
└── db-maintenance.sh         # Maintenance tasks
```

## Schema Definition

### Main Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model with authentication
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  password      String?  // Nullable for OAuth users
  role          Role     @default(USER)
  isActive      Boolean  @default(true)
  emailVerified Boolean  @default(false)

  // OAuth fields
  googleId      String?  @unique
  githubId      String?  @unique

  // Profile information
  avatar        String?
  bio           String?
  location      String?
  website       String?

  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastLoginAt   DateTime?

  // Relations
  accounts      Account[]
  sessions      Session[]
  tasks         Task[]
  projects      ProjectMember[]

  // Indexes
  @@map("users")
}

// Role enumeration
enum Role {
  USER
  ADMIN
  MODERATOR

  @@map("roles")
}

// OAuth accounts
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// User sessions
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// Task management
model Task {
  id          String     @id @default(cuid())
  title       String
  description String?    @db.Text
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)

  // Dates
  dueDate     DateTime?
  startDate   DateTime?
  completedAt DateTime?

  // Relations
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId   String?
  project     Project?   @relation(fields: [projectId], references: [id], onDelete: SetNull)

  // Metadata
  tags        String[]
  estimatedHours Int?
  actualHours    Int?

  // Timestamps
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Indexes
  @@index([userId])
  @@index([status])
  @@index([priority])
  @@index([dueDate])
  @@map("tasks")
}

// Task status enumeration
enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
  CANCELLED

  @@map("task_status")
}

// Priority enumeration
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT

  @@map("priority")
}

// Project management
model Project {
  id          String    @id @default(cuid())
  name        String
  description String?   @db.Text
  color       String?   @default("#3B82F6")

  // Dates
  startDate   DateTime?
  endDate     DateTime?

  // Relations
  tasks       Task[]
  members     ProjectMember[]

  // Timestamps
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("projects")
}

// Project membership
model ProjectMember {
  id        String      @id @default(cuid())
  userId    String
  projectId String
  role      ProjectRole @default(MEMBER)
  joinedAt  DateTime    @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId])
  @@map("project_members")
}

// Project role enumeration
enum ProjectRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER

  @@map("project_roles")
}

// Audit log for tracking changes
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  resource  String
  resourceId String?
  oldValues Json?
  newValues Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([resource])
  @@index([createdAt])
  @@map("audit_logs")
}
```

## Database Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/taskmanager?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/taskmanager?schema=public"

# Test Database
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/taskmanager_test?schema=public"

# Connection Pool Settings
DATABASE_MAX_CONNECTIONS=20
DATABASE_TIMEOUT=10000

# SSL Configuration (Production)
DATABASE_SSL_MODE=require
DATABASE_SSL_CERT_PATH=/path/to/cert.pem
```

### Connection Configuration

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      errorFormat: 'pretty',
    });

    // Log slow queries
    this.$on('query', (e: any) => {
      if (e.duration > 1000) {
        console.warn(`Slow query detected: ${e.duration}ms`);
        console.warn(`Query: ${e.query}`);
        console.warn(`Params: ${e.params}`);
      }
    });

    // Log errors
    this.$on('error', (e: any) => {
      console.error('Database error:', e);
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database disconnected');
  }

  // Helper methods for common operations
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async getUserCount(): Promise<number> {
    return this.user.count();
  }

  async getActiveUserCount(): Promise<number> {
    return this.user.count({
      where: {
        isActive: true,
      },
    });
  }

  // Transaction helper
  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }

  // Soft delete helper
  async softDelete(model: string, id: string): Promise<any> {
    const modelDelegate = (this as any)[model];
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }

    return modelDelegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

## Migrations

### Creating Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_user_profile_fields

# Reset database (development only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Resolve migration conflicts
npx prisma migrate resolve --applied 20240914_migration_name
```

### Migration Best Practices

```sql
-- Example migration: Adding indexes for performance
-- migrations/20240915_add_performance_indexes/migration.sql

-- Add indexes for frequently queried fields
CREATE INDEX CONCURRENTLY "idx_tasks_user_status" ON "tasks" ("userId", "status");
CREATE INDEX CONCURRENTLY "idx_tasks_due_date" ON "tasks" ("dueDate") WHERE "dueDate" IS NOT NULL;
CREATE INDEX CONCURRENTLY "idx_audit_logs_created_at" ON "audit_logs" ("createdAt");

-- Add partial indexes for better performance
CREATE INDEX CONCURRENTLY "idx_users_active_email" ON "users" ("email") WHERE "isActive" = true;

-- Add composite indexes for common query patterns
CREATE INDEX CONCURRENTLY "idx_project_members_user_project" ON "project_members" ("userId", "projectId");
```

### Custom Migration Script

```typescript
// scripts/migration-helper.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function customMigration() {
  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Custom migration logic here
      console.log('Running custom migration...');

      // Example: Migrate existing data
      const users = await tx.user.findMany();

      for (const user of users) {
        if (!user.role) {
          await tx.user.update({
            where: { id: user.id },
            data: { role: 'USER' },
          });
        }
      }

      console.log(`Updated ${users.length} users`);
    });

    console.log('Custom migration completed successfully');
  } catch (error) {
    console.error('Custom migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

customMigration();
```

## Database Seeding

### Main Seed Script

```typescript
// prisma/seed/seed.ts
import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { userFixtures } from './fixtures/users.json';
import { projectFixtures } from './fixtures/projects.json';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clean existing data
    await cleanDatabase();

    // Seed users
    await seedUsers();

    // Seed projects
    await seedProjects();

    // Seed tasks
    await seedTasks();

    // Seed audit logs
    await seedAuditLogs();

    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...');

  // Delete in correct order due to foreign key constraints
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleaned');
}

async function seedUsers() {
  console.log('👥 Seeding users...');

  const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@taskmanager.com',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
      emailVerified: true,
      bio: 'System administrator',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  // Create regular users
  const users = [];
  for (const userFixture of userFixtures) {
    const user = await prisma.user.create({
      data: {
        ...userFixture,
        password: hashedPassword,
        role: Role.USER,
        isActive: true,
        emailVerified: true,
      },
    });
    users.push(user);
  }

  console.log(`✅ Created ${users.length + 1} users`);
  return { adminUser, users };
}

async function seedProjects() {
  console.log('📁 Seeding projects...');

  const users = await prisma.user.findMany();
  const projects = [];

  for (const projectFixture of projectFixtures) {
    const project = await prisma.project.create({
      data: {
        ...projectFixture,
        members: {
          create: users.slice(0, 3).map((user, index) => ({
            userId: user.id,
            role: index === 0 ? 'OWNER' : 'MEMBER',
          })),
        },
      },
    });
    projects.push(project);
  }

  console.log(`✅ Created ${projects.length} projects`);
  return projects;
}

async function seedTasks() {
  console.log('📋 Seeding tasks...');

  const users = await prisma.user.findMany();
  const projects = await prisma.project.findMany();

  const taskTemplates = [
    {
      title: 'Setup project repository',
      description:
        'Initialize Git repository and setup basic project structure',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
    },
    {
      title: 'Design user interface mockups',
      description: 'Create wireframes and mockups for the main user interfaces',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
    },
    {
      title: 'Implement user authentication',
      description: 'Setup JWT authentication with refresh tokens',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
    },
    {
      title: 'Write unit tests',
      description: 'Create comprehensive unit tests for core functionality',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
    },
    {
      title: 'Deploy to staging environment',
      description: 'Setup CI/CD pipeline and deploy to staging',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
    },
  ];

  const tasks = [];
  for (let i = 0; i < 50; i++) {
    const template = taskTemplates[i % taskTemplates.length];
    const user = users[Math.floor(Math.random() * users.length)];
    const project =
      Math.random() > 0.3
        ? projects[Math.floor(Math.random() * projects.length)]
        : null;

    const task = await prisma.task.create({
      data: {
        ...template,
        title: `${template.title} #${i + 1}`,
        userId: user.id,
        projectId: project?.id,
        dueDate:
          Math.random() > 0.5
            ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
            : null,
        estimatedHours: Math.floor(Math.random() * 20) + 1,
        tags: getRandomTags(),
      },
    });
    tasks.push(task);
  }

  console.log(`✅ Created ${tasks.length} tasks`);
  return tasks;
}

async function seedAuditLogs() {
  console.log('📜 Seeding audit logs...');

  const users = await prisma.user.findMany();
  const logs = [];

  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
  const resources = ['USER', 'TASK', 'PROJECT'];

  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];

    const log = await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        resource,
        resourceId: `resource_${i}`,
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
      },
    });
    logs.push(log);
  }

  console.log(`✅ Created ${logs.length} audit logs`);
  return logs;
}

function getRandomTags(): string[] {
  const allTags = [
    'urgent',
    'bug',
    'feature',
    'enhancement',
    'documentation',
    'testing',
    'frontend',
    'backend',
  ];
  const numTags = Math.floor(Math.random() * 3);
  const shuffled = allTags.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numTags);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Seed Data Fixtures

```json
// prisma/seed/fixtures/users.json
[
  {
    "email": "john.doe@example.com",
    "name": "John Doe",
    "bio": "Software developer with 5 years of experience",
    "location": "San Francisco, CA",
    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
  },
  {
    "email": "jane.smith@example.com",
    "name": "Jane Smith",
    "bio": "Product manager passionate about user experience",
    "location": "New York, NY",
    "avatar": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150"
  },
  {
    "email": "bob.wilson@example.com",
    "name": "Bob Wilson",
    "bio": "Full-stack developer and team lead",
    "location": "Austin, TX",
    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
  }
]
```

```json
// prisma/seed/fixtures/projects.json
[
  {
    "name": "E-commerce Platform",
    "description": "Building a modern e-commerce platform with React and Node.js",
    "color": "#3B82F6",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-06-30T00:00:00Z"
  },
  {
    "name": "Mobile App Development",
    "description": "Cross-platform mobile application using React Native",
    "color": "#10B981",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-08-31T00:00:00Z"
  },
  {
    "name": "Data Analytics Dashboard",
    "description": "Real-time analytics dashboard for business insights",
    "color": "#F59E0B",
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-09-30T00:00:00Z"
  }
]
```

## Database Operations

### Query Optimization

```typescript
// src/common/database/query-optimizer.ts
import { PrismaService } from '@/prisma/prisma.service';

export class QueryOptimizer {
  constructor(private readonly prisma: PrismaService) {}

  // Optimized user queries with selective includes
  async findUserWithTasks(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tasks: {
          where: {
            status: {
              not: 'DONE',
            },
          },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
          take: 20,
        },
        _count: {
          select: {
            tasks: true,
            projects: true,
          },
        },
      },
    });
  }

  // Paginated queries
  async getPaginatedTasks(
    userId: string,
    page: number = 1,
    limit: number = 10,
    filters?: any,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...filters,
    };

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Bulk operations
  async bulkUpdateTaskStatus(taskIds: string[], status: string) {
    return this.prisma.task.updateMany({
      where: {
        id: {
          in: taskIds,
        },
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  // Complex aggregations
  async getUserStatistics(userId: string) {
    const stats = await this.prisma.task.groupBy({
      by: ['status'],
      where: {
        userId,
      },
      _count: {
        status: true,
      },
    });

    const totalTasks = await this.prisma.task.count({
      where: { userId },
    });

    const completedThisMonth = await this.prisma.task.count({
      where: {
        userId,
        status: 'DONE',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    return {
      totalTasks,
      completedThisMonth,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {}),
    };
  }
}
```

### Database Transactions

```typescript
// Example of complex transaction
async function transferProjectOwnership(
  projectId: string,
  currentOwnerId: string,
  newOwnerId: string,
) {
  return await prisma.$transaction(async (tx) => {
    // Verify current owner
    const currentOwner = await tx.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: currentOwnerId,
          projectId,
        },
      },
    });

    if (!currentOwner || currentOwner.role !== 'OWNER') {
      throw new Error('Current user is not the project owner');
    }

    // Verify new owner is a member
    const newOwner = await tx.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: newOwnerId,
          projectId,
        },
      },
    });

    if (!newOwner) {
      throw new Error('New owner must be a project member');
    }

    // Update roles
    await tx.projectMember.update({
      where: {
        userId_projectId: {
          userId: currentOwnerId,
          projectId,
        },
      },
      data: {
        role: 'ADMIN',
      },
    });

    await tx.projectMember.update({
      where: {
        userId_projectId: {
          userId: newOwnerId,
          projectId,
        },
      },
      data: {
        role: 'OWNER',
      },
    });

    // Log the transfer
    await tx.auditLog.create({
      data: {
        userId: currentOwnerId,
        action: 'TRANSFER_OWNERSHIP',
        resource: 'PROJECT',
        resourceId: projectId,
        oldValues: { owner: currentOwnerId },
        newValues: { owner: newOwnerId },
      },
    });

    return true;
  });
}
```

## Backup and Restore

### Backup Scripts

```bash
#!/bin/bash
# scripts/backup-db.sh

set -e

# Configuration
DB_NAME="${DB_NAME:-taskmanager}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${DATE}.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Creating database backup..."
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Create backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --verbose \
  --clean \
  --create \
  --if-exists \
  --format=custom \
  --file="$BACKUP_FILE.custom"

# Also create SQL format for easier inspection
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --verbose \
  --clean \
  --create \
  --if-exists \
  --format=plain \
  --file="$BACKUP_FILE"

# Compress backups
gzip "$BACKUP_FILE"

echo "Backup completed successfully!"
echo "Files created:"
echo "  - $BACKUP_FILE.custom (pg_restore format)"
echo "  - $BACKUP_FILE.gz (SQL format, compressed)"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.custom" -mtime +7 -delete

echo "Old backups cleaned up"
```

### Restore Script

```bash
#!/bin/bash
# scripts/restore-db.sh

set -e

# Configuration
DB_NAME="${DB_NAME:-taskmanager}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Example: $0 ./backups/taskmanager_backup_20240915_123000.custom"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' not found"
  exit 1
fi

echo "Restoring database from backup..."
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
echo "WARNING: This will replace all data in the database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Determine file format
if [[ "$BACKUP_FILE" == *.custom ]]; then
  echo "Restoring from custom format..."
  pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    --verbose \
    --clean \
    --create \
    --if-exists \
    --dbname="$DB_NAME" \
    "$BACKUP_FILE"
elif [[ "$BACKUP_FILE" == *.sql || "$BACKUP_FILE" == *.sql.gz ]]; then
  echo "Restoring from SQL format..."
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
  else
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"
  fi
else
  echo "Error: Unsupported backup file format"
  exit 1
fi

echo "Database restored successfully!"
echo "Running post-restore checks..."

# Verify restore
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT
  'tasks' as table_name, COUNT(*) as count FROM tasks
UNION ALL
SELECT
  'projects' as table_name, COUNT(*) as count FROM projects;
"

echo "Restore verification completed!"
```

## Performance Monitoring

### Database Monitoring Queries

```sql
-- Monitor slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries taking more than 1 second
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor database size
SELECT
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  pg_size_pretty(pg_total_relation_size('users')) as users_table_size,
  pg_size_pretty(pg_total_relation_size('tasks')) as tasks_table_size;

-- Monitor connection usage
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;

-- Monitor index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Performance Optimization

```typescript
// Performance monitoring service
@Injectable()
export class DatabasePerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSlowQueries() {
    return this.prisma.$queryRaw`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements 
      WHERE mean_time > 1000
      ORDER BY mean_time DESC 
      LIMIT 10
    `;
  }

  async getDatabaseStats() {
    const [size, connections, queries] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `,
      this.prisma.$queryRaw`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity
      `,
      this.prisma.$queryRaw`
        SELECT count(*) as total_queries FROM pg_stat_statements
      `,
    ]);

    return {
      size: size[0]?.size,
      connections: connections[0],
      queries: queries[0]?.total_queries,
    };
  }

  async analyzeTableSizes() {
    return this.prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
    `;
  }
}
```

## Best Practices

### Schema Design

- Use appropriate data types
- Add proper indexes for query patterns
- Implement proper foreign key constraints
- Use enums for fixed value sets

### Query Optimization

- Use selective includes in Prisma queries
- Implement pagination for large datasets
- Use database indexes effectively
- Monitor and optimize slow queries

### Data Integrity

- Use transactions for related operations
- Implement proper validation at database level
- Use soft deletes for important data
- Maintain audit trails for critical operations

### Security

- Use environment variables for sensitive data
- Implement proper access controls
- Sanitize user inputs
- Regular security updates

## Troubleshooting

### Common Issues

#### Migration Conflicts

```bash
# Reset migrations (development only)
npx prisma migrate reset

# Mark migration as applied
npx prisma migrate resolve --applied 20240915_migration_name

# Generate new migration from schema drift
npx prisma db push
```

#### Performance Issues

```bash
# Enable query logging
export DEBUG="prisma:query"

# Analyze slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;

# Check index usage
SELECT * FROM pg_stat_user_indexes WHERE idx_scan < 10;
```

#### Connection Issues

```bash
# Check connection limits
SELECT * FROM pg_stat_activity;

# Test connection
npx prisma db ping

# Reset connection pool
# Restart application or use connection pooling
```

---

**Next Steps:**

- Review [API Guide](../api/) for database integration
- Check [Testing Guide](../testing/) for database testing
- See [Deployment Guide](../deployment/) for production database setup
