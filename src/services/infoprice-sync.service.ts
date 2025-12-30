import { InfoPriceService } from './infoprice.service';
import { MercadoService } from './mercado.service';
import { prisma } from '../lib/prisma';

interface ProdutoInfoPrice {
  produto: string;
  produto_descricao: string;
  preco_varejo: number | null;
  preco_atacado: number | null;
  loja: string;
  data: string;
  regiao?: string;
}

export class InfoPriceSyncService {
  private infoPriceService: InfoPriceService;
  private mercadoService: MercadoService;

  constructor() {
    this.infoPriceService = InfoPriceService.getInstance();
    this.mercadoService = new MercadoService();
  }

  /**
   * Extrai marca do nome do produto
   */
  private extrairMarca(descricao: string): string | undefined {
    const marcasComuns = [
      'quick', 'kibon', 'nestlé', 'nestle', 'eletrolux', 'brastemp', 'consul',
      'lg', 'samsung', 'bosch', 'philco', 'mondial', 'continental', 'delicia',
      'qualy', 'vigor', 'itambé', 'parmalat', 'danone', 'yoplait'
    ];

    const descricaoLower = descricao.toLowerCase();
    for (const marca of marcasComuns) {
      if (descricaoLower.includes(marca)) {
        return marca.charAt(0).toUpperCase() + marca.slice(1);
      }
    }

    return undefined;
  }

  /**
   * Extrai categoria do nome do produto
   */
  private extrairCategoria(descricao: string): string {
    const descricaoLower = descricao.toLowerCase();

    if (descricaoLower.includes('gelato') || descricaoLower.includes('sorvete') || 
        descricaoLower.includes('picolé') || descricaoLower.includes('açai')) {
      return 'Alimentos';
    }
    if (descricaoLower.includes('refrigerador') || descricaoLower.includes('geladeira') ||
        descricaoLower.includes('fogão') || descricaoLower.includes('freezer') ||
        descricaoLower.includes('máquina') || descricaoLower.includes('lavadora')) {
      return 'Eletrodomésticos';
    }
    if (descricaoLower.includes('margarina') || descricaoLower.includes('manteiga') ||
        descricaoLower.includes('queijo') || descricaoLower.includes('leite')) {
      return 'Laticínios';
    }
    if (descricaoLower.includes('arroz') || descricaoLower.includes('feijão') ||
        descricaoLower.includes('açúcar') || descricaoLower.includes('óleo')) {
      return 'Alimentos';
    }
    if (descricaoLower.includes('detergente') || descricaoLower.includes('sabão') ||
        descricaoLower.includes('limpeza')) {
      return 'Limpeza';
    }

    return 'Alimentos'; // Padrão
  }

  /**
   * Extrai região baseada no código da loja ou outros dados
   * Por enquanto retorna undefined, mas pode ser expandido
   */
  private extrairRegiao(loja: string, produto: string): string | undefined {
    // Aqui você pode mapear códigos de loja para regiões
    // ou usar outros dados disponíveis
    return undefined;
  }

