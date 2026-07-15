import ExcelJS from 'exceljs';
import {
  SettlementComponent,
  SettlementDetailLine,
  RefundLine,
  SaleOrder,
  BankStatementLine,
  ReconciliationRow,
  ReconciliationSummary,
  ReconciliationResult
} from '../src/types';

export const DEFAULT_CONFIG = {
  COL_DATE: 0,
  COL_SETTLEMENT_ID: 1,
  COL_TYPE: 2,
  COL_ORDER_ID: 3,
  COL_SKU: 4,
  COL_DESCRIPTION: 5,
  COL_MARKETPLACE: 7,
  COL_ACCOUNT_TYPE: 8,
  COL_PRINCIPAL: 13, // "product sales"
  COL_SHIPPING_CREDITS: 14,
  COL_GIFTWRAP_CREDITS: 15,
  COL_PROMO_REBATES: 16,
  COL_TAX_LIABLE: 17,
  COL_TCS_CGST: 18,
  COL_TCS_SGST: 19,
  COL_TCS_IGST: 20,
  COL_TDS: 21,
  COL_SELLING_FEES: 22,
  COL_FBA_FEES: 23,
  COL_OTHER_TXN_FEES: 24,
  COL_OTHER: 25,
  COL_TOTAL: 26,
  COL_STATUS: 27,

  SO_COL_DISPLAY_ORDER_CODE: 1,
  SO_COL_COD_FLAG: 3,
  SO_COL_TOTAL_PRICE: 30,
  SO_COL_ORDER_DATE: 52,
  SO_COL_SALE_ORDER_CODE: 53,
  SO_COL_SALE_ORDER_STATUS: 55,
  SO_COL_CHANNEL: 24,

  BANK_COL_DATE: 1,
  BANK_COL_PARTICULARS: 3,
  BANK_COL_DEBIT: 4,
  BANK_COL_CREDIT: 5,
  BANK_SHEET_NAME: "Transaction Ledger",

  ORDER_ID_PATTERN: "^\\d{3}-\\d{7}-\\d{7}$",
  AMAZON_CHANNEL_KEYWORD: "AMAZON",
  COD_ACCOUNT_KEYWORD: "cash on delivery",
  PREPAID_ACCOUNT_KEYWORD: "electronic transactions",
  BANK_COD_KEYWORDS: ["AMAZONSE", "AMAZON_COD", "AMAZON COD"],
  BANK_PREPAID_KEYWORDS: ["INTERMEDIERY", "INTERMEDIARY", "AMAZON_PREPAID", "AMAZON PAY"],

  REVIEW_TOLERANCE: 1.0,
};

export const COMPONENT_DEFS = [
  { label: "Principal", key: "COL_PRINCIPAL" },
  { label: "shipping credits", key: "COL_SHIPPING_CREDITS" },
  { label: "gift wrap credits", key: "COL_GIFTWRAP_CREDITS" },
  { label: "promotional rebates", key: "COL_PROMO_REBATES" },
  { label: "Total sales tax liable(GST before adjusting TCS)", key: "COL_TAX_LIABLE" },
  { label: "TCS-CGST", key: "COL_TCS_CGST" },
  { label: "TCS-SGST", key: "COL_TCS_SGST" },
  { label: "TCS-IGST", key: "COL_TCS_IGST" },
  { label: "TDS (Section 194-O)", key: "COL_TDS" },
  { label: "selling fees", key: "COL_SELLING_FEES" },
  { label: "fba fees", key: "COL_FBA_FEES" },
  { label: "other transaction fees", key: "COL_OTHER_TXN_FEES" },
  { label: "other", key: "COL_OTHER" },
] as const;

export const SHORT_LABELS: Record<string, string> = {
  "Principal": "Principal",
  "shipping credits": "ShipCredits",
  "gift wrap credits": "GiftWrap",
  "promotional rebates": "PromoRebates",
  "Total sales tax liable(GST before adjusting TCS)": "Tax",
  "TCS-CGST": "TCS-CGST",
  "TCS-SGST": "TCS-SGST",
  "TCS-IGST": "TCS-IGST",
  "TDS (Section 194-O)": "TDS",
  "selling fees": "SellingFees",
  "fba fees": "FBAFees",
  "other transaction fees": "OtherFees",
  "other": "Other",
};

// Formatting helpers
function num(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) {
    if ('result' in val) return num(val.result);
    if ('value' in val) return num(val.value);
  }
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

function strVal(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val !== null) {
    if ('result' in val) return strVal(val.result);
    if ('value' in val) return strVal(val.value);
  }
  return String(val).trim();
}

function classifyAccount(accountType: string): 'COD' | 'PrePaid' | null {
  if (!accountType) return null;
  const t = accountType.toLowerCase();
  if (t.includes(DEFAULT_CONFIG.COD_ACCOUNT_KEYWORD)) return 'COD';
  if (t.includes(DEFAULT_CONFIG.PREPAID_ACCOUNT_KEYWORD)) return 'PrePaid';
  return null;
}

function classifyBankLine(particulars: string): 'COD (Amazon)' | 'PrePaid (Amazon)' | 'Other / Non-Amazon' {
  if (!particulars) return 'Other / Non-Amazon';
  const p = particulars.toUpperCase();
  if (DEFAULT_CONFIG.BANK_COD_KEYWORDS.some(k => p.includes(k))) return 'COD (Amazon)';
  if (DEFAULT_CONFIG.BANK_PREPAID_KEYWORDS.some(k => p.includes(k))) return 'PrePaid (Amazon)';
  return 'Other / Non-Amazon';
}

function isRefundOrCancel(txnType: string, description: string): boolean {
  const t = txnType.toLowerCase();
  const d = description.toLowerCase();
  if (t === 'refund' || t === 'adjustment') return true;
  return ['refund', 'reimbursement', 'cancellation', 'cancel'].some(k => d.includes(k));
}

