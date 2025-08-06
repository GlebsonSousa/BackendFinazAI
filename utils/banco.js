const mongoose = require('mongoose');
const Registro = require('../models/registro');

// Conexão com o MongoDB
async function conectarDB() {
  try {
    await mongoose.connect('mongodb+srv://glebsonsalmeida:lBVyvhQSXxjH4EBb@ravicluster.m4hpc2p.mongodb.net/?retryWrites=true&w=majority&appName=RaviCluster', {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Conectado ao DB !!');
  } catch (err) {
    console.error('Erro ao conectar ao DB: ', err.message);
  }
}

// Adicionar gasto
async function adicionarGasto(comando, usuarioId) {
  const novo = new Registro({
    usuarioId,
    tipo: 'gasto',
    item: comando.item,
    valor: comando.valor,
    quantidade: comando.quantidade || 1,
    categoria: comando.categoria,
    data: new Date()
  });
  return await novo.save();
}

// Adicionar receita
async function adicionarReceita(comando, usuarioId) {
  const novo = new Registro({
    usuarioId,
    tipo: 'receita',
    item: comando.item,
    valor: comando.valor,
    quantidade: comando.quantidade || 1,
    categoria: comando.categoria,
    data: new Date()
  });
  return await novo.save();
}

// Remover gasto ou receita por ID
async function removerRegistro(comando, usuarioId) {
  return await Registro.deleteOne({
    _id: comando.id,
    usuarioId: usuarioId
  });
}

// Corrigir gasto ou receita
async function corrigirRegistro(comando, usuarioId) {
  return await Registro.updateOne(
    { _id: comando.id, usuarioId },
    {
      $set: {
        item: comando.item,
        valor: comando.valor,
        quantidade: comando.quantidade,
        categoria: comando.categoria
      }
    }
  );
}

// Gerar relatório
async function gerarRelatorio(tipo, comando, usuarioId) {
  const agora = new Date();
  let dataInicio;

  switch (tipo) {
    case 'diario':
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      break;
    case 'semanal':
      const diaSemana = agora.getDay(); // 0 = domingo
      dataInicio = new Date(agora);
      dataInicio.setDate(agora.getDate() - diaSemana);
      break;
    case 'mensal':
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
      break;
    case 'anual':
      dataInicio = new Date(agora.getFullYear(), 0, 1);
      break;
    default:
      throw new Error('Tipo de relatório inválido.');
  }

  const registros = await Registro.find({
    usuarioId,
    data: { $gte: dataInicio }
  }).sort({ data: -1 });

  return registros;
}

module.exports = {
  conectarDB,
  adicionarGasto,
  adicionarReceita,
  removerRegistro,
  corrigirRegistro,
  gerarRelatorio
};
