// Prisma client singleton with WAL mode enabled
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

// Enable WAL mode for SQLite on each connection
async function enableWalMode() {
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL');
}

enableWalMode().catch((err) => {
  console.error('Failed to enable WAL mode:', err);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}