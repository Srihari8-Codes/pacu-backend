import prisma from './config/prisma';

async function verify() {
    try {
        console.log('Attempting to find a patient with patient_id: P12345...');
        const patient = await (prisma as any).patient.findFirst({
            where: { patient_id: 'P12345' }
        });
        console.log('Result:', patient);
        console.log('SUCCESS: prisma.patient.findUnique is working!');
    } catch (error: any) {
        console.error('FAILURE: Prisma findUnique failed.');
        console.error('Error Message:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
