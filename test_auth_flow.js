const http = require('http');

async function makeRequest(path, method, payload = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = payload ? JSON.stringify(payload) : '';
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            options.headers['Content-Length'] = data.length;
        }

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseBody });
                }
            });
        });

        req.on('error', (error) => reject(error));
        if (data) req.write(data);
        req.end();
    });
}

async function testAuthFlow() {
    console.log('1. Registering new user...');
    const regRes = await makeRequest('/api/auth/register', 'POST', {
        name: 'Test Auth User',
        email: `testauth${Date.now()}@example.com`,
        password: 'Password@123',
        role: 'NURSE' // The role element mentioned by user
    });
    console.log(`Register status: ${regRes.status}`);

    if (regRes.status !== 201) {
        console.error('Registration failed:', regRes.data);
        return;
    }

    const { token, refreshToken, user } = regRes.data.data;
    console.log('User created:', user);

    console.log('\n2. Testing /auth/me...');
    const meRes = await makeRequest('/api/auth/me', 'GET', null, { Authorization: `Bearer ${token}` });
    console.log(`/auth/me status: ${meRes.status}`);
    console.log('/auth/me response:', meRes.data.data?.user?.role);

    console.log('\n3. Testing refresh token...');
    // This was failing with 500 "Cannot read properties of undefined (reading 'role')"
    const refreshRes = await makeRequest('/api/auth/refresh', 'POST', { refreshToken });
    console.log(`Refresh token status: ${refreshRes.status}`);
    console.log('Refresh token successful:', !!refreshRes.data.data?.token);

    console.log('\n4. Testing login...');
    const loginRes = await makeRequest('/api/auth/login', 'POST', {
        email: user.email,
        password: 'Password@123'
    });
    console.log(`Login status: ${loginRes.status}`);
    console.log('Login successful:', !!loginRes.data.data?.token);
}

testAuthFlow();
