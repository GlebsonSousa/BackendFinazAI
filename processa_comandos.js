const banco = require('./banco');

async function processarComandos(usuarioId, json) {
  const respostas = [];

  console.log("📥 Processando comandos:", JSON.stringify(json, null, 2));

  if (json.comandos) {
    const comandos = Array.isArray(json.comandos) ? json.comandos : [json.comandos];

    for (const comando of comandos) {
      const tipo = comando.comando;

      try {
        if (tipo === 'adicionar_gasto') {
          const r = await banco.adicionarGasto(comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'adicionar_receita') {
          const r = await banco.adicionarReceita(comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'remover_gasto') {
          const r = await banco.removerGasto(comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'corrigir_gasto') {
          const r = await banco.corrigirGasto(comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'pedido_relatorio_diario') {
          const r = await banco.gerarRelatorio('diario', comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'pedido_relatorio_semanal') {
          const r = await banco.gerarRelatorio('semanal', comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'pedido_relatorio_mensal') {
          const r = await banco.gerarRelatorio('mensal', comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'pedido_relatorio_anual') {
          const r = await banco.gerarRelatorio('anual', comando, usuarioId);
          respostas.push({ sucesso: true, dado: r });

        } else if (tipo === 'ajuda') {
          respostas.push({ sucesso: true, dado: 'Ajuda solicitada. Você pode me pedir para registrar gastos, receitas, gerar relatórios, corrigir lançamentos ou pedir ajuda!' });

        } else if (tipo === 'erro_entrada') {
          respostas.push({ sucesso: false, erro: 'A mensagem não pôde ser compreendida. Pode reformular ou pedir ajuda!' });

        } else {
          respostas.push({ sucesso: false, erro: `Comando desconhecido: ${tipo}` });
        }
      } catch (err) {
        respostas.push({ sucesso: false, erro: err.message });
      }
    }
  }

  return respostas;
}

module.exports = { processarComandos };
