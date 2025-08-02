const OpenAI = require("openai");
const fs = require("fs");
const path = require('path');
require("dotenv").config(); // Carrega variáveis do .env

// Lê o prompt inicial da IA
const prompt = fs.readFileSync(path.join(__dirname, "./finanzai-prompt.txt"), "utf-8")

// Instancia do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Função principal exportada
async function processarMensagemIA(mensagem) {
  if (!mensagem) {
    throw new Error("Mensagem é obrigatória.");
  }

  if (typeof mensagem !== "string") {
    mensagem = JSON.stringify(mensagem);
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: mensagem },
      ],
    });

    const output = response.choices[0].message.content;
    const json = JSON.parse(output);

    // Limpeza de quebras de linha
    if (json.mensagem) {
      json.mensagem = json.mensagem.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }

    return json;
  } catch (err) {
    console.error("Erro ao processar mensagem da IA:", err.message);
    throw err;
  }
}

module.exports = {
  processarMensagemIA,
};
