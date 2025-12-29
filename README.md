# B2B API - Sistema de Representantes Comerciais

Backend completo para um sistema B2B de representantes comerciais que negociam com grandes redes de supermercados.

## 🚀 Tecnologias

- **Node.js** com **TypeScript**
- **Express** - Framework web
- **Prisma** - ORM para MySQL
- **MySQL** - Banco de dados
- **OpenAI API** - Integração com ChatGPT para análises inteligentes
- **Zod** - Validação de dados

## 📋 Pré-requisitos

- Node.js 18+ instalado
- MySQL instalado e rodando
- Conta OpenAI com API Key

## 🔧 Instalação

1. **Clone o repositório** (se aplicável) ou navegue até a pasta do projeto

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   
   Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
   ```env
   PORT=5000
   DATABASE_URL="mysql://usuario:senha@localhost:3306/b2b_db"
   OPENAI_API_KEY=sua_chave_api_openai_aqui
   NODE_ENV=development
   ```

   **Importante:** Substitua:
   - `usuario` e `senha` pelas credenciais do seu MySQL
   - `b2b_db` pelo nome do banco de dados que deseja usar (crie o banco antes se não existir)
   - `sua_chave_api_openai_aqui` pela sua chave da API OpenAI

4. **Configure o banco de dados:**
   ```bash
   # Gerar o cliente Prisma
   npm run prisma:generate
   
   # Executar as migrações
   npm run prisma:migrate
   ```

## 🏃 Executando o Projeto

### Modo Desenvolvimento
```bash
npm run dev
```

O servidor estará rodando em `http://localhost:5000`

### Modo Produção
```bash
# Compilar TypeScript
npm run build

# Iniciar servidor
npm start
```

## 📚 Estrutura do Projeto

```
b2b-api/
├── src/
│   ├── config/          # Configurações (env, etc)
│   ├── controllers/     # Controllers das rotas
│   ├── lib/             # Bibliotecas (Prisma client)
│   ├── middleware/      # Middlewares (error handler, validation)
│   ├── routes/          # Definição das rotas
│   ├── services/        # Lógica de negócio
│   ├── types/           # Tipos TypeScript
│   └── server.ts        # Arquivo principal
├── prisma/
│   └── schema.prisma    # Schema do banco de dados
├── .env                 # Variáveis de ambiente (não versionado)
├── .env.example         # Exemplo de variáveis de ambiente
├── package.json
└── tsconfig.json
```

## 🔌 Endpoints da API

### Dashboard

- **GET** `/api/dashboard/stats`
  - Retorna estatísticas agregadas (total de visitas, taxa de conversão, propostas pendentes, receita mensal)

- **GET** `/api/dashboard/activities?limite=10`
  - Retorna últimas atividades recentes (padrão: 10)

- **GET** `/api/dashboard/sugestoes`
  - Retorna sugestões inteligentes baseadas em dados históricos

### Propostas

- **GET** `/api/propostas`
  - Lista todas as propostas

- **GET** `/api/propostas/:id`
  - Busca uma proposta por ID

- **POST** `/api/propostas`
  - Cria uma nova proposta
  - Body:
    ```json
    {
      "cliente": "string",
      "valor": number,
      "dataVencimento": "YYYY-MM-DD",
      "status": "pendente" | "aprovada" | "rejeitada" | "enviada",
      "descricao": "string (opcional)",
      "observacoes": "string (opcional)"
    }
    ```

- **PUT** `/api/propostas/:id`
  - Atualiza uma proposta existente
  - Body: Mesmos campos do POST (todos opcionais)

- **DELETE** `/api/propostas/:id`
  - Deleta uma proposta

- **POST** `/api/propostas/gerar-com-ia`
  - Gera uma proposta completa usando IA
  - Body:
    ```json
    {
      "cliente": "string",
      "valor": number (opcional),
      "contexto": "string (opcional)"
    }
    ```

### Visitas

- **GET** `/api/visitas`
  - Lista todas as visitas

- **GET** `/api/visitas/:id`
  - Busca uma visita por ID

