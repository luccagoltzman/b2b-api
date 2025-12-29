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

export interface Proposta {
  id: string;
  cliente: string;
  valor: number;
  status: PropostaStatus;
  dataCriacao: string;
  dataVencimento: string;
  descricao?: string;
  observacoes?: string;
  
  // Novos campos - Informações do Produto
  produto?: string;
  marca?: string;
  categoria?: string;
  unidadeMedida?: UnidadeMedida;
  
  // Novos campos - Valores e Quantidades
  valorUnitario?: number;
  quantidade?: number;
  desconto?: number;
  descontoTipo?: DescontoTipo;
  
  // Novos campos - Condições Comerciais
  condicoesPagamento?: string;
  prazoEntrega?: string;
  
  // Novos campos - Estratégia de Representação
  estrategiaRepresentacao?: string;
  publicoAlvo?: string;
  diferenciaisCompetitivos?: string;
  
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

