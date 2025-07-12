const express = require("express");
const cors = require("cors");
require("dotenv").config();  // Carrega variáveis de ambiente do .env

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get ("/", async (req, res) => {
    return res.status(200).json('Api rodando!')
})

app.post ("/recebemensagem", async (req, res) => {
    const { numero, mensagem } = req.body;

    const resposta = 'Sua mensagem foi recebida'

    return res.status(200).json({
        numero,
        mensagem,
        resposta,
    })
})

app.listen(PORT, () => {
  console.log(`🚀 API da FinanzAI rodando em http://localhost:${PORT}`);
});