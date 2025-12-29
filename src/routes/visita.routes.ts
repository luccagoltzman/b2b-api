import { Router } from 'express';
import { VisitaController } from '../controllers/visita.controller';

const router = Router();
const visitaController = new VisitaController();

router.get('/', visitaController.listar);
router.get('/:id', visitaController.buscarPorId);
router.post('/', visitaController.criar);
router.put('/:id', visitaController.atualizar);
router.delete('/:id', visitaController.deletar);

export default router;

