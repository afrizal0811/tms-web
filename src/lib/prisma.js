import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

const globalForPrisma = globalThis;
const SCHEMA_VERSION = '2026-10-27-v6';

if (
  process.env.NODE_ENV !== 'production' &&
  globalForPrisma._prismaSchemaVersion !== SCHEMA_VERSION
) {
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {}
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma._prismaSchemaVersion = SCHEMA_VERSION;
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
