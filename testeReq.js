const axios = require('axios');
const prompt = require('prompt-sync')();

async function inputLoop() {
  let sair = null;

  while (sair !== 'sair') {
    const mensagem = prompt('Digite a sua mensagem: ');
    
    // se digitar 'sair', interrompe o loop
    if (mensagem.toLowerCase() === 'sair') break;

    await enviarMensagem(mensagem);
  }
}

async function enviarMensagem(mensagem) {
  try {
    const resposta = await axios.post('http://localhost:3000/recebe-mensagem', {
      usuarioId: '11951300788',
      mensagem: mensagem
    }, { timeout: 10000 }); 

    console.log('✅ Resposta:', resposta.data.resposta);
  } catch (error) {
    console.error('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }
}

inputLoop(); // inicia o loop
