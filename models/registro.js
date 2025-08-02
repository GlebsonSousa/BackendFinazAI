const mongoose = require('mongoose')

const registroSchema = new mongoose.Schema({
    usuarioId: String,
    tipo: String,
    item: String,
    valor: Number,
    quantidade: Number,
    categoria: String,
    data: Date,
    identificador: String // Para corrigir gasto
})

const Registro = mongoose.model('Registro', registroSchema)

module.exports = Registro