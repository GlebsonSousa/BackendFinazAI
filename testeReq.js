const axios = require('axios');

async function enviarMensagem() {
  try {
    const resposta = await axios.post('http://localhost:3000/recebe-mensagem', {
      usuarioId: '11951300788',
      mensagem: 'quanto gastei com chocolate'});

    console.log('✅ Resposta:', resposta.data);
  } catch (error) {
    console.error('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }
}

enviarMensagem();
