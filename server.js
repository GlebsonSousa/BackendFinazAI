require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require('axios');
const { processarComandos } = require('./utils/processa_comandos');
const { conectarDB } = require('./utils/banco');
const { processarMensagemIA } = require('./IA/server_ia');

const app = express();
const PORT = process.env.PORT || 3000;
const filaMensagens = [];

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota para testar banco (não conecta aqui)
app.post('/testaBanco', async (req, res) => {
  try {
    const usuarioId = req.body.usuarioId;
    const jsonIa = req.body.ia;
    const resultado = await processarComandos(jsonIa, usuarioId);
    res.json({ sucesso: true, resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.get("/", (req, res) => {
  res.status(200).json('API Backend rodando!');
});

app.post('/recebe-mensagem', async (req, res) => {
  const usuarioId = req.body.usuarioId;
  const mensagem = req.body.mensagem;

  console.log('-------------------------------------------------------------------');
  console.log("USUARIO ID", usuarioId);

  if (!usuarioId) {
    return res.status(400).json({ sucesso: false, erro: "usuarioId não pode ser vazio" });
  }
  if (!mensagem) {
    return res.status(400).json({ sucesso: false, erro: "mensagem não pode ser vazia" });
  }

  try {
    const respostaIa = await processaMensagemRecebida(usuarioId, mensagem);
    res.json({ sucesso: true, resposta: respostaIa });
  } catch (error) {
    console.error('❌ Erro ao receber mensagem:', error.message);
    res.status(500).json({ sucesso: false, erro: "Erro ao processar mensagem." });
  }
});

async function processaMensagemRecebida(usuarioId, mensagemInicial) {
  try {
    const respostaIa = await processarMensagemIA(mensagemInicial) 

    console.log(respostaIa)

    if (respostaIa?.comandos.length > 0) {
      const respostaDB = await AcessaBD(usuarioId, respostaIa.comandos)
    }

    if (respostaIa?.mensagem) {
      await enviarRespostaMsgWhats (usuarioId, respostaIa.mensagem)
    }
    return respostaIa.mensagem   
  } catch {

  }
}



async function AcessaBD(usuarioId, jsonIa) {
  // Processa comandos no banco e retorna resultado
  const respostaDB = await processarComandos(jsonIa, usuarioId); // inverti os parâmetros para combinar com o que vc tinha no post testeBanco
  return respostaDB
}

async function enviarRespostaMsgWhats(numero, mensagem) {
  const url = `${process.env.URL_WHATS_API}/enviar`;
  try {
    console.log("🔗 Tentando enviar para:", url);
    console.log("📦 Payload:", { numero, mensagem });
    await axios.post(url, { numero, mensagem }, { headers: { 'Content-Type': 'application/json' } });
    console.log("✅ Mensagem enviada com sucesso");
  } catch (erro) {
    console.error("❌ Erro ao enviar mensagem para API Whats:", erro.message);
  }
}

async function processarFilaMensagens() {
  while (true) {
    if (filaMensagens.length > 0) {
      const dados = filaMensagens.shift();
      console.log(`⚙️ Processando mensagem de ${dados.numero}`);

      try {
        const respostaIA = await axios.post(`${process.env.URL_IA}/interpretar`, {
          numero: dados.numero,
          mensagem: dados.mensagem,
          data: dados.dataMsgRecebida
        });

        const comandos = respostaIA.data.comandos;
        const respostaUsuario = respostaIA.data.resposta;

        console.log("🤖 Comandos recebidos da IA:", comandos);
        console.log("📤 Resposta para o usuário:", respostaUsuario);

        await enviarRespostaMsgWhats(dados.numero, respostaUsuario);

      } catch (erro) {
        console.error("❌ Erro ao processar mensagem da fila:", erro.message);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

// Função que conecta no banco e inicia o servidor
async function startServer() {
  try {
    await conectarDB(); // conecta uma vez
    app.listen(PORT, () => {
      console.log(`🚀 API Backend rodando em http://localhost:${PORT}`);
      processarFilaMensagens(); // inicia a fila só depois do servidor rodar
    });
  } catch (err) {
    console.error('Erro ao conectar no banco:', err);
    process.exit(1);
  }
}

startServer();