  /**
   * Sincroniza dados da InfoPrice com o banco local
   */
  async sincronizarDados(dataInicio: string, dataFim: string): Promise<{
    totalProcessados: number;
    precosCadastrados: number;
    benchmarksCadastrados: number;
    erros: number;
  }> {
    if (!this.infoPriceService.isConfigurado()) {
      throw new Error('InfoPrice não está configurado. Configure as credenciais no .env');
    }

    console.log(`Iniciando sincronização InfoPrice: ${dataInicio} até ${dataFim}`);

    const dados = await this.infoPriceService.buscarTodosDadosPeriodo(dataInicio, dataFim);
    
    let precosCadastrados = 0;
    let erros = 0;

    // Agrupar por produto/marca/região para evitar duplicatas
    const precosAgrupados = new Map<string, {
      produto: string;
      marca?: string;
      categoria: string;
      regiao?: string;
      precos: number[];
      precosAtacado: number[];
      dataColeta: string;
    }>();

    for (const item of dados) {
      try {
        // Usar apenas itens com preço válido
        const preco = item.preco_varejo || item.preco_atacado;
        if (!preco || preco <= 0) continue;

        const marca = this.extrairMarca(item.produto_descricao);
        const categoria = this.extrairCategoria(item.produto_descricao);
        const regiao = this.extrairRegiao(item.loja, item.produto);

        // Criar chave única
        const chave = `${item.produto}-${marca || 'N/A'}-${regiao || 'Nacional'}`;

        if (!precosAgrupados.has(chave)) {
          precosAgrupados.set(chave, {
            produto: item.produto_descricao,
            marca,
            categoria,
            regiao,
            precos: [],
            precosAtacado: [],
            dataColeta: item.data,
          });
        }

        const grupo = precosAgrupados.get(chave)!;
        if (item.preco_varejo) {
          grupo.precos.push(item.preco_varejo);
        }
        if (item.preco_atacado) {
          grupo.precosAtacado.push(item.preco_atacado);
        }
      } catch (error) {
        console.error(`Erro ao processar item ${item.produto}:`, error);
        erros++;
      }
    }

    // Cadastrar preços agrupados
    for (const [chave, grupo] of precosAgrupados) {
      try {
        // Calcular preço médio, mínimo e máximo
        const todosPrecos = [...grupo.precos, ...grupo.precosAtacado];
        if (todosPrecos.length === 0) continue;

        const precoMedio = todosPrecos.reduce((a, b) => a + b, 0) / todosPrecos.length;
        const precoMinimo = Math.min(...todosPrecos);
        const precoMaximo = Math.max(...todosPrecos);

        // Extrair nome do produto (sem marca)
        const nomeProduto = grupo.produto
          .replace(new RegExp(grupo.marca || '', 'gi'), '')
          .trim();

        await this.mercadoService.cadastrarPrecoMercado({
          produto: nomeProduto || grupo.produto,
          marca: grupo.marca,
          categoria: grupo.categoria,
          regiao: grupo.regiao,
          precoMedio,
          precoMinimo,
          precoMaximo,
          unidadeMedida: 'unidade',
          fonte: 'InfoPrice API',
          observacoes: `Sincronizado automaticamente em ${new Date().toISOString()}. Dados coletados em ${grupo.dataColeta}`,
        });

        precosCadastrados++;
      } catch (error) {
        console.error(`Erro ao cadastrar preço ${chave}:`, error);
        erros++;
      }
    }

    // Calcular e cadastrar benchmarks
    const benchmarksCadastrados = await this.calcularECadastrarBenchmarks(dados, precosAgrupados);

    // Registrar sincronização
    await prisma.atividade.create({
      data: {
        type: 'analise',
        description: `Sincronização InfoPrice: ${precosCadastrados} preços e ${benchmarksCadastrados} benchmarks cadastrados de ${dados.length} itens processados`,
        status: 'concluida',
      },
    });

    return {
      totalProcessados: dados.length,
      precosCadastrados,
      benchmarksCadastrados,
      erros,
    };
  }

