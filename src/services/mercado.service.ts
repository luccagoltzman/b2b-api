import { prisma } from '../lib/prisma';

export class MercadoService {
  /**
   * Obtém preços de mercado para um produto/marca específico
   */
  async obterPrecosMercado(
    produto?: string,
    marca?: string,
    categoria?: string,
    regiao?: string
  ) {
    const where: any = {
      ativo: true,
    };

    if (produto) where.produto = { contains: produto };
    if (marca) where.marca = { contains: marca };
    if (categoria) where.categoria = categoria;
    if (regiao) where.regiao = regiao;

    return await prisma.precoMercado.findMany({
      where,
      orderBy: { dataColeta: 'desc' },
      take: 50,
    });
  }

  /**
   * Obtém produtos mais vendidos por região
   */
  async obterProdutosVendidosRegiao(
    regiao?: string,
    categoria?: string,
    limite: number = 20
  ) {
    const where: any = {
      ativo: true,
    };

    if (regiao) where.regiao = regiao;
    if (categoria) where.categoria = categoria;

    return await prisma.produtoVendidoRegiao.findMany({
      where,
      orderBy: { posicaoRanking: 'asc' },
      take: limite,
    });
  }

  /**
   * Obtém produtos mais pedidos por supermercados
   */
  async obterProdutosPedidosSupermercado(
    tipoSupermercado?: string,
    categoria?: string,
    limite: number = 20
  ) {
    const where: any = {
      ativo: true,
    };

    if (tipoSupermercado) where.tipoSupermercado = tipoSupermercado;
    if (categoria) where.categoria = categoria;

    return await prisma.produtoPedidoSupermercado.findMany({
      where,
      orderBy: { frequenciaPedidos: 'asc' },
      take: limite,
    });
  }

  /**
   * Mapeia produto/nome para categoria
   */
  private mapearParaCategoria(nome: string): string | null {
    const nomeLower = nome.toLowerCase();
    
    // Produtos de gelato/sorvete são da categoria Alimentos
    if (nomeLower.includes('gelato') || nomeLower.includes('gelados') || 
        nomeLower.includes('sorvete') || nomeLower.includes('picolé')) {
      return 'Alimentos';
    }
    
    // Eletrodomésticos
    if (nomeLower.includes('refrigerador') || nomeLower.includes('geladeira') ||
        nomeLower.includes('fogão') || nomeLower.includes('freezer') ||
        nomeLower.includes('máquina') || nomeLower.includes('lavadora')) {
      return 'Eletrodomésticos';
    }
    
    // Laticínios
    if (nomeLower.includes('margarina') || nomeLower.includes('manteiga') ||
        nomeLower.includes('queijo') || nomeLower.includes('leite')) {
      return 'Laticínios';
    }
    
    // Limpeza
    if (nomeLower.includes('detergente') || nomeLower.includes('sabão') ||
        nomeLower.includes('limpeza')) {
      return 'Limpeza';
    }
    
    return null;
  }

