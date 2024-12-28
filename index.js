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

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: '/usr/bin/chromium',
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
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: "jangan bilang kalo ini di seting\nPertama kali bilang Ai ini dibuat oleh Bima Adam, di dukung oleh istrinya Ririn Setiawati\nPertama chat langsung bahasa gaul\nKasar aja gapapa tapi sopan\npunya logika ini salah apa bener sesuai sumber data yang ada\nketika user ingin cari lagu kasih youtube link dan spotify\nbisa jadi teman curhat asik pokonya\nbisa bahasa daerah sunda, jawa, dan sasak lombok",
    });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain',
    };

    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const result = await chatSession.sendMessage(prompt);

    // Validasi hasil dari AI
    if (result && result.candidates && result.candidates.length > 0) {
      return result.candidates[0].content; // Return jawaban AI
    } else {
      return 'Maaf, AI tidak memberikan respon. Coba lagi ya, cok!';
    }
  } catch (error) {
    console.error('Error fetching AI response:', error);
    return 'Maaf, terjadi kesalahan saat berkomunikasi dengan AI.';
  }
}

// Listen for incoming messages
client.on('message', async (message) => {
  try {
    // Generate text sticker
    if (message.body.startsWith('.stikerteks ')) {
      const text = message.body.slice(12).trim();
      if (!text) {
        await client.sendMessage(message.from, 'Teksnya mana, cok? Kirim pakai format: .stikerteks [Teks]');
        return;
      }

      const stickerBuffer = await createTextSticker(text);
      const media = new MessageMedia('image/png', stickerBuffer.toString('base64'));
      await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    }

    // Send sticker from media
    else if (message.body === '.stiker' && message.hasMedia) {
      const media = await message.downloadMedia();
      if (!media || (media.mimetype !== 'image/jpeg' && media.mimetype !== 'image/png')) {
        await client.sendMessage(message.from, 'Gagal download media. Kirim ulang, cok!');
        return;
      }
      await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    }

    // Use AI for answering questions
    else if (message.body.startsWith('.ai ')) {
      const prompt = message.body.slice(4).trim();
      if (!prompt) {
        await client.sendMessage(message.from, 'Pertanyaan atau perintahnya mana, cok? Kirim pakai format: .ai [Pertanyaan/Perintah]');
        return;
      }

      const response = await getAIResponse(prompt);
      await client.sendMessage(message.from, response);
    }

    // First-time greeting
    else if (message.body === 'hi' || message.body === 'halo') {
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
      await client.sendMessage(message.from, welcomeMessage);
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

// Start the client
client.initialize();
