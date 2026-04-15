(async () => {
    try {
        const uniqueEmail = `test${Date.now()}@example.com`;
        console.log(`Sending registration request for ${uniqueEmail}...`);
        
        const payload = {
            name: "Test User",
            email: uniqueEmail,
            password: "Password@123",
            role: "NURSE",
            confirmPassword: "Password@123"
        };
        
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log("Status Code:", response.status);
        console.log("Response Body:", JSON.stringify(data, null, 2));

    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
})();