// Reconciles settlement rows against sale order rows
export async function reconcileData(
  settlementBuffer: Buffer | null,
  saleOrdersBuffer: Buffer | null,
  bankBuffer: Buffer | null,
  tolerance: number = DEFAULT_CONFIG.REVIEW_TOLERANCE
): Promise<ReconciliationResult> {
  // If no buffers provided, load fully high-fidelity Demo Data!
  if (!settlementBuffer || !saleOrdersBuffer || !bankBuffer) {
    return generateDemoData();
  }

  // 1. Parse Settlement
  const settlementWb = new ExcelJS.Workbook();
  await settlementWb.xlsx.load(settlementBuffer);
  const settlementWs = settlementWb.worksheets[0];
  if (!settlementWs) {
    throw new Error('The Amazon Settlement file contains no worksheets or is invalid.');
  }

  const orderTotals: Record<'COD' | 'PrePaid', Record<string, Record<string, number>>> = {
    COD: {},
    PrePaid: {}
  };
  const declaredTotals = { COD: 0, PrePaid: 0 };
  const refunds: RefundLine[] = [];
  const detailRows: SettlementDetailLine[] = [];

  settlementWs.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Header

    const accountType = strVal(row.getCell(DEFAULT_CONFIG.COL_ACCOUNT_TYPE + 1).value);
    const group = classifyAccount(accountType);
    if (!group) return; // Skip unrecognized accounts

    const totalAmount = num(row.getCell(DEFAULT_CONFIG.COL_TOTAL + 1).value);
    declaredTotals[group] += totalAmount;

    const orderId = strVal(row.getCell(DEFAULT_CONFIG.COL_ORDER_ID + 1).value);
    const txnType = strVal(row.getCell(DEFAULT_CONFIG.COL_TYPE + 1).value);
    const description = strVal(row.getCell(DEFAULT_CONFIG.COL_DESCRIPTION + 1).value);
    const settlementId = strVal(row.getCell(DEFAULT_CONFIG.COL_SETTLEMENT_ID + 1).value);

    if (orderId) {
      if (!orderTotals[group][orderId]) {
        orderTotals[group][orderId] = {};
        COMPONENT_DEFS.forEach(c => {
          orderTotals[group][orderId][c.label] = 0;
        });
      }

      const bucket = orderTotals[group][orderId];
      COMPONENT_DEFS.forEach(c => {
        const val = num(row.getCell(DEFAULT_CONFIG[c.key] + 1).value);
        bucket[c.label] = Number((bucket[c.label] + val).toFixed(2));
      });

      const comps: Record<string, number> = {};
      COMPONENT_DEFS.forEach(c => {
        comps[c.label] = num(row.getCell(DEFAULT_CONFIG[c.key] + 1).value);
      });

      detailRows.push({
        orderId,
        settlementId,
        dateTime: strVal(row.getCell(DEFAULT_CONFIG.COL_DATE + 1).value),
        type: txnType,
        sku: strVal(row.getCell(DEFAULT_CONFIG.COL_SKU + 1).value),
        description,
        paymentType: group,
        marketplace: strVal(row.getCell(DEFAULT_CONFIG.COL_MARKETPLACE + 1).value),
        components: comps as unknown as SettlementComponent,
        total: totalAmount,
        status: strVal(row.getCell(DEFAULT_CONFIG.COL_STATUS + 1).value)
      });
    }

    if (isRefundOrCancel(txnType, description)) {
      refunds.push({
        source: group,
        settlementId,
        orderId,
        amountType: txnType,
        description,
        amount: totalAmount
      });
    }
  });

  // 2. Parse Sale Orders
  const saleOrdersWb = new ExcelJS.Workbook();
  await saleOrdersWb.xlsx.load(saleOrdersBuffer);
  const saleOrdersWs = saleOrdersWb.worksheets[0];
  if (!saleOrdersWs) {
    throw new Error('The Sale Orders file contains no worksheets or is invalid.');
  }

  const saleOrders: Record<'COD' | 'PrePaid', Record<string, { status: string; date: string; totalPrice: number }>> = {
    COD: {},
    PrePaid: {}
  };
  const flatSaleOrders: SaleOrder[] = [];
  const orderIdRe = new RegExp(DEFAULT_CONFIG.ORDER_ID_PATTERN);

  saleOrdersWs.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const channel = strVal(row.getCell(DEFAULT_CONFIG.SO_COL_CHANNEL + 1).value);
    if (!channel.toUpperCase().includes(DEFAULT_CONFIG.AMAZON_CHANNEL_KEYWORD)) return;

    // Extract Order ID from SO_COL_DISPLAY_ORDER_CODE or SO_COL_SALE_ORDER_CODE
    let orderId = '';
    for (const colKey of ['SO_COL_DISPLAY_ORDER_CODE', 'SO_COL_SALE_ORDER_CODE'] as const) {
      const val = strVal(row.getCell(DEFAULT_CONFIG[colKey] + 1).value);
      if (val && orderIdRe.test(val)) {
        orderId = val;
        break;
      }
    }
    if (!orderId) return;

    const isCod = strVal(row.getCell(DEFAULT_CONFIG.SO_COL_COD_FLAG + 1).value).toLowerCase() === 'true' ||
                  num(row.getCell(DEFAULT_CONFIG.SO_COL_COD_FLAG + 1).value) === 1;
    const group = isCod ? 'COD' : 'PrePaid';

    const totalPrice = num(row.getCell(DEFAULT_CONFIG.SO_COL_TOTAL_PRICE + 1).value);
    const orderDate = strVal(row.getCell(DEFAULT_CONFIG.SO_COL_ORDER_DATE + 1).value);
    const statusVal = strVal(row.getCell(DEFAULT_CONFIG.SO_COL_SALE_ORDER_STATUS + 1).value) || 'COMPLETE';

    let status: 'COMPLETE' | 'PROCESSING' | 'CANCELLED' | 'UNKNOWN' = 'COMPLETE';
    if (statusVal.toUpperCase().includes('CANCEL')) status = 'CANCELLED';
    else if (statusVal.toUpperCase().includes('PROCESS')) status = 'PROCESSING';

    if (!saleOrders[group][orderId]) {
      saleOrders[group][orderId] = { status, date: orderDate, totalPrice: 0 };
    }
    saleOrders[group][orderId].totalPrice = Number((saleOrders[group][orderId].totalPrice + totalPrice).toFixed(2));

    flatSaleOrders.push({
      orderId,
      channel: "AMAZON",
      paymentType: group,
      status,
      totalPrice,
      orderDate
    });
  });

  // 3. Parse Bank Statement
  const bankWb = new ExcelJS.Workbook();
  await bankWb.xlsx.load(bankBuffer);
  // Find worksheet (by config sheet name or first worksheet)
  let bankWs = bankWb.getWorksheet(DEFAULT_CONFIG.BANK_SHEET_NAME);
  if (!bankWs) {
    bankWs = bankWb.worksheets[0];
  }
  if (!bankWs) {
    throw new Error('The Bank Statement file contains no worksheets or is invalid.');
  }

  const bankRows: BankStatementLine[] = [];
  const bankBucketTotals: Record<string, number> = {
    'COD (Amazon)': 0,
    'PrePaid (Amazon)': 0,
    'Other / Non-Amazon': 0
  };

  bankWs.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const credit = num(row.getCell(DEFAULT_CONFIG.BANK_COL_CREDIT + 1).value);
    if (credit === 0) return;

    const particulars = strVal(row.getCell(DEFAULT_CONFIG.BANK_COL_PARTICULARS + 1).value);
    const dateStr = strVal(row.getCell(DEFAULT_CONFIG.BANK_COL_DATE + 1).value);
    const bucket = classifyBankLine(particulars);

    bankBucketTotals[bucket] += credit;
    bankRows.push({
      transactionDate: dateStr,
      particulars,
      creditAmount: credit,
      bucket
    });
  });

  // 4. Run Reconciliation Logic
  const mergedOrderTotals = { ...orderTotals.COD, ...orderTotals.PrePaid };
  const mergedSaleOrders = { ...saleOrders.COD, ...saleOrders.PrePaid };
  const allOrderIds = new Set([...Object.keys(mergedOrderTotals), ...Object.keys(mergedSaleOrders)]);

  const reconciliationRows: ReconciliationRow[] = [];
  let matchedCount = 0;
  let matchedValue = 0;
  let notFoundCount = 0;
  let notFoundValue = 0;
  let pendingCount = 0;
  let pendingValue = 0;
  let flaggedCount = 0;

  Array.from(allOrderIds).sort().forEach(orderId => {
    const comps = mergedOrderTotals[orderId] || {};
    const so = mergedSaleOrders[orderId];

    const calculatedTotal = Number(
      COMPONENT_DEFS.reduce((sum, c) => sum + (comps[c.label] || 0), 0).toFixed(2)
    );
    const saleOrderTotal = so ? so.totalPrice : null;

    let matchStatus = '';
    if (mergedOrderTotals[orderId] && so) {
      matchStatus = 'Matched';
      matchedCount++;
      matchedValue += saleOrderTotal || 0;
    } else if (mergedOrderTotals[orderId] && !so) {
      matchStatus = 'Not found in Sale Orders';
      notFoundCount++;
      notFoundValue += calculatedTotal;
    } else {
      matchStatus = 'Not yet in Settlement (pending)';
      pendingCount++;
      pendingValue += saleOrderTotal || 0;
    }

    let difference: number | null = null;
    let flag: 'OK' | 'REVIEW' = 'OK';
    let differenceBreakdown = '';

    if (saleOrderTotal !== null) {
      difference = Number((calculatedTotal - saleOrderTotal).toFixed(2));
      const activeComps = COMPONENT_DEFS
        .filter(c => Math.abs(comps[c.label] || 0) > 0.004)
        .map(c => `${SHORT_LABELS[c.label]}: ${(comps[c.label] || 0).toFixed(2)}`)
        .join(', ');

      differenceBreakdown = `SO Price: ${saleOrderTotal.toFixed(2)} | Comps: [${activeComps}] = Calc Settled: ${calculatedTotal.toFixed(2)} | Diff: ${difference.toFixed(2)}`;
      if (Math.abs(difference) > tolerance) {
        flag = 'REVIEW';
        flaggedCount++;
      }
    } else {
      differenceBreakdown = 'No matching Sale Order found in Sale Orders list';
      flag = 'REVIEW';
      flaggedCount++;
    }

    // Prepare robust default components mapping
    const fullComps: Record<string, number> = {};
    COMPONENT_DEFS.forEach(c => {
      fullComps[c.label] = comps[c.label] || 0;
    });

    reconciliationRows.push({
      orderId,
      components: fullComps as unknown as SettlementComponent,
      calculatedTotal,
      saleOrderTotal,
      difference,
      matchStatus,
      differenceBreakdown,
      flag
    });
  });

  const orderStatuses: Record<string, { status: string; date: string | null; totalPrice: number; _settled: boolean }> = {};
  Object.entries(mergedSaleOrders).forEach(([orderId, info]) => {
    orderStatuses[orderId] = {
      status: info.status,
      date: info.date,
      totalPrice: info.totalPrice,
      _settled: orderId in mergedOrderTotals
    };
  });

  const summary: ReconciliationSummary = {
    matchedCount,
    matchedValue,
    notFoundCount,
    notFoundValue,
    pendingCount,
    pendingValue,
    flaggedCount,
    refundsTotal: Number(refunds.reduce((sum, r) => sum + r.amount, 0).toFixed(2)),
    bankCodTotal: Number(bankBucketTotals['COD (Amazon)'].toFixed(2)),
    bankPrePaidTotal: Number(bankBucketTotals['PrePaid (Amazon)'].toFixed(2)),
    declaredCodTotal: Number(declaredTotals.COD.toFixed(2)),
    declaredPrePaidTotal: Number(declaredTotals.PrePaid.toFixed(2))
  };

  return {
    summary,
    reconciliationRows,
    orderStatuses,
    detailRows,
    refunds,
    bankRows,
    saleOrders: flatSaleOrders
  };
}

