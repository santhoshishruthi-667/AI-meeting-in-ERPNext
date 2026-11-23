'use client';
import { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, Key, Link2, ToggleLeft, ToggleRight } from 'lucide-react';
import { saveERPConfig, testERPConnection } from '../services/api';

export default function ERPNextConfigModal({ isOpen, onClose, erpConfig, onConfigSaved }) {
  const [config, setConfig] = useState(erpConfig || {
    host: 'http://localhost:8000',
    apiKey: 'demo_api_key',
    apiSecret: 'demo_api_secret',
    useMockMode: true
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (erpConfig) setConfig(erpConfig);
  }, [erpConfig]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testERPConnection(config);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: 'FastAPI Backend connection failed: ' + err.message });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    try {
      await saveERPConfig(config);
      if (onConfigSaved) onConfigSaved(config);
      onClose();
    } catch (err) {
      alert('Failed to save config: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ERPNext Connection Settings</h3>
              <p className="text-xs text-slate-400">FastAPI backend to ERPNext REST API configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-200">Use ERPNext Mock Engine</div>
              <div className="text-[11px] text-slate-400">Simulate ERPNext task sync locally without Frappe server</div>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, useMockMode: !prev.useMockMode }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                config.useMockMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {config.useMockMode ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              {config.useMockMode ? 'Mock Active' : 'Real ERPNext'}
            </button>
          </div>

          {!config.useMockMode && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-400" /> ERPNext Host URL
                </label>
                <input
                  type="text"
                  name="host"
                  value={config.host}
                  onChange={handleChange}
                  placeholder="e.g. http://localhost:8000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" /> API Key
                  </label>
                  <input
                    type="text"
                    name="apiKey"
                    value={config.apiKey}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" /> API Secret
                  </label>
                  <input
                    type="password"
                    name="apiSecret"
                    value={config.apiSecret}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              <div>{testResult.message}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
