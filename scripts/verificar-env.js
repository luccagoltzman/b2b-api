/**
 * Script para verificar se as variáveis de ambiente estão sendo lidas corretamente
 */

require('dotenv').config();

console.log('🔍 Verificando variáveis de ambiente...\n');

const variaveis = {
  'INFOPRICE_USERNAME': process.env.INFOPRICE_USERNAME,
  'INFOPRICE_PASSWORD': process.env.INFOPRICE_PASSWORD,
  'INFOPRICE_STATIC_TOKEN': process.env.INFOPRICE_STATIC_TOKEN,
};

let todasConfiguradas = true;

console.log('Variáveis InfoPrice:');
for (const [nome, valor] of Object.entries(variaveis)) {
  const configurado = valor && valor.trim() !== '' && !valor.includes('seu_');
  const status = configurado ? '✅' : '❌';
  const valorExibido = valor 
    ? (valor.length > 20 ? valor.substring(0, 20) + '...' : valor)
    : '(não definida)';
  
  console.log(`  ${status} ${nome}: ${valorExibido}`);
  
  if (!configurado) {
    todasConfiguradas = false;
  }
}

console.log('\n' + '='.repeat(50));

if (todasConfiguradas) {
  console.log('✅ Todas as variáveis estão configuradas!');
  console.log('   Reinicie o servidor se ainda não funcionar.');
} else {
  console.log('❌ Algumas variáveis não estão configuradas.');
  console.log('\nPara configurar, adicione no arquivo .env:');
  console.log('  INFOPRICE_USERNAME=seu_usuario_real');
  console.log('  INFOPRICE_PASSWORD=sua_senha_real');
  console.log('  INFOPRICE_STATIC_TOKEN=seu_token_real');
  console.log('\n⚠️  IMPORTANTE: Após adicionar, REINICIE o servidor!');
}

console.log('\n' + '='.repeat(50));
console.log('\nOutras variáveis importantes:');
console.log(`  PORT: ${process.env.PORT || '5000 (padrão)'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development (padrão)'}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ configurada' : '❌ não configurada'}`);
console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ configurada' : '❌ não configurada'}`);

