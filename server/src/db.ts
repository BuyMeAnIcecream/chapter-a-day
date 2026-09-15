import { PrismaClient } from "@prisma/client";

/** Shared Prisma client so the whole server uses a single connection pool. */
export const prisma = new PrismaClient();
