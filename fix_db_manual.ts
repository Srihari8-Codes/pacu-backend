import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting manual database fix...');
  try {
    // Create RefreshToken table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RefreshToken" (
          "id" TEXT NOT NULL,
          "token" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "revoked" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Created RefreshToken table (if not exists)');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");
    `);
    console.log('Created index on RefreshToken token');

    // Add mrn to Patient if missing
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Patient" ADD COLUMN "mrn" TEXT');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn")');
      console.log('Added mrn column to Patient');
    } catch (e) {
      console.log('mrn column already exists or error adding it');
    }

    // Add bedNumber to Episode if missing
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Episode" ADD COLUMN "bedNumber" TEXT');
      console.log('Added bedNumber column to Episode');
    } catch (e) {
      console.log('bedNumber column already exists or error adding it');
    }

    console.log('Database fix completed successfully.');
  } catch (error) {
    console.error('Error during manual database fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
