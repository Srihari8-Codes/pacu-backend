const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const testEmail = `debug_test_${Date.now()}@example.com`;
        console.log(`Attempting to create user with email: ${testEmail}`);
        
        const user = await prisma.user.create({
            data: {
                name: 'Debug Test User',
                email: testEmail,
                passwordHash: 'dummy_hash',
                role: 'NURSE',
                phone: '' // Test common case of empty phone
            }
        });
        console.log("User created successfully:", user.id);

    } catch (err) {
        console.log("Error Code:", err.code);
        console.log("Error Meta:", JSON.stringify(err.meta, null, 2));
        if (err.code === 'P2002') {
            console.log("CONFLICT FIELD(S):", err.meta?.target);
        }
    } finally {
        await prisma.$disconnect();
    }
}

test();
