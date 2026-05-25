const https = require('https');

const apiKey = "AIzaSyCPmzH9kKoqzf4hOQgmJHx85k7bKPZE9cg";
const email = "aggarwal.vani1@gmail.com";
const password = "asdfgh";

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    console.log(`1. Signing in as ${email} via Auth REST API...`);
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const authRes = await post(authUrl, {}, { email, password, returnSecureToken: true });
    
    if (authRes.status !== 200) {
      console.error('Auth failed:', authRes.body);
      process.exit(1);
    }

    const authData = JSON.parse(authRes.body);
    const idToken = authData.idToken;
    const localId = authData.localId;
    console.log(`   Success! UID: ${localId}`);
    
    console.log('2. Calling live sendBroadcast function with valid ID Token...');
    const funcUrl = 'https://europe-west2-guruji-satsang-b650a.cloudfunctions.net/sendBroadcast';
    const funcRes = await post(funcUrl, {
      'Authorization': `Bearer ${idToken}`
    }, {
      data: {
        subject: "Verification Test",
        body: "Checking the live API response"
      }
    });

    console.log('\nSTATUS:', funcRes.status);
    console.log('RESPONSE BODY:', funcRes.body);
    process.exit(0);
  } catch (e) {
    console.error('Test script crashed:', e);
    process.exit(2);
  }
})();
