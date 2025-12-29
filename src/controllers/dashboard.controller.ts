import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AppError } from '../middleware/errorHandler';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  obterEstatisticas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.dashboardService.obterEstatisticas();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  obterAtividades = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limite = parseInt(req.query.limite as string) || 10;
      const atividades = await this.dashboardService.obterAtividadesRecentes(limite);
      res.json(atividades);
    } catch (error) {
      next(error);
    }
  };

  obterSugestoes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sugestoes = await this.dashboardService.obterSugestoes();
      res.json({ sugestoes });
    } catch (error) {
      next(error);
    }
  };
}

