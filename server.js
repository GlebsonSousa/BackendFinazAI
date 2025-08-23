require("dotenv").config()
const express = require("express")
const cors = require("cors")
const axios = require('axios')
const { processarComandos } = require('./utils/processa_comandos')
const { conectarDB } = require('./utils/banco')
const { processarMensagemIA } = require('./IA/server_ia')
const { ler_cache, guarda_dados } = require ('./Cache/cache')

const app = express()
const PORT = process.env.PORT || 3000

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
    console.error(err)
    res.status(500).json({ sucesso: false, erro: err.message })
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
    // 1. Lê histórico formatado (string)
    const mensagemUsuario = await ler_cache(usuarioId);

    // 2. Monta o prompt concatenado para IA
    const mensagemFinalParaIa = mensagemUsuario + "\n\nUsuário: " + mensagemInicial + "\nIA: "

    console.log('Mensagem Concatenada: ', mensagemFinalParaIa);

    // 3. Envia para IA processar
    const respostaIa = await processarMensagemIA(mensagemFinalParaIa);

    // 4. Salva a conversa no cache: usuário + resposta textual da IA
    if (respostaIa) {
      await guarda_dados(usuarioId, mensagemInicial, respostaIa.mensagem);
    }

    // 6. Envia resposta para o WhatsApp
    if (respostaIa?.mensagem) {
      await enviarRespostaMsgWhats(usuarioId, respostaIa.mensagem);
    }

    // 5. Processa comandos no banco, se existirem
    if (respostaIa?.comandos?.length > 0) {
      const dadosDB = await AcessaBD(usuarioId, respostaIa.comandos);
      
      const novaMensagemFinalParaIa = mensagemUsuario + "\n\nUsuário: " + mensagemInicial + "\nIA: " + respostaIa + "\nRespostaBancodeDados: " +  dadosDB

      const novaRespostaIa = await processarMensagemIA(novaMensagemFinalParaIa);

      if (novaRespostaIa?.mensagem) {
        await enviarRespostaMsgWhats(usuarioId, novaRespostaIa.mensagem);
      }
  }


    // 7. Retorna mensagem da IA para endpoint
    return respostaIa.mensagem;

  } catch (error) {
    console.error('Erro ao processar mensagem recebida:', error);
    throw error;
  }
}

async function AcessaBD(usuarioId, jsonIa) {
  // Processa comandos no banco e retorna resultado
  const respostaDB = await processarComandos(jsonIa, usuarioId); // inverti os parâmetros para combinar com o que vc tinha no post testeBanco
  return respostaDB
}

async function enviarRespostaMsgWhats(numero, mensagem) {
  const url = `${process.env.URL_WHATS_API}/enviar`
  try {
    console.log("🔗 Tentando enviar para:", url)
    console.log("📦 Payload:", { numero, mensagem })
    await axios.post(url, { numero, mensagem }, { headers: { 'Content-Type': 'application/json' } });
    console.log("✅ Mensagem enviada com sucesso")
  } catch (erro) {
    console.error("❌ Erro ao enviar mensagem para API Whats:", erro.message)
  }
}

// Função que conecta no banco e inicia o servidor
async function startServer() {
  try {
    await conectarDB() // conecta uma vez
    app.listen(PORT, () => {
      console.log(`🚀 API Backend rodando em http://localhost:${PORT}`)
      //processarFilaMensagens(); // inicia a fila só depois do servidor rodar
    })
  } catch (err) {
    console.error('Erro ao conectar no banco:', err)
    process.exit(1)
  }
}

startServer()
