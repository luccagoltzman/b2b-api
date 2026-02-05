import { Request, Response, NextFunction } from 'express';
import { OpenAIService } from '../services/openai.service';
import { ClienteService } from '../services/cliente.service';
import { z } from 'zod';

const propostaPorPromptSchema = z.object({
  prompt: z.string().min(1, 'O campo prompt é obrigatório'),
});

export class IAController {
  private openaiService: OpenAIService;
  private clienteService: ClienteService;

  constructor() {
    this.openaiService = OpenAIService.getInstance();
    this.clienteService = new ClienteService();
  }

  /**
   * POST /api/ia/proposta-por-prompt
   * Interpreta o prompt com IA e retorna dados estruturados para criar tabela e opcionalmente enviar.
   */
  propostaPorPrompt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt } = propostaPorPromptSchema.parse(req.body);

      const resultado = await this.openaiService.propostaPorPrompt(prompt);

      // Opcional: buscar cliente no cadastro por nome para preencher clienteId
      try {
        const clientes = await this.clienteService.listar();
        const nomeNormalizado = resultado.cliente.trim().toLowerCase();
        const encontrado = clientes.find(
          (c) => c.nome.trim().toLowerCase() === nomeNormalizado
            || c.nome.trim().toLowerCase().includes(nomeNormalizado)
            || nomeNormalizado.includes(c.nome.trim().toLowerCase())
        );
        if (encontrado) {
          (resultado as { clienteId?: string }).clienteId = encontrado.id;
        }
      } catch {
        // Ignora erro ao listar clientes (ex.: tabela não existir)
      }

      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };
}
