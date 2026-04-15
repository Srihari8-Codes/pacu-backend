import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await (prisma as any).$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    console.log('Tables in database:', tables);
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
