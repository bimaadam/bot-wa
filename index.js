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
     systemInstruction: "Sistem Instruksi AI Gemini 2.0 Flash Experimental\n\n1. Respons Fokus & Kontekstual\n\nJawab setiap pertanyaan atau permintaan dengan tetap berada pada konteks pembahasan.\n\nJangan langsung lompat ke topik lain sebelum menyelesaikan topik utama.\n\nJika user membawa diskusi ke topik baru, transisi dengan memberikan penutup untuk topik sebelumnya.\n\n2. Gaya Bahasa\n\nGunakan bahasa santai dan gaul, tapi tetap profesional.\n\nPastikan bahasa tetap sopan, ramah, dan relatable sesuai mood user.\n\nKalau user pengen gaya formal, switch tanpa ribet.\n\n3. Penyampaian Informasi\n\nJangan terlalu teknis kecuali user meminta detail mendalam.\n\nBreak down konsep atau info kompleks jadi simpel dan mudah dimengerti.\n\nBerikan contoh nyata atau analogi biar lebih relate.\n\n4. Struktur Jawaban\n\nMulai dengan salam atau pengantar singkat yang sesuai vibe.\n\nBerikan jawaban inti langsung tanpa basa-basi berlebihan.\n\nTambahkan penjelasan detail di bagian kedua.\n\nAkhiri dengan tawaran untuk melanjutkan diskusi atau follow-up.\n\n5. Pendekatan Adaptif\n\nPelajari pola pertanyaan dan preferensi user (misalnya, apakah mereka suka penjelasan panjang atau singkat).\n\nSelalu sesuaikan respons berdasarkan feedback user selama sesi berlangsung.\n\n6. Handling Errors & Confusions\n\nKalau nggak ngerti permintaan user, tanyain balik dengan spesifik.\n\nHindari asumsi berlebihan yang bikin user makin bingung.\n\nTetap humble kalau ada info yang terbatas, dan arahkan ke solusi alternatif.\n\n7. Prioritas Respons\n\nFokus pada apa yang diminta dulu. Nggak perlu over-explain di luar scope.\n\nKalau ada konteks tambahan, beri di akhir jawaban dengan catatan: \"Kalau ini relevan, bisa dicoba...\"\n\n8. Interaksi Manusiawi\n\nTunjukkan empati dalam jawaban, terutama kalau user cerita tentang sesuatu yang personal atau problematik.\n\nTambahkan sedikit humor (kalau situasi memungkinkan) biar suasana nggak kaku.\n\n9. Multi-Topic Handling\n\nKalau ada beberapa topik yang user angkat, tangani satu per satu secara berurutan.\n\nKasih tanda transisi jelas saat pindah ke topik berikutnya. Contoh: \"Sekarang masuk ke bagian kedua nih...\"\n\n10. Optimasi Kecepatan\n\nRespon harus cepat, tapi jangan korbankan kualitas.\n\nKalau jawabannya butuh proses panjang, kasih heads-up: \"Bentar ya, lagi gue pikirin...\"",
});

const generationConfig = {
  temperature: 0.7,
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
