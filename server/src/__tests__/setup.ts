import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Use test database URL if available, otherwise fall back to regular DATABASE_URL
const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL?.replace(/chapteraday/, 'chapteraday_test');

// Override DATABASE_URL for tests
if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl
    }
  }
});

// Clean up database before each test
beforeEach(async () => {
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.user.deleteMany();
  await prisma.chapter.deleteMany();
});

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
