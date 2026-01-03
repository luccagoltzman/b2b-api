import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Routes
import dashboardRoutes from './routes/dashboard.routes';
import propostaRoutes from './routes/proposta.routes';
import visitaRoutes from './routes/visita.routes';
import analiseRoutes from './routes/analise.routes';
import posVendaRoutes from './routes/posVenda.routes';
import mercadoRoutes from './routes/mercado.routes';
import infopriceRoutes from './routes/infoprice.routes';
import tabelaProdutoRoutes from './routes/tabela-produto.routes';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/propostas', propostaRoutes);
app.use('/api/visitas', visitaRoutes);
app.use('/api/analises', analiseRoutes);
app.use('/api/pos-venda', posVendaRoutes);
app.use('/api/mercado', mercadoRoutes);
app.use('/api/infoprice', infopriceRoutes);
app.use('/api/tabelas-produtos', tabelaProdutoRoutes);

// Error handler (deve ser o último middleware)
app.use(errorHandler);

// Iniciar servidor
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${config.nodeEnv}`);
  console.log(`🌐 CORS habilitado para: ${config.corsOrigin}`);
  if (!config.openaiApiKey) {
    console.warn('⚠️  OPENAI_API_KEY não configurada');
  }
});

export default app;

