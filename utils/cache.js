// utils/cache.js
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.resolve(__dirname, '../cache.json');

function carregarCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  const conteudo = fs.readFileSync(CACHE_PATH, 'utf-8');
  try {
    return JSON.parse(conteudo || '{}');
  } catch (err) {
    console.error('Erro ao ler cache.json:', err);
    return {};
  }
}

function salvarCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

function atualizarCache(usuarioId, dados) {
  const cache = carregarCache();
  cache[usuarioId] = {
    ...cache[usuarioId],
    ...dados,
    ultima_interacao: new Date().toISOString()
  };
  salvarCache(cache);
}

function getCacheUsuario(usuarioId) {
  const cache = carregarCache();
  return cache[usuarioId] || null;
}

function limparCache(usuarioId) {
  const cache = carregarCache();
  delete cache[usuarioId];
  salvarCache(cache);
}

module.exports = {
  carregarCache,
  salvarCache,
  atualizarCache,
  getCacheUsuario,
  limparCache
};


// Em seu fluxo principal (por exemplo, index.js)
const express = require('express');
const { getCacheUsuario, atualizarCache, limparCache } = require('./utils/cache');
const { processarMensagemIA } = require('./IA/server_ia');
const { acessarBanco } = require('./utils/banco');

const app = express();
app.use(express.json());

app.post('/recebe-mensagem', async (req, res) => {
  const { usuarioId, mensagem } = req.body;

  console.log(`\n[MENSAGEM RECEBIDA] (${usuarioId}):`, mensagem);
  const cache = getCacheUsuario(usuarioId);
  if (cache) {
    console.log(`[CACHE ENCONTRADO] Estado: ${cache.estado}`);
  } else {
    console.log(`[CACHE] Nenhum cache encontrado.`);
  }

  const respostaIa = await processarMensagemIA({
    mensagem,
    cache
  });

  console.log(`[RESPOSTA IA]:`, JSON.stringify(respostaIa, null, 2));

  let dadosDoBanco = [];
  if (respostaIa.memoria === true) {
    dadosDoBanco = await acessarBanco(usuarioId, respostaIa.comandos);
    console.log(`[DADOS DO BANCO]:`, JSON.stringify(dadosDoBanco, null, 2));
  }

  // Atualiza o cache se necessário
  if (respostaIa.estado || respostaIa.memoria === true) {
    atualizarCache(usuarioId, {
      ...respostaIa,
      comandos: respostaIa.comandos || [],
      dados_consultados: dadosDoBanco || []
    });
    console.log(`[CACHE ATUALIZADO] para usuário ${usuarioId}`);
  } else {
    limparCache(usuarioId);
    console.log(`[CACHE LIMPO] para usuário ${usuarioId}`);
  }

  res.json({ mensagem: respostaIa.resposta });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ouvindo na porta ${PORT}`);
});
