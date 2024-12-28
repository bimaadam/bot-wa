const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Register custom font for the canvas
registerFont(path.join(__dirname, 'fonts', 'NotoColorEmoji.ttf'), { family: 'NotoColorEmoji' });

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: '/usr/bin/chromium', // Path ke Chromium untuk Railway
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// Generate QR code for WhatsApp web
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

// Bot is ready
client.on('ready', () => {
  console.log('Bot sudah siap!');
});

// Function to create a text sticker
async function createTextSticker(text) {
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 90px "NotoColorEmoji", Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toBuffer('image/png');
}

async function getAIResponse(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    return responseText;
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return "Maaf, terjadi kesalahan saat berkomunikasi dengan AI.";
  }
}

// Listen for incoming messages
client.on('message', async (message) => {
  // First-time greeting
  if (message.body === 'hi' || message.body === 'halo') {
    const welcomeMessage = `
🌟 *Selamat datang di bot Rinbim.dev | Beta* 🌟
 
*Fitur yang tersedia:*
1️⃣ Buat stiker dari teks ➡️ _Ketik: .stikerteks [Teks]_
2️⃣ Ubah gambar jadi stiker ➡️ _Kirim gambar lalu ketik: .stiker_
3️⃣ Tanya apa saja ke AI ➡️ _Ketik: .ai [Pertanyaan]_

💼 Kami juga menyediakan jasa:
- Pembuatan Website (Frontend & Backend)
- Pembuatan Script Custom

🔥 Hubungi admin untuk info lebih lanjut!
💬 Semoga membantu! 😊
    `;
    client.sendMessage(message.from, welcomeMessage);
    return;
  }

  // Generate text sticker
  if (message.body.startsWith('.stikerteks ')) {
    const text = message.body.slice(12).trim();
    if (!text) {
      client.sendMessage(message.from, 'Teksnya mana, cok? Kirim pakai format: .stikerteks [Teks]');
      return;
    }

    try {
      const stickerBuffer = await createTextSticker(text);
      const media = new MessageMedia('image/png', stickerBuffer.toString('base64'));
      client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    } catch (err) {
      console.log('Error bikin stiker teks:', err);
      client.sendMessage(message.from, 'Gagal bikin stiker teks. Coba lagi ntar, cok!');
    }
  }

  // Send sticker from media
  if (message.body === '.stiker' && message.hasMedia) {
    try {
      const media = await message.downloadMedia();
      if (!media || (media.mimetype !== 'image/jpeg' && media.mimetype !== 'image/png')) {
        console.error('Media download failed. Message details:', message);
        client.sendMessage(message.from, 'Gagal download media. Kirim ulang, cok!');
        return;
      }
      client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    } catch (err) {
      console.log('Error saat mengirim stiker:', err);
      client.sendMessage(message.from, 'Gagal mengirim stiker. Coba lagi, cok!');
    }
  }

  // Use AI for answering questions
  if (message.body.startsWith('.ai ')) {
    const prompt = message.body.slice(4).trim();
    if (!prompt) {
      client.sendMessage(message.from, 'Pertanyaan atau perintahnya mana, cok? Kirim pakai format: .ai [Pertanyaan/Perintah]');
      return;
    }

    try {
      const response = await getAIResponse(prompt);
      client.sendMessage(message.from, response);
    } catch (err) {
      console.log('Error saat berinteraksi dengan AI:', err);
      client.sendMessage(message.from, 'Maaf, terjadi kesalahan saat berkomunikasi dengan AI.');
    }
  }
});

// Initialize the bot
client.initialize();
