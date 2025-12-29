import { Router } from 'express';
import { PropostaController } from '../controllers/proposta.controller';
import { AnaliseController } from '../controllers/analise.controller';

const router = Router();
const propostaController = new PropostaController();
const analiseController = new AnaliseController();

router.get('/', propostaController.listar);
router.get('/:id', propostaController.buscarPorId);
router.post('/gerar-com-ia', analiseController.gerarPropostaComIA);
router.post('/', propostaController.criar);
router.post('/:id/status', propostaController.atualizarStatus);
router.put('/:id', propostaController.atualizar);
router.delete('/:id', propostaController.deletar);

export default router;
