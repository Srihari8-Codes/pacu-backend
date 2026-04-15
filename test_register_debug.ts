import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        console.log("Testing patient registration...");
        
        // Find a valid user to use as creator
        const user = await prisma.user.findFirst();
        if (!user) {
            console.error("No users found in database. Create a user first.");
            return;
        }

        const patientId = `PTEST${Math.floor(Math.random() * 1000)}`;
        
        const patient = await (prisma as any).patient.create({
            data: {
                patient_id: patientId,
                name: "Test Patient",
                age: 30,
                gender: "Male",
                procedure: "Test Proc",
                allergies: "None",
                createdByUserId: user.id
            }
        });

        console.log("Success! Patient created:", patient);
    } catch (error) {
        console.error("FAILED to create patient:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
