/**
 * Script para testar e sincronizar dados da InfoPrice
 * 
 * Uso: node scripts/testar-infoprice.js [comando]
 * 
 * Comandos disponíveis:
 * - configuracao: Verifica se InfoPrice está configurado
 * - status: Verifica status dos benchmarks
 * - sincronizar [dias]: Sincroniza dados (padrão: 7 dias)
 * - benchmarks [categoria]: Lista benchmarks (opcional: filtrar por categoria)
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function fazerRequisicao(method, path, body = null) {
  return new Promise((resolve, reject) => {
    // Remover / do início do path se existir e construir URL corretamente
    const pathLimpo = path.startsWith('/') ? path.substring(1) : path;
    const urlCompleto = `${API_BASE}/${pathLimpo}`;
    const url = new URL(urlCompleto);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function verificarConfiguracao() {
  console.log('\n🔍 Verificando configuração da InfoPrice...\n');
  try {
    const response = await fazerRequisicao('GET', '/infoprice/configuracao');
    console.log('Status:', response.status);
    console.log('Resposta:', JSON.stringify(response.data, null, 2));
    
    if (response.data.configurado) {
      console.log('\n✅ InfoPrice está configurado!');
    } else {
      console.log('\n❌ InfoPrice NÃO está configurado.');
      console.log('Configure no arquivo .env:');
      console.log('  INFOPRICE_USERNAME=seu_usuario');
      console.log('  INFOPRICE_PASSWORD=sua_senha');
      console.log('  INFOPRICE_STATIC_TOKEN=seu_token');
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

async function verificarStatusBenchmarks() {
  console.log('\n📊 Verificando status dos benchmarks...\n');
  try {
    const response = await fazerRequisicao('GET', '/mercado/benchmarks/status');
    console.log('Status:', response.status);
    console.log('Resposta:', JSON.stringify(response.data, null, 2));
    
    if (response.data.temDados) {
      console.log(`\n✅ Há ${response.data.total} benchmarks cadastrados`);
      console.log('Categorias:', response.data.categorias.join(', ') || 'Nenhuma');
    } else {
      console.log('\n⚠️  Nenhum benchmark cadastrado ainda.');
      console.log('Execute a sincronização da InfoPrice para gerar benchmarks automaticamente.');
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

async function sincronizar(dias = 7) {
  console.log(`\n🔄 Sincronizando dados dos últimos ${dias} dias...\n`);
  try {
    const response = await fazerRequisicao('POST', '/infoprice/sincronizar/ultimos-dias', { dias });
    console.log('Status:', response.status);
    console.log('Resposta:', JSON.stringify(response.data, null, 2));
    
    if (response.data.sucesso) {
      console.log('\n✅ Sincronização concluída!');
      console.log(`   - Itens processados: ${response.data.totalProcessados}`);
      console.log(`   - Preços cadastrados: ${response.data.precosCadastrados}`);
      console.log(`   - Benchmarks cadastrados: ${response.data.benchmarksCadastrados || 0}`);
      console.log(`   - Erros: ${response.data.erros}`);
      
      if (response.data.benchmarksCadastrados > 0) {
        console.log('\n🎉 Benchmarks foram gerados automaticamente!');
      } else {
        console.log('\n⚠️  Nenhum benchmark foi gerado. Verifique se há dados na InfoPrice para o período.');
      }
    }
  } catch (error) {
    console.error('Erro:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n❌ Servidor não está rodando. Inicie o servidor primeiro:');
      console.error('   npm run dev');
    }
  }
}

async function listarBenchmarks(categoria = null) {
  console.log('\n📋 Listando benchmarks...\n');
  try {
    const path = categoria 
      ? `/mercado/benchmarks?categoria=${encodeURIComponent(categoria)}`
      : '/mercado/benchmarks';
    
    const response = await fazerRequisicao('GET', path);
    console.log('Status:', response.status);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log(`\n✅ Encontrados ${response.data.length} benchmarks:\n`);
      response.data.forEach((benchmark, index) => {
        console.log(`${index + 1}. ${benchmark.categoria || 'Geral'} - ${benchmark.tipoMetrica}`);
        console.log(`   Valor: ${benchmark.valorBenchmark} ${benchmark.unidade === 'percentual' ? '%' : benchmark.unidade === 'reais' ? 'R$' : ''}`);
        console.log(`   Fonte: ${benchmark.fonte || 'N/A'}`);
        console.log(`   Período: ${benchmark.periodo || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  Nenhum benchmark encontrado.');
      if (categoria) {
        console.log(`   Categoria "${categoria}" não possui benchmarks.`);
        console.log('   Tente buscar sem filtro ou execute a sincronização.');
      } else {
        console.log('   Execute a sincronização da InfoPrice para gerar benchmarks.');
      }
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

async function main() {
  const comando = process.argv[2];
  const parametro = process.argv[3];

  console.log('🚀 Script de Teste InfoPrice\n');

  switch (comando) {
    case 'configuracao':
      await verificarConfiguracao();
      break;
    
    case 'status':
      await verificarStatusBenchmarks();
      break;
    
    case 'sincronizar':
      const dias = parametro ? parseInt(parametro) : 7;
      await sincronizar(dias);
      break;
    
    case 'benchmarks':
      await listarBenchmarks(parametro || null);
      break;
    
    case 'tudo':
    case 'all':
      await verificarConfiguracao();
      await verificarStatusBenchmarks();
      await listarBenchmarks();
      break;
    
    default:
      console.log('Uso: node scripts/testar-infoprice.js [comando] [parametro]\n');
      console.log('Comandos disponíveis:');
      console.log('  configuracao              - Verifica se InfoPrice está configurado');
      console.log('  status                    - Verifica status dos benchmarks');
      console.log('  sincronizar [dias]        - Sincroniza dados (padrão: 7 dias)');
      console.log('  benchmarks [categoria]     - Lista benchmarks (opcional: filtrar por categoria)');
      console.log('  tudo                      - Executa todas as verificações\n');
      console.log('Exemplos:');
      console.log('  node scripts/testar-infoprice.js configuracao');
      console.log('  node scripts/testar-infoprice.js sincronizar 30');
      console.log('  node scripts/testar-infoprice.js benchmarks Alimentos');
      console.log('  node scripts/testar-infoprice.js tudo');
  }
}

main().catch(console.error);

