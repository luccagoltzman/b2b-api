import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ProdutoService } from '../services/produto.service';
import { AppError } from '../middleware/errorHandler';
import { ApresentacaoTipo } from '../types';

const optionalTrimString = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return t === '' ? undefined : t;
  },
  z.string().min(1).optional(),
);

const optionalCoerceNumber = (min: number, max?: number) =>
  z.preprocess(
    (v) => {
      if (v === undefined || v === null) return v;
      if (typeof v === 'string' && v.trim() === '') return undefined;
      return v;
    },
    max !== undefined
      ? z.coerce.number().min(min).max(max).optional()
      : z.coerce.number().min(min).optional(),
  );

const produtoBaseSchema = z.object({
  produto: z.string().min(1, 'Produto é obrigatório'),
  produtoCodigo: optionalTrimString,
  marca: z.string().min(1, 'Marca é obrigatória'),
  categoria: optionalTrimString,
  unidadeMedida: z.string().min(1, 'Unidade de medida é obrigatória'),
  valorUnitario: z.coerce.number().positive('Valor unitário deve ser maior que zero'),
  aliquotaIpi: optionalCoerceNumber(0, 100),
});

const produtoCreateSchema = produtoBaseSchema;
const produtoUpdateSchema = produtoBaseSchema.partial();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const okImage = file.mimetype.startsWith('image/');
    const okPdf = file.mimetype === 'application/pdf';
    if (!okImage && !okPdf) {
      return cb(new AppError('apresentacaoArquivo deve ser image/* ou application/pdf', 'VALIDATION_ERROR', 400));
    }
    cb(null, true);
  },
});

export class ProdutoController {
  private produtoService: ProdutoService;

  constructor() {
    this.produtoService = new ProdutoService();
  }

