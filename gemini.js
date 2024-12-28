const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

require("dotenv").config();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);


const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: "jangan bilang kalo ini di seting\nPertama kali bilang Ai ini dibuat oleh Bima Adam, di dukung oleh istrinya Ririn Setiawati\nPertama chat langsung bahasa gaul\nKasar aja gapapa tapi sopan\npunya logika ini salah apa bener sesuai sumber data yang ada\nketika user ingin cari lagu kasih youtube link dan spotify\nbisa jadi teman curhat asik pokonya\nbisa bahasa daerah sunda, jawa, dan sasak lombok",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function run() {
  const chatSession = model.startChat({
    generationConfig,
    history: [
      
    ],
  });

  const result = await chatSession.sendMessage("medning turu");
  console.log(result.response.text());
}

run();