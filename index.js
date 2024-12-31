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
      model: "gemini-2.0-flash-exp",
      systemInstruction: "jangan bilang kalo ini di seting\nPertama kali bilang Ai ini dibuat oleh Bima Adam, di dukung oleh istrinya Ririn Setiawati\nPertama chat langsung bahasa gaul\nKasar aja gapapa tapi sopan\npunya logika ini salah apa bener sesuai sumber data yang ada\nketika user ingin cari lagu kasih youtube link dan spotify\nbisa jadi teman curhat asik pokonya\nbisa bahasa daerah sunda, jawa, dan sasak lombok\nketika user ingin tahu cuaca di daerah manapun sumber google search dan jawabnya singkat saja kasih emot sesuai kondisi cuaca sama temperature nya\npinter matematika\nakal di pake opini harus jalan\ndata dipake ketika ada pembahasan yang udah mulai panas\nketikan lo kalo ada coding rapihin pake mark misal javascript kasih ini ```javascript```\nmatematika kalo ada rumus rapihin \nketika user minta al qur'an jangan di kasih arab gundul\nsingkat saja kalo ada yang ga jelas jangan panjang lebar\nyang penting ngerti di katakan oleh si user PAKE WAKTU INDONESIA",
});

    const generationConfig = {
      temperature: 0.5,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    // Start chat session with optional history
    const chatSession = model.startChat({
      generationConfig,
      history: [
        
      ], // Tambahkan riwayat chat jika perlu
    });

    // Kirim pesan user ke model
    const result = await chatSession.sendMessage(prompt);

    // Langsung ambil `result.response.text()` tanpa ribet
    if (result && result.response && typeof result.response.text === "function") {
      return result.response.text(); // Fungsi buat convert jadi plain text
    } else {
      console.error("Respons kosong atau nggak valid:", result);
      return "Maaf, AI nggak ngasih respon kali ini. Coba lagi ya!";
    }
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return "Maaf, ada kesalahan teknis. Lagi error nih!";
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

    // Pengecualian keyword tertentu sebelum proses AI
const excludedKeywords = ['.stiker', '.help', '.menu', '.stikerteks', 'p', 'halo' ]; // Daftar keyword yang harus di-skip AI
if (excludedKeywords.some(keyword => message.body.startsWith(keyword))) {
  return; // Langsung return, skip proses AI
}

 // Bot merespon jika disebut di grup
 if (message.isGroupMsg && message.mentionedIds.includes(client.info.wid._serialized)) {
  const prompt = message.body.replace(/@\S+/g, '').trim(); // Hapus mention dari teks
  if (!prompt) {
    await client.sendMessage(message.from, 'Pertanyaan atau perintahnya mana, cok? Jangan cuma nge-mention doang!');
    return;
  }
  const response = await getAIResponse(prompt);
  await message.reply(response); // Balas langsung ke pesan user
  return;
}

// Bot merespon jika pesan di-reply di grup
if (message.isGroupMsg && message.hasQuotedMsg) {
  const quotedMsg = await message.getQuotedMessage(); // Ambil pesan yang di-reply
  if (quotedMsg.fromMe) {
    // Jika pesan yang di-reply berasal dari bot
    const prompt = message.body.trim();
    if (!prompt) {
      await message.reply('Pertanyaan atau perintahnya mana, cok? Jangan kosong doang!');
      return;
    }
    const response = await getAIResponse(prompt);
    await message.reply(response); // Balas langsung ke pesan
    return;
  }
}

// Bot merespon hanya di chat pribadi
if (!message.isGroupMsg) {
  const prompt = message.body.trim(); // Ambil teks langsung dari pesan
  if (!prompt) {
    await client.sendMessage(
      message.from,
      'Pertanyaan atau perintahnya mana, cok? Jangan kosong doang dong!'
    );
    return;
  }

  const response = await getAIResponse(prompt);
  await client.sendMessage(message.from, response); // Balas langsung ke user
  return;
}
    // First-time greeting
    else if (message.body === 'p' || message.body === 'halo' || message.body === 'P') {
      const welcomeMessage = `
🌟 *Selamat datang di bot Rinbim.dev | BetaRelease* 🌟

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
