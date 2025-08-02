const mongoose = require('mongoose');
const Registro = require('../models/registro')

async function conectarDB() {
  try{
    await mongoose.connect('mongodb+srv://glebsonsalmeida:lBVyvhQSXxjH4EBb@ravicluster.m4hpc2p.mongodb.net/?retryWrites=true&w=majority&appName=RaviCluster', {
      useNewUrlParser: true,
      useUnifiedTopology: true
  })
  console.log('Conectado ao DB !!')
  } catch {
    console.error('Erro ao conectar ao DB: ', err.message)
  }
}

// Adicionar gasto

async function adicionarGasto(comando, usuarioId) {
  const novo = new Registro ({
    usuarioId,
    tipo: 'gasto',
    item: comando.item,
    valor: comando.valor,
    qunatidade: comando.qunatidade || 1,
    categoria: comando.categoria,
    data: new Date()
  })
  return await novo.save()
}


module.exports = {
  conectarDB,
  adicionarGasto
  //adicionarReceita,
  //removerGasto,
  //corrigirGasto,
  //gerarRelatorio
}