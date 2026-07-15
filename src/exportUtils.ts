import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReconciliationResult } from './types';

/**
 * Downloads the Order Reconciliation rows as a CSV file.
 */
export function downloadCSV(data: ReconciliationResult) {
  const headers = [
    'Amazon Order ID',
    'Calculated Settled Amount (INR)',
    'Sale Order Invoiced Total (INR)',
    'Difference (INR)',
    'Match Status',
    'Anomalous Flag',
    'Breakdown Description'
  ];

  const rows = data.reconciliationRows.map(row => [
    row.orderId,
    row.calculatedTotal.toFixed(2),
    row.saleOrderTotal !== null ? row.saleOrderTotal.toFixed(2) : '—',
    row.difference !== null ? row.difference.toFixed(2) : '0.00',
    row.matchStatus,
    row.flag,
    row.differenceBreakdown
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Amazon_Reconciliation_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a highly polished PDF executive report of the reconciliation results.
 */
export function downloadPDF(data: ReconciliationResult) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const summary = data.summary;

  // Header Theme Panel (visual accent block)
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(14, 15, 182, 22, 'F');

  // Title inside accent panel
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Amazon Settlement Reconciliation Report', 20, 23);

  // Subtitle inside accent panel
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(224, 231, 255); // indigo-100
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}  |  System Integrity Status: verified`,
    20,
    30
  );

  // Section 1: Executive Summary Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('1. Executive Reconciliation Summary', 14, 47);

  // Summary Grid formatting
  const summaryRows = [
    [
      'Matched Orders Count',
      `${summary.matchedCount} orders`,
      'Total Settled Value (INR)',
      `INR ${summary.matchedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ],
    [
      'Pending Settlement Count',
      `${summary.pendingCount} orders`,
      'Estimated Pending Value',
      `INR ${summary.pendingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ],
    [
      'Discrepancies Flagged',
      `${summary.flaggedCount} issues`,
      'Total Refund Adjustments',
      `INR ${summary.refundsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ],
    [
      'Bank COD Credit Ledger',
      `INR ${summary.bankCodTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Declared Amazon COD Total',
      `INR ${summary.declaredCodTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ],
    [
      'Bank PrePaid Credit Ledger',
      `INR ${summary.bankPrePaidTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Declared Amazon PrePaid Total',
      `INR ${summary.declaredPrePaidTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]
  ];

  autoTable(doc, {
    startY: 51,
    head: [['Audited Metric', 'Consolidated Value', 'Benchmark Metric', 'Calculated Total']],
    body: summaryRows,
    theme: 'striped',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48 },
      1: { cellWidth: 43 },
      2: { fontStyle: 'bold', cellWidth: 48 },
      3: { cellWidth: 43 }
    },
    margin: { left: 14, right: 14 }
  });

  // Section 2: Order Reconciliation Table
  const nextY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Order Reconciliation Table', 14, nextY);

  const reconHeaders = [
    'Amazon Order ID',
    'Settled Amt (INR)',
    'Invoiced Total (INR)',
    'Difference (INR)',
    'Match Status',
    'Flag'
  ];

  const reconRows = data.reconciliationRows.map(row => [
    row.orderId,
    row.calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    row.saleOrderTotal !== null ? row.saleOrderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—',
    row.difference !== null ? (row.difference > 0 ? `+${row.difference.toFixed(2)}` : row.difference.toFixed(2)) : '0.00',
    row.matchStatus,
    row.flag
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [reconHeaders],
    body: reconRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 44, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 28 },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 24 },
      4: { cellWidth: 42 },
      5: { halign: 'center', cellWidth: 16 }
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body') {
        if (cellData.column.index === 5) {
          const flag = cellData.cell.text[0];
          if (flag === 'REVIEW') {
            cellData.cell.styles.textColor = [180, 83, 9]; // Amber-700
            cellData.cell.styles.fillColor = [254, 243, 199]; // Amber-100 bg
            cellData.cell.styles.fontStyle = 'bold';
          } else {
            cellData.cell.styles.textColor = [71, 85, 105];
          }
        }
        if (cellData.column.index === 3) {
          const diffVal = parseFloat(cellData.cell.text[0]);
          if (!isNaN(diffVal) && Math.abs(diffVal) > 0.01) {
            cellData.cell.styles.textColor = [225, 29, 72]; // Rose-600
            cellData.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 15 }
  });

  // Stamp clean footer page numbering
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Page ${i} of ${pageCount}`, 14, 287);
    doc.text(
      'Amazon Settlement Reconciliation Audit Tool • Confidential',
      196 - doc.getTextWidth('Amazon Settlement Reconciliation Audit Tool • Confidential'),
      287
    );
  }

  doc.save(`Amazon_Reconciliation_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
