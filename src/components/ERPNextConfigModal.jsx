import { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, Key, Link2, ToggleLeft, ToggleRight } from 'lucide-react';
import { getERPNextConfig, saveERPNextConfig, testERPNextConnection } from '../services/erpnextApi';

export default function ERPNextConfigModal({ isOpen, onClose, onConfigSaved }) {
  const [config, setConfig] = useState(getERPNextConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

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
    const result = await testERPNextConnection(config);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    saveERPNextConfig(config);
    if (onConfigSaved) onConfigSaved(config);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">ERPNext Connection Settings</h3>
              <p className="text-xs text-slate-400">Configure your ERPNext instance credentials for REST API task sync</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div>
              <div className="text-sm font-medium text-slate-200">Use ERPNext Mock Engine</div>
              <div className="text-xs text-slate-400">Simulate ERPNext API sync locally without a running Frappe instance</div>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, useMockMode: !prev.useMockMode }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                config.useMockMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
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
                  placeholder="e.g. http://localhost:8000 or https://erp.yourdomain.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
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
                    placeholder="Enter Frappe API Key"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
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
                    placeholder="Enter API Secret"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {testResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              <div>{testResult.message}</div>
            </div>
          )}
        </div>

        <div className="modal-footer flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-2 border border-slate-700"
          >
            {testing ? 'Testing Connection...' : 'Test Connection'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-blue-500/20"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
