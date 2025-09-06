const mongoose = require('mongoose');
const Registro = require('../models/registro');

// Conexão com o MongoDB
async function conectarDB() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Conectado ao DB!');
  } catch (err) {
    console.error('❌ Erro ao conectar ao DB: ', err.message);
    process.exit(1);
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

// Remover gasto (MODO SEGURO - APENAS POR ID)
async function removerGasto(usuarioId, comando) {
  if (!comando.id || typeof comando.id !== 'string' || !mongoose.Types.ObjectId.isValid(comando.id)) {
    console.error('Tentativa de remoção com ID inválido:', comando.id);
    return { sucesso: false, erro: 'ID do registo é inválido ou não fornecido.' };
  }
  const filtro = { usuarioId, _id: comando.id };
  const resultado = await Registro.deleteOne(filtro);
  return { sucesso: true, detalhes: resultado };
}

// Corrigir gasto
async function corrigirGasto(usuarioId, comando) {
  if (!comando.id || !mongoose.Types.ObjectId.isValid(comando.id)) {
    return { sucesso: false, erro: 'ID do registo é inválido ou não fornecido.' };
  }
  const filtro = { usuarioId, _id: comando.id };
  const atualizacao = {};
  if (comando.valor != null) atualizacao.valor = comando.valor;
  if (comando.item) atualizacao.item = comando.item;
  
  const resultado = await Registro.updateOne(filtro, { $set: atualizacao });
  return { sucesso: true, detalhes: resultado };
}

// Gerar relatórios
async function gerarRelatorio(usuarioId, tipo, referencia_data) {
  const query = { usuarioId };
  const dataRef = referencia_data ? new Date(referencia_data) : new Date();

  switch (tipo) {
    case 'diario':
      const inicioDia = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth(), dataRef.getUTCDate()));
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
  const registros = await Registro.find(query).sort({ data: 1 });

  return registros.map(d => ({
    id: d._id.toString(), // Garante que o ID é uma string
    item: d.item,
    valor: d.valor,
    quantidade: d.quantidade,
    categoria: d.categoria,
    data: d.data,
    tipo: d.tipo // Adicionado tipo para diferenciar gastos de receitas
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
