const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Carrega variáveis de ambiente do .env

const app = express();
const PORT = process.env.PORT || 3000;

const axios = require('axios');

app.use(cors());
app.use(express.json());

// Rota para verificar se a API está funcionando
app.get("/", async (req, res) => {
    return res.status(200).json('API Backend rodando!');
});

async function enviarRespostaMsgWhats(numero, mensagem) {
    try {
        const response = await axios.get(`${process.env.URL_WHATS_API}/enviar`, {
            numero,
            mensagem
        })
        console.log(`Enviado ao backend: ${numero}, ${mensagem}`)
    }catch (erro) {
        console.error('Erro ao enviar MSG para ApiWhats', erro.message)
    }
}


// Rota que recebe as mensagens do WhatsApp
app.post("/recebemensagem", async (req, res) => {
    
    const body = req.body

    if(!body || !body.numero || !body.mensagem || !body.dataMsgRecebida) {
        return res.status(400).json({
            sucesso: false,
            erro: "Requisição inálida: corpo ausente ou incoerente."
        })
    }

    const { numero, mensagem, dataMsgRecebida } = req.body;
    
    console.log("📩 Mensagem recebida:");
    console.log("Número:", numero);
    console.log("Mensagem:", mensagem);
    console.log("Data:", dataMsgRecebida);

    await enviarRespostaMsgWhats(numero, mensagem)

    // Aqui você pode salvar a mensagem, processar, enviar para outro sistema, etc.
    return res.status(200).json({
        sucesso: true,
        mensagem: "Mensagem recebida com sucesso",
        numero,
        mensagemOriginal: mensagem,
        dataMsgRecebida,
    })

})

app.listen(PORT, () => {
    console.log(`🚀 API Backend rodando em http://localhost:${PORT}`);
});
