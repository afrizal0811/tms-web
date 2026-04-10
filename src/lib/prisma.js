// File: src/lib/prisma.js
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

// Gunakan globalThis, bukan global biasa
const globalForPrisma = globalThis;

// Gunakan nullish coalescing (??) agar lebih aman dari falsy value
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
