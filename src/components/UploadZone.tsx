import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle2, ShieldAlert, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface UploadZoneProps {
  onReconcile: (formData: FormData) => void;
  onLoadDemo: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function UploadZone({ onReconcile, onLoadDemo, isLoading, error }: UploadZoneProps) {
  const [settlement, setSettlement] = useState<File | null>(null);
  const [saleOrders, setSaleOrders] = useState<File | null>(null);
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [tolerance, setTolerance] = useState<number>(1.0);

  // File drag states
  const [dragSettlement, setDragSettlement] = useState(false);
  const [dragOrders, setDragOrders] = useState(false);
  const [dragBank, setDragBank] = useState(false);

  const settlementRef = useRef<HTMLInputElement>(null);
  const ordersRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent, setDrag: (state: boolean) => void) => {
    e.preventDefault();
    setDrag(true);
  };

  const handleDragLeave = (e: React.DragEvent, setDrag: (state: boolean) => void) => {
    e.preventDefault();
    setDrag(false);
  };

  const handleDrop = (
    e: React.DragEvent,
    setter: React.Dispatch<React.SetStateAction<File | null>>,
    setDrag: (state: boolean) => void
  ) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx')) {
        setter(file);
      } else {
        alert('Please drop an Excel workbook (.xlsx file)');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlement || !saleOrders || !bankStatement) return;

    const formData = new FormData();
    formData.append('settlement', settlement);
    formData.append('sale_orders', saleOrders);
    formData.append('bank_statement', bankStatement);
    formData.append('tolerance', tolerance.toString());

    onReconcile(formData);
  };

  const clearFiles = () => {
    setSettlement(null);
    setSaleOrders(null);
    setBankStatement(null);
  };

  return (
    <div id="upload-panel" className="w-full max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="mb-6">
        <h2 id="upload-title" className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" />
          Upload Current Month's Statements
        </h2>
        <p id="upload-subtitle" className="text-sm text-slate-500 mt-1">
          Upload your exported statements. All calculation, reconciliation, and flag matching run entirely on the server.
        </p>
      </div>

      <form id="upload-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Upload Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Amazon Settlement Card */}
          <div
            id="drag-settlement-zone"
            onDragOver={(e) => handleDragOver(e, setDragSettlement)}
            onDragLeave={(e) => handleDragLeave(e, setDragSettlement)}
            onDrop={(e) => handleDrop(e, setSettlement, setDragSettlement)}
            onClick={() => settlementRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center h-48 ${
              settlement
                ? 'border-emerald-500 bg-emerald-50/20'
                : dragSettlement
                ? 'border-indigo-600 bg-indigo-50/30 shadow-inner'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={settlementRef}
              accept=".xlsx"
              className="hidden"
              onChange={(e) => handleFileChange(e, setSettlement)}
            />
            {settlement ? (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={settlement.name}>
                  {settlement.name}
                </span>
                <span className="text-xs text-slate-500 mt-1">{formatSize(settlement.size)}</span>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors mb-3">
                  <FileText className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">1. Amazon Settlement</span>
                <span className="text-xs text-slate-400 mt-1">Drag or click (.xlsx)</span>
              </div>
            )}
          </div>

          {/* 2. Amazon Sale Orders Card */}
          <div
            id="drag-orders-zone"
            onDragOver={(e) => handleDragOver(e, setDragOrders)}
            onDragLeave={(e) => handleDragLeave(e, setDragOrders)}
            onDrop={(e) => handleDrop(e, setSaleOrders, setDragOrders)}
            onClick={() => ordersRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center h-48 ${
              saleOrders
                ? 'border-emerald-500 bg-emerald-50/20'
                : dragOrders
                ? 'border-indigo-600 bg-indigo-50/30 shadow-inner'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={ordersRef}
              accept=".xlsx"
              className="hidden"
              onChange={(e) => handleFileChange(e, setSaleOrders)}
            />
            {saleOrders ? (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={saleOrders.name}>
                  {saleOrders.name}
                </span>
                <span className="text-xs text-slate-500 mt-1">{formatSize(saleOrders.size)}</span>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors mb-3">
                  <FileText className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">2. Sale Orders</span>
                <span className="text-xs text-slate-400 mt-1">Drag or click (.xlsx)</span>
              </div>
            )}
          </div>

          {/* 3. Bank Statement Card */}
          <div
            id="drag-bank-zone"
            onDragOver={(e) => handleDragOver(e, setDragBank)}
            onDragLeave={(e) => handleDragLeave(e, setDragBank)}
            onDrop={(e) => handleDrop(e, setBankStatement, setDragBank)}
            onClick={() => bankRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center h-48 ${
              bankStatement
                ? 'border-emerald-500 bg-emerald-50/20'
                : dragBank
                ? 'border-indigo-600 bg-indigo-50/30 shadow-inner'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={bankRef}
              accept=".xlsx"
              className="hidden"
              onChange={(e) => handleFileChange(e, setBankStatement)}
            />
            {bankStatement ? (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={bankStatement.name}>
                  {bankStatement.name}
                </span>
                <span className="text-xs text-slate-500 mt-1">{formatSize(bankStatement.size)}</span>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors mb-3">
                  <FileText className="w-5 h-5 text-slate-500 group-hover:text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">3. Bank Statement</span>
                <span className="text-xs text-slate-400 mt-1">Drag or click (.xlsx)</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div id="upload-error-banner" className="bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Execution Failed</p>
              <p className="text-rose-600/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Configurations Panel (Tolerance) */}
        <div id="configs-panel" className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <label id="tolerance-label" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Discrepancy Review Tolerance Threshold
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Orders with pricing differences exceeding this threshold (in Rupees) will be automatically flagged for your review.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="tolerance-slider"
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={tolerance}
                onChange={(e) => setTolerance(parseFloat(e.target.value))}
                className="w-40 accent-indigo-600"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">₹</span>
                <input
                  id="tolerance-num"
                  type="number"
                  min="0"
                  step="0.1"
                  value={tolerance}
                  onChange={(e) => setTolerance(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-16 px-2 py-1 text-sm text-center font-semibold text-slate-800 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submission Panel */}
        <div id="actions-panel" className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Reset button */}
          {(settlement || saleOrders || bankStatement) && (
            <button
              id="clear-files-btn"
              type="button"
              onClick={clearFiles}
              className="text-xs text-slate-500 hover:text-rose-600 transition-colors py-2 px-3 hover:bg-rose-50 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Clear chosen files
            </button>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
            {/* Run Demo button */}
            <button
              id="load-demo-btn"
              type="button"
              disabled={isLoading}
              onClick={onLoadDemo}
              className="w-full sm:w-auto text-sm px-5 py-3 font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-indigo-500 fill-indigo-500" />
              Explore with Demo Data
            </button>

            {/* Run Reconciliation button */}
            <button
              id="reconcile-submit-btn"
              type="submit"
              disabled={isLoading || !settlement || !saleOrders || !bankStatement}
              className={`w-full sm:w-auto text-sm px-6 py-3 font-semibold text-white rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                isLoading || !settlement || !saleOrders || !bankStatement
                  ? 'bg-slate-300 border-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 hover:shadow'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Reconciliation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Run Reconciliation
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