- **POST** `/api/visitas`
  - Cria uma nova visita
  - Body:
    ```json
    {
      "cliente": "string",
      "data": "YYYY-MM-DD",
      "hora": "HH:MM",
      "status": "agendada" | "realizada" | "cancelada" | "reagendada",
      "endereco": "string (opcional)",
      "observacoes": "string (opcional)"
    }
    ```

- **PUT** `/api/visitas/:id`
  - Atualiza uma visita existente
  - Body: Mesmos campos do POST (todos opcionais)

- **DELETE** `/api/visitas/:id`
  - Deleta uma visita

### Análises com IA

- **POST** `/api/analises/gerar`
  - Gera análises inteligentes usando OpenAI
  - Body:
    ```json
    {
      "tipo": "performance" | "concorrencia" | "tendencia" | "oportunidade",
      "dados": "string com os dados para análise"
    }
    ```
  - Retorna:
    ```json
    {
      "resultado": "string com a análise gerada"
    }
    ```

## 🛠️ Scripts Disponíveis

- `npm run dev` - Inicia o servidor em modo desenvolvimento com hot-reload
- `npm run build` - Compila o TypeScript para JavaScript
- `npm start` - Inicia o servidor em modo produção
- `npm run prisma:generate` - Gera o cliente Prisma
- `npm run prisma:migrate` - Executa migrações do banco de dados
- `npm run prisma:studio` - Abre o Prisma Studio (interface visual do banco)

## 🔒 Segurança

- Todas as validações de entrada são feitas usando Zod
- Tratamento de erros centralizado
- CORS configurado para aceitar apenas requisições de `http://localhost:3000` (configurável via `.env`)
- Variáveis sensíveis (como API keys) devem estar no arquivo `.env` (não versionado)

## 📝 Modelos de Dados

### Proposta
- `id`: UUID
- `cliente`: String
- `valor`: Float
- `status`: 'pendente' | 'aprovada' | 'rejeitada' | 'enviada'
- `dataCriacao`: DateTime
- `dataVencimento`: DateTime
- `descricao`: String (opcional)
- `observacoes`: String (opcional)

### Visita
- `id`: UUID
- `cliente`: String
- `data`: DateTime
- `hora`: String
- `status`: 'agendada' | 'realizada' | 'cancelada' | 'reagendada'
- `endereco`: String (opcional)
- `observacoes`: String (opcional)

### Atividade
- `id`: UUID
- `type`: 'visita' | 'proposta' | 'analise'
- `description`: String
- `timestamp`: DateTime
- `status`: String

## 🤖 Integração com OpenAI

O sistema utiliza a API da OpenAI para:

1. **Análises Inteligentes**: Gera análises contextuais de performance, concorrência, tendências e oportunidades
2. **Geração de Propostas**: Cria propostas comerciais completas baseadas em dados básicos

**Tipos de Análise:**
- **Performance**: Analisa dados de vendas, visitas e conversões
- **Concorrência**: Compara com mercado e concorrentes
- **Tendências**: Identifica padrões e tendências futuras
- **Oportunidades**: Sugere oportunidades de negócio

## 🐛 Tratamento de Erros

Todos os erros retornam no formato:
```json
{
  "error": "Mensagem de erro",
  "code": "CODIGO_DO_ERRO"
}
```

Códigos de status HTTP:
- `200` - Sucesso
- `201` - Criado com sucesso
- `204` - Sucesso sem conteúdo
- `400` - Erro de validação
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor

## 📦 Dependências Principais

- `express` - Framework web
- `@prisma/client` - Cliente Prisma
- `prisma` - ORM e ferramentas
- `openai` - SDK da OpenAI
- `zod` - Validação de schemas
- `cors` - Middleware CORS
- `dotenv` - Gerenciamento de variáveis de ambiente

## 🚧 Desenvolvimento Futuro

- Autenticação e autorização
- Rate limiting
- Logging avançado
- Testes automatizados
- Documentação com Swagger/OpenAPI
- Cache para melhor performance
- Webhooks para integrações

## 📄 Licença

ISC

## 👥 Contribuindo

Este é um projeto privado. Para sugestões ou problemas, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para otimizar a gestão de representantes comerciais B2B**
