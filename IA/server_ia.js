const OpenAI = require("openai");
const fs = require("fs");
const path = require('path');
require("dotenv").config(); // Carrega variáveis do .env

// Lê o prompt inicial da IA
const promptPrincipal = fs.readFileSync(path.join(__dirname, "./PrompTeste.txt"), "utf-8")
const dataAtual = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const prompt = promptPrincipal.replace('{{dataAtual}}', dataAtual)

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
      temperature: 0.6,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: mensagem },
      ],
    });

    const output = response.choices[0].message.content;

    //console.log('Resposta bruta da ia: ', output)

    try {
      // Tenta parsear a resposta como JSON
      const json = JSON.parse(output);

      // Limpeza de quebras de linha na mensagem
      if (json.mensagem && typeof json.mensagem === 'string') {
        json.mensagem = json.mensagem.trim();
      }

      return json;

    } catch (parseError) {
      console.error("Erro ao parsear JSON da IA:", parseError.message);
      throw new Error("Resposta da IA não está em formato JSON válido.");
    }
  } catch (err) {
    console.error("Erro ao processar mensagem da IA:", err.message);
    throw err;
  }
}

module.exports = {
  processarMensagemIA,
};
