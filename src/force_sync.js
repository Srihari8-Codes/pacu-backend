const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run() {
    console.log('--- STARTING PRISMA SYNC SCRIPT ---');
    try {
        const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
        console.log(`Using schema path: ${schemaPath}`);
        
        if (!fs.existsSync(schemaPath)) {
            console.error(`ERROR: Schema file not found at ${schemaPath}`);
            return;
        }

        console.log('1. Deleting stale client...');
        const clientPath = path.resolve(__dirname, '../node_modules/.prisma');
        if (fs.existsSync(clientPath)) {
            fs.rmSync(clientPath, { recursive: true, force: true });
            console.log('   Client deleted.');
        } else {
            console.log('   Client path not found, skipping delete.');
        }

        console.log('2. Running npx prisma generate...');
        const genOut = execSync(`npx prisma generate --schema="${schemaPath}"`, { encoding: 'utf8' });
        console.log('   OUTPUT:', genOut);

        console.log('3. Running npx prisma db push --force-reset...');
        const pushOut = execSync('npx prisma db push --force-reset --accept-data-loss', { encoding: 'utf8' });
        console.log('   OUTPUT:', pushOut);

        console.log('--- SYNC COMPLETED SUCCESSFULLY ---');
    } catch (error) {
        console.error('--- SYNC FAILED ---');
        console.error('Error Message:', error.message);
        if (error.stdout) console.error('STDOUT:', error.stdout);
        if (error.stderr) console.error('STDERR:', error.stderr);
    }
}

run();
