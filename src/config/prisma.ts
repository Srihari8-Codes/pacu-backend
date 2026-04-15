import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Database initialization log
console.log('Prisma Client initialized.');

export default prisma;
