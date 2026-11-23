import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, User, Calendar, AlertCircle, Plus, Edit2, ArrowRight, Bot, MessageSquare, Tag } from 'lucide-react';
import { extractTasksFromTranscript } from '../services/aiProcessor';
import { ERPNEXT_USERS } from '../data/erpnextProjects';

export default function AIExtraction({ activeMeeting, extractedTasks, setExtractedTasks, onProceedToSync }) {
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTranscriptLine, setSelectedTranscriptLine] = useState(null);

  // Run AI extraction whenever active meeting transcript changes if tasks are empty
  useEffect(() => {
    if (activeMeeting && activeMeeting.transcript) {
      const tasks = extractTasksFromTranscript(activeMeeting.transcript, {
        project: activeMeeting.project,
        projectName: activeMeeting.projectName
      });
      setExtractedTasks(tasks);
    }
  }, [activeMeeting]);

  const handleCreateManualTaskFromLine = (line) => {
    const newTask = {
      id: `AI-TASK-MANUAL-${Date.now()}`,
      transcriptId: line.id,
      title: line.text,
      description: `Manually extracted from meeting transcript entry by ${line.speaker} at ${line.timestamp}:\n"${line.text}"`,
      rawQuote: line.text,
      speaker: line.speaker,
      timestamp: line.timestamp,
      assigneeName: line.speaker,
      assigneeEmail: 'unassigned@company.com',
      project: activeMeeting?.project || 'PROJ-001',
      projectName: activeMeeting?.projectName || 'ERPNext AI Module Integration',
      priority: 'Medium',
      expEndDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'Pending Approval',
      confidence: 95,
      erpnextTaskId: null
    };
    setExtractedTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = (taskId, updatedFields) => {
    setExtractedTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedFields } : t));
    setEditingTask(null);
  };

  const handleRemoveTask = (taskId) => {
    setExtractedTasks(prev => prev.filter(t => t.id !== taskId));
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 p-6 rounded-2xl border border-purple-500/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Step 3: AI Task Extraction & Assignment Engine
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">AI Transcript Insights & Auto-Assigned Tasks</h1>
          <p className="text-xs text-slate-400 mt-1">
            The AI model has parsed the meeting transcript, matched action items with ERPNext team members, and calculated confidence scores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onProceedToSync}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Proceed to Approval & ERPNext Sync ({extractedTasks.length} Tasks)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Full Transcript & Manual Trigger (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-2xl border border-slate-800 p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Full Meeting Transcript</h3>
            </div>
            <span className="text-[11px] text-slate-400">Click any line to extract task</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {activeMeeting?.transcript && activeMeeting.transcript.length > 0 ? (
              activeMeeting.transcript.map(line => (
                <div
                  key={line.id}
                  onClick={() => handleCreateManualTaskFromLine(line)}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/40 cursor-pointer transition space-y-1 group"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-indigo-400">{line.speaker}</span>
                    <span className="text-slate-500">{line.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{line.text}</p>
                  <div className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 font-semibold pt-1">
                    <Plus className="w-3 h-3" /> Turn this sentence into ERPNext Task
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">No transcript available for this meeting.</div>
            )}
          </div>
        </div>

        {/* Right Column: AI Extracted Tasks List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Captured AI Tasks ({extractedTasks.length})</h3>
                <p className="text-[11px] text-slate-400">Review AI suggestions before human sign-off</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {extractedTasks.length === 0 ? (
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 space-y-3">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold">No actionable tasks detected yet.</p>
                <p className="text-xs text-slate-500">Select any line on the left transcript to manually extract an actionable task.</p>
              </div>
            ) : (
              extractedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 hover:border-purple-500/40 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {task.priority} Priority
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-mono font-semibold">
                          AI Confidence: {task.confidence}%
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">{task.title}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  </div>

                  {/* Transcript Quote */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-mono italic">
                    "{task.rawQuote}"
                  </div>

                  {/* Editing Panel */}
                  {editingTask === task.id ? (
                    <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/40 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Task Title</label>
                        <input
                          type="text"
                          value={task.title}
                          onChange={e => handleUpdateTask(task.id, { title: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assignee</label>
                          <select
                            value={task.assigneeName}
                            onChange={e => {
                              const selectedUser = ERPNEXT_USERS.find(u => u.name === e.target.value);
                              handleUpdateTask(task.id, {
                                assigneeName: selectedUser.name,
                                assigneeEmail: selectedUser.email
                              });
                            }}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            {ERPNEXT_USERS.map(u => (
                              <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Due Date</label>
                          <input
                            type="date"
                            value={task.expEndDate}
                            onChange={e => handleUpdateTask(task.id, { expEndDate: e.target.value })}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Task Meta Details */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Assigned to: <strong className="text-slate-200">{task.assigneeName}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Due Date: <strong className="text-slate-200">{task.expEndDate}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-purple-400" />
                      <span>Project: <strong className="text-slate-200">{task.projectName}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
