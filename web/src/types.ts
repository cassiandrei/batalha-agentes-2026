// S2: catálogo de ações do agente. Os botões da mensagem vêm daqui, não do front.
export type TipoAcao =
  | 'abrir_visao_financeira'
  | 'abrir_fatura'
  | 'abrir_simulacao_t01'
  | 'abrir_simulacao_t02'
  | 'falar_com_pessoa';

export interface AcaoAgente {
  tipo: TipoAcao;
  rotulo: string;
  simulacao_id?: string | null;
}

export interface Abertura {
  push: string;
  texto: string;
  acoes: AcaoAgente[];
  fallback: boolean;
}

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  isInitial?: boolean;
  actionTaken?: 'flow_adjusted' | 'installment_active';
  // S2: botões estruturados vindos do agente
  actions?: AcaoAgente[];
}

export interface InvoiceMonth {
  anomes: number;
  mes: number;
  modo: 'integral' | 'parcial' | 'minimo';
  pago: number;
  juros_rotativo: number;
  fatura_total_reconstruida: number | null;
  saldo_rotativo_reconstruido: number | null;
}

export interface FinancialProfile {
  user: string;
  // S1: tudo do bloco card vem do agente (GET /customers/{id}/financial-profile).
  // Nenhum número é escrito aqui; até a resposta chegar, referenceMonth é null.
  card: {
    brand: string;
    lastFour: string;
    referenceMonth: number | null;
    paymentMode: 'integral' | 'parcial' | 'minimo' | null;
    totalInvoice: number | null;
    paidAmount: number | null;
    outstandingBalance: number | null;
    rotaryInterestCharged: number | null;
    invoiceHistory: InvoiceMonth[];
  };
  reserve: {
    total: number;
    product: string;
    monthlyYieldRate: number;
    monthsCoverage: number;
  };
  financialOverview: {
    // null até a S3 definir a fórmula do índice sobre a vw_bioimpedancia
    score: number | null;
    status: string;
    freeCashflowPercentage: number;
    emergencyReserve: number;
    variableExpensesPercentage: number;
    monthlyInterestCost: number;
  };
}

export type ActiveModal = 'none' | 'flow_adjustment' | 'installment' | 'financial_overview' | 'invoice_details';
