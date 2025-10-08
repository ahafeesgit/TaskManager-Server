import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database cleanup...');

  // Delete all users (cascade will handle related records)
  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`🗑️  Deleted ${deletedUsers.count} users`);

  console.log('✨ Database cleanup completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
