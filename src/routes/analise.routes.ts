import { Router } from 'express';
import { AnaliseController } from '../controllers/analise.controller';

const router = Router();
const analiseController = new AnaliseController();

router.post('/gerar', analiseController.gerarAnalise);

export default router;

