import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean up database before each test
beforeEach(async () => {
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
