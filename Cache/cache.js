const fs = require('fs').promises;
const path = require('path');

const MAX_PARES = 10;
const filePath = path.join(__dirname, 'cache.json');

async function guarda_dados(usuarioId, mensagemUsuario, RespostaIA) {
    try {
        let historico = {};
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            // Verifica se o ficheiro não está vazio antes de fazer o parse
            if (data && data.trim() !== '') {
                historico = JSON.parse(data);
            }
        } catch (err) {
            if (err.code !== 'ENOENT') console.error("Erro ao ler ficheiro de cache:", err);
            historico = {};
        }

        if (!historico[usuarioId]) {
            historico[usuarioId] = { id: usuarioId, conversas: [] };
        }

        historico[usuarioId].conversas.push({
            usuarioId: mensagemUsuario,
            ia: RespostaIA
        });

        if (historico[usuarioId].conversas.length > MAX_PARES) {
            historico[usuarioId].conversas.slice(-MAX_PARES);
        }

        await fs.writeFile(filePath, JSON.stringify(historico, null, 2), 'utf-8');
    } catch (error){
        console.error('Erro ao guardar dados no cache: ', error);
    }
}

async function ler_cache(usuarioId) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        // Adiciona uma verificação para ficheiro vazio para evitar o erro de JSON
        if (!data || data.trim() === '') {
            return '';
        }
        const historico = JSON.parse(data);

        if (historico[usuarioId] && historico[usuarioId].conversas) {
            return historico[usuarioId].conversas.map(item => {
                return `Usuário: ${item.usuarioId || ''}\nIA: ${item.ia || ''}`
            }).join('\n\n');
        }
        return '';
    } catch (err) {
        if (err.code === 'ENOENT') {
            return ''; // Ficheiro não existe, retorna string vazia
        }
        console.error("Erro ao ler cache:", err);
        // Em caso de erro de parse, apaga o ficheiro corrompido para a próxima vez
        if (err instanceof SyntaxError) {
            console.warn("Ficheiro de cache corrompido. A limpá-lo.");
            await fs.writeFile(filePath, '{}', 'utf-8');
        }
        return '';
    }
}

async function salvar_contexto_temporario(usuarioId, contexto) {
    try {
        let historico = {};
        try {
            const data = await fs.readFile(filePath, 'utf-8');
             if (data && data.trim() !== '') {
                historico = JSON.parse(data);
            }
        } catch (err) {
            historico = {};
        }

        if (!historico[usuarioId]) {
            historico[usuarioId] = { id: usuarioId, conversas: [] };
        }
        historico[usuarioId].contextoAcao = contexto;
        await fs.writeFile(filePath, JSON.stringify(historico, null, 2), 'utf-8');
    } catch (error) {
        console.error('Erro ao salvar contexto temporário:', error);
    }
}

async function ler_e_limpar_contexto_temporario(usuarioId) {
    try {
        let historico = {};
        const data = await fs.readFile(filePath, 'utf-8');
        if (!data || data.trim() === '') return null;
        historico = JSON.parse(data);

        if (historico[usuarioId] && historico[usuarioId].contextoAcao) {
            const contexto = historico[usuarioId].contextoAcao;
            delete historico[usuarioId].contextoAcao; // Limpa o contexto após o uso
            await fs.writeFile(filePath, JSON.stringify(historico, null, 2), 'utf-8');
            return contexto;
        }
        return null;
    } catch (error) {
        console.error('Erro ao ler e limpar contexto temporário:', error);
        return null;
    }
}

module.exports = {
    guarda_dados,
    ler_cache,
    salvar_contexto_temporario, 
    ler_e_limpar_contexto_temporario 
};
