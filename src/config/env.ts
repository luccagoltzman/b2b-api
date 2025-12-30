import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  infopriceUsername: process.env.INFOPRICE_USERNAME || '',
  infopricePassword: process.env.INFOPRICE_PASSWORD || '',
  infopriceStaticToken: process.env.INFOPRICE_STATIC_TOKEN || '',
};

if (!config.openaiApiKey) {
  console.warn('⚠️  OPENAI_API_KEY não configurada. Funcionalidades de IA não estarão disponíveis.');
}

