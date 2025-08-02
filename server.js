require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require('axios');
const { processarComandos } = require('./utils/processa_comandos');
const { conectarDB } = require('./utils/banco');
const { processarMensagemIA } = require('./IA/server_ia')

const app = express();
const PORT = process.env.PORT || 3000;
const filaMensagens = [];

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rota para testar banco (não conecta aqui)
app.post('/testaBanco', async (req, res) => {
  try {
    const usuarioId = req.body.usuarioId
    const jsonIa = req.body.ia
    const resultado = await processarComandos(jsonIa, usuarioId)
    res.json({ sucesso: true, resultado })
  } catch (err) {
    console.log(err)
    res.status(500).json({ sucesso: false, erro: err.message })
  }
});

app.get("/", (req, res) => {
  res.status(200).json('API Backend rodando!');
});

app.post('/recebe-mensagem', async(req, res) => {
    const usuarioId = req.body.usuarioId
    const mensagem = req.body.mensagem
    try { 
      console.log('menssagem: ', mensagem)
      const respostaDaIa = await enviaParaIa(mensagem)
      console.log('Tipo da resposta: ', typeof respostaDaIa, '| Comandos: ', respostaDaIa.comandos , '| Mensagem ao usuario: ', respostaDaIa.mensagem)
      if (respostaDaIa.comandos && respostaDaIa.comandos.length > 0) {
        AcessaBD(usuarioId, { comandos: respostaDaIa.comandos })
      }

    } catch (error) {
      console.log ('Erro ao receber mensagem: ', error.message)
    }
})

async function enviaParaIa(mensagem) {
  const msgUsuario = `${mensagem}`
  const resposta = await processarMensagemIA(msgUsuario)
  return resposta
}

async function AcessaBD(usuarioId, jsonIa) {
  await processarComandos(usuarioId, jsonIa)
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

startServer(); // chama o startServer para iniciar tudo
