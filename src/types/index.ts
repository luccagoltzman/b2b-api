export type PropostaStatus = 
  | 'rascunho' 
  | 'pendente' 
  | 'enviada' 
  | 'em_analise_gerente_compras' 
  | 'em_analise_diretoria' 
  | 'aprovada' 
  | 'rejeitada' 
  | 'cancelada';

export type VisitaStatus = 
  | 'agendada' 
  | 'confirmada' 
  | 'em_andamento' 
  | 'realizada' 
  | 'cancelada' 
  | 'reagendada';

export type AtividadeType = 'visita' | 'proposta' | 'analise';

export interface Checkpoint {
  id: string;
  status: string;
  label: string;
  descricao?: string;
  data: string;
  usuario?: string;
}

export type UnidadeMedida = 
  | 'unidade' 
  | 'kg' 
  | 'g' 
  | 'litro' 
  | 'ml' 
  | 'caixa' 
  | 'pacote' 
  | 'fardo' 
  | 'duzia' 
  | 'metro' 
  | 'outro';

export type DescontoTipo = 'percentual' | 'valor';

export type TipoPedido = 'venda' | 'cotacao' | 'orcamento';

export type ApresentacaoTipo = 'imagem' | 'pdf';

export interface Cliente {
  id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  inscricaoEstadual?: string | null;
}

export interface Produto {
  id: string;
  produto: string;
  produtoCodigo?: string | null;
  marca: string;
  categoria?: string | null;
  unidadeMedida: string;
  valorUnitario: number;
  aliquotaIpi?: number | null;

  apresentacaoTipo?: ApresentacaoTipo | null;
  apresentacaoUrl?: string | null;
  apresentacaoNome?: string | null;
}

export interface Proposta {
  id: string;
  cliente: string;
  valor: number;
  status: PropostaStatus;
  dataCriacao: string;
  dataVencimento: string;
  descricao?: string;
  observacoes?: string;
  
  // Campos - Informações do Produto
  produto?: string;
  marca?: string;
  categoria?: string;
  unidadeMedida?: UnidadeMedida;
  produtoCodigo?: string;
  aliquotaIpi?: number;
  
  // Campos - Valores e Quantidades
  valorUnitario?: number;
  quantidade?: number;
  desconto?: number;
  descontoTipo?: DescontoTipo;
  valorFrete?: number;
  
  // Campos - Condições Comerciais
  condicoesPagamento?: string;
  prazoEntrega?: string;
  tipoPedido?: TipoPedido;
  transportadora?: string;
  informacoesAdicionais?: string;
  
  // Campos - Estratégia de Representação
  estrategiaRepresentacao?: string;
  publicoAlvo?: string;
  diferenciaisCompetitivos?: string;
  
  // Campos - Informações do Cliente
  clienteCnpj?: string;
  clienteEndereco?: string;
  clienteNumero?: string;
  clienteBairro?: string;
  clienteCidade?: string;
  clienteCep?: string;
  clienteEstado?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  clienteNomeFantasia?: string;
  
  // Campos - Dados de Compra (Pós-Venda)
  quantidadeAdquirida?: number;
  valorCompra?: number;
  
  // Campos - Associação com Tabela de Produtos (Simular Retorno)
  tabelaId?: string;
  geradaAutomaticamente?: boolean;
  
  checkpoints?: Checkpoint[];
}

export interface Visita {
  id: string;
  cliente: string;
  data: string;
  hora: string;
  status: VisitaStatus;
  endereco?: string;
  observacoes?: string;
  checkpoints?: Checkpoint[];
}

export interface Atividade {
  id: string;
  type: AtividadeType;
  description: string;
  timestamp: string;
  status: string;
}

export interface DashboardStats {
  totalVisitas: number;
  taxaConversao: number;
  propostasPendentes: number;
  receitaMensal: number;
}

export interface AnaliseRequest {
  tipo: 'performance' | 'concorrencia' | 'tendencia' | 'oportunidade';
  dados: string;
}

export interface AnaliseResponse {
  resultado: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
}

