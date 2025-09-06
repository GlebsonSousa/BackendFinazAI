const mongoose = require('mongoose');
const Registro = require('../models/registro');

// Conexão com o MongoDB
async function conectarDB() {
  if (mongoose.connection.readyState === 1) return; // já conectado
  try {
    await mongoose.connect(
      'mongodb+srv://glebsonsalmeida:conecta@ravicluster.keccztf.mongodb.net/raviDB?retryWrites=true&w=majority&appName=RaviCluster',
      { serverSelectionTimeoutMS: 5000 }
    );
    console.log('✅ Conectado ao DB!');
  } catch (err) {
    console.error('❌ Erro ao conectar ao DB: ', err.message);
  }
}

// Adicionar gasto
async function adicionarGasto(usuarioId, comando) {
  const novo = new Registro({
    usuarioId,
    tipo: 'Despesa',
    item: comando.item,
    valor: comando.valor,
    quantidade: comando.quantidade || 1,
    categoria: comando.categoria,
    data: comando.referencia_data ? new Date(comando.referencia_data) : new Date()
  });
  return await novo.save();
}

// Adicionar receita
async function adicionarReceita(usuarioId, comando) {
  const nova = new Registro({
    usuarioId,
    tipo: 'Receita',
    item: comando.item,
    valor: comando.valor,
    quantidade: comando.quantidade || 1,
    categoria: comando.categoria,
    data: comando.referencia_data ? new Date(comando.referencia_data) : new Date()
  });
  return await nova.save();
}

// Remover gasto
async function removerGasto(usuarioId, comando) {
  const filtro = { usuarioId, item: comando.item, tipo: 'Despesa' };
  const resultado = await Registro.deleteMany(filtro);
  return resultado;
}

// Corrigir gasto (necessário enviar "id")
async function corrigirGasto(usuarioId, comando) {
  if (!comando.id) {
    return { sucesso: false, erro: 'ID do registro é necessário para corrigir' };
  }
  const filtro = { usuarioId, _id: comando.id };
  const atualizacao = { valor: comando.valor };
  const resultado = await Registro.updateOne(filtro, atualizacao);
  return { sucesso: true, detalhes: resultado };
}

// Gerar relatórios
async function gerarRelatorio(usuarioId, tipo, referencia_data) {
  const query = { usuarioId };
  const dataRef = referencia_data ? new Date(referencia_data) : new Date();

  switch (tipo) {
     case 'diario':
      // Constrói a data de referência em UTC para evitar problemas de fuso horário
      const dataRefUTCdia = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth(), dataRef.getUTCDate()));
      const inicioDia = dataRefUTCdia;
      const fimDia = new Date(inicioDia);
      fimDia.setUTCDate(fimDia.getUTCDate() + 1);
      query.data = { $gte: inicioDia, $lt: fimDia };
      break;

    case 'semanal':
      const dataRefUTCsemana = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth(), dataRef.getUTCDate()));
      const diaDaSemana = dataRefUTCsemana.getUTCDay();
      const inicioSemana = new Date(dataRefUTCsemana);
      inicioSemana.setUTCDate(inicioSemana.getUTCDate() - diaDaSemana);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setUTCDate(fimSemana.getUTCDate() + 7);
      query.data = { $gte: inicioSemana, $lt: fimSemana };
      break;

    case 'mensal':
      // Usa métodos UTC para garantir que o fuso horário não interfira
      const inicioMes = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth(), 1));
      const fimMes = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth() + 1, 1));
      query.data = { $gte: inicioMes, $lt: fimMes };
      break;

    case 'anual':
      const inicioAno = new Date(Date.UTC(dataRef.getUTCFullYear(), 0, 1));
      const fimAno = new Date(Date.UTC(dataRef.getUTCFullYear() + 1, 0, 1));
      query.data = { $gte: inicioAno, $lt: fimAno };
      break;
  }
  const registros = await Registro.find(query);

  // Retornar apenas campos que a IA pode usar
  return registros.map(d => ({
    id: d._id,
    item: d.item,
    valor: d.valor,
    quantidade: d.quantidade,
    categoria: d.categoria,
    data: d.data
  }));
}

module.exports = {
  conectarDB,
  adicionarGasto,
  adicionarReceita,
  removerGasto,
  corrigirGasto,
  gerarRelatorio
};
