/**
 * Script para testar autenticação na InfoPrice
 * 
 * Uso: node scripts/testar-autenticacao-infoprice.js
 * 
 * Este script testa se as credenciais no .env estão corretas
 */

require('dotenv').config();
const crypto = require('crypto');
const https = require('https');

const username = process.env.INFOPRICE_USERNAME;
const password = process.env.INFOPRICE_PASSWORD;
const staticToken = process.env.INFOPRICE_STATIC_TOKEN;

console.log('🔐 Testando Autenticação InfoPrice\n');
console.log('='.repeat(50));

// Verificar se as credenciais estão configuradas
if (!username || !password || !staticToken) {
  console.log('❌ Credenciais não configuradas no .env\n');
  console.log('Configure no arquivo .env:');
  console.log('  INFOPRICE_USERNAME=seu_usuario');
  console.log('  INFOPRICE_PASSWORD=sua_senha');
  console.log('  INFOPRICE_STATIC_TOKEN=seu_token_estatico');
  process.exit(1);
}

console.log('✅ Credenciais encontradas no .env');
console.log(`   Username: ${username}`);
console.log(`   Password: ${password ? '***' + password.slice(-2) : 'não definida'}`);
console.log(`   Static Token: ${staticToken ? staticToken.substring(0, 20) + '...' : 'não definido'}`);
console.log('\n' + '='.repeat(50));
console.log('\n🔄 Tentando autenticar na InfoPrice...\n');

// Hash da senha (SHA512)
const passwordHash = crypto.createHash('sha512').update(password).digest('hex');

// Fazer requisição
const postData = null; // GET com query params
const url = new URL('https://api.infopriceti.com.br/portal-acesso-web/oauth/token');
url.searchParams.append('grant_type', 'password');
url.searchParams.append('username', username);
url.searchParams.append('password', passwordHash);

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Authorization': `Basic ${staticToken}`,
    'Content-Type': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);

    try {
      const json = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log('✅ Autenticação bem-sucedida!\n');
        console.log('Resposta:');
        console.log(JSON.stringify(json, null, 2));
        console.log('\n' + '='.repeat(50));
        console.log('\n🎉 Suas credenciais estão corretas!');
        console.log('   Você pode usar a integração normalmente.');
        console.log('\nPróximos passos:');
        console.log('   1. Reinicie o servidor: npm run dev');
        console.log('   2. Teste a configuração: node scripts/testar-infoprice.js configuracao');
        console.log('   3. Sincronize dados: node scripts/testar-infoprice.js sincronizar 30');
      } else {
        console.log('❌ Erro na autenticação\n');
        console.log('Resposta:', JSON.stringify(json, null, 2));
        console.log('\nPossíveis causas:');
        console.log('  - Username ou password incorretos');
        console.log('  - Token estático incorreto');
        console.log('  - Conta não ativada');
        console.log('  - Credenciais expiradas');
      }
    } catch (error) {
      console.log('❌ Erro ao processar resposta\n');
      console.log('Resposta recebida:', data);
      console.log('\nErro:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Erro na requisição\n');
  console.log('Erro:', error.message);
  console.log('\nPossíveis causas:');
  console.log('  - Problema de conexão com a internet');
  console.log('  - URL da API incorreta');
  console.log('  - Firewall bloqueando a conexão');
});

req.end();

