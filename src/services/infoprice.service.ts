import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config/env';

interface InfoPriceToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  expires_at: Date;
}

interface InfoPriceRelatorioItem {
  data: string;
  loja: string;
  produto: string;
  produto_descricao: string;
  preco_varejo: number | null;
  preco_atacado: number | null;
  gatilho_atacado: number | null;
  rebaixa_preco: boolean | null;
  promocao: boolean | null;
  tipo_promocao: string | null;
  clube_desconto: string | null;
  preco_de: number | null;
  preco_por: number | null;
  data_validade: string | null;
  auditoria: string | null;
  range_precos: {
    preco_maximo: number;
    preco_minimo: number;
    sugestao_expurgo: boolean;
  } | null;
  sugestao: any | null;
  data_processamento: string;
}

interface InfoPriceRelatorioResponse {
  content: InfoPriceRelatorioItem[];
  last: boolean;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  sort: any;
  first: boolean;
  size: number;
  number: number;
}

export class InfoPriceService {
  private static instance: InfoPriceService;
  private token: InfoPriceToken | null = null;
  private axiosInstance: AxiosInstance;
  private username: string;
  private password: string;
  private staticToken: string;

  private constructor() {
    this.username = process.env.INFOPRICE_USERNAME || '';
    this.password = process.env.INFOPRICE_PASSWORD || '';
    this.staticToken = process.env.INFOPRICE_STATIC_TOKEN || '';

    this.axiosInstance = axios.create({
      baseURL: 'https://api.infopriceti.com.br',
      timeout: 30000,
    });

    // Interceptor para adicionar token automaticamente
    this.axiosInstance.interceptors.request.use(async (config) => {
      if (!this.token || this.isTokenExpired()) {
        await this.obterToken();
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token.access_token}`;
      }
      return config;
    });
  }

  static getInstance(): InfoPriceService {
    if (!InfoPriceService.instance) {
      InfoPriceService.instance = new InfoPriceService();
    }
    return InfoPriceService.instance;
  }

  /**
   * Verifica se o token está expirado
   */
  private isTokenExpired(): boolean {
    if (!this.token || !this.token.expires_at) {
      return true;
    }
    // Renovar 5 minutos antes de expirar
    const now = new Date();
    const expiresAt = new Date(this.token.expires_at);
    expiresAt.setMinutes(expiresAt.getMinutes() - 5);
    return now >= expiresAt;
  }

  /**
   * Criptografa senha no padrão SHA512
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha512').update(password).digest('hex');
  }

  /**
   * Obtém token de autenticação da InfoPrice
   */
  async obterToken(): Promise<InfoPriceToken> {
    if (!this.username || !this.password || !this.staticToken) {
      throw new Error('Credenciais InfoPrice não configuradas. Configure INFOPRICE_USERNAME, INFOPRICE_PASSWORD e INFOPRICE_STATIC_TOKEN no .env');
    }

    try {
      const senhaHash = this.hashPassword(this.password);

      const response = await axios.post(
        'https://api.infopriceti.com.br/portal-acesso-web/oauth/token',
        null,
        {
          params: {
            grant_type: 'password',
            username: this.username,
            password: senhaHash,
          },
          headers: {
            Authorization: `Basic ${this.staticToken}`,
          },
        }
      );

      const tokenData = response.data;
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      this.token = {
        ...tokenData,
        expires_at: expiresAt,
      };

      return this.token!; // Non-null assertion: token foi atribuído acima
    } catch (error: any) {
      console.error('Erro ao obter token InfoPrice:', error.response?.data || error.message);
      throw new Error(`Erro ao autenticar na InfoPrice: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Busca relatório de preços por data de coleta
   */
  async buscarRelatorioPorDataColeta(
    dataInicio: string,
    dataFim: string,
    page: number = 0
  ): Promise<InfoPriceRelatorioResponse> {
    try {
      // Garantir que o token está válido
      if (!this.token || this.isTokenExpired()) {
        await this.obterToken();
      }

      const response = await this.axiosInstance.get('/integracao/v2/relatorio', {
        params: {
          dataInicio,
          dataFim,
          page,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar relatório InfoPrice:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar relatório: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Busca todos os dados de um período (itera por todas as páginas)
   */
  async buscarTodosDadosPeriodo(
    dataInicio: string,
    dataFim: string
  ): Promise<InfoPriceRelatorioItem[]> {
    const todosDados: InfoPriceRelatorioItem[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.buscarRelatorioPorDataColeta(dataInicio, dataFim, page);
      todosDados.push(...response.content);
      hasMore = !response.last;
      page++;

      // Limite de segurança para evitar loops infinitos
      if (page > 1000) {
        console.warn('Limite de páginas atingido. Parando busca.');
        break;
      }
    }

    return todosDados;
  }

  /**
   * Busca dados dos últimos N dias
   */
  async buscarDadosUltimosDias(dias: number = 7): Promise<InfoPriceRelatorioItem[]> {
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const dataInicioStr = this.formatarData(dataInicio);
    const dataFimStr = this.formatarData(dataFim);

    return await this.buscarTodosDadosPeriodo(dataInicioStr, dataFimStr);
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

  /**
   * Verifica se as credenciais estão configuradas
   */
  isConfigurado(): boolean {
    return !!(this.username && this.password && this.staticToken);
  }
}

