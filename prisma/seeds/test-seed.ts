import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting test database seeding...');

  // Create test admin
  const adminPassword = await bcrypt.hash('test123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'test-admin@test.com' },
    update: {},
    create: {
      email: 'test-admin@test.com',
      password: adminPassword,
      name: 'Test Administrator',
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`✅ Created test admin: ${admin.email}`);

  // Create test users
  const testUser = await prisma.user.upsert({
    where: { email: 'test-user@test.com' },
    update: {},
    create: {
      email: 'test-user@test.com',
      password: await bcrypt.hash('test123', 10),
      name: 'Test User',
      role: 'task_logger',
      isActive: true,
    },
  });

  console.log(`✅ Created test user: ${testUser.email}`);

  console.log('🧪 Test database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during test seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
