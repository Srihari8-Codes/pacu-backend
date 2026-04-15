const { execSync } = require('child_process');
const path = require('path');

console.log('--- FORCED PRISMA GENERATE START ---');
try {
    const cwd = process.cwd();
    console.log('Current working directory:', cwd);
    console.log('Executing: npx prisma generate');
    
    const output = execSync('npx prisma generate', { 
        cwd: cwd,
        stdio: 'inherit',
        shell: 'cmd.exe'
    });
    
    console.log('--- FORCED PRISMA GENERATE SUCCESS ---');
} catch (error) {
    console.error('--- FORCED PRISMA GENERATE FAILED ---');
    console.error('Error message:', error.message);
    if (error.stdout) console.error('STDOUT:', error.stdout.toString());
    if (error.stderr) console.error('STDERR:', error.stderr.toString());
}
