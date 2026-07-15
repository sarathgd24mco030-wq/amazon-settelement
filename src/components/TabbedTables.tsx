import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  FileSpreadsheet,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ReconciliationResult, ReconciliationRow, SettlementComponent } from '../types';
import { SHORT_LABELS, COMPONENT_DEFS } from '../../server/reconciliationEngine';

interface TabbedTablesProps {
  data: ReconciliationResult;
}

type ActiveTab = 'recon' | 'status' | 'detail' | 'refunds' | 'bank' | 'sale_orders';

export default function TabbedTables({ data }: TabbedTablesProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('recon');

  // Search and filter states
  const [reconSearch, setReconSearch] = useState('');
  const [reconStatusFilter, setReconStatusFilter] = useState('All');
  const [reconFlagFilter, setReconFlagFilter] = useState('All');

  const [statusSearch, setStatusSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [detailSearch, setDetailSearch] = useState('');
  const [refundSearch, setRefundSearch] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [soSearch, setSoSearch] = useState('');

  // Row expansions for Reconciliation sheet
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Pagination states (15 per page for performance)
  const [reconPage, setReconPage] = useState(1);
  const [statusPage, setStatusPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const [refundsPage, setRefundsPage] = useState(1);
  const [bankPage, setBankPage] = useState(1);
  const [soPage, setSoPage] = useState(1);

  const PAGE_SIZE = 15;

  // Format currency helpers
  const fmt = (val: number | null) => {
    if (val === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  const fmtDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const toggleRow = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // --- Filtering & Sorting ---

  // 1. Reconciliation Sheet
  const filteredReconRows = useMemo(() => {
    return data.reconciliationRows.filter(row => {
      const matchesSearch = row.orderId.toLowerCase().includes(reconSearch.toLowerCase());
      const matchesStatus = reconStatusFilter === 'All' || row.matchStatus === reconStatusFilter;
      const matchesFlag = reconFlagFilter === 'All' || row.flag === reconFlagFilter;
      return matchesSearch && matchesStatus && matchesFlag;
    });
  }, [data.reconciliationRows, reconSearch, reconStatusFilter, reconFlagFilter]);

  // 2. Status Sheet
  const filteredStatusRows = useMemo(() => {
    return Object.entries(data.orderStatuses).map(([orderId, val]) => ({
      orderId,
      ...val
    })).filter(row => {
      const matchesSearch = row.orderId.toLowerCase().includes(statusSearch.toLowerCase());
      const matchesStatus = statusFilter === 'All' ||
        (statusFilter === 'Settled' && row._settled) ||
        (statusFilter === 'Pending' && !row._settled);
      return matchesSearch && matchesStatus;
    });
  }, [data.orderStatuses, statusSearch, statusFilter]);

  // 3. Detail Sheet
  const filteredDetailRows = useMemo(() => {
    return data.detailRows.filter(row => {
      return row.orderId.toLowerCase().includes(detailSearch.toLowerCase()) ||
             row.sku.toLowerCase().includes(detailSearch.toLowerCase()) ||
             row.settlementId.toLowerCase().includes(detailSearch.toLowerCase());
    });
  }, [data.detailRows, detailSearch]);

  // 4. Refunds Sheet
  const filteredRefundsRows = useMemo(() => {
    return data.refunds.filter(row => {
      return row.orderId.toLowerCase().includes(refundSearch.toLowerCase()) ||
             row.description.toLowerCase().includes(refundSearch.toLowerCase()) ||
             row.settlementId.toLowerCase().includes(refundSearch.toLowerCase());
    });
  }, [data.refunds, refundSearch]);

  // 5. Bank Sheet
  const filteredBankRows = useMemo(() => {
    return data.bankRows.filter(row => {
      return row.particulars.toLowerCase().includes(bankSearch.toLowerCase()) ||
             row.bucket.toLowerCase().includes(bankSearch.toLowerCase());
    });
  }, [data.bankRows, bankSearch]);

  // 6. Sales Order Sheet
  const filteredSoRows = useMemo(() => {
    return data.saleOrders.filter(row => {
      return row.orderId.toLowerCase().includes(soSearch.toLowerCase()) ||
             row.status.toLowerCase().includes(soSearch.toLowerCase());
    });
  }, [data.saleOrders, soSearch]);

  // Pagination helper component
  const PaginationControls = ({
    totalItems,
    currentPage,
    onPageChange
  }: {
    totalItems: number;
    currentPage: number;
    onPageChange: (p: number) => void;
  }) => {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-white select-none">
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{Math.min(totalItems, (currentPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
          <span className="font-semibold text-slate-700">{Math.min(totalItems, currentPage * PAGE_SIZE)}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalItems}</span> rows
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 text-slate-500 hover:bg-slate-150 rounded disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 text-slate-500 hover:bg-slate-150 rounded disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 text-slate-500 hover:bg-slate-150 rounded disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 text-slate-500 hover:bg-slate-150 rounded disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Sliced rows for current page
  const currentReconRows = filteredReconRows.slice((reconPage - 1) * PAGE_SIZE, reconPage * PAGE_SIZE);
  const currentStatusRows = filteredStatusRows.slice((statusPage - 1) * PAGE_SIZE, statusPage * PAGE_SIZE);
  const currentDetailRows = filteredDetailRows.slice((detailPage - 1) * PAGE_SIZE, detailPage * PAGE_SIZE);
  const currentRefundsRows = filteredRefundsRows.slice((refundsPage - 1) * PAGE_SIZE, refundsPage * PAGE_SIZE);
  const currentBankRows = filteredBankRows.slice((bankPage - 1) * PAGE_SIZE, bankPage * PAGE_SIZE);
  const currentSoRows = filteredSoRows.slice((soPage - 1) * PAGE_SIZE, soPage * PAGE_SIZE);

  return (
    <div id="reconciliation-tables-panel" className="space-y-4">
      {/* Visual Navigation Tabs */}
      <div id="tabs-navigation" className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-px scrollbar-none select-none">
        {[
          { id: 'recon', label: 'Order Reconciliation', count: filteredReconRows.length },
          { id: 'status', label: 'Order Status Log', count: filteredStatusRows.length },
          { id: 'detail', label: 'Raw Settlement Details', count: filteredDetailRows.length },
          { id: 'refunds', label: 'Refunds & Adjustments', count: filteredRefundsRows.length },
          { id: 'bank', label: 'Bank Credit Detail', count: filteredBankRows.length },
          { id: 'sale_orders', label: 'Amazon Sales Orders', count: filteredSoRows.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as ActiveTab);
              // Reset pagination pages
              setReconPage(1);
              setStatusPage(1);
              setDetailPage(1);
              setRefundsPage(1);
              setBankPage(1);
              setSoPage(1);
            }}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {/* --- 1. Tab: Reconciliation --- */}
        {activeTab === 'recon' && (
          <div id="tab-recon-content">
            {/* Filters panel */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Amazon Order ID..."
                  value={reconSearch}
                  onChange={(e) => {
                    setReconSearch(e.target.value);
                    setReconPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Match Status:</span>
                </div>
                <select
                  value={reconStatusFilter}
                  onChange={(e) => {
                    setReconStatusFilter(e.target.value);
                    setReconPage(1);
                  }}
                  className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Matched">Matched</option>
                  <option value="Not found in Sale Orders">Not in Sale Orders</option>
                  <option value="Not yet in Settlement (pending)">Pending Settlement</option>
                </select>

                <div className="flex items-center gap-1 text-xs text-slate-500 ml-2">
                  <span>Flag:</span>
                </div>
                <select
                  value={reconFlagFilter}
                  onChange={(e) => {
                    setReconFlagFilter(e.target.value);
                    setReconPage(1);
                  }}
                  className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="All">All Flags</option>
                  <option value="OK">OK Only</option>
                  <option value="REVIEW">REVIEW Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase select-none">
                    <th className="py-3.5 px-4 w-12"></th>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4 text-right">Settled Amount (Calculated)</th>
                    <th className="py-3.5 px-4 text-right">Sale Order Total</th>
                    <th className="py-3.5 px-4 text-right">Difference</th>
                    <th className="py-3.5 px-4">Match Status</th>
                    <th className="py-3.5 px-4">Anomalous Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentReconRows.length > 0 ? (
                    currentReconRows.map((row) => {
                      const isExpanded = !!expandedOrders[row.orderId];
                      return (
                        <React.Fragment key={row.orderId}>
                          <tr
                            className={`hover:bg-slate-50/40 transition-colors ${
                              row.flag === 'REVIEW' ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleRow(row.orderId)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-800">{row.orderId}</td>
                            <td className="py-3 px-4 text-right font-medium text-slate-800">{fmt(row.calculatedTotal)}</td>
                            <td className="py-3 px-4 text-right font-medium">{fmt(row.saleOrderTotal)}</td>
                            <td className={`py-3 px-4 text-right font-semibold font-mono ${
                              row.difference !== null && Math.abs(row.difference) > 0.01
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}>
                              {row.difference !== null ? (row.difference > 0 ? `+${row.difference.toFixed(2)}` : row.difference.toFixed(2)) : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                row.matchStatus === 'Matched'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : row.matchStatus === 'Not found in Sale Orders'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {row.matchStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                row.flag === 'REVIEW'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}>
                                {row.flag === 'REVIEW' ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    REVIEW
                                  </>
                                ) : (
                                  'OK'
                                )}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded detail section */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="bg-slate-50/50 p-5 border-l-4 border-indigo-500">
                                <div className="space-y-4">
                                  {/* Breakdown Header */}
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200/80 pb-2.5">
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                      Amazon Settlement 13-Component Breakdown
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-mono italic mt-1 sm:mt-0">
                                      {row.differenceBreakdown}
                                    </span>
                                  </div>

                                  {/* Components Bento Grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {COMPONENT_DEFS.map((c) => {
                                      const val = row.components[c.label as keyof SettlementComponent] || 0;
                                      const isZero = Math.abs(val) < 0.001;
                                      return (
                                        <div
                                          key={c.label}
                                          className={`border rounded-lg p-3 flex flex-col justify-between ${
                                            isZero ? 'bg-white/40 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-2xs'
                                          }`}
                                        >
                                          <span className="text-[10px] text-slate-400 font-semibold uppercase truncate" title={c.label}>
                                            {SHORT_LABELS[c.label] || c.label}
                                          </span>
                                          <span className={`text-xs font-bold mt-1 font-mono ${
                                            val < 0 ? 'text-rose-600' : 'text-slate-800'
                                          }`}>
                                            {fmt(val)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No orders match the specified filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredReconRows.length}
              currentPage={reconPage}
              onPageChange={setReconPage}
            />
          </div>
        )}

        {/* --- 2. Tab: Order Status Log --- */}
        {activeTab === 'status' && (
          <div id="tab-status-content">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Amazon Order ID..."
                  value={statusSearch}
                  onChange={(e) => {
                    setStatusSearch(e.target.value);
                    setStatusPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Settlement Status:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setStatusPage(1);
                  }}
                  className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="All">All Orders</option>
                  <option value="Settled">Settled Only</option>
                  <option value="Pending">Pending Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Internal Workflow Status</th>
                    <th className="py-3.5 px-4">Order Placement Date</th>
                    <th className="py-3.5 px-4 text-right">Invoiced Price</th>
                    <th className="py-3.5 px-4">Settlement Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentStatusRows.length > 0 ? (
                    currentStatusRows.map((row) => (
                      <tr key={row.orderId} className={`hover:bg-slate-50/40 ${!row._settled ? 'bg-amber-50/20' : ''}`}>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{row.orderId}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.status === 'COMPLETE'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{fmtDate(row.date)}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-800">{fmt(row.totalPrice)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                            row._settled ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${row._settled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {row._settled ? 'Settled' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredStatusRows.length}
              currentPage={statusPage}
              onPageChange={setStatusPage}
            />
          </div>
        )}

        {/* --- 3. Tab: Raw Settlement Details --- */}
        {activeTab === 'detail' && (
          <div id="tab-detail-content">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by SKU, Order ID, Settlement ID..."
                  value={detailSearch}
                  onChange={(e) => {
                    setDetailSearch(e.target.value);
                    setDetailPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Settlement ID</th>
                    <th className="py-3.5 px-4">SKU / Code</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Payment Channel</th>
                    <th className="py-3.5 px-4 text-right font-mono">Net Settlement Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentDetailRows.length > 0 ? (
                    currentDetailRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{row.orderId}</td>
                        <td className="py-3.5 px-4 text-slate-500">{row.settlementId}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">{row.sku}</td>
                        <td className="py-3.5 px-4 truncate max-w-[200px]" title={row.description}>{row.description}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-150 text-[10px] text-slate-600 font-bold">
                            {row.paymentType}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold font-mono ${row.total < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {fmt(row.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No lines match search criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredDetailRows.length}
              currentPage={detailPage}
              onPageChange={setDetailPage}
            />
          </div>
        )}

        {/* --- 4. Tab: Refunds & Adjustments --- */}
        {activeTab === 'refunds' && (
          <div id="tab-refunds-content">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Settlement ID, Description..."
                  value={refundSearch}
                  onChange={(e) => {
                    setRefundSearch(e.target.value);
                    setRefundsPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Source Channel</th>
                    <th className="py-3.5 px-4">Settlement ID</th>
                    <th className="py-3.5 px-4">Transaction Class</th>
                    <th className="py-3.5 px-4">Particular Description</th>
                    <th className="py-3.5 px-4 text-right">Adjustment Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentRefundsRows.length > 0 ? (
                    currentRefundsRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{row.orderId}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded text-[10px] font-bold">
                            {row.source}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{row.settlementId}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600">{row.amountType}</td>
                        <td className="py-3.5 px-4 truncate max-w-[220px]" title={row.description}>{row.description}</td>
                        <td className="py-3.5 px-4 text-right font-bold font-mono text-rose-600">
                          {fmt(row.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No refund or adjustments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredRefundsRows.length}
              currentPage={refundsPage}
              onPageChange={setRefundsPage}
            />
          </div>
        )}

        {/* --- 5. Tab: Bank Credit Detail --- */}
        {activeTab === 'bank' && (
          <div id="tab-bank-content">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by particulars or category..."
                  value={bankSearch}
                  onChange={(e) => {
                    setBankSearch(e.target.value);
                    setBankPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    <th className="py-3.5 px-4">Transaction Date</th>
                    <th className="py-3.5 px-4">Particular Ledger Description</th>
                    <th className="py-3.5 px-4 text-right">Credit Amount (INR)</th>
                    <th className="py-3.5 px-4">Automated Bucket Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentBankRows.length > 0 ? (
                    currentBankRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4 text-slate-500">{row.transactionDate}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700" title={row.particulars}>{row.particulars}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">{fmt(row.creditAmount)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.bucket === 'COD (Amazon)'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : row.bucket === 'PrePaid (Amazon)'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-150'
                          }`}>
                            {row.bucket}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">No ledger records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredBankRows.length}
              currentPage={bankPage}
              onPageChange={setBankPage}
            />
          </div>
        )}

        {/* --- 6. Tab: Amazon Sales Orders --- */}
        {activeTab === 'sale_orders' && (
          <div id="tab-sale-orders-content">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Amazon Order ID..."
                  value={soSearch}
                  onChange={(e) => {
                    setSoSearch(e.target.value);
                    setSoPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Channel Origin</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Order Date</th>
                    <th className="py-3.5 px-4">Sales Order Workflow</th>
                    <th className="py-3.5 px-4 text-right">Invoiced Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentSoRows.length > 0 ? (
                    currentSoRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{row.orderId}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-semibold">{row.channel}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-1.5 py-0.5 rounded bg-slate-50 text-[10px] text-slate-500 font-bold border border-slate-150">
                            {row.paymentType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{fmtDate(row.orderDate)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.status === 'COMPLETE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.status === 'PROCESSING'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800 font-mono">
                          {fmt(row.totalPrice)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No orders matched the criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              totalItems={filteredSoRows.length}
              currentPage={soPage}
              onPageChange={setSoPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
