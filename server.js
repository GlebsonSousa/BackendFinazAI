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
      await processaMensagemRecebida(usuarioId, mensagem, destinatario='ia')
      
    } catch (error) {
      console.log ('Erro ao receber mensagem: ', error.message)
    }
})

async function processaMensagemRecebida(usuarioId, mensagem, destinatario = "ia") {
  try {
    console.log("📥 Mensagem recebida:", mensagem);
    console.log("👤 Usuário ID:", usuarioId);
    console.log("🎯 Destinatário inicial:", destinatario);

    if (destinatario === "ia") {
      const respostaDaIa = await enviaParaIa(mensagem);
      console.log("🤖 Resposta da IA (1ª etapa):", JSON.stringify(respostaDaIa, null, 2));

      const comandos = respostaDaIa.comandos || [];
      console.log("🧠 Comandos retornados:", JSON.stringify(comandos, null, 2));

      const precisaConsultarBanco = respostaDaIa.memoria === true;
      console.log(precisaConsultarBanco)
      if (precisaConsultarBanco) {
        console.log('Buscando dados')
        const dados = await AcessaBD(usuarioId, { comandos });
        console.log("📦 Dados do banco:", JSON.stringify(dados, null, 2));

        const novaMensagem = {
          original: mensagem,
          comandos,
          dados
        };

        const novaRespostaIa = await enviaParaIa(JSON.stringify(novaMensagem));
        console.log("🔁 Resposta da IA após dados:", JSON.stringify(novaRespostaIa, null, 2));

        if (novaRespostaIa?.mensagem) {
          await enviarRespostaMsgWhats(usuarioId, novaRespostaIa.mensagem);
        } else {
          console.log("⚠️ IA não retornou nova mensagem após receber os dados.");
        }

        return;
      }

      // Caso não precise consultar o banco
      if (respostaDaIa?.mensagem) {
        await enviarRespostaMsgWhats(usuarioId, respostaDaIa.mensagem);
      } else {
        console.log("⚠️ IA não retornou mensagem direta.");
      }
    } else {
      console.log("⚠️ Destinatário não é IA. Nenhuma ação tomada.");
    }
  } catch (err) {
    console.error("❌ Erro em processaMensagemRecebida:", err.message);
    console.error(err.stack);
  }
}

async function enviaParaIa(mensagem) {
  const msgUsuario = `${mensagem}`
  const resposta = await processarMensagemIA(msgUsuario)
  return resposta
}

async function AcessaBD(usuarioId, jsonIa) {
  respostaDB = processarComandos(usuarioId, jsonIa)
  return respostaDB
}

async function enviarRespostaMsgWhats (numero, mensagem) {
  console.log(`⚠️ [Mock] Mensagem para ${numero} ignorada (API WhatsApp não está ativa): ${mensagem}`);
  return;
}

async function enviarRespostaMsgWhatsFUNÇÃOCERTA(numero, mensagem) {
  const url = `${process.env.URL_WHATS_API}/enviar`;  
  try {
    console.log("🔗 Tentando enviar para:", url);
    console.log("📦 Payload:", { numero, mensagem });
    axios.post(url, { numero, mensagem }, { headers: { 'Content-Type': 'application/json' } }); // Adicione await no cameço dessa linha
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
