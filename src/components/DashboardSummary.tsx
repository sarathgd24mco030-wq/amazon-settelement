import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  IndianRupee,
  TrendingDown,
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ReconciliationSummary } from '../types';

interface DashboardSummaryProps {
  summary: ReconciliationSummary;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function DashboardSummary({ summary }: DashboardSummaryProps) {
  // Format currency helpers
  const fmt = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const fmtCompact = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toFixed(0)}`;
  };

  // Pie chart data
  const matchPieData = [
    { name: 'Matched', value: summary.matchedCount },
    { name: 'Pending Settlement', value: summary.pendingCount },
    { name: 'Not in Sale Orders', value: summary.notFoundCount }
  ].filter(d => d.value > 0);

  // Reality check chart data
  const bankCheckData = [
    {
      name: 'Cash on Delivery (COD)',
      'Bank Credits': summary.bankCodTotal,
      'Settlement Declared': summary.declaredCodTotal
    },
    {
      name: 'PrePaid Transactions',
      'Bank Credits': summary.bankPrePaidTotal,
      'Settlement Declared': summary.declaredPrePaidTotal
    }
  ];

  const codDiff = summary.bankCodTotal - summary.declaredCodTotal;
  const ppDiff = summary.bankPrePaidTotal - summary.declaredPrePaidTotal;

  return (
    <div id="dashboard-summary" className="space-y-6">
      {/* KPI Cards Grid */}
      <div id="kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Matched */}
        <div id="kpi-card-matched" className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Matched Orders</span>
            <h3 className="text-2xl font-bold text-slate-800 font-sans">{summary.matchedCount}</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {fmt(summary.matchedValue)} value
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Review Flags */}
        <div id="kpi-card-flagged" className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-sm transition-all flex items-start justify-between ${
          summary.flaggedCount > 0 ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200/80'
        }`}>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Flagged Review Lines</span>
            <h3 className={`text-2xl font-bold font-sans ${summary.flaggedCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {summary.flaggedCount}
            </h3>
            <p className={`text-xs font-medium flex items-center gap-1 ${summary.flaggedCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Requires human review
            </p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            summary.flaggedCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-500'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Refunds */}
        <div id="kpi-card-refunds" className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Settlement Refunds</span>
            <h3 className="text-2xl font-bold text-rose-700 font-sans">{fmtCompact(Math.abs(summary.refundsTotal))}</h3>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              Returned / Cancelled rows
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Pending */}
        <div id="kpi-card-pending" className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Pending Settlement</span>
            <h3 className="text-2xl font-bold text-slate-800 font-sans">{summary.pendingCount}</h3>
            <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {fmt(summary.pendingValue)} value
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div id="charts-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Composition (Pie) */}
        <div id="chart-card-pie" className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-1">Order Reconciliation Status</h4>
            <p className="text-xs text-slate-400">Proportion of orders matched, pending, or unmatched.</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {matchPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={matchPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {matchPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Orders`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No data available</div>
            )}
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {matchPieData.map((d, index) => (
              <div key={d.name} className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{d.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Reality Check (Bar Chart) */}
        <div id="chart-card-bar" className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-1">Bank Credits vs. Settlement Declared</h4>
            <p className="text-xs text-slate-400">Cross-checks actual bank statement ledger credits against Amazon's declared totals.</p>
          </div>
          <div className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankCheckData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                <Tooltip formatter={(value: any) => [fmt(value), 'Value']} />
                <Legend iconSize={8} iconType="circle" />
                <Bar dataKey="Bank Credits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Settlement Declared" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            {/* COD Check */}
            <div className="text-xs">
              <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">COD Straddle Difference</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-semibold text-slate-800">{fmt(codDiff)}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  Math.abs(codDiff) < 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {Math.abs(codDiff) < 100 ? 'Normal Straddle' : 'Verify'}
                </span>
              </div>
            </div>
            {/* PrePaid Check */}
            <div className="text-xs">
              <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">PrePaid Straddle Difference</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-semibold text-slate-800">{fmt(ppDiff)}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  Math.abs(ppDiff) < 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {Math.abs(ppDiff) < 100 ? 'Normal Straddle' : 'Verify'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation Guideline card */}
      <div id="reality-check-guide" className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
        <IndianRupee className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 block mb-0.5">Understanding Straddle Differences</span>
          A slight difference between bank transaction statement receipts and Amazon's declared monthly settlement is highly normal. This is primarily caused by payments initiated by Amazon at month-end that get credited to your bank account in the subsequent calendar month. Discrepancies larger than ±₹1,000 should be cross-checked manually against transaction reference lines.
        </div>
      </div>
    </div>
  );
}
