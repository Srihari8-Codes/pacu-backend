import { PrismaClient } from '@prisma/client';

async function verify() {
    const prisma = new PrismaClient();
    try {
        console.log('Verifying Prisma configuration...');
        // @ts-ignore - access internal metadata if possible or just try to connect
        console.log('Attempting to connect to PostgreSQL...');
        await prisma.$connect();
        console.log('Successfully connected to PostgreSQL!');
        await prisma.$disconnect();
    } catch (e) {
        console.error('Prisma connection failed:');
        console.error(e);
    }
}

verify();
