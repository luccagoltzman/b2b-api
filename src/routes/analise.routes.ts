import { Router } from 'express';
import { AnaliseController } from '../controllers/analise.controller';

const router = Router();
const analiseController = new AnaliseController();

router.post('/gerar', analiseController.gerarAnalise);
router.get('/produtos/insights', analiseController.obterInsightsProdutos);
router.post('/produtos/analisar', analiseController.analisarProduto);

export default router;

