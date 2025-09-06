// Arquivo: index.js (ou o nome do seu arquivo principal)

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

// Rota para testar a execução de comandos diretamente (útil para testes)
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

// Rota de "saúde" da API
app.get("/", (req, res) => {
  res.status(200).json("API Backend rodando!");
});

// Rota principal que recebe as mensagens do usuário
app.post("/recebe-mensagem", async (req, res) => {
  const usuarioId = req.body.usuarioId;
  const mensagem = req.body.mensagem;

  console.log("\n\n--- NOVA MENSAGEM RECEBIDA ---");
  console.log("USUARIO ID:", usuarioId);
  console.log("MENSAGEM:", mensagem);
  console.log("---------------------------------");
  
  if (!usuarioId || !mensagem) {
    return res.status(400).json({ sucesso: false, erro: "usuarioId e mensagem são obrigatórios." });
  }

  try {
    const respostaIa = await processaMensagemRecebida(usuarioId, mensagem);
    res.json({ sucesso: true, resposta: respostaIa });
  } catch (error) {
    console.error("❌ Erro grave na rota /recebe-mensagem:", error.message);
    res.status(500).json({ sucesso: false, erro: "Erro crítico ao processar mensagem." });
  }
});

/**
 * Função central que orquestra a conversa com a IA e o acesso ao banco de dados.
 * @param {string} usuarioId - O ID do usuário (ex: número de telefone).
 * @param {string} mensagemInicial - A mensagem enviada pelo usuário.
 */
async function processaMensagemRecebida(usuarioId, mensagemInicial) {
  try {
    let historico = await ler_cache(usuarioId);
    let processarNovamente = true;
    let respostaIa = null;
    let dadosBanco = null;
    let loopCount = 1;

    // Loop que continua até a IA ter todos os dados necessários (processar_novamente = false)
    while (processarNovamente) {
      console.log(`\n============ INÍCIO DO LOOP ${loopCount} ============`);
      
      const promptParaIa = `
Histórico do usuário:
${JSON.stringify(historico, null, 2)}

Mensagem atual do usuário: ${mensagemInicial}

${dadosBanco ? `Dados do Banco: ${JSON.stringify(dadosBanco, null, 2)}` : ""}

IA:
      `;

      // LOG CRÍTICO 1: Mostra exatamente o que a IA está recebendo
      console.log(`[LOOP ${loopCount}] PROMPT COMPLETO ENVIADO PARA A IA:\n`, promptParaIa);

      respostaIa = await processarMensagemIA(promptParaIa);
      
      // LOG CRÍTICO 2: Mostra exatamente o que a IA respondeu
      console.log(`[LOOP ${loopCount}] RESPOSTA BRUTA DA IA:\n`, JSON.stringify(respostaIa, null, 2));

      if (!respostaIa) {
        throw new Error("A resposta da IA foi nula ou inválida.");
      }

      // Se a IA pedir para processar novamente, significa que ela precisa de dados do banco
      if (respostaIa.processar_novamente) {
        if (respostaIa.comandos && respostaIa.comandos.length > 0) {
          console.log(`[LOOP ${loopCount}] IA pediu dados. Buscando no banco...`);
          dadosBanco = await AcessaBD(usuarioId, respostaIa.comandos);
          
          // LOG CRÍTICO 3: Mostra o que o banco de dados retornou
          console.log(`[LOOP ${loopCount}] DADOS RETORNADOS DO BANCO:\n`, JSON.stringify(dadosBanco, null, 2));
        } else {
          // Se a IA pedir para processar novamente mas não mandar comandos, é um estado de erro.
          // Quebramos o loop para evitar um ciclo infinito.
          console.warn(`[LOOP ${loopCount}] AVISO: IA pediu para processar novamente, mas não enviou comandos. Interrompendo loop.`);
          processarNovamente = false; 
        }
      } else {
        // Se a IA não pedir para processar novamente, o ciclo está completo
        console.log(`[LOOP ${loopCount}] IA finalizou o processamento.`);
        processarNovamente = false;
      }
      
      console.log(`============ FIM DO LOOP ${loopCount} ============`);
      loopCount++;
    }

    // Após o loop, executa os comandos finais se houver
    if (!respostaIa.processar_novamente && respostaIa.comandos && respostaIa.comandos.length > 0) {
        console.log("Executando comandos finais no banco de dados...");
        await processarComandos(usuarioId, respostaIa.comandos);
    }

    // Salva a interação no cache e envia a resposta para o usuário
    if (respostaIa?.mensagem) {
      console.log("Salvando no cache e enviando resposta para o WhatsApp...");
      await guarda_dados(usuarioId, mensagemInicial, respostaIa.mensagem);
      await enviarRespostaMsgWhats(usuarioId, respostaIa.mensagem);
    }

    return respostaIa.mensagem;

  } catch (error) {
    console.error("Erro detalhado em processaMensagemRecebida:", error);
    // Retorna uma mensagem de erro genérica para o usuário final
    return "Ops, algo deu errado aqui dentro. 🤯 Já estou verificando o que aconteceu. Tente novamente em um instante.";
  }
}

/**
 * Função auxiliar para encapsular a chamada ao banco de dados.
 */
async function AcessaBD(usuarioId, comandos) {
  try {
    const resultado = await processarComandos(usuarioId, comandos);
    console.log("✅ Dados do BD acessados com sucesso.");
    return resultado;
  } catch (error) {
    console.error("❌ Erro ao acessar o banco de dados via AcessaBD:", error);
    return { erro: "Falha ao buscar dados no banco.", detalhes: error.message };
  }
}

/**
 * Função para enviar a mensagem final via API do WhatsApp.
 */
async function enviarRespostaMsgWhats(numero, mensagem) {
  // Descomente e preencha a URL real da sua API
  // const url = `${process.env.URL_WHATS_API}/enviar`;
  console.log(`\n--- SIMULANDO ENVIO PARA WHATSAPP ---`);
  console.log(`Destinatário: ${numero}`);
  console.log(`Mensagem: ${mensagem}`);
  console.log(`-------------------------------------\n`);

  /*
  try {
    // AINDA NÃO DESCOMENTE ESTA PARTE, vamos primeiro validar a lógica pelos logs.
    // await axios.post(url, { numero, mensagem }, { headers: { "Content-Type": "application/json" } });
    // console.log("✅ Mensagem enviada com sucesso para a API do Whats.");
  } catch (erro) {
    console.error("❌ Erro ao enviar mensagem para API Whats:", erro.message);
  }
  */
}

/**
 * Função principal que inicia o servidor.
 */
async function startServer() {
  try {
    await conectarDB();
    app.listen(PORT, () => {
      console.log(`🚀 API Backend rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Falha crítica ao conectar no banco:", err);
    process.exit(1);
  }
}

startServer();