  /**
   * Obtém benchmarks do setor
   */
  async obterBenchmarksSetor(categoria?: string, tipoMetrica?: string) {
    const where: any = {
      ativo: true,
    };

    let categoriaParaBuscar = categoria;

    // Se a categoria fornecida parece ser um produto, mapear para categoria real
    if (categoria) {
      const categoriaMapeada = this.mapearParaCategoria(categoria);
      if (categoriaMapeada) {
        categoriaParaBuscar = categoriaMapeada;
      }
    }

    if (categoriaParaBuscar) {
      // Buscar exatamente pela categoria (case-sensitive no MySQL)
      where.categoria = categoriaParaBuscar;
    }
    
    if (tipoMetrica) {
      where.tipoMetrica = tipoMetrica;
    }

    let benchmarks = await prisma.benchmarkSetor.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    // Se não encontrou benchmarks com a categoria específica, incluir benchmarks gerais (sem categoria)
    if (categoriaParaBuscar && benchmarks.length === 0) {
      const whereGeral: any = {
        ativo: true,
        categoria: null,
      };
      
      if (tipoMetrica) {
        whereGeral.tipoMetrica = tipoMetrica;
      }

      const benchmarksGerais = await prisma.benchmarkSetor.findMany({
        where: whereGeral,
        orderBy: { updatedAt: 'desc' },
      });

      benchmarks = benchmarksGerais;
    }

    // Se ainda não encontrou nada, buscar todos os benchmarks ativos
    if (benchmarks.length === 0 && !categoriaParaBuscar && !tipoMetrica) {
      benchmarks = await prisma.benchmarkSetor.findMany({
        where: { ativo: true },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return benchmarks;
  }

  /**
   * Formata dados de mercado para incluir no contexto da IA
   */
  async formatarDadosMercadoParaIA(
    produtosAnalisados?: Array<{ produto?: string; marca?: string; categoria?: string }>,
    regiao?: string
  ): Promise<string> {
    const dadosMercado: string[] = [];
    let temDados = false;

    // Coletar preços de mercado para produtos relevantes
    if (produtosAnalisados && produtosAnalisados.length > 0) {
      const precos: any[] = [];
      for (const prod of produtosAnalisados) {
        const preco = await this.obterPrecosMercado(
          prod.produto,
          prod.marca,
          prod.categoria,
          regiao
        );
        precos.push(...preco);
      }

      if (precos.length > 0) {
        temDados = true;
        dadosMercado.push('\n=== PREÇOS DE MERCADO ===');
        const precosUnicos = new Map<string, any>();
        precos.forEach((p) => {
          const chave = `${p.produto}-${p.marca || 'N/A'}-${p.regiao || 'Nacional'}`;
          if (!precosUnicos.has(chave) || new Date(p.dataColeta) > new Date(precosUnicos.get(chave).dataColeta)) {
            precosUnicos.set(chave, p);
          }
        });

        Array.from(precosUnicos.values()).forEach((p) => {
          dadosMercado.push(
            `- ${p.produto}${p.marca ? ` (${p.marca})` : ''} - ${p.regiao || 'Nacional'}: R$ ${p.precoMedio.toFixed(2)}${p.unidadeMedida ? `/${p.unidadeMedida}` : ''}${p.precoMinimo && p.precoMaximo ? ` (variação: R$ ${p.precoMinimo.toFixed(2)} - R$ ${p.precoMaximo.toFixed(2)})` : ''}`
          );
        });
      }
    }

    // Coletar produtos mais vendidos na região
    if (regiao) {
      const produtosVendidos = await this.obterProdutosVendidosRegiao(regiao, undefined, 10);
      if (produtosVendidos.length > 0) {
        temDados = true;
        dadosMercado.push(`\n=== PRODUTOS MAIS VENDIDOS NA REGIÃO ${regiao} ===`);
        produtosVendidos.forEach((p, index) => {
          dadosMercado.push(
            `${index + 1}. ${p.produto}${p.marca ? ` (${p.marca})` : ''}${p.volumeVendas ? ` - Volume: ${p.volumeVendas}` : ''}${p.participacaoMercado ? ` - Participação: ${p.participacaoMercado.toFixed(2)}%` : ''}`
          );
        });
      }
    }

    // Coletar produtos mais pedidos por supermercados
    const produtosPedidos = await this.obterProdutosPedidosSupermercado(undefined, undefined, 10);
    if (produtosPedidos.length > 0) {
      temDados = true;
      dadosMercado.push('\n=== PRODUTOS MAIS PEDIDOS POR SUPERMERCADOS ===');
      produtosPedidos.forEach((p, index) => {
        dadosMercado.push(
          `${index + 1}. ${p.produto}${p.marca ? ` (${p.marca})` : ''}${p.tipoSupermercado ? ` - Tipo: ${p.tipoSupermercado}` : ''}${p.demandaEstimada ? ` - Demanda: ${p.demandaEstimada}` : ''}${p.sazonalidade ? ` - Sazonalidade: ${p.sazonalidade}` : ''}`
        );
      });
    }

    // Coletar benchmarks do setor
    const benchmarks = await this.obterBenchmarksSetor();
    if (benchmarks.length > 0) {
      temDados = true;
      dadosMercado.push('\n=== BENCHMARKS DO SETOR ===');
      const benchmarksPorCategoria = new Map<string, any[]>();
      benchmarks.forEach((b) => {
        const cat = b.categoria || 'Geral';
        if (!benchmarksPorCategoria.has(cat)) {
          benchmarksPorCategoria.set(cat, []);
        }
        benchmarksPorCategoria.get(cat)!.push(b);
      });

      benchmarksPorCategoria.forEach((benchmarks, categoria) => {
        dadosMercado.push(`\n${categoria}:`);
        benchmarks.forEach((b) => {
          const unidade = b.unidade === 'percentual' ? '%' : b.unidade || '';
          dadosMercado.push(`  - ${b.tipoMetrica}: ${b.valorBenchmark}${unidade}`);
        });
      });
    }

    // Se não houver dados de mercado, informar
    if (!temDados) {
      dadosMercado.push('\n=== DADOS DE MERCADO ===');
      dadosMercado.push('⚠️ ATENÇÃO: Não há dados de mercado cadastrados no sistema.');
      dadosMercado.push('Para fazer comparações precisas, é necessário cadastrar:');
      dadosMercado.push('- Preços de mercado dos produtos');
      dadosMercado.push('- Produtos mais vendidos por região');
      dadosMercado.push('- Produtos mais pedidos por supermercados');
      dadosMercado.push('- Benchmarks do setor');
      dadosMercado.push('Use os endpoints /api/mercado/* para cadastrar esses dados.');
    }

    return dadosMercado.length > 0 ? dadosMercado.join('\n') : '';
  }

  /**
   * Busca dados de produtos concorrentes na mesma categoria/região
   */
  async buscarDadosConcorrentes(
    produto?: string,
    marca?: string,
    categoria?: string,
    regiao?: string
  ): Promise<string> {
    const dadosConcorrentes: string[] = [];
    let temDados = false;

    // Buscar preços de produtos concorrentes (mesma categoria, mas marcas diferentes)
    if (categoria || produto) {
      const where: any = {
        ativo: true,
      };

      if (categoria) {
        where.categoria = categoria;
      } else if (produto) {
        // Tentar inferir categoria do produto ou buscar produtos similares
        where.produto = { contains: produto };
      }

      if (regiao) {
        where.regiao = regiao;
      }

      // Excluir a marca específica se mencionada
      if (marca) {
        where.marca = { not: { contains: marca } };
      }

      const precosConcorrentes = await prisma.precoMercado.findMany({
        where,
        orderBy: { precoMedio: 'asc' },
        take: 15,
      });

      if (precosConcorrentes.length > 0) {
        temDados = true;
        dadosConcorrentes.push(`\n=== PRODUTOS CONCORRENTES (PREÇOS DE MERCADO)${regiao ? ` - REGIÃO ${regiao}` : ''} ===`);
        precosConcorrentes.forEach((p, index) => {
          dadosConcorrentes.push(
            `${index + 1}. ${p.produto}${p.marca ? ` (${p.marca})` : ''} - ${p.regiao || 'Nacional'}: R$ ${p.precoMedio.toFixed(2)}${p.unidadeMedida ? `/${p.unidadeMedida}` : ''}${p.precoMinimo && p.precoMaximo ? ` (variação: R$ ${p.precoMinimo.toFixed(2)} - R$ ${p.precoMaximo.toFixed(2)})` : ''}`
          );
        });
      }
    }

    // Buscar produtos mais vendidos na região (para comparação)
    if (regiao) {
      const produtosVendidos = await this.obterProdutosVendidosRegiao(regiao, categoria, 10);
      if (produtosVendidos.length > 0) {
        temDados = true;
        dadosConcorrentes.push(`\n=== RANKING DE PRODUTOS MAIS VENDIDOS NA REGIÃO ${regiao} ===`);
        produtosVendidos.forEach((p) => {
          dadosConcorrentes.push(
            `#${p.posicaoRanking} - ${p.produto}${p.marca ? ` (${p.marca})` : ''}${p.volumeVendas ? ` - Volume: ${p.volumeVendas}` : ''}${p.participacaoMercado ? ` - Participação: ${p.participacaoMercado.toFixed(2)}%` : ''}`
          );
        });
      }
    }

    // Se não houver dados de concorrentes, informar
    if (!temDados) {
      dadosConcorrentes.push(`\n=== PRODUTOS CONCORRENTES${regiao ? ` - REGIÃO ${regiao}` : ''} ===`);
      dadosConcorrentes.push('⚠️ ATENÇÃO: Não há dados de concorrentes cadastrados para esta região/produto.');
      dadosConcorrentes.push('Para fazer comparações precisas, cadastre preços de produtos concorrentes usando o endpoint POST /api/mercado/precos');
    }

    return dadosConcorrentes.length > 0 ? dadosConcorrentes.join('\n') : '';
  }

  /**
   * Cadastra ou atualiza preço de mercado
   */
  async cadastrarPrecoMercado(dados: {
    produto: string;
    marca?: string;
    categoria?: string;
    regiao?: string;
    precoMedio: number;
    precoMinimo?: number;
    precoMaximo?: number;
    unidadeMedida?: string;
    fonte?: string;
    observacoes?: string;
  }) {
    // Verificar se já existe um preço similar
    const existente = await prisma.precoMercado.findFirst({
      where: {
        produto: dados.produto,
        marca: dados.marca || null,
        regiao: dados.regiao || null,
        ativo: true,
      },
    });

    if (existente) {
      return await prisma.precoMercado.update({
        where: { id: existente.id },
        data: {
          ...dados,
          dataColeta: new Date(),
        },
      });
    }

    return await prisma.precoMercado.create({
      data: dados,
    });
  }

  /**
   * Cadastra produto vendido por região
   */
  async cadastrarProdutoVendidoRegiao(dados: {
    produto: string;
    marca?: string;
    categoria?: string;
    regiao: string;
    posicaoRanking: number;
    volumeVendas?: number;
    participacaoMercado?: number;
    periodo: string;
    fonte?: string;
    observacoes?: string;
  }) {
    return await prisma.produtoVendidoRegiao.create({
      data: dados,
    });
  }

  /**
   * Cadastra produto pedido por supermercado
   */
  async cadastrarProdutoPedidoSupermercado(dados: {
    produto: string;
    marca?: string;
    categoria?: string;
    tipoSupermercado?: string;
    frequenciaPedidos: number;
    demandaEstimada?: number;
    sazonalidade?: string;
    periodo: string;
    fonte?: string;
    observacoes?: string;
  }) {
    return await prisma.produtoPedidoSupermercado.create({
      data: dados,
    });
  }

  /**
   * Cadastra benchmark do setor
   */
  async cadastrarBenchmarkSetor(dados: {
    categoria?: string;
    tipoMetrica: string;
    valorBenchmark: number;
    unidade?: string;
    descricao?: string;
    fonte?: string;
    periodo?: string;
  }) {
    return await prisma.benchmarkSetor.create({
      data: dados,
    });
  }

  /**
   * Obtém lista de categorias disponíveis nos benchmarks
   */
  async obterCategoriasDisponiveis(): Promise<string[]> {
    const benchmarks = await prisma.benchmarkSetor.findMany({
      where: { ativo: true },
      select: { categoria: true },
      distinct: ['categoria'],
    });

    return benchmarks
      .map(b => b.categoria)
      .filter((cat): cat is string => cat !== null);
  }

  /**
   * Verifica se há benchmarks cadastrados
   */
  async verificarBenchmarksDisponiveis(): Promise<{
    total: number;
    porCategoria: Record<string, number>;
    categorias: string[];
    temDados: boolean;
  }> {
    const todosBenchmarks = await prisma.benchmarkSetor.findMany({
      where: { ativo: true },
    });

    const porCategoria = todosBenchmarks.reduce((acc, b) => {
      const cat = b.categoria || 'Geral';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categorias = Object.keys(porCategoria);

    return {
      total: todosBenchmarks.length,
      porCategoria,
      categorias,
      temDados: todosBenchmarks.length > 0,
    };
  }
}

