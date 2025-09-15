const fs = require('fs').promises
const { response } = require('express')
const { file } = require('googleapis/build/src/apis/file')
const path = require('path')

MAX_PARES = 10

let couter = 0

const filePath = path.join(__dirname, 'cache.json')

async function guarda_dados(usuarioId, mensagemUsuario, RespostaIA) {
    
    try {
        let historico = {}

        try {
            const data = await fs.readFile(filePath, 'utf-8')
            historico = data ? JSON.parse(data) : {}
        } catch (err) {
            historico = {}
        }

        if (!historico[usuarioId]) {
            historico[usuarioId] = {
                id: usuarioId,
                conversas: []
            }
        }

        historico[usuarioId].conversas.push({
            usuarioId: mensagemUsuario,
            ia: RespostaIA
        })

        if (historico[usuarioId].conversas.length > MAX_PARES) {
            historico[usuarioId].conversas = historico[usuarioId].conversas.slice(-MAX_PARES)
        }

        // Salvar o novo histórico
        await fs.writeFile(filePath, JSON.stringify(historico, null, 2), 'utf-8')
        return historico[usuarioId].conversas

    } catch (error){
        console.log('Erro ao processar os dados: ', error)
        return []
    }
}

async function ler_cache(usuarioId) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const historico = JSON.parse(data)

    if (historico[usuarioId]) {
      const historicoTotal = historico[usuarioId].conversas
      const contextoSimples = historicoTotal.map(item => {
        const usuarioMsg = item.usuarioId || ''
        const iaMsg = item.ia || ''
        return `Usuário: ${usuarioMsg}\nIA: ${iaMsg}`
      }).join('\n\n')

      return contextoSimples

    } else {
      console.log(`Nenhum histórico encontrado para usuario ${usuarioId}`)
      return ''
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log("Arquivo cache.json não encontrado.")
      return ''
    } else {
      console.error("Erro ao buscar histórico:", err)
      return ''
    }
  }
}

async function salvar_contexto_temporario(usuarioId, contexto) {
    try {
        let historico = {};
        // ... (lógica para ler o cache.json)
        const data = await fs.readFile(filePath, 'utf-8');
        historico = data ? JSON.parse(data) : {};

        if (!historico[usuarioId]) {
            historico[usuarioId] = { id: usuarioId, conversas: [] };
        }

        // Adiciona ou substitui o contexto
        historico[usuarioId].contextoAcao = contexto;

        await fs.writeFile(filePath, JSON.stringify(historico, null, 2), 'utf-8');
    } catch (error) {
        console.log('Erro ao salvar contexto temporário:', error);
    }
}

async function ler_e_limpar_contexto_temporario(usuarioId) {
    try {
        let historico = {};
        // ... (lógica para ler o cache.json)
        const data = await fs.readFile(filePath, 'utf-8');
        historico = data ? JSON.parse(data) : {};

        if (historico[usuarioId] && historico[usuarioId].contextoAcao) {
            const contexto = historico[usuarioId].contextoAcao;
            delete historico[usuarioId].contextoAcao; // Limpa o contexto após o uso
            await fs.writeFile(filePath, JSON.stringify(historico, null, 2), 'utf-8');
            return contexto;
        }
        return null;
    } catch (error) {
        console.log('Erro ao ler contexto temporário:', error);
        return null;
    }
}


module.exports = {
    guarda_dados,
    ler_cache,
    salvar_contexto_temporario, 
    ler_e_limpar_contexto_temporario 
}
