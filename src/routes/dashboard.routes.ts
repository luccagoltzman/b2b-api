import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

router.get('/stats', dashboardController.obterEstatisticas);
router.get('/activities', dashboardController.obterAtividades);
router.get('/sugestoes', dashboardController.obterSugestoes);

export default router;

