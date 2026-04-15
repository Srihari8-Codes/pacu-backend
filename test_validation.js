const http = require('http');

const payloads = [
    { name: 'Test', email: 'test@example.com', password: '123', role: 'NURSE' },
    { name: 'Test', email: 'test@example.com', password: 'password', role: 'NURSE' },
    { name: 'Test', email: 'test@example.com', password: 'Password123', role: 'NURSE' }, 
    { name: 'Test', email: 'test@example.com', password: 'password@123', role: 'NURSE' }, 
    { name: 'Test', email: 'test@example.com', password: 'Password@123', role: 'NURSE' }  
];

async function runTest(payload) {
    return new Promise((resolve) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: '10.78.227.35',
            port: 5000,
            path: '/api/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                console.log(`Testing password: ${payload.password}`);
                console.log(`Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(responseBody);
                    console.log(`Message: ${parsed.message || 'No message'}`);
                    if (parsed.errors) console.log('Validation Errors:', JSON.stringify(parsed.errors, null, 2));
                } catch (e) {
                    console.log('Response:', responseBody);
                }
                console.log('---');
                resolve();
            });
        });

        req.on('error', (error) => {
            console.error(`Error for ${payload.password}:`, error.message);
            resolve();
        });

        req.write(data);
        req.end();
    });
}

async function main() {
    for (const payload of payloads) {
        await runTest(payload);
    }
}

main();
