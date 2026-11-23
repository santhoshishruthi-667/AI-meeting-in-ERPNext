'use client';
import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, User, Calendar, Plus, Edit2, ArrowRight, Bot, MessageSquare, Tag, RefreshCw } from 'lucide-react';
import { extractAITasks } from '../services/api';

function getAssigneeFromText(text, speaker, attendees = []) {
  const lowerText = (text || '').toLowerCase();
  let domain = 'company.com';
  const firstWithDomain = attendees.find(a => a.email && a.email.includes('@'));
  if (firstWithDomain) {
    domain = firstWithDomain.email.split('@')[1];
  }

  // 1. Match against attendees
  for (const att of attendees) {
    const email = (att.email || '').trim();
    const name = (att.name || '').trim();
    const emailPrefix = email.includes('@') ? email.split('@')[0].toLowerCase() : email.toLowerCase();
    const nameParts = name.toLowerCase().split(/\s+/).filter(Boolean);
    const emailParts = emailPrefix.split(/[._-]/).filter(Boolean);
    const candidateWords = new Set([...nameParts, ...emailParts]);
    if (name) candidateWords.add(name.toLowerCase());
    if (emailPrefix) candidateWords.add(emailPrefix);

    for (const word of candidateWords) {
      if (word.length >= 2) {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lowerText)) {
          return {
            email: email || `${word}@${domain}`,
            name: name || word.charAt(0).toUpperCase() + word.slice(1)
          };
        }
      }
    }
  }

  // 2. Extract capitalized name from text if not in attendees
  const matches = (text || '').match(/\b([A-Z][a-z]{2,})\b/g);
  const stopwords = new Set([
    'The', 'This', 'That', 'Next', 'Thursday', 'Wednesday', 'Friday', 'Monday', 'Tuesday',
    'Saturday', 'Sunday', 'Today', 'Tomorrow', 'ERPNext', 'FastAPI', 'DocType', 'Jitsi',
    'Google', 'Meet', 'GMeet',
    'Sprint', 'Sync', 'Meeting', 'Task', 'Code', 'Login', 'Development', 'Action', 'Item',
    'Sure', 'Yeah', 'Okay', 'Welcome', 'Everyone', 'Please', 'Could', 'Would', 'Should'
  ]);

  if (matches) {
    for (const m of matches) {
      if (!stopwords.has(m)) {
        const cleanName = m.charAt(0).toUpperCase() + m.slice(1);
        const derivedEmail = `${cleanName.toLowerCase()}@${domain}`;
        const foundInAtt = attendees.find(a => (a.email || '').toLowerCase().includes(cleanName.toLowerCase()));
        if (foundInAtt) {
          return { email: foundInAtt.email, name: foundInAtt.name || cleanName };
        }
        return { email: derivedEmail, name: cleanName };
      }
    }
  }

  // 3. Fallback to speaker if provided
  if (speaker) {
    const sp = String(speaker).trim();
    const foundSp = attendees.find(a => (a.email || '').toLowerCase() === sp.toLowerCase() || (a.name || '').toLowerCase() === sp.toLowerCase());
    if (foundSp) {
      return { email: foundSp.email, name: foundSp.name || sp };
    }
    if (sp.includes('@')) {
      const spName = sp.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
      return { email: sp, name: spName };
    }
  }

  // 4. Fallback to first attendee
  if (attendees.length > 0) {
    return {
      email: attendees[0].email,
      name: attendees[0].name || attendees[0].email.split('@')[0]
    };
  }

  return { email: `team@${domain}`, name: 'Team Member' };
}

export default function AIExtraction({ activeMeeting, extractedTasks, setExtractedTasks, onProceedToSync }) {
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeMeeting && activeMeeting.transcript) {
      setLoading(true);
      extractAITasks(
        activeMeeting.transcript,
        activeMeeting.project,
        activeMeeting.projectName,
        activeMeeting.attendees || []
      )
        .then(tasks => setExtractedTasks(tasks))
        .catch(err => console.error('FastAPI AI extraction error:', err))
        .finally(() => setLoading(false));
    }
  }, [activeMeeting]);

  const handleCreateManualTaskFromLine = (line) => {
    const { email: matchedEmail, name: matchedName } = getAssigneeFromText(line.text, line.speaker, activeMeeting?.attendees || []);

    const newTask = {
      id: `AI-TASK-MANUAL-${Date.now()}`,
      transcriptId: line.id,
      title: line.text,
      description: `Manually extracted from meeting transcript entry by ${line.speaker} at ${line.timestamp}:\n"${line.text}"`,
      rawQuote: line.text,
      speaker: line.speaker,
      timestamp: line.timestamp,
      assigneeName: matchedName,
      assigneeEmail: matchedEmail,
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
  };

  const attendeesList = activeMeeting?.attendees || [];

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 p-6 rounded-2xl border border-purple-500/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Step 3: AI NLP Task Extraction & Auto-Assignment
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">AI Transcript Insights & Task Assignments</h1>
          <p className="text-xs text-slate-400 mt-1">
            FastAPI AI model parsed speech transcript lines and assigned action items based on attendee names and invited email IDs.
          </p>
        </div>

        <button
          onClick={onProceedToSync}
          className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Proceed to Approval & ERPNext Sync ({extractedTasks.length} Tasks)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column Transcript */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-2xl border border-slate-800 p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Meeting Transcript</h3>
            </div>
            <span className="text-[11px] text-slate-400">Click line to extract task</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {activeMeeting?.transcript?.map(line => (
              <div
                key={line.id}
                onClick={() => handleCreateManualTaskFromLine(line)}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition space-y-1 group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-indigo-400">{line.speaker}</span>
                  <span className="text-slate-500">{line.timestamp}</span>
                </div>
                <p className="text-xs text-slate-300">{line.text}</p>
                <div className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 font-semibold pt-1">
                  <Plus className="w-3 h-3" /> Turn sentence into Task
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column Tasks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Extracted Tasks ({extractedTasks.length})</h3>
                <p className="text-[11px] text-slate-400">Assigned to transcript name & attendee email IDs</p>
              </div>
            </div>
            {loading && <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />}
          </div>

          <div className="space-y-4">
            {extractedTasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                No tasks extracted yet. Speak action sentences like "Shruti will complete the login by Thursday" or click a transcript line on the left.
              </div>
            ) : (
              extractedTasks.map((task) => {
                const selectOptions = [...attendeesList];
                if (task.assigneeEmail && !selectOptions.some(a => a.email === task.assigneeEmail)) {
                  selectOptions.unshift({ name: task.assigneeName || task.assigneeEmail.split('@')[0], email: task.assigneeEmail });
                }

                return (
                  <div key={task.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            task.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {task.priority} Priority
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-mono font-semibold">
                            AI Confidence: {task.confidence}%
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{task.title}</h4>
                      </div>

                      <button
                        onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono italic">
                      "{task.rawQuote}"
                    </div>

                    {editingTask === task.id && (
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
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assignee Email</label>
                            <select
                              value={task.assigneeEmail}
                              onChange={e => {
                                const found = selectOptions.find(a => a.email === e.target.value);
                                handleUpdateTask(task.id, {
                                  assigneeEmail: e.target.value,
                                  assigneeName: found ? found.name : e.target.value.split('@')[0]
                                });
                              }}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                            >
                              {selectOptions.map(a => (
                                <option key={a.email} value={a.email}>{a.name} ({a.email})</option>
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
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Assigned: <strong className="text-slate-200">{task.assigneeEmail}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Due: <strong className="text-slate-200">{task.expEndDate}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        <span>Project: <strong className="text-slate-200">{task.projectName}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
