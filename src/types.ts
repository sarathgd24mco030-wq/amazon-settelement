export interface SettlementComponent {
  Principal: number;
  shippingCredits: number;
  giftWrapCredits: number;
  promotionalRebates: number;
  taxLiable: number;
  tcsCgst: number;
  tcsSgst: number;
  tcsIgst: number;
  tds: number;
  sellingFees: number;
  fbaFees: number;
  otherTransactionFees: number;
  other: number;
}

export interface SettlementDetailLine {
  orderId: string;
  settlementId: string;
  dateTime: string;
  type: string;
  sku: string;
  description: string;
  paymentType: 'COD' | 'PrePaid';
  marketplace: string;
  components: SettlementComponent;
  total: number;
  status: string;
}

export interface RefundLine {
  source: 'COD' | 'PrePaid';
  settlementId: string;
  orderId: string;
  amountType: string;
  description: string;
  amount: number;
}

export interface SaleOrder {
  orderId: string;
  channel: string;
  paymentType: 'COD' | 'PrePaid';
  status: 'COMPLETE' | 'PROCESSING' | 'CANCELLED' | 'UNKNOWN';
  totalPrice: number;
  orderDate: string; // ISO or formatted date
}

export interface BankStatementLine {
  transactionDate: string;
  particulars: string;
  creditAmount: number;
  bucket: 'COD (Amazon)' | 'PrePaid (Amazon)' | 'Other / Non-Amazon';
}

export interface ReconciliationRow {
  orderId: string;
  components: SettlementComponent;
  calculatedTotal: number;
  saleOrderTotal: number | null;
  difference: number | null;
  matchStatus: string;
  differenceBreakdown: string;
  flag: 'OK' | 'REVIEW';
}

export interface ReconciliationSummary {
  matchedCount: number;
  matchedValue: number;
  notFoundCount: number;
  notFoundValue: number;
  pendingCount: number;
  pendingValue: number;
  flaggedCount: number;
  refundsTotal: number;
  bankCodTotal: number;
  bankPrePaidTotal: number;
  declaredCodTotal: number;
  declaredPrePaidTotal: number;
}

export interface ReconciliationResult {
  summary: ReconciliationSummary;
  reconciliationRows: ReconciliationRow[];
  orderStatuses: { [orderId: string]: { status: string; date: string | null; totalPrice: number; _settled: boolean } };
  detailRows: SettlementDetailLine[];
  refunds: RefundLine[];
  bankRows: BankStatementLine[];
  saleOrders: SaleOrder[];
}
