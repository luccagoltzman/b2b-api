import { Router } from 'express';
import { ClienteController } from '../controllers/cliente.controller';

const router = Router();
const clienteController = new ClienteController();

router.get('/', clienteController.listar);
router.get('/:id', clienteController.buscarPorId);
router.post('/', clienteController.criar);
router.put('/:id', clienteController.atualizar);
router.delete('/:id', clienteController.deletar);

export default router;
