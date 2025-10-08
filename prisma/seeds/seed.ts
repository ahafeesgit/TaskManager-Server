import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Administrator',
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create regular users
  const users = [
    {
      email: 'user1@example.com',
      password: await bcrypt.hash('user123', 10),
      name: 'John Doe',
      role: 'task_logger',
    },
    {
      email: 'user2@example.com',
      password: await bcrypt.hash('user123', 10),
      name: 'Jane Smith',
      role: 'project_owner',
    },
    {
      email: 'google.user@example.com',
      password: null, // Google OAuth user
      googleId: 'google-123456789',
      name: 'Google User',
      role: 'task_logger',
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log(`✅ Created user: ${user.email}`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
