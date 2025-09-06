// Arquivo: utils/processa_comandos.js (CORRIGIDO)

const banco = require('./banco');

async function processarComandos(usuarioId, json) {
  const respostas = [];

  console.log("📥 Processando comandos:", JSON.stringify(json, null, 2));

  const comandos = Array.isArray(json.comandos)
    ? json.comandos
    : Array.isArray(json)
      ? json
      : [json].filter(Boolean);

  console.log("Comandos após verificação---------------:", comandos);

  for (const comando of comandos) {
    const tipo = comando.comando;
    console.log('➡️ Processando comando:', tipo);

    // Lógica para substituir a data ANTES de usar
    let dataParaRelatorio = comando.referencia_data;
    if (dataParaRelatorio === '{{dataAtual}}') {
      dataParaRelatorio = new Date(); // Substitui o placeholder pela data atual real
    }

    try {
      switch (tipo) {
        case 'adicionar_gasto':
          const gasto = await banco.adicionarGasto(usuarioId, comando);
          respostas.push({ comando: tipo, sucesso: true, detalhes: gasto });
          break;

        case 'adicionar_receita':
          const receita = await banco.adicionarReceita(usuarioId, comando);
          respostas.push({ comando: tipo, sucesso: true, detalhes: receita });
          break;

        case 'remover_gasto':
          const removeGasto = await banco.removerGasto(usuarioId, comando);
          respostas.push({ comando: tipo, sucesso: true, detalhes: removeGasto });
          break;

        case 'corrigir_gasto':
          if (comando.id && comando.valor != null) {
            const corrigido = await banco.corrigirGasto(usuarioId, comando);
            respostas.push({ comando: tipo, sucesso: true, detalhes: corrigido });
          } else {
            respostas.push({ comando: tipo, sucesso: false, erro: 'Faltam dados para correção' });
          }
          break;

        // --- SEÇÃO CORRIGIDA ---
        case 'pedido_relatorio_diario':
          const diario = await banco.gerarRelatorio(usuarioId, 'diario', dataParaRelatorio);
          respostas.push({ comando: tipo, sucesso: true, dados: diario });
          break;

        case 'pedido_relatorio_semanal':
          const semanal = await banco.gerarRelatorio(usuarioId, 'semanal', dataParaRelatorio);
          respostas.push({ comando: tipo, sucesso: true, dados: semanal });
          break;

        case 'pedido_relatorio_mensal':
          const mensal = await banco.gerarRelatorio(usuarioId, 'mensal', dataParaRelatorio);
          respostas.push({ comando: tipo, sucesso: true, dados: mensal });
          break;

        case 'pedido_relatorio_anual':
          const anual = await banco.gerarRelatorio(usuarioId, 'anual', dataParaRelatorio);
          respostas.push({ comando: tipo, sucesso: true, dados: anual });
          break;
        // --- FIM DA SEÇÃO CORRIGIDA ---

        default:
          respostas.push({ comando: tipo, sucesso: false, erro: 'Comando desconhecido' });
      }

    } catch (error) {
      console.error('❌ Erro ao processar comando:', error);
      respostas.push({ comando: tipo, sucesso: false, erro: error.message });
    }
  }

  return respostas;
}

module.exports = { processarComandos };