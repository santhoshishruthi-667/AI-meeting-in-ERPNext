import { useState } from 'react';
import { CheckSquare, CheckCircle2, XCircle, Server, ExternalLink, RefreshCw, AlertCircle, ShieldCheck, Sparkles, Send, Trash2, ArrowUpRight } from 'lucide-react';
import { syncTaskToERPNext, getSyncedTasksFromStorage } from '../services/erpnextApi';

export default function ERPNextSyncHub({ extractedTasks, setExtractedTasks, erpnextConfig, onOpenConfig }) {
  const [syncedTasksHistory, setSyncedTasksHistory] = useState(getSyncedTasksFromStorage());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('approval'); // 'approval' or 'history'

  const handleApprove = (taskId) => {
    setExtractedTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Approved' } : t));
  };

  const handleReject = (taskId) => {
    setExtractedTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Rejected' } : t));
  };

  const handleBulkApprove = () => {
    setExtractedTasks(prev => prev.map(t => t.status === 'Pending Approval' ? { ...t, status: 'Approved' } : t));
  };

  const handleSyncAllApproved = async () => {
    const approvedTasks = extractedTasks.filter(t => t.status === 'Approved');
    if (approvedTasks.length === 0) {
      alert('Please approve at least one task before syncing to ERPNext!');
      return;
    }

    setIsSyncing(true);
    setSyncLogs([]);

    for (let i = 0; i < approvedTasks.length; i++) {
      const task = approvedTasks[i];
      setSyncLogs(prev => [...prev, `[${i + 1}/${approvedTasks.length}] Syncing "${task.title}" to ERPNext...`]);

      const result = await syncTaskToERPNext(task, erpnextConfig);
      
      if (result.success) {
        setSyncLogs(prev => [...prev, `✅ Created ERPNext DocType Task: ${result.taskId}`]);
        // Update task state
        setExtractedTasks(prev => prev.map(t => t.id === task.id ? result.task : t));
      } else {
        setSyncLogs(prev => [...prev, `❌ Failed to sync: ${result.message}`]);
      }
    }

    // Refresh history
    setSyncedTasksHistory(getSyncedTasksFromStorage());
    setIsSyncing(false);
  };

  const pendingCount = extractedTasks.filter(t => t.status === 'Pending Approval').length;
  const approvedCount = extractedTasks.filter(t => t.status === 'Approved').length;
  const syncedCount = extractedTasks.filter(t => t.status === 'Synced' || t.status === 'Synced (Offline Mode)').length;

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Step 4: Human-in-the-Loop Approval & ERPNext DocType Sync
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">ERPNext Task Sync Hub</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Review and verify AI-generated tasks before pushing them to your ERPNext instance as official Task DocTypes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
            >
              Bulk Approve All
            </button>

            <button
              onClick={handleSyncAllApproved}
              disabled={isSyncing || approvedCount === 0}
              className={`px-5 py-3 rounded-xl text-xs font-extrabold transition shadow-lg flex items-center gap-2 ${
                approvedCount > 0 && !isSyncing
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-200" />}
              <span>Sync {approvedCount} Approved Tasks to ERPNext</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pending Review</div>
            <div className="text-xl font-extrabold text-amber-400">{pendingCount}</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Approved for Sync</div>
            <div className="text-xl font-extrabold text-emerald-400">{approvedCount}</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Synced to ERPNext</div>
            <div className="text-xl font-extrabold text-blue-400">{syncedCount}</div>
          </div>
        </div>
      </div>

      {/* Sync Console Progress Overlay */}
      {isSyncing && (
        <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Communicating with ERPNext REST API...</span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto">
            {syncLogs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('approval')}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === 'approval' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tasks Approval Queue ({extractedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === 'history' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Synced ERPNext Task DocTypes History ({syncedTasksHistory.length})
        </button>
      </div>

      {activeTab === 'approval' ? (
        <div className="space-y-4">
          {extractedTasks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold">No tasks in approval queue.</p>
              <p className="text-xs text-slate-500">Go to Step 2 & 3 to start a meeting and extract AI tasks.</p>
            </div>
          ) : (
            extractedTasks.map((task) => (
              <div
                key={task.id}
                className={`p-5 rounded-2xl border transition space-y-3 ${
                  task.status === 'Approved' ? 'bg-emerald-950/20 border-emerald-500/40' :
                  task.status === 'Rejected' ? 'bg-rose-950/20 border-rose-500/30 opacity-60' :
                  task.status === 'Synced' || task.status === 'Synced (Offline Mode)' ? 'bg-blue-950/20 border-blue-500/40' :
                  'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        task.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        task.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        task.status === 'Synced' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {task.status}
                      </span>

                      {task.erpnextTaskId && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Server className="w-3 h-3" /> {task.erpnextTaskId}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-slate-400 font-mono italic">"{task.rawQuote}"</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status !== 'Synced' && (
                      <>
                        <button
                          onClick={() => handleApprove(task.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
                            task.status === 'Approved'
                              ? 'bg-emerald-500 text-white border-emerald-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </button>

                        <button
                          onClick={() => handleReject(task.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
                            task.status === 'Rejected'
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}

                    {task.erpnextUrl && (
                      <a
                        href={task.erpnextUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                      >
                        <span>View in ERPNext</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <div>Assigned: <strong className="text-slate-200">{task.assigneeName}</strong> ({task.assigneeEmail})</div>
                  <div>Project: <strong className="text-slate-200">{task.project}</strong></div>
                  <div>Due: <strong className="text-slate-200">{task.expEndDate}</strong></div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* History View */
        <div className="space-y-4">
          {syncedTasksHistory.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
              No synced tasks recorded yet.
            </div>
          ) : (
            syncedTasksHistory.map(synced => (
              <div key={synced.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    DocType: {synced.erpnextTaskId}
                  </span>
                  <span className="text-[11px] text-slate-500">{new Date(synced.syncedAt).toLocaleString()}</span>
                </div>
                <div className="text-sm font-bold text-white">{synced.title}</div>
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Assigned to: {synced.assigneeName}</span>
                  <span>Project: {synced.project}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
