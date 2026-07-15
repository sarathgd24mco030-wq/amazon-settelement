import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  ArrowLeft,
  Download,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  TrendingDown,
  LayoutDashboard,
  Coins,
  ChevronDown,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReconciliationResult } from './types';
import UploadZone from './components/UploadZone';
import DashboardSummary from './components/DashboardSummary';
import TabbedTables from './components/TabbedTables';
import { downloadCSV, downloadPDF } from './exportUtils';

export default function App() {
  const [data, setData] = useState<ReconciliationResult | null>(null);
  const [cacheId, setCacheId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleReconcile = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        let errMsg = `HTTP error ${response.status}`;
        try {
          const errText = await response.text();
          try {
            const errJson = JSON.parse(errText);
            errMsg = errJson.error || errMsg;
          } catch (_) {
            if (errText && errText.trim().length > 0 && errText.length < 150) {
              errMsg = errText.trim();
            }
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      
      let resData;
      try {
        resData = await response.json();
      } catch (jsonErr) {
        throw new Error('The server returned an invalid, non-JSON response.');
      }

      if (resData.success) {
        setData(resData.result);
        setCacheId(resData.cacheId);
      } else {
        throw new Error(resData.error || 'Failed to complete reconciliation.');
      }
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err?.message || 'An unexpected error occurred during reconciliation processing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ demo: 'true' })
      });
      if (!response.ok) {
        let errMsg = `HTTP error ${response.status}`;
        try {
          const errText = await response.text();
          try {
            const errJson = JSON.parse(errText);
            errMsg = errJson.error || errMsg;
          } catch (_) {
            if (errText && errText.trim().length > 0 && errText.length < 150) {
              errMsg = errText.trim();
            }
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      
      let resData;
      try {
        resData = await response.json();
      } catch (jsonErr) {
        throw new Error('The server returned an invalid, non-JSON response.');
      }

      if (resData.success) {
        setData(resData.result);
        setCacheId(resData.cacheId);
      } else {
        throw new Error(resData.error || 'Failed to load demo data.');
      }
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err?.message || 'An unexpected error occurred while loading demo reconciliation data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!cacheId) return;
    window.location.href = `/api/download/${cacheId}`;
  };

  const handleReset = () => {
    setData(null);
    setCacheId(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-700 font-sans antialiased flex flex-col">
      {/* Visual top border line */}
      <div className="h-1.5 bg-indigo-600 w-full" />

      {/* Main Header Bar */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2 justify-center sm:justify-start">
                Amazon Settlement Reconciliation
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded-lg border border-indigo-100 uppercase">
                  v1.2 Full-Stack
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Reconcile settlements, invoices, and bank credits into multi-tab sheets</p>
            </div>
          </div>

          {/* Quick status indicator or controls */}
          <div className="flex items-center gap-3">
            {data && (
              <button
                id="header-back-btn"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Upload New Files
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <AnimatePresence mode="wait">
          {!data ? (
            /* 1. UPLOADER SCREEN */
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 py-4"
            >
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Month-over-Month Order Reconciliation</h3>
                <p className="text-sm text-slate-500">
                  Cross-checks settlement ledger items, sale order sheets, and bank credits to instantly flag pricing differences, pending items, and bank discrepancies.
                </p>
              </div>

              <UploadZone
                onReconcile={handleReconcile}
                onLoadDemo={handleLoadDemo}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>
          ) : (
            /* 2. RECONCILIATION REPORT DASHBOARD SCREEN */
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Dashboard Controls Panel */}
              <div id="dashboard-controls" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-800">Reconciliation Analysis Complete</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-xs text-slate-500 font-medium">Auto-generated dated archive file is ready.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {/* Reset analysis */}
                  <button
                    id="dash-reset-btn"
                    onClick={handleReset}
                    className="w-full sm:w-auto text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Report
                  </button>

                  {/* Split Button Export Dropdown Group */}
                  <div className="relative inline-flex w-full sm:w-auto rounded-xl shadow-xs" ref={dropdownRef}>
                    {/* Left primary button (Downloads Excel) */}
                    <button
                      id="dash-download-excel-btn"
                      onClick={handleDownloadExcel}
                      title="Download full multi-tab report"
                      className="flex-1 sm:flex-initial text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-l-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-y border-l border-indigo-600"
                    >
                      <Download className="w-4 h-4" />
                      Export Report
                    </button>

                    {/* Right Chevron Button to toggle dropdown */}
                    <button
                      id="dash-export-dropdown-toggle"
                      onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                      className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2.5 rounded-r-xl transition-all flex items-center justify-center cursor-pointer border border-indigo-600 border-l-indigo-500/50"
                      aria-label="Select export format"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Options Panel */}
                    <AnimatePresence>
                      {isExportDropdownOpen && (
                        <motion.div
                          id="export-dropdown-menu"
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 origin-top-right"
                        >
                          <div className="px-3 py-1.5 border-b border-slate-100 mb-1 select-none">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Available Formats</span>
                          </div>

                          <button
                            id="export-option-excel"
                            onClick={() => {
                              handleDownloadExcel();
                              setIsExportDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <div className="text-left">
                              <p className="font-semibold text-slate-800 leading-tight">Multi-Tab Excel (.xlsx)</p>
                              <p className="text-[10px] text-slate-400 font-normal mt-0.5">All worksheets fully populated</p>
                            </div>
                          </button>

                          <button
                            id="export-option-csv"
                            onClick={() => {
                              if (data) downloadCSV(data);
                              setIsExportDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                            <div className="text-left">
                              <p className="font-semibold text-slate-800 leading-tight">Order Reconciliation (.csv)</p>
                              <p className="text-[10px] text-slate-400 font-normal mt-0.5">Main sheet as a flat table</p>
                            </div>
                          </button>

                          <button
                            id="export-option-pdf"
                            onClick={() => {
                              if (data) downloadPDF(data);
                              setIsExportDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-rose-600" />
                            <div className="text-left">
                              <p className="font-semibold text-slate-800 leading-tight">Audit PDF Report (.pdf)</p>
                              <p className="text-[10px] text-slate-400 font-normal mt-0.5">Executive overview & main logs</p>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Summary Metrics & Charts */}
              <DashboardSummary summary={data.summary} />

              {/* Data Tables tabs visual list */}
              <TabbedTables data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 px-6 mt-12 text-center text-xs text-slate-400 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p id="footer-credits">Amazon Settlement Reconciliation Application • Month-over-Month Accounting Tool</p>
          <p id="footer-author" className="font-mono text-[10px]">Secure Server-Side Compilation Engine</p>
        </div>
      </footer>
    </div>
  );
}
