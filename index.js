const { Client } = require('whatsapp-web.js');

const client = new Client({
  puppeteer: {
    executablePath: '/usr/bin/chromium-browser', // Path Chromium dari Railway
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Tambahin args buat environment container
  },
});

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();
