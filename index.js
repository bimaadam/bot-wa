const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Register custom font for the canvas
registerFont(path.join(__dirname, 'fonts', 'NotoColorEmoji.ttf'), { family: 'NotoColorEmoji' });

// Initialize WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: '/mnt/data/.wwebjs_auth', // Persistent storage path for Railway
  }),
  puppeteer: {
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-gpu',
    ],
  },
});

// Event Handlers
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('QR Code Generated! Scan untuk login.');
});

client.on('ready', () => {
  console.log('Bot WhatsApp sudah siap!');
});

client.on('authenticated', () => {
  console.log('Berhasil login ke WhatsApp!');
});

client.on('auth_failure', (msg) => {
  console.error('Autentikasi gagal:', msg);
});

client.on('disconnected', (reason) => {
  console.log('Bot terputus karena:', reason);
});

// Function to create a text sticker
async function createTextSticker(text) {
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 90px "NotoColorEmoji", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toBuffer('image/png');
}

// Function to get AI response
async function getAIResponse(prompt) {
  try {
    const result = await genAI.generateText({
      model: 'gemini-2.0-flash-exp',
      prompt,
      temperature: 0.7,
      maxTokens: 200,
    });
    return result.text || 'Maaf, saya tidak dapat memberikan jawaban.';
  } catch (error) {
    console.error('Error AI:', error);
    return 'Terjadi kesalahan pada AI. Coba lagi nanti ya!';
  }
}

// Handle incoming messages
client.on('message', async (message) => {
  try {
    if (message.body.startsWith('.stikerteks ')) {
      const text = message.body.slice(12).trim();
      if (!text) {
        await message.reply('Teksnya mana? Ketik: .stikerteks [Teks]');
        return;
      }
      const stickerBuffer = await createTextSticker(text);
      const media = new MessageMedia('image/png', stickerBuffer.toString('base64'));
      await message.reply(media, { sendMediaAsSticker: true });
    } else if (message.body === '.stiker' && message.hasMedia) {
      const media = await message.downloadMedia();
      if (!media || (media.mimetype !== 'image/jpeg' && media.mimetype !== 'image/png')) {
        await message.reply('Media tidak valid. Kirim ulang gambar dalam format PNG/JPG.');
        return;
      }
      await message.reply(media, { sendMediaAsSticker: true });
    } else if (!message.isGroupMsg) {
      const response = await getAIResponse(message.body.trim());
      await message.reply(response);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Start WhatsApp Client
client.initialize();
