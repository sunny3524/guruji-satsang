const http = require('http');

const data = JSON.stringify({
  data: {
    subject: "Test Subject",
    body: "Test Body"
  }
});

const options = {
  hostname: '127.0.0.1',
  port: 5001,
  path: '/guruji-satsang-b650a/europe-west2/sendBroadcast',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending callable request to sendBroadcast...');
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  process.exit(1);
});

req.write(data);
req.end();