// Generate beautiful styled Excel sheet
export async function writeReconciliationWorkbook(data: ReconciliationResult, tolerance: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // Color theme definitions
  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '305496' } } as ExcelJS.Fill;
  const HEADER_FONT = { name: 'Arial', bold: true, color: { argb: 'FFFFFF' } };
  const BOLD_FONT = { name: 'Arial', bold: true };
  const TITLE_FONT = { name: 'Arial', bold: true, size: 14 };
  const SUBTITLE_FONT = { name: 'Arial', italic: true, size: 9 };
  const REVIEW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } } as ExcelJS.Fill;

  const numFormat = '#,##0.00';

  // Helper to convert column index to Excel column letters
  const colToAlpha = (colNum: number): string => {
    let alpha = '';
    let temp = colNum;
    while (temp > 0) {
      const remainder = (temp - 1) % 26;
      alpha = String.fromCharCode(65 + remainder) + alpha;
      temp = Math.floor((temp - 1) / 26);
    }
    return alpha;
  };

  // --- TAB 1: Summary ---
  const wsSummary = wb.addWorksheet('Summary');
  wsSummary.views = [{ showGridLines: true }];
  wsSummary.getColumn('A').width = 45;
  wsSummary.getColumn('B').width = 30;
  wsSummary.getColumn('C').width = 15;
  wsSummary.getColumn('D').width = 18;

  wsSummary.getCell('A1').value = 'Amazon Settlement Reconciliation — Summary';
  wsSummary.getCell('A1').font = TITLE_FONT;
  wsSummary.getCell('A2').value = `Generated: ${new Date().toLocaleDateString()} | Review tolerance: ±${tolerance.toFixed(2)}`;
  wsSummary.getCell('A2').font = SUBTITLE_FONT;

  let r = 4;
  wsSummary.getCell(`A${r}`).value = '1. Order-Level Match Status (all orders, COD + PrePaid combined)';
  wsSummary.getCell(`A${r}`).font = BOLD_FONT;
  r++;

  const summaryHeaders = ['Metric', '', 'Order Count', 'Total Value (INR)'];
  summaryHeaders.forEach((h, idx) => {
    const cell = wsSummary.getCell(r, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
  r++;

  const s = data.summary;
  const matchMetrics = [
    { label: 'Matched', count: s.matchedCount, value: s.matchedValue },
    { label: 'Not found in Sale Orders', count: s.notFoundCount, value: s.notFoundValue },
    { label: 'In Sale Orders, not yet settled', count: s.pendingCount, value: s.pendingValue },
    { label: 'Flagged for review (|Diff| > tolerance)', count: s.flaggedCount, value: 0 }
  ];

  matchMetrics.forEach(m => {
    wsSummary.getCell(`A${r}`).value = m.label;
    wsSummary.getCell(`C${r}`).value = m.count;
    if (m.value > 0) {
      wsSummary.getCell(`D${r}`).value = m.value;
      wsSummary.getCell(`D${r}`).numFmt = numFormat;
    }
    r++;
  });
  r++;

  wsSummary.getCell(`A${r}`).value = '2. Pending Orders (placed, not yet settled)';
  wsSummary.getCell(`A${r}`).font = BOLD_FONT;
  r++;

  summaryHeaders.forEach((h, idx) => {
    const cell = wsSummary.getCell(r, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
  r++;

  wsSummary.getCell(`A${r}`).value = 'Settled';
  wsSummary.getCell(`C${r}`).value = s.matchedCount;
  wsSummary.getCell(`D${r}`).value = s.matchedValue;
  wsSummary.getCell(`D${r}`).numFmt = numFormat;
  r++;

  wsSummary.getCell(`A${r}`).value = 'Pending';
  wsSummary.getCell(`C${r}`).value = s.pendingCount;
  wsSummary.getCell(`D${r}`).value = s.pendingValue;
  wsSummary.getCell(`D${r}`).numFmt = numFormat;
  r++;
  r++;

  wsSummary.getCell(`A${r}`).value = '3. Refunds & Cancellations';
  wsSummary.getCell(`A${r}`).font = BOLD_FONT;
  r++;
  wsSummary.getCell(`A${r}`).value = 'Total refunded/cancelled per settlement data:';
  wsSummary.getCell(`D${r}`).value = s.refundsTotal;
  wsSummary.getCell(`D${r}`).numFmt = numFormat;
  r += 2;

  wsSummary.getCell(`A${r}`).value = "4. Bank Statement Reality Check (actual bank ledger vs Amazon's declared total)";
  wsSummary.getCell(`A${r}`).font = BOLD_FONT;
  r++;

  const bankChecks = [
    { type: 'COD', bank: s.bankCodTotal, declared: s.declaredCodTotal },
    { type: 'PrePaid', bank: s.bankPrePaidTotal, declared: s.declaredPrePaidTotal }
  ];

  bankChecks.forEach(bc => {
    wsSummary.getCell(`A${r}`).value = `Actually received in bank -- ${bc.type} (Amazon)`;
    wsSummary.getCell(`D${r}`).value = bc.bank;
    wsSummary.getCell(`D${r}`).numFmt = numFormat;
    r++;

    wsSummary.getCell(`A${r}`).value = `${bc.type} settlement Grand Total (declared by Amazon)`;
    wsSummary.getCell(`D${r}`).value = bc.declared;
    wsSummary.getCell(`D${r}`).numFmt = numFormat;
    r++;

    wsSummary.getCell(`A${r}`).value = `Difference (Bank - Declared), ${bc.type}`;
    wsSummary.getCell(`D${r}`).value = bc.bank - bc.declared;
    wsSummary.getCell(`D${r}`).numFmt = numFormat;
    wsSummary.getCell(`D${r}`).font = BOLD_FONT;
    r += 2;
  });

  // --- TAB 2: CU_Order_Reconciliation ---
  const wsRecon = wb.addWorksheet('CU_Order_Reconciliation');
  wsRecon.views = [{ state: 'frozen', xSplit: 1, ySplit: 1, showGridLines: true }];

  const reconHeaders = [
    'Order ID',
    ...COMPONENT_DEFS.map(c => c.label),
    'Calculated Total Settled Amount',
    'Sale Order Total Price',
    'Difference',
    'Match Status',
    'Difference Breakdown',
    'Flag'
  ];

  reconHeaders.forEach((h, idx) => {
    const cell = wsRecon.getCell(1, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  data.reconciliationRows.forEach((row, rowIdx) => {
    const sheetRowIdx = rowIdx + 2;
    const cells = [
      row.orderId,
      ...COMPONENT_DEFS.map(c => row.components[c.label as keyof SettlementComponent] || 0),
    ];

    cells.forEach((val, colIdx) => {
      wsRecon.getCell(sheetRowIdx, colIdx + 1).value = val;
    });

    const numComp = COMPONENT_DEFS.length;

    // Excel Formulas
    const sumRange = `B${sheetRowIdx}:${colToAlpha(numComp + 1)}${sheetRowIdx}`;
    wsRecon.getCell(sheetRowIdx, numComp + 2).value = { formula: `SUM(${sumRange})` };
    wsRecon.getCell(sheetRowIdx, numComp + 3).value = row.saleOrderTotal !== null ? row.saleOrderTotal : '';
    wsRecon.getCell(sheetRowIdx, numComp + 4).value = row.saleOrderTotal !== null ? { formula: `${colToAlpha(numComp + 2)}${sheetRowIdx}-${colToAlpha(numComp + 3)}${sheetRowIdx}` } : '';

    wsRecon.getCell(sheetRowIdx, numComp + 5).value = row.matchStatus;
    wsRecon.getCell(sheetRowIdx, numComp + 6).value = row.differenceBreakdown;
    wsRecon.getCell(sheetRowIdx, numComp + 7).value = row.flag;

    // Number formats
    for (let c = 2; c <= numComp + 4; c++) {
      wsRecon.getCell(sheetRowIdx, c).numFmt = numFormat;
    }

    // Conditional Styling for Flags
    if (row.flag === 'REVIEW') {
      for (let c = 1; c <= reconHeaders.length; c++) {
        wsRecon.getCell(sheetRowIdx, c).fill = REVIEW_FILL;
      }
    }
  });

  // Grand Total line
  const lastDataRow = data.reconciliationRows.length + 1;
  const gtRow = lastDataRow + 2;
  wsRecon.getCell(gtRow, 1).value = 'GRAND TOTAL';
  wsRecon.getCell(gtRow, 1).font = BOLD_FONT;

  const numComp = COMPONENT_DEFS.length;
  for (let c = 2; c <= numComp + 4; c++) {
    const colAlpha = colToAlpha(c);
    const cell = wsRecon.getCell(gtRow, c);
    cell.value = { formula: `SUM(${colAlpha}2:${colAlpha}${lastDataRow})` };
    cell.font = BOLD_FONT;
    cell.numFmt = numFormat;
  }

  const flagColAlpha = colToAlpha(reconHeaders.length);
  wsRecon.getCell(gtRow, reconHeaders.length).value = { formula: `COUNTIF(${flagColAlpha}2:${flagColAlpha}${lastDataRow},"REVIEW")&" flagged"` };
  wsRecon.getCell(gtRow, reconHeaders.length).font = BOLD_FONT;

  // Auto-fit columns for Reconciliation Sheet
  const reconWidths = [22, ...COMPONENT_DEFS.map(() => 16), 16, 16, 12, 26, 90, 10];
  reconWidths.forEach((w, idx) => {
    wsRecon.getColumn(idx + 1).width = w;
  });

  // --- TAB 3: CU_Order_Status ---
  const wsStatus = wb.addWorksheet('CU_Order_Status');
  wsStatus.views = [{ showGridLines: true }];
  const statusHeaders = ['Order ID', 'Order Status', 'Order Date', 'Total Price', 'Settlement Status'];
  statusHeaders.forEach((h, idx) => {
    const cell = wsStatus.getCell(1, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  let statusRowIdx = 2;
  Object.entries(data.orderStatuses).sort().forEach(([orderId, info]) => {
    wsStatus.getCell(statusRowIdx, 1).value = orderId;
    wsStatus.getCell(statusRowIdx, 2).value = info.status;
    wsStatus.getCell(statusRowIdx, 3).value = info.date;
    wsStatus.getCell(statusRowIdx, 4).value = info.totalPrice;
    wsStatus.getCell(statusRowIdx, 4).numFmt = numFormat;
    wsStatus.getCell(statusRowIdx, 5).value = info._settled ? 'Settled' : 'Pending';

    if (!info._settled) {
      for (let c = 1; c <= 5; c++) {
        wsStatus.getCell(statusRowIdx, c).fill = REVIEW_FILL;
      }
    }
    statusRowIdx++;
  });
  const statusWidths = [22, 14, 20, 14, 16];
  statusWidths.forEach((w, idx) => {
    wsStatus.getColumn(idx + 1).width = w;
  });

  // --- TAB 4: CU_Order_Detail ---
  const wsDetail = wb.addWorksheet('CU_Order_Detail');
  wsDetail.views = [{ state: 'frozen', xSplit: 2, ySplit: 1, showGridLines: true }];
  const detailHeaders = [
    'Order ID', 'Settlement ID', 'Date/Time', 'Type', 'SKU', 'Description',
    'Payment Type', 'Marketplace', ...COMPONENT_DEFS.map(c => c.label), 'Total', 'Status'
  ];
  detailHeaders.forEach((h, idx) => {
    const cell = wsDetail.getCell(1, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  data.detailRows.forEach((r, idx) => {
    const sheetRowIdx = idx + 2;
    const rowVals = [
      r.orderId,
      r.settlementId,
      r.dateTime,
      r.type,
      r.sku,
      r.description,
      r.paymentType,
      r.marketplace,
      ...COMPONENT_DEFS.map(c => r.components[c.label as keyof SettlementComponent] || 0),
      r.total,
      r.status
    ];

    rowVals.forEach((val, colIdx) => {
      const cell = wsDetail.getCell(sheetRowIdx, colIdx + 1);
      cell.value = val;
      if (colIdx >= 8 && colIdx < 8 + COMPONENT_DEFS.length + 1) {
        cell.numFmt = numFormat;
      }
    });
  });

  const detailWidths = [22, 16, 20, 14, 16, 30, 12, 14, ...COMPONENT_DEFS.map(() => 16), 14, 12];
  detailWidths.forEach((w, idx) => {
    wsDetail.getColumn(idx + 1).width = w;
  });

  // --- TAB 5: Refund & Cancellation ---
  const wsRefunds = wb.addWorksheet('Refund & Cancellation');
  wsRefunds.views = [{ showGridLines: true }];
  const refundHeaders = ['Source', 'Settlement ID', 'Order ID', 'Amount Type', 'Description', 'Amount'];
  refundHeaders.forEach((h, idx) => {
    const cell = wsRefunds.getCell(1, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  data.refunds.forEach((r, idx) => {
    const sheetRowIdx = idx + 2;
    wsRefunds.getCell(sheetRowIdx, 1).value = r.source;
    wsRefunds.getCell(sheetRowIdx, 2).value = r.settlementId;
    wsRefunds.getCell(sheetRowIdx, 3).value = r.orderId;
    wsRefunds.getCell(sheetRowIdx, 4).value = r.amountType;
    wsRefunds.getCell(sheetRowIdx, 5).value = r.description;
    wsRefunds.getCell(sheetRowIdx, 6).value = r.amount;
    wsRefunds.getCell(sheetRowIdx, 6).numFmt = numFormat;
  });
  const refundWidths = [10, 16, 22, 14, 40, 14];
  refundWidths.forEach((w, idx) => {
    wsRefunds.getColumn(idx + 1).width = w;
  });

  // --- TAB 6: Bank Statement Detail ---
  const wsBank = wb.addWorksheet('Bank Statement Detail');
  wsBank.views = [{ showGridLines: true }];
  const bankHeaders = ['Transaction Date', 'Particulars', 'Credit Amount (INR)', 'Bucket'];
  bankHeaders.forEach((h, idx) => {
    const cell = wsBank.getCell(1, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  data.bankRows.forEach((r, idx) => {
    const sheetRowIdx = idx + 2;
    wsBank.getCell(sheetRowIdx, 1).value = r.transactionDate;
    wsBank.getCell(sheetRowIdx, 2).value = r.particulars;
    wsBank.getCell(sheetRowIdx, 3).value = r.creditAmount;
    wsBank.getCell(sheetRowIdx, 3).numFmt = numFormat;
    wsBank.getCell(sheetRowIdx, 4).value = r.bucket;
  });
  const bankWidths = [16, 60, 18, 20];
  bankWidths.forEach((w, idx) => {
    wsBank.getColumn(idx + 1).width = w;
  });

  // --- TAB 7: Amazon Sales Order ---
  const wsSaleOrders = wb.addWorksheet('Amazon Sales Order');
  wsSaleOrders.views = [{ showGridLines: true }];
  const soHeaders = ['Order ID', 'Channel', 'Payment Type', 'Status', 'Total Price', 'Order Date'];
  soHeaders.forEach((h, idx) => {
    const cell = wsSaleOrders.getCell(1, idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });

  data.saleOrders.forEach((r, idx) => {
    const sheetRowIdx = idx + 2;
    wsSaleOrders.getCell(sheetRowIdx, 1).value = r.orderId;
    wsSaleOrders.getCell(sheetRowIdx, 2).value = r.channel;
    wsSaleOrders.getCell(sheetRowIdx, 3).value = r.paymentType;
    wsSaleOrders.getCell(sheetRowIdx, 4).value = r.status;
    wsSaleOrders.getCell(sheetRowIdx, 5).value = r.totalPrice;
    wsSaleOrders.getCell(sheetRowIdx, 5).numFmt = numFormat;
    wsSaleOrders.getCell(sheetRowIdx, 6).value = r.orderDate;
  });
  const soWidths = [22, 14, 12, 14, 14, 20];
  soWidths.forEach((w, idx) => {
    wsSaleOrders.getColumn(idx + 1).width = w;
  });

  // Double-check fonts & vertical centering on all headers
  wb.worksheets.forEach(ws => {
    const firstRow = ws.getRow(1);
    firstRow.height = 28;
    firstRow.eachCell(cell => {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
  });

  const buffer = await wb.xlsx.writeBuffer() as Buffer;
  return buffer;
}

// Generates high-fidelity Mock Demo Data
export function generateDemoData(): ReconciliationResult {
  const orderIdList = [
    '403-1254879-6325412', '403-9654123-5471254', '403-4587123-6985412',
    '403-8541254-9658741', '403-1254789-3214587', '403-9658741-1458741',
    '403-5412587-3214569', '403-7896541-2154879', '403-6325412-9658741',
    '403-2587412-1458796', '403-1122334-5566778', '403-9988776-5544332',
    '403-5566778-1122334', '403-4455667-7788990', '403-1458796-2587412',
    '403-8529631-7418529', '403-3692581-1472583', '403-7539514-8524561',
    '403-1593572-8521593', '403-9517536-4568521', '403-1234567-8901234',
    '403-2233445-5566770', '403-7788990-1122330', '403-6655443-3322110',
    '403-8877665-5544330'
  ];

  const detailRows: SettlementDetailLine[] = [];
  const refunds: RefundLine[] = [];
  const bankRows: BankStatementLine[] = [];
  const flatSaleOrders: SaleOrder[] = [];

  const orderTotals: Record<string, Record<string, number>> = {};
  const orderStatuses: Record<string, { status: string; date: string | null; totalPrice: number; _settled: boolean }> = {};

  const orderDates = [
    '2026-07-01', '2026-07-02', '2026-07-04', '2026-07-05', '2026-07-06',
    '2026-07-08', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-14'
  ];

  // Helper to generate components
  const makeComponents = (principal: number, hasTax = true, hasFees = true): SettlementComponent => ({
    Principal: principal,
    shippingCredits: hasTax ? 40 : 0,
    giftWrapCredits: 0,
    promotionalRebates: 0,
    taxLiable: hasTax ? Number((principal * 0.18).toFixed(2)) : 0,
    tcsCgst: hasTax ? Number((-principal * 0.005).toFixed(2)) : 0,
    tcsSgst: hasTax ? Number((-principal * 0.005).toFixed(2)) : 0,
    tcsIgst: 0,
    tds: hasTax ? Number((-principal * 0.01).toFixed(2)) : 0,
    sellingFees: hasFees ? Number((-principal * 0.12).toFixed(2)) : 0,
    fbaFees: hasFees ? -35 : 0,
    otherTransactionFees: hasFees ? -2 : 0,
    other: 0
  });

  let matchedCount = 0;
  let matchedValue = 0;
  let notFoundCount = 0;
  let notFoundValue = 0;
  let pendingCount = 0;
  let pendingValue = 0;
  let flaggedCount = 0;

  const reconciliationRows: ReconciliationRow[] = [];

  orderIdList.forEach((orderId, index) => {
    const isCod = index % 2 === 0;
    const group = isCod ? 'COD' : 'PrePaid';
    const dateStr = orderDates[index % orderDates.length];

    // Determine type of match for high-fidelity diversity:
    // 0-17: Perfect Matches (Matched)
    // 18-19: Match with Discrepancy (Flagged)
    // 20-21: In Settlement, Not in Sale Orders
    // 22-24: In Sale Orders, Not yet Settled (Pending)

    if (index < 18) {
      // Perfect Match
      const saleOrderPrice = index % 3 === 0 ? 999.0 : index % 3 === 1 ? 599.0 : 349.0;
      const principal = Number((saleOrderPrice / 1.18).toFixed(2));
      const comps = makeComponents(principal);
      const calculatedTotal = Number(
        Object.values(comps).reduce((sum, v) => sum + v, 0).toFixed(2)
      );

      // Create Sale Order
      flatSaleOrders.push({
        orderId,
        channel: 'AMAZON',
        paymentType: group,
        status: 'COMPLETE',
        totalPrice: calculatedTotal, // Matches perfectly!
        orderDate: dateStr
      });

      orderStatuses[orderId] = {
        status: 'COMPLETE',
        date: dateStr,
        totalPrice: calculatedTotal,
        _settled: true
      };

      // Add detail lines for settlement
      const settlementId = `SETT-2026-${isCod ? '101' : '202'}`;
      detailRows.push({
        orderId,
        settlementId,
        dateTime: `${dateStr}T14:22:00`,
        type: 'Order',
        sku: `SKU-PROD-${index % 5 + 1}`,
        description: `Amazon Product SKU-${index % 5 + 1}`,
        paymentType: group,
        marketplace: 'amazon.in',
        components: comps,
        total: calculatedTotal,
        status: 'Settled'
      });

      matchedCount++;
      matchedValue += calculatedTotal;

      reconciliationRows.push({
        orderId,
        components: comps,
        calculatedTotal,
        saleOrderTotal: calculatedTotal,
        difference: 0,
        matchStatus: 'Matched',
        differenceBreakdown: `SO Price: ${calculatedTotal.toFixed(2)} | Comps: [Principal: ${principal.toFixed(2)}] = Calc Settled: ${calculatedTotal.toFixed(2)} | Diff: 0.00`,
        flag: 'OK'
      });

    } else if (index >= 18 && index <= 19) {
      // Discrepancy (Settled total !== Sale Order total)
      const saleOrderPrice = 1299.0;
      const actualSettledPrice = 1199.0; // Discrepancy of 100.0 INR

      const principal = Number((actualSettledPrice / 1.18).toFixed(2));
      const comps = makeComponents(principal);
      const calculatedTotal = Number(
        Object.values(comps).reduce((sum, v) => sum + v, 0).toFixed(2)
      );

      flatSaleOrders.push({
        orderId,
        channel: 'AMAZON',
        paymentType: group,
        status: 'COMPLETE',
        totalPrice: saleOrderPrice, // High price on invoice
        orderDate: dateStr
      });

      orderStatuses[orderId] = {
        status: 'COMPLETE',
        date: dateStr,
        totalPrice: saleOrderPrice,
        _settled: true
      };

      const settlementId = `SETT-2026-${isCod ? '101' : '202'}`;
      detailRows.push({
        orderId,
        settlementId,
        dateTime: `${dateStr}T11:04:00`,
        type: 'Order',
        sku: `SKU-PROD-FEVER`,
        description: `Amazon Premium Product`,
        paymentType: group,
        marketplace: 'amazon.in',
        components: comps,
        total: calculatedTotal,
        status: 'Settled'
      });

      const difference = Number((calculatedTotal - saleOrderPrice).toFixed(2));
      flaggedCount++;
      matchedCount++;
      matchedValue += saleOrderPrice;

      reconciliationRows.push({
        orderId,
        components: comps,
        calculatedTotal,
        saleOrderTotal: saleOrderPrice,
        difference,
        matchStatus: 'Matched',
        differenceBreakdown: `SO Price: ${saleOrderPrice.toFixed(2)} | Comps: [Principal: ${principal.toFixed(2)}] = Calc Settled: ${calculatedTotal.toFixed(2)} | Diff: ${difference.toFixed(2)}`,
        flag: 'REVIEW'
      });

    } else if (index >= 20 && index <= 21) {
      // In Settlement, missing from Sale Orders
      const settledPrice = 499.0;
      const principal = Number((settledPrice / 1.18).toFixed(2));
      const comps = makeComponents(principal);
      const calculatedTotal = Number(
        Object.values(comps).reduce((sum, v) => sum + v, 0).toFixed(2)
      );

      const settlementId = `SETT-2026-${isCod ? '101' : '202'}`;
      detailRows.push({
        orderId,
        settlementId,
        dateTime: `${dateStr}T09:12:00`,
        type: 'Order',
        sku: `SKU-ORPHAN`,
        description: `Orphaned Order Line`,
        paymentType: group,
        marketplace: 'amazon.in',
        components: comps,
        total: calculatedTotal,
        status: 'Settled'
      });

      notFoundCount++;
      notFoundValue += calculatedTotal;
      flaggedCount++;

      reconciliationRows.push({
        orderId,
        components: comps,
        calculatedTotal,
        saleOrderTotal: null,
        difference: null,
        matchStatus: 'Not found in Sale Orders',
        differenceBreakdown: 'No matching Sale Order found for this Order ID',
        flag: 'REVIEW'
      });

    } else {
      // In Sale Orders, not yet settled (Pending)
      const saleOrderPrice = 799.0;

      flatSaleOrders.push({
        orderId,
        channel: 'AMAZON',
        paymentType: group,
        status: 'PROCESSING',
        totalPrice: saleOrderPrice,
        orderDate: dateStr
      });

      orderStatuses[orderId] = {
        status: 'PROCESSING',
        date: dateStr,
        totalPrice: saleOrderPrice,
        _settled: false
      };

      pendingCount++;
      pendingValue += saleOrderPrice;

      const emptyComps = makeComponents(0, false, false);

      reconciliationRows.push({
        orderId,
        components: emptyComps,
        calculatedTotal: 0,
        saleOrderTotal: saleOrderPrice,
        difference: null,
        matchStatus: 'Not yet in Settlement (pending)',
        differenceBreakdown: 'No matching Settlement line found for this Order ID',
        flag: 'OK'
      });
    }

    // Add some random Refunds & Cancellations
    if (index === 3 || index === 8) {
      const settlementId = `SETT-2026-${isCod ? '101' : '202'}`;
      refunds.push({
        source: group,
        settlementId,
        orderId,
        amountType: 'Refund',
        description: 'Customer Refund / Return item processing fee',
        amount: isCod ? -349.0 : -199.0
      });
    }
  });

  // Generate Bank Ledger data
  const declaredCodTotal = detailRows.filter(r => r.paymentType === 'COD').reduce((sum, r) => sum + r.total, 0);
  const declaredPrePaidTotal = detailRows.filter(r => r.paymentType === 'PrePaid').reduce((sum, r) => sum + r.total, 0);

  // Bank ledger rows
  bankRows.push({
    transactionDate: '2026-07-06',
    particulars: 'NEFT credit from AMAZONSE - Settlement COD_RECON_01',
    creditAmount: Number((declaredCodTotal + 15.50).toFixed(2)), // Straddle difference
    bucket: 'COD (Amazon)'
  });

  bankRows.push({
    transactionDate: '2026-07-12',
    particulars: 'RTGS credit from INTERMEDIARY PAYMENTS - PrePaid_RECON_02',
    creditAmount: Number((declaredPrePaidTotal - 8.20).toFixed(2)), // Straddle difference
    bucket: 'PrePaid (Amazon)'
  });

  bankRows.push({
    transactionDate: '2026-07-15',
    particulars: 'UPI payment from John Doe',
    creditAmount: 1500.0,
    bucket: 'Other / Non-Amazon'
  });

  bankRows.push({
    transactionDate: '2026-07-15',
    particulars: 'Monthly Office Rent payout',
    creditAmount: 0, // Debits are ignored in credits summary
    bucket: 'Other / Non-Amazon'
  });

  const summary: ReconciliationSummary = {
    matchedCount,
    matchedValue: Number(matchedValue.toFixed(2)),
    notFoundCount,
    notFoundValue: Number(notFoundValue.toFixed(2)),
    pendingCount,
    pendingValue: Number(pendingValue.toFixed(2)),
    flaggedCount,
    refundsTotal: Number(refunds.reduce((sum, r) => sum + r.amount, 0).toFixed(2)),
    bankCodTotal: Number(bankRows.filter(b => b.bucket === 'COD (Amazon)').reduce((sum, b) => sum + b.creditAmount, 0).toFixed(2)),
    bankPrePaidTotal: Number(bankRows.filter(b => b.bucket === 'PrePaid (Amazon)').reduce((sum, b) => sum + b.creditAmount, 0).toFixed(2)),
    declaredCodTotal: Number(declaredCodTotal.toFixed(2)),
    declaredPrePaidTotal: Number(declaredPrePaidTotal.toFixed(2))
  };

  return {
    summary,
    reconciliationRows,
    orderStatuses,
    detailRows,
    refunds,
    bankRows,
    saleOrders: flatSaleOrders
  };
}
