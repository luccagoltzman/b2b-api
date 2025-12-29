export type PropostaStatus = 'pendente' | 'aprovada' | 'rejeitada' | 'enviada';
export type VisitaStatus = 'agendada' | 'realizada' | 'cancelada' | 'reagendada';
export type AtividadeType = 'visita' | 'proposta' | 'analise';

export interface Proposta {
  id: string;
  cliente: string;
  valor: number;
  status: PropostaStatus;
  dataCriacao: string;
  dataVencimento: string;
  descricao?: string;
  observacoes?: string;
}

export interface Visita {
  id: string;
  cliente: string;
  data: string;
  hora: string;
  status: VisitaStatus;
  endereco?: string;
  observacoes?: string;
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

