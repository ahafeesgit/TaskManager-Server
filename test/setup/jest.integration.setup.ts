// Global test setup for integration tests
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-integration';

// Global test timeout
jest.setTimeout(60000);

// Global test database setup and teardown
let prismaService: PrismaService;

beforeAll(async () => {
  // This will be used to setup test database
  // Can be extended to use TestContainers
});

afterAll(async () => {
  if (prismaService) {
    await prismaService.$disconnect();
  }
});

// Helper function to create test module
export const createTestingModule = async (providers: any[] = []) => {
  const moduleRef = await Test.createTestingModule({
    providers: [PrismaService, ...providers],
  }).compile();

  prismaService = moduleRef.get<PrismaService>(PrismaService);
  return moduleRef;
};
