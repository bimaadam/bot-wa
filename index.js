const { Client } = require('whatsapp-web.js');

const client = new Client({
  puppeteer: {
    executablePath: '/usr/bin/google-chrome', // Atau path browser yang udah ada di Railway
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Buat jalanin Puppeteer di container
  },
});

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();
