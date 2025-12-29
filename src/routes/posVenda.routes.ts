import { Router } from 'express';
import { PosVendaController } from '../controllers/posVenda.controller';

const router = Router();
const posVendaController = new PosVendaController();

router.post('/analisar-saida', posVendaController.analisarSaida);
router.get('/historico/:propostaId', posVendaController.obterHistorico);

export default router;

