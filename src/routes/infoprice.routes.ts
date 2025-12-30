import { Router } from 'express';
import { InfoPriceController } from '../controllers/infoprice.controller';

const router = Router();
const infopriceController = new InfoPriceController();

// Verificar configuração
router.get('/configuracao', infopriceController.verificarConfiguracao);

// Testar autenticação
router.post('/testar-autenticacao', infopriceController.testarAutenticacao);

// Buscar relatório
router.get('/relatorio', infopriceController.buscarRelatorio);

// Sincronizar dados
router.post('/sincronizar', infopriceController.sincronizarDados);
router.post('/sincronizar/ultimos-dias', infopriceController.sincronizarUltimosDias);

export default router;

