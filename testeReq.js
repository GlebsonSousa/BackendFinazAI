const axios = require('axios');
const prompt = require('prompt-sync')();

const max_tentativas = 4;

async function inputLoop() {
  while (true) {
    const mensagem = prompt('Digite a sua mensagem: ');
    
    if (mensagem.toLowerCase() === 'sair') break;

    await enviarMensagem(mensagem, 0);
  }
}

async function enviarMensagem(mensagem, tentativaAtual) {
  try {
    const resposta = await axios.post('http://localhost:3000/recebe-mensagem', {
      usuarioId: '5511951300788',
      mensagem: mensagem
    }, { timeout: 10000 });

    console.log('✅ Resposta:', resposta.data.resposta);
  } catch (error) {
    console.error(`❌ Erro (tentativa ${tentativaAtual + 1}):`, error.response?.status, error.response?.data || error.message);
    
    if (tentativaAtual < max_tentativas) {
      console.log('🔁 Tentando reenviar a mensagem ...');
      await enviarMensagem(mensagem, tentativaAtual + 1);
    } else {
      console.log('❌ Número máximo de tentativas atingido. Pulando esta mensagem.');
    }
  }
}

inputLoop()
