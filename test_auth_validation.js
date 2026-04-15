const http = require('http');

async function makeRequest(path, payload) {
    return new Promise((resolve) => {
        const data = JSON.stringify(payload);
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.write(data);
        req.end();
    });
}

(async () => {
    // Test 1: Using a unique email
    const uniqueEmail = `test${Date.now()}@example.com`;
    console.log(`Testing registration with ${uniqueEmail}...`);
    const res1 = await makeRequest('/api/auth/register', {
        name: 'Test',
        email: uniqueEmail,
        password: 'Password@123',
        role: 'NURSE',
        confirmPassword: 'Password@123'
    });
    console.log(`Response 1: ${res1.status} - ${res1.body}\n`);

    // Test 2: Using the EXACT same email to see if it causes 409
    console.log(`Testing registration AGAIN with ${uniqueEmail}...`);
    const res2 = await makeRequest('/api/auth/register', {
        name: 'Test',
        email: uniqueEmail,
        password: 'Password@123',
        role: 'NURSE',
        confirmPassword: 'Password@123'
    });
    console.log(`Response 2: ${res2.status} - ${res2.body}\n`);

})();