  /**
   * Para usar o middleware de upload no router.
   */
  getUploadMiddleware() {
    return upload.single('apresentacaoArquivo');
  }

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const produtos = await this.produtoService.listar();
      res.json(produtos);
    } catch (error) {
      next(error);
    }
  };

  buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const produto = await this.produtoService.buscarPorId(id);
      if (!produto) throw new AppError('Produto não encontrado', 'NOT_FOUND', 404);
      res.json(produto);
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = produtoCreateSchema.parse(req.body);
      const produtoCriado = await this.produtoService.criar({
        produto: dados.produto.trim(),
        produtoCodigo: dados.produtoCodigo?.trim(),
        marca: dados.marca.trim(),
        categoria: dados.categoria?.trim(),
        unidadeMedida: dados.unidadeMedida.trim(),
        valorUnitario: dados.valorUnitario,
        aliquotaIpi: dados.aliquotaIpi,
      });

      const file = (req as any).file as Express.Multer.File | undefined;
      if (file) {
        const apresentacao = this.salvarApresentacaoArquivo(produtoCriado.id, file);
        const produtoAtualizado = await this.produtoService.atualizar(produtoCriado.id, {
          apresentacaoTipo: apresentacao.apresentacaoTipo,
          apresentacaoUrl: apresentacao.apresentacaoUrl,
          apresentacaoNome: apresentacao.apresentacaoNome,
        });
        res.status(201).json(produtoAtualizado);
      } else {
        res.status(201).json(produtoCriado);
      }
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const produtoAtual = await this.produtoService.buscarPorId(id);
      if (!produtoAtual) throw new AppError('Produto não encontrado', 'NOT_FOUND', 404);

      const remover =
        typeof req.body.apresentacaoRemover === 'string' && req.body.apresentacaoRemover === 'true';

      const dadosParciais = produtoUpdateSchema.parse(req.body);

      const file = (req as any).file as Express.Multer.File | undefined;

      // 1) Remover apresentação se solicitado
      if (remover) {
        this.removerApresentacaoPorProdutoId(produtoAtual.id);
        await this.produtoService.atualizar(produtoAtual.id, {
          apresentacaoTipo: null,
          apresentacaoUrl: null,
          apresentacaoNome: null,
        });
      }

      // 2) Salvar/substituir apresentação se arquivo veio
      if (file) {
        this.removerApresentacaoPorProdutoId(produtoAtual.id);
        const apresentacao = this.salvarApresentacaoArquivo(produtoAtual.id, file);
        const produtoAtualizado = await this.produtoService.atualizar(produtoAtual.id, {
          ...(dadosParciais.produto !== undefined && { produto: dadosParciais.produto.trim() }),
          ...(dadosParciais.produtoCodigo !== undefined && {
            produtoCodigo: dadosParciais.produtoCodigo?.trim() || null,
          }),
          ...(dadosParciais.marca !== undefined && { marca: dadosParciais.marca.trim() }),
          ...(dadosParciais.categoria !== undefined && {
            categoria: dadosParciais.categoria?.trim() || null,
          }),
          ...(dadosParciais.unidadeMedida !== undefined && {
            unidadeMedida: dadosParciais.unidadeMedida.trim(),
          }),
          ...(dadosParciais.valorUnitario !== undefined && { valorUnitario: dadosParciais.valorUnitario }),
          ...(dadosParciais.aliquotaIpi !== undefined && { aliquotaIpi: dadosParciais.aliquotaIpi ?? null }),
          apresentacaoTipo: apresentacao.apresentacaoTipo,
          apresentacaoUrl: apresentacao.apresentacaoUrl,
          apresentacaoNome: apresentacao.apresentacaoNome,
        });
        res.json(produtoAtualizado);
        return;
      }

      // 3) Apenas atualizar dados sem mexer na apresentação
      const produtoAtualizado = await this.produtoService.atualizar(produtoAtual.id, {
        ...(dadosParciais.produto !== undefined && { produto: dadosParciais.produto.trim() }),
        ...(dadosParciais.produtoCodigo !== undefined && {
          produtoCodigo: dadosParciais.produtoCodigo?.trim() || null,
        }),
        ...(dadosParciais.marca !== undefined && { marca: dadosParciais.marca.trim() }),
        ...(dadosParciais.categoria !== undefined && {
          categoria: dadosParciais.categoria?.trim() || null,
        }),
        ...(dadosParciais.unidadeMedida !== undefined && {
          unidadeMedida: dadosParciais.unidadeMedida.trim(),
        }),
        ...(dadosParciais.valorUnitario !== undefined && { valorUnitario: dadosParciais.valorUnitario }),
        ...(dadosParciais.aliquotaIpi !== undefined && { aliquotaIpi: dadosParciais.aliquotaIpi ?? null }),
      });

      res.json(produtoAtualizado);
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const produtoAtual = await this.produtoService.buscarPorId(id);
      if (!produtoAtual) throw new AppError('Produto não encontrado', 'NOT_FOUND', 404);

      this.removerApresentacaoPorProdutoId(produtoAtual.id);
      await this.produtoService.deletar(produtoAtual.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  private salvarApresentacaoArquivo(
    produtoId: string,
    file: Express.Multer.File
  ): { apresentacaoTipo: ApresentacaoTipo; apresentacaoUrl: string; apresentacaoNome: string } {
    const tipo: ApresentacaoTipo = file.mimetype.startsWith('image/') ? 'imagem' : 'pdf';

    const uploadsDir = path.join(process.cwd(), 'uploads', 'produtos', produtoId);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(file.originalname) || (tipo === 'pdf' ? '.pdf' : '.img');
    const safeExt = ext.toLowerCase();
    const filename = `${Date.now()}_${produtoId}${safeExt}`;
    const diskPath = path.join(uploadsDir, filename);

    fs.writeFileSync(diskPath, file.buffer);

    return {
      apresentacaoTipo: tipo,
      apresentacaoUrl: `/uploads/produtos/${produtoId}/${filename}`,
      apresentacaoNome: file.originalname,
    };
  }

  private removerApresentacaoPorProdutoId(produtoId: string) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'produtos', produtoId);
    try {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    } catch {
      // Não bloquear a operação se arquivo/pasta já não existir
    }
  }
}

export const produtoUploadMiddleware = new ProdutoController().getUploadMiddleware();

