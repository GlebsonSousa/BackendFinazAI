const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Carrega variáveis de ambiente do .env

const app = express();
const PORT = process.env.PORT || 3000;

const qs = require('qs'); // transforma JSON em string url-encoded
const axios = require('axios');

const filaMensagens = [];

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Rota para verificar se a API está funcionando
app.get("/", async (req, res) => {
    return res.status(200).json('API Backend rodando!');
});

async function enviarRespostaMsgWhats(numero, mensagem) {
    const url = `${process.env.URL_WHATS_API}/enviar`;
    try {
        console.log("🔗 Tentando enviar para:", url);
        console.log("📦 Payload:", { numero, mensagem });

        await axios.post(url, { numero, mensagem }, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log("✅ Mensagem enviada com sucesso");
    } catch (erro) {
        console.error("❌ Erro ao enviar mensagem para API Whats:");
        console.error("Status:", erro.response?.status);
        console.error("Data:", erro.response?.data);
        console.error("Mensagem:", erro.message);
    }
}

// Rota que recebe as mensagens do WhatsApp
async function processarFilaMensagens() {
  while (true) {
    if (filaMensagens.length > 0) {
      const dados = filaMensagens.shift(); // Remove o primeiro item
      console.log(`⚙️ Processando mensagem de ${dados.numero}`);

      try {
        // Aqui você vai enviar para a IA:
        const respostaIA = await axios.post(`${process.env.URL_IA}/interpretar`, {
          numero: dados.numero,
          mensagem: dados.mensagem,
          data: dados.dataMsgRecebida
        });

        const comandos = respostaIA.data.comandos;
        const respostaUsuario = respostaIA.data.resposta;

        console.log("🤖 Comandos recebidos da IA:", comandos);
        console.log("📤 Resposta para o usuário:", respostaUsuario);

        // Enviar a resposta para o WhatsApp
        await enviarRespostaMsgWhats(dados.numero, respostaUsuario);

        // Executar comandos recebidos (implementaremos isso depois)

      } catch (erro) {
        console.error("❌ Erro ao processar mensagem da fila:", erro.message);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // Espera 500ms antes de checar de novo
  }
}


app.listen(PORT, () => {
    console.log(`🚀 API Backend rodando em http://localhost:${PORT}`);
    processarFilaMensagens(); // Inicia o loop da fila

});
