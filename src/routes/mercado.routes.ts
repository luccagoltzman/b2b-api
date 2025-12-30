import { Router } from 'express';
import { MercadoController } from '../controllers/mercado.controller';

const router = Router();
const mercadoController = new MercadoController();

// Preços de Mercado
router.get('/precos', mercadoController.obterPrecos);
router.post('/precos', mercadoController.cadastrarPreco);

// Produtos Mais Vendidos por Região
router.get('/produtos-vendidos', mercadoController.obterProdutosVendidos);
router.post('/produtos-vendidos', mercadoController.cadastrarProdutoVendido);

// Produtos Mais Pedidos por Supermercados
router.get('/produtos-pedidos', mercadoController.obterProdutosPedidos);
router.post('/produtos-pedidos', mercadoController.cadastrarProdutoPedido);

// Benchmarks do Setor
router.get('/benchmarks', mercadoController.obterBenchmarks);
router.get('/benchmarks/status', mercadoController.verificarStatusBenchmarks);
router.post('/benchmarks', mercadoController.cadastrarBenchmark);

export default router;

