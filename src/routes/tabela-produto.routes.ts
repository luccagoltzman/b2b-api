import { Router } from 'express';
import { TabelaProdutoController } from '../controllers/tabela-produto.controller';

const router = Router();
const tabelaProdutoController = new TabelaProdutoController();

router.get('/', tabelaProdutoController.listar);
router.get('/:id', tabelaProdutoController.buscarPorId);
router.post('/', tabelaProdutoController.criar);
router.put('/:id', tabelaProdutoController.atualizar);
router.delete('/:id', tabelaProdutoController.deletar);
router.post('/:id/enviar', tabelaProdutoController.enviar);
router.post('/:id/gerar-proposta', tabelaProdutoController.gerarProposta);

export default router;
