
import React, { useState, useCallback, useRef } from 'react';
import { 
  FileUp, 
  Download, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { PartEntry, ProcessedPart } from './types';
import { parseExcelFile, exportToExcel } from './excelUtils';
import { processPartWithGemini } from './geminiService';

const App: React.FC = () => {
  const [data, setData] = useState<ProcessedPart[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const parts = await parseExcelFile(file);
      if (parts.length === 0) {
        throw new Error("No valid data found in Excel. Please check column names 'Part' and 'Website'.");
      }
      const initialData: ProcessedPart[] = parts.map(p => ({
        ...p,
        Link: 'Pending',
        Lifecycle: 'Pending',
        Datasheet: 'Pending',
        status: 'pending'
      }));
      setData(initialData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startProcessing = async () => {
    if (data.length === 0) return;
    
    setIsProcessing(true);
    abortControllerRef.current = false;
    setProgress({ current: 0, total: data.length });

    const updatedData = [...data];

    for (let i = 0; i < updatedData.length; i++) {
      if (abortControllerRef.current) break;

      const item = updatedData[i];
      if (item.status === 'completed') {
        setProgress(prev => ({ ...prev, current: i + 1 }));
        continue;
      }

      updatedData[i] = { ...item, status: 'processing' };
      setData([...updatedData]);

      try {
        const result = await processPartWithGemini(item.Part, item.Website);
        updatedData[i] = {
          ...item,
          Link: result.link,
          Lifecycle: result.lifecycle,
          Datasheet: result.datasheet,
          status: 'completed'
        };
      } catch (err) {
        updatedData[i] = { ...item, status: 'error', error: 'API Error' };
      }

      setData([...updatedData]);
      setProgress({ current: i + 1, total: data.length });
    }

    setIsProcessing(false);
  };

  const stopProcessing = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
  };

  const clearData = () => {
    setData([]);
    setError(null);
    setProgress({ current: 0, total: 0 });
  };

  const completedCount = data.filter(d => d.status === 'completed').length;
  const isDone = data.length > 0 && completedCount === data.length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileSpreadsheet className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Part Lifecycle AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {data.length > 0 && (
              <button 
                onClick={clearData}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Clear All
              </button>
            )}
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:underline"
            >
              API Key Info
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
        {/* Upload Section */}
        {data.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center space-y-6 max-w-2xl mx-auto mt-12 hover:border-blue-400 transition-colors">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <FileUp className="w-10 h-10 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-800">Import Your Data</h2>
              <p className="text-slate-500">Upload an Excel file with 'Part' and 'Website' columns to begin analysis.</p>
            </div>
            <label className="inline-block">
              <span className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold cursor-pointer transition-all shadow-lg hover:shadow-blue-200 active:scale-95 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" /> Choose Excel File
              </span>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-2 max-w-md mx-auto">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Process Controls */}
        {data.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="text-sm text-slate-500">
                <span className="block font-medium text-slate-900 text-lg">{data.length}</span>
                Parts Loaded
              </div>
              <div className="h-10 w-px bg-slate-200 hidden md:block" />
              <div className="text-sm text-slate-500">
                <span className="block font-medium text-slate-900 text-lg">{completedCount}</span>
                Processed
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              {!isProcessing && !isDone && (
                <button 
                  onClick={startProcessing}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" /> Start Research
                </button>
              )}
              {isProcessing && (
                <button 
                  onClick={stopProcessing}
                  className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 text-red-600 px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Loader2 className="w-5 h-5 animate-spin" /> Stop
                </button>
              )}
              {isDone && (
                <button 
                  onClick={() => exportToExcel(data)}
                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" /> Export to Excel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-600">Processing components...</span>
              <span className="text-blue-600">{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Data Table */}
        {data.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Part</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Website</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Link</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lifecycle</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Datasheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        {item.status === 'processing' ? (
                          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : item.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : item.status === 'error' ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{item.Part}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{item.Website}</td>
                      <td className="px-6 py-4">
                        {item.Link === 'Pending' ? (
                          <span className="text-slate-300 italic text-sm">Waiting...</span>
                        ) : item.Link === 'Not found' ? (
                          <span className="text-slate-400 text-sm">Not found</span>
                        ) : (
                          <a 
                            href={item.Link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                          >
                            View Page <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.Lifecycle === 'Pending' ? (
                          <span className="text-slate-300 italic text-sm">Waiting...</span>
                        ) : (
                          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase ${
                            item.Lifecycle.toLowerCase().includes('active') || item.Lifecycle.toLowerCase().includes('in stock')
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.Lifecycle.toLowerCase().includes('obsolete') || item.Lifecycle.toLowerCase().includes('eol') || item.Lifecycle.toLowerCase().includes('discontinued')
                                ? 'bg-red-50 text-red-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.Lifecycle}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.Datasheet === 'Pending' ? (
                          <span className="text-slate-300 italic text-sm">Waiting...</span>
                        ) : item.Datasheet === 'Not found' ? (
                          <span className="text-slate-400 text-sm">Not found</span>
                        ) : (
                          <a 
                            href={item.Datasheet} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-medium transition-colors w-fit"
                          >
                            PDF <Download className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>© 2024 AI Part Explorer. Advanced data extraction powered by Gemini.</p>
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> System Active</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Gemini 3 Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
