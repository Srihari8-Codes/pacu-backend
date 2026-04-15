import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/hash';

const prisma = new PrismaClient();

async function main() {
    const password = await hashPassword('Password@123');

    // Create Nurse
    const nurse = await prisma.user.upsert({
        where: { email: 'nurse1@nurse.com' },
        update: {},
        create: {
            email: 'nurse1@nurse.com',
            name: 'Nurse Joy',
            passwordHash: password,
            role: 'NURSE',
            phone: '1234567890',
        },
    });

    // Create Doctor
    const doctor = await prisma.user.upsert({
        where: { email: 'doctor1@doctor.com' },
        update: {},
        create: {
            email: 'doctor1@doctor.com',
            name: 'Dr. House',
            passwordHash: password,
            role: 'DOCTOR',
            phone: '0987654321',
        },
    });

    console.log({ nurse, doctor });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
