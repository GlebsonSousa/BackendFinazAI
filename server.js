require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { processarComandos } = require("./utils/processa_comandos");
const { conectarDB } = require("./utils/banco");
const { processarMensagemIA } = require("./IA/server_ia");
const { ler_cache, guarda_dados, salvar_contexto_temporario, ler_e_limpar_contexto_temporario } = require("./Cache/cache");

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

// Substitua a função existente pela esta no seu arquivo principal (ex: index.js)

async function processaMensagemRecebida(usuarioId, mensagemInicial) {
  try {
    // 1. Início: Lê o histórico e o contexto de uma ação anterior, se existir.
    let historico = await ler_cache(usuarioId);
    let contextoAcao = await ler_e_limpar_contexto_temporario(usuarioId);

    let processarNovamente = true;
    let respostaIa = null;
    let dadosBanco = null;
    let contador = 1;

    // 2. Loop de conversação com a IA
    while (processarNovamente) {
      console.log(`🔄 Iteração IA : ${contador++}`);
      let mensagemFinalParaIa;

      // Monta o prompt para a IA
      if (dadosBanco) {
        // Se temos dados do banco, é a Etapa 2 (Apresentar/Confirmar)
        console.log("Montando prompt SEM histórico, mas com contexto da ação.");
        mensagemFinalParaIa = `
            A mensagem original do usuário era: "${mensagemInicial}"
            Você solicitou os dados abaixo para continuar uma tarefa de múltiplos passos (como corrigir ou remover um gasto).
            Dados do Banco: ${JSON.stringify(dadosBanco, null, 2)}
            IA, continue a tarefa que você começou. Analise os 'Dados do Banco' e siga as regras do seu prompt principal.
        `;
      } else {
        // Se não, é a Etapa 1 (Intenção inicial do usuário)
        console.log("Montando prompt COM histórico para interpretação inicial.");
        mensagemFinalParaIa = `
            Histórico do usuário: 
            ${JSON.stringify(historico, null, 2)}
            ${contextoAcao ? `Contexto da Ação Anterior (use estes IDs): ${JSON.stringify(contextoAcao)}` : ""}
            Mensagem atual do usuário: ${mensagemInicial}
        `;
      }

      // 4. Envia para a IA e obtém a resposta
      respostaIa = await processarMensagemIA(mensagemFinalParaIa);
      if (!respostaIa) {
        throw new Error("IA não retornou resposta válida.");
      }
       console.log("-------------------------------------------------------------------");
       console.log("Resposta da IA:", respostaIa);
       console.log("-------------------------------------------------------------------");

      // 5. Bloco de Decisão: O que fazer com a resposta da IA?
      if (respostaIa.processar_novamente) {
        // Se a IA precisa de mais dados do banco para continuar...
        if (respostaIa.comandos && respostaIa.comandos.length > 0) {
          dadosBanco = await AcessaBD(usuarioId, respostaIa.comandos);
          // Guarda o contexto para a próxima iteração ou a próxima mensagem do usuário
          await salvar_contexto_temporario(usuarioId, dadosBanco);
          processarNovamente = true; // Continua o loop
        } else {
          // Se a IA só fez uma pergunta (sem pedir dados), saímos do loop para esperar a resposta do usuário.
          processarNovamente = false;
        }
      } else {
        // Se a IA disse que terminou, saímos do loop.
        processarNovamente = false;
      }
    }

    // 6. Execução Final: Após o fim da conversa com a IA.
    // Se a resposta final da IA contém comandos, eles são executados aqui.
    if (respostaIa.comandos && respostaIa.comandos.length > 0) {
      console.log('✅ Executando comandos finais da IA...');
      await AcessaBD(usuarioId, respostaIa.comandos);
    }

    // 7. Envio e Salvamento: Envia a mensagem final para o usuário e guarda no histórico.
    if (respostaIa?.mensagem) {
      await guarda_dados(usuarioId, mensagemInicial, respostaIa.mensagem);
      await enviarRespostaMsgWhats(usuarioId, respostaIa.mensagem);
    }

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