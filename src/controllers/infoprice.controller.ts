import { Request, Response, NextFunction } from 'express';
import { InfoPriceService } from '../services/infoprice.service';
import { InfoPriceSyncService } from '../services/infoprice-sync.service';
import { AppError } from '../middleware/errorHandler';
import { z, ZodError } from 'zod';

const sincronizarSchema = z.object({
  dataInicio: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'Data deve estar no formato yyyy/MM/dd'),
  dataFim: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'Data deve estar no formato yyyy/MM/dd'),
});

const sincronizarDiasSchema = z.object({
  dias: z.number().int().min(1).max(90).optional().default(7),
});

export class InfoPriceController {
  private infoPriceService: InfoPriceService;
  private syncService: InfoPriceSyncService;

  constructor() {
    this.infoPriceService = InfoPriceService.getInstance();
    this.syncService = new InfoPriceSyncService();
  }

  /**
   * Verifica se a integração está configurada
   */
  verificarConfiguracao = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configurado = this.infoPriceService.isConfigurado();
      res.json({
        configurado,
        mensagem: configurado
          ? 'InfoPrice está configurado e pronto para uso'
          : 'InfoPrice não está configurado. Configure INFOPRICE_USERNAME, INFOPRICE_PASSWORD e INFOPRICE_STATIC_TOKEN no .env',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Testa a autenticação na InfoPrice
   */
  testarAutenticacao = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = await this.infoPriceService.obterToken();
      res.json({
        sucesso: true,
        token_type: token.token_type,
        expires_in: token.expires_in,
        expires_at: token.expires_at,
        mensagem: 'Autenticação realizada com sucesso',
      });
    } catch (error: any) {
      throw new AppError(
        `Erro ao autenticar na InfoPrice: ${error.message}`,
        'INFOPRICE_AUTH_ERROR',
        401
      );
    }
  };

  /**
   * Busca relatório de preços
   */
  buscarRelatorio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dataInicio, dataFim, page } = req.query;

      if (!dataInicio || !dataFim) {
        throw new AppError(
          'Parâmetros dataInicio e dataFim são obrigatórios (formato: yyyy/MM/dd)',
          'VALIDATION_ERROR',
          400
        );
      }

      const pageNumber = page ? parseInt(page as string, 10) : 0;
      const relatorio = await this.infoPriceService.buscarRelatorioPorDataColeta(
        dataInicio as string,
        dataFim as string,
        pageNumber
      );

      res.json(relatorio);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Sincroniza dados da InfoPrice com o banco local
   */
  sincronizarDados = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = sincronizarSchema.parse(req.body);
      const resultado = await this.syncService.sincronizarDados(
        dados.dataInicio,
        dados.dataFim
      );

      res.json({
        sucesso: true,
        ...resultado,
        mensagem: `Sincronização concluída: ${resultado.precosCadastrados} preços e ${resultado.benchmarksCadastrados || 0} benchmarks cadastrados de ${resultado.totalProcessados} itens processados`,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map(e => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos inválidos: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }
      next(error);
    }
  };

  /**
   * Sincroniza dados dos últimos N dias
   */
  sincronizarUltimosDias = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = sincronizarDiasSchema.parse(req.body);
      const resultado = await this.syncService.sincronizarUltimosDias(dados.dias);

      res.json({
        sucesso: true,
        ...resultado,
        dias: dados.dias,
        mensagem: `Sincronização concluída: ${resultado.precosCadastrados} preços e ${resultado.benchmarksCadastrados || 0} benchmarks cadastrados de ${resultado.totalProcessados} itens processados`,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map(e => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos inválidos: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }
      next(error);
    }
  };
}

