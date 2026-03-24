import { Router } from 'express';
import { ProdutoController } from '../controllers/produto.controller';

const router = Router();
const produtoController = new ProdutoController();

router.get('/', produtoController.listar);
router.get('/:id', produtoController.buscarPorId);

// multipart/form-data
router.post(
  '/',
  produtoController.getUploadMiddleware(),
  produtoController.criar
);
router.put(
  '/:id',
  produtoController.getUploadMiddleware(),
  produtoController.atualizar
);
router.delete('/:id', produtoController.deletar);

export default router;

