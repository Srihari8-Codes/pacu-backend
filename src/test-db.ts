import { PrismaClient } from '@prisma/client';

async function testConnection() {
    const prisma = new PrismaClient();
    try {
        console.log('Testing connection to PostgreSQL...');
        await prisma.$connect();
        console.log('Successfully connected to the database!');
        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Failed to connect to the database:');
        console.error(error);
        process.exit(1);
    }
}

testConnection();
