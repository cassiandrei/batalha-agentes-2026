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
  // S5: pergunta de consentimento de memória, respondida por botões (sem modelo)
  consentPrompt?: boolean;
}

export interface Confirmacao {
  status: 'confirmada' | 'ja_confirmada';
  execucao_id: string;
  evento: string;
  tipo: 't01' | 't02';
  simulacao_id: string;
  em: string;
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
  // S3: reserva (posicao_investimentos), índice por regra (vw_bioimpedancia) e T01
  // calculado pela tool simular_uso_reserva. null = sem dado, nunca um chute.
  reserve: {
    produto: string;
    liquidez: string;
    saldo: number | null;
    percentualCdi: number | null;
    finalidade: string;
  } | null;
  financialOverview: {
    score: number | null;
    status: 'organizado' | 'atencao' | 'critico' | null;
    componentes: { poupanca: number; dreno: number; comprometimento: number; cronicidade: number } | null;
    poupancaSobreEntradasPct: number | null;
    drenoPctRenda: number | null;
    comprometimentoCreditoPct: number | null;
    mesesPagandoJuros: number | null;
    jurosUltimoMes: number | null;
    jurosEncargosAno: number | null;
    essenciaisMediaMensal: number | null;
  };
  t01: SimulacaoT01 | null;
  // S4: ofertas por regra e T02 pela tabela Price; o motor diz qual é o principal.
  offers: Ofertas | null;
  t02: SimulacaoT02 | null;
  principal: 't01' | 't02' | null;
  ordem: { tipo: 't01' | 't02'; custo_mensal: number; descricao: string; prazo?: number }[];
}

export interface Ofertas {
  faixa_risco: 'A' | 'B' | 'C' | 'V';
  motivo_faixa: string;
  elegivel: boolean;
  ofertas: { modalidade: string; taxa_mensal: number; prazo_min: number; prazo_max: number; carencia_dias: number }[];
  motivo: string;
  encaminhamento?: string;
  regra_atencao: boolean;
  custo_mensal_juros_atual: number;
}

export interface OpcaoT02 {
  prazo: number;
  parcela: number;
  juros_totais: number;
  aprovado: boolean;
  motivo: string;
}

export interface SimulacaoT02 {
  simulacao_id: string;
  expira_em: string;
  saldo: number;
  faixa_risco: string;
  taxa_mensal: number;
  carencia_dias: number;
  custo_mensal_juros_atual: number;
  regra_atencao: boolean;
  opcoes: OpcaoT02[];
  aviso: string;
}

export interface SimulacaoT01 {
  simulacao_id: string;
  expira_em: string;
  saldo_quitado: number;
  taxa_rotativo_mes: number;
  juros_evitados_mes: number;
  origem_reserva: string;
  reserva_antes: number;
  reserva_restante: number;
  percentual_cdi: number;
  cdi_aa_pct: number;
  cdi_origem: string;
  cdi_data: string;
  rendimento_bruto_perdido_mes: number;
  ir_aliquota: number;
  ir_mes: number;
  rendimento_liquido_perdido_mes: number;
  ganho_liquido_mes: number;
  meses_cobertura_essenciais: number;
  justificativa: string;
}

export type ActiveModal = 'none' | 'flow_adjustment' | 'installment' | 'financial_overview' | 'invoice_details';
