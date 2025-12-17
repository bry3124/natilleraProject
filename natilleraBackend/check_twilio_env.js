require('dotenv').config();
const twilio = require('twilio');

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;

console.log('--- Twilio Environment Check ---');

if (!sid) {
    console.error('❌ TWILIO_ACCOUNT_SID is missing in .env');
} else {
    console.log(`✅ TWILIO_ACCOUNT_SID found: ${sid.substring(0, 5)}...${sid.substring(sid.length - 4)}`);
}

if (!token) {
    console.error('❌ TWILIO_AUTH_TOKEN is missing in .env');
} else {
    console.log('✅ TWILIO_AUTH_TOKEN found (masked)');
}

if (sid && token) {
    console.log('🔄 Attempting to initialize Twilio client...');
    try {
        const client = new twilio(sid, token);
        // Try to fetch account info to verify credentials
        client.api.v2010.accounts(sid).fetch()
            .then(account => {
                console.log(`✅ Authentication Successful! Account: ${account.friendlyName}`);
            })
            .catch(err => {
                console.error('❌ Authentication Failed:', err.message);
                if (err.status === 401) {
                    console.error('👉 Suggestion: Check if your Account SID and Auth Token are correct.');
                }
            });
    } catch (e) {
        console.error('❌ Client Initialization Error:', e.message);
    }
} else {
    console.log('⚠️ Cannot test authentication without both SID and Token.');
}
