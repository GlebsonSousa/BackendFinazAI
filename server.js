const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Carrega variáveis de ambiente do .env

const app = express();
const PORT = process.env.PORT || 3000;

const qs = require('qs'); // transforma JSON em string url-encoded
const axios = require('axios');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Rota para verificar se a API está funcionando
app.get("/", async (req, res) => {
    return res.status(200).json('API Backend rodando!');
});

async function enviarRespostaMsgWhats(numero, mensagem) {
    const url = `${process.env.URL_WHATS_API}/enviar`;
    try {
        console.log("🔗 Tentando enviar para:", url);
        console.log("📦 Payload:", { numero, mensagem });

        const data = qs.stringify({ numero, mensagem });

        await axios.post(url, data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })

        console.log("✅ Mensagem enviada com sucesso");
    } catch (erro) {
        console.error("❌ Erro ao enviar mensagem para API Whats:");
        console.error("Status:", erro.response?.status);
        console.error("Data:", erro.response?.data);
        console.error("Mensagem:", erro.message);
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
