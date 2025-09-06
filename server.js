require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { processarComandos } = require("./utils/processa_comandos");
const { conectarDB } = require("./utils/banco");
const { processarMensagemIA } = require("./IA/server_ia");
const { ler_cache, guarda_dados } = require("./Cache/cache");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota para testar banco
app.post("/testaBanco", async (req, res) => {
  try {
    const usuarioId = req.body.usuarioId;
    const jsonIa = req.body.ia;
    const resultado = await processarComandos(usuarioId, jsonIa);
    res.json({ sucesso: true, resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.get("/", (req, res) => {
  res.status(200).json("API Backend rodando!");
});

app.post("/recebe-mensagem", async (req, res) => {
  const usuarioId = req.body.usuarioId;
  const mensagem = req.body.mensagem;

  console.log("-------------------------------------------------------------------");
  console.log("USUARIO ID", usuarioId);
  console.log("MENSAGEM", mensagem);
  console.log("-------------------------------------------------------------------");
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
    console.error("❌ Erro ao receber mensagem:", error.message);
    res.status(500).json({ sucesso: false, erro: "Erro ao processar mensagem." });
  }
});

async function processaMensagemRecebida(usuarioId, mensagemInicial) {
  try {
    // 1. Lê histórico do usuário já formatado
    let historico = await ler_cache(usuarioId);
    let processarNovamente = true;
    let respostaIa = null;
    let dadosBanco = null;

    // 2. Loop iterativo até a IA decidir que todos os dados estão prontos
    while (processarNovamente) {
      // 3. Monta prompt para IA
      let mensagemFinalParaIa = `
Histórico do usuário:
${JSON.stringify(historico, null, 2)}

Mensagem atual do usuário: ${mensagemInicial}

${dadosBanco ? `Dados do Banco: ${JSON.stringify(dadosBanco)}` : ""}

IA:
      `;

      // 4. Envia para IA processar
      respostaIa = await processarMensagemIA(mensagemFinalParaIa);

      if (!respostaIa) {
        throw new Error("IA não retornou resposta válida.");
      }


      // 5. Se IA retornar processar_novamente = true, buscamos dados no banco
      if (respostaIa.processar_novamente) {
        if (respostaIa.comandos && respostaIa.comandos.length > 0) {
          dadosBanco = await AcessaBD(usuarioId, respostaIa.comandos);
          console.log("🔄 Dados do BD retornados para IA:", dadosBanco);
        }
        // Continua o loop, enviando os dados do banco novamente para a IA
        processarNovamente = true;
      } else {
        // IA confirmou que está pronta para executar
        processarNovamente = false;
      }
    }

    // 6. Quando a IA confirma (processar_novamente = false), executa comandos
    let resultadoExecucao = [];
    if (respostaIa.comandos && respostaIa.comandos.length > 0) {
      resultadoExecucao = await processarComandos(usuarioId, respostaIa.comandos);
    }

    // 7. Salva a conversa final no cache
    if (respostaIa?.mensagem) {
      await guarda_dados(usuarioId, mensagemInicial, respostaIa.mensagem);
      await enviarRespostaMsgWhats(usuarioId, respostaIa.mensagem);
    }

    // 8. Retorna a mensagem final da IA
    return respostaIa.mensagem;

  } catch (error) {
    console.error("Erro ao processar mensagem recebida:", error);
    throw error;
  }
}

async function AcessaBD(usuarioId, jsonIa) {
  try {
    const resultado = await processarComandos(usuarioId, jsonIa);
    console.log("✅ Dados do BD acessados:", resultado);
    return resultado;
  } catch (error) {
    console.error("Erro ao acessar o banco de dados:", error);
  }
}

async function enviarRespostaMsgWhats(numero, mensagem) {
  const url = `${process.env.URL_WHATS_API}/enviar`;
  try {
    await axios.post(url, { numero, mensagem }, { headers: { "Content-Type": "application/json" } });
    console.log("✅ Mensagem enviada com sucesso");
  } catch (erro) {
    console.error("❌ Erro ao enviar mensagem para API Whats:", erro.message);
  }
}

// Função que conecta no banco e inicia o servidor
async function startServer() {
  try {
    await conectarDB();
    app.listen(PORT, () => {
      console.log(`🚀 API Backend rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Erro ao conectar no banco:", err);
    process.exit(1);
  }
}

startServer();