  /**
   * Calcula e cadastra benchmarks do setor baseado nos dados da InfoPrice
   */
  private async calcularECadastrarBenchmarks(
    dados: any[],
    precosAgrupados: Map<string, any>
  ): Promise<number> {
    let benchmarksCadastrados = 0;
    const periodo = new Date().toISOString().slice(0, 7); // YYYY-MM

    console.log(`[InfoPrice Sync] Iniciando cálculo de benchmarks. Total de itens: ${dados.length}`);

    // Agrupar dados por categoria para calcular benchmarks
    const dadosPorCategoria = new Map<string, {
      precos: number[];
      promocoes: number;
      totalItens: number;
      precosPromocao: number[];
    }>();

    for (const item of dados) {
      const preco = item.preco_varejo || item.preco_atacado;
      if (!preco || preco <= 0) continue;

      const categoria = this.extrairCategoria(item.produto_descricao);
      
      if (!dadosPorCategoria.has(categoria)) {
        dadosPorCategoria.set(categoria, {
          precos: [],
          promocoes: 0,
          totalItens: 0,
          precosPromocao: [],
        });
      }

      const catData = dadosPorCategoria.get(categoria)!;
      catData.precos.push(preco);
      catData.totalItens++;

      if (item.promocao) {
        catData.promocoes++;
        if (item.preco_por) {
          catData.precosPromocao.push(item.preco_por);
        }
      }
    }

    console.log(`[InfoPrice Sync] Categorias encontradas para benchmarks: ${Array.from(dadosPorCategoria.keys()).join(', ')}`);

    // Se não houver dados, retornar 0
    if (dadosPorCategoria.size === 0) {
      console.log('[InfoPrice Sync] Nenhuma categoria encontrada para calcular benchmarks');
      return 0;
    }

    // Calcular benchmarks por categoria
    for (const [categoria, catData] of dadosPorCategoria) {
      if (catData.precos.length === 0) {
        console.log(`[InfoPrice Sync] Pulando categoria ${categoria} - sem preços válidos`);
        continue;
      }

      console.log(`[InfoPrice Sync] Calculando benchmarks para categoria: ${categoria} (${catData.precos.length} preços)`);

      try {
        // 1. Preço médio de mercado por categoria
        const precoMedio = catData.precos.reduce((a, b) => a + b, 0) / catData.precos.length;
        const precoMinimo = Math.min(...catData.precos);
        const precoMaximo = Math.max(...catData.precos);

        // Verificar se já existe benchmark de preço médio
        const benchmarkExistente = await prisma.benchmarkSetor.findFirst({
          where: {
            categoria,
            tipoMetrica: 'preco_medio_mercado',
            ativo: true,
          },
        });

        if (benchmarkExistente) {
          await prisma.benchmarkSetor.update({
            where: { id: benchmarkExistente.id },
            data: {
              valorBenchmark: precoMedio,
              periodo,
              updatedAt: new Date(),
            },
          });
        } else {
          await this.mercadoService.cadastrarBenchmarkSetor({
            categoria,
            tipoMetrica: 'preco_medio_mercado',
            valorBenchmark: precoMedio,
            unidade: 'reais',
            descricao: `Preço médio de mercado para categoria ${categoria} baseado em dados da InfoPrice`,
            fonte: 'InfoPrice API',
            periodo,
          });
        }
        benchmarksCadastrados++;

        // 2. Taxa de promoção por categoria
        const taxaPromocao = (catData.promocoes / catData.totalItens) * 100;
        
        const benchmarkPromocao = await prisma.benchmarkSetor.findFirst({
          where: {
            categoria,
            tipoMetrica: 'taxa_promocao',
            ativo: true,
          },
        });

        if (benchmarkPromocao) {
          await prisma.benchmarkSetor.update({
            where: { id: benchmarkPromocao.id },
            data: {
              valorBenchmark: taxaPromocao,
              periodo,
              updatedAt: new Date(),
            },
          });
        } else {
          await this.mercadoService.cadastrarBenchmarkSetor({
            categoria,
            tipoMetrica: 'taxa_promocao',
            valorBenchmark: taxaPromocao,
            unidade: 'percentual',
            descricao: `Percentual de produtos em promoção na categoria ${categoria}`,
            fonte: 'InfoPrice API',
            periodo,
          });
        }
        benchmarksCadastrados++;

        // 3. Desconto médio em promoções
        if (catData.precosPromocao.length > 0) {
          const precoMedioPromocao = catData.precosPromocao.reduce((a, b) => a + b, 0) / catData.precosPromocao.length;
          const descontoMedio = ((precoMedio - precoMedioPromocao) / precoMedio) * 100;

          const benchmarkDesconto = await prisma.benchmarkSetor.findFirst({
            where: {
              categoria,
              tipoMetrica: 'desconto_medio_promocao',
              ativo: true,
            },
          });

          if (benchmarkDesconto) {
            await prisma.benchmarkSetor.update({
              where: { id: benchmarkDesconto.id },
              data: {
                valorBenchmark: descontoMedio,
                periodo,
                updatedAt: new Date(),
              },
            });
          } else {
            await this.mercadoService.cadastrarBenchmarkSetor({
              categoria,
              tipoMetrica: 'desconto_medio_promocao',
              valorBenchmark: descontoMedio,
              unidade: 'percentual',
              descricao: `Desconto médio aplicado em promoções na categoria ${categoria}`,
              fonte: 'InfoPrice API',
              periodo,
            });
          }
          benchmarksCadastrados++;
        }

        // 4. Variação de preços (margem de mercado)
        const variacaoPreco = ((precoMaximo - precoMinimo) / precoMedio) * 100;

        const benchmarkVariacao = await prisma.benchmarkSetor.findFirst({
          where: {
            categoria,
            tipoMetrica: 'variacao_preco_mercado',
            ativo: true,
          },
        });

        if (benchmarkVariacao) {
          await prisma.benchmarkSetor.update({
            where: { id: benchmarkVariacao.id },
            data: {
              valorBenchmark: variacaoPreco,
              periodo,
              updatedAt: new Date(),
            },
          });
        } else {
          await this.mercadoService.cadastrarBenchmarkSetor({
            categoria,
            tipoMetrica: 'variacao_preco_mercado',
            valorBenchmark: variacaoPreco,
            unidade: 'percentual',
            descricao: `Variação percentual de preços no mercado para categoria ${categoria}`,
            fonte: 'InfoPrice API',
            periodo,
          });
        }
        benchmarksCadastrados++;
        console.log(`[InfoPrice Sync] Benchmark cadastrado: ${categoria} - variacao_preco_mercado`);

      } catch (error) {
        console.error(`[InfoPrice Sync] Erro ao cadastrar benchmarks para categoria ${categoria}:`, error);
      }
    }

    // Calcular benchmarks gerais (sem categoria específica)
    try {
      const todosPrecos = Array.from(dadosPorCategoria.values())
        .flatMap(cat => cat.precos);

      if (todosPrecos.length > 0) {
        const precoMedioGeral = todosPrecos.reduce((a, b) => a + b, 0) / todosPrecos.length;
        const totalPromocoes = Array.from(dadosPorCategoria.values())
          .reduce((sum, cat) => sum + cat.promocoes, 0);
        const totalItens = Array.from(dadosPorCategoria.values())
          .reduce((sum, cat) => sum + cat.totalItens, 0);
        const taxaPromocaoGeral = (totalPromocoes / totalItens) * 100;

        // Benchmark geral de preço médio
        const benchmarkGeralPreco = await prisma.benchmarkSetor.findFirst({
          where: {
            categoria: null,
            tipoMetrica: 'preco_medio_mercado_geral',
            ativo: true,
          },
        });

        if (benchmarkGeralPreco) {
          await prisma.benchmarkSetor.update({
            where: { id: benchmarkGeralPreco.id },
            data: {
              valorBenchmark: precoMedioGeral,
              periodo,
              updatedAt: new Date(),
            },
          });
        } else {
          await this.mercadoService.cadastrarBenchmarkSetor({
            tipoMetrica: 'preco_medio_mercado_geral',
            valorBenchmark: precoMedioGeral,
            unidade: 'reais',
            descricao: 'Preço médio geral de mercado baseado em dados da InfoPrice',
            fonte: 'InfoPrice API',
            periodo,
          });
        }
        benchmarksCadastrados++;

        // Benchmark geral de taxa de promoção
        const benchmarkGeralPromocao = await prisma.benchmarkSetor.findFirst({
          where: {
            categoria: null,
            tipoMetrica: 'taxa_promocao_geral',
            ativo: true,
          },
        });

        if (benchmarkGeralPromocao) {
          await prisma.benchmarkSetor.update({
            where: { id: benchmarkGeralPromocao.id },
            data: {
              valorBenchmark: taxaPromocaoGeral,
              periodo,
              updatedAt: new Date(),
            },
          });
        } else {
          await this.mercadoService.cadastrarBenchmarkSetor({
            tipoMetrica: 'taxa_promocao_geral',
            valorBenchmark: taxaPromocaoGeral,
            unidade: 'percentual',
            descricao: 'Taxa geral de produtos em promoção no mercado',
            fonte: 'InfoPrice API',
            periodo,
          });
        }
        benchmarksCadastrados++;
      }
    } catch (error) {
      console.error('[InfoPrice Sync] Erro ao cadastrar benchmarks gerais:', error);
    }

    console.log(`[InfoPrice Sync] Total de benchmarks cadastrados: ${benchmarksCadastrados}`);
    return benchmarksCadastrados;
  }

  /**
   * Sincroniza dados dos últimos N dias
   */
  async sincronizarUltimosDias(dias: number = 7): Promise<{
    totalProcessados: number;
    precosCadastrados: number;
    benchmarksCadastrados: number;
    erros: number;
  }> {
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const dataInicioStr = this.formatarData(dataInicio);
    const dataFimStr = this.formatarData(dataFim);

    return await this.sincronizarDados(dataInicioStr, dataFimStr);
  }

  /**
   * Formata data no formato yyyy/MM/dd
   */
  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}/${mes}/${dia}`;
  }
}

