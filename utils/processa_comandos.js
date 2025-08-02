const banco = require('./banco')

async function processarComandos(usuarioId, json) {
    const respostas = []

    if (json.comandos){
        // Criei essa linha para garantir que os comandos sempre sejam um array, memo que seja um unico
        const comandos = Array.isArray(json.comandos) ? json.comandos : [json.comandos]
        for (const comando of comandos) {
        if (comando.comando === 'adicionar_gasto') {
            const r = await banco.adicionarGasto(comando, usuarioId)
            respostas.push({ sucesso: true, dado: r})
            console.log('comando: ', comando)
            console.log('-------------------------------------')
        }
    }
    }
    
    return respostas
}

module.exports = {
    processarComandos
}

