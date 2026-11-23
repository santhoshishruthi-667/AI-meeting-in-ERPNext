import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, FolderKanban, Sparkles, ArrowRight, PlayCircle, Plus, X, Mail, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { ERPNEXT_PROJECTS } from '../data/erpnextProjects';
import { getMeetingTimeStatus, formatTimeForDisplay } from '../utils/meetingTime';

export default function MeetingCreation({ meetings, onSelectMeeting, onMeetingCreated, onStartMeeting }) {
  const getInitialTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [formData, setFormData] = useState({
    title: 'ERPNext AI Module Integration & Sprint Planning',
    project: 'PROJ-001',
    date: new Date().toISOString().split('T')[0],
    time: getInitialTime(),
    duration: '45 mins',
    agenda: '1. Review ERPNext custom DocType schemas\n2. Discuss AI transcription webhook endpoint\n3. Assign tasks with human verification workflow'
  });

  const [createdGMeetLink, setCreatedGMeetLink] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [customMeetUrl, setCustomMeetUrl] = useState('');

  // Real-time ticking clock every second to update meeting link status
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStatus = getMeetingTimeStatus(formData.date, formData.time);

  const selectedProjObj = ERPNEXT_PROJECTS.find(p => p.id === formData.project) || ERPNEXT_PROJECTS[0];

  const handleAddEmail = (e) => {
    if (e) e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      alert('Please enter a valid email ID (e.g. colleague@company.com)');
      return;
    }
    if (!attendees.includes(clean)) {
      setAttendees(prev => [...prev, clean]);
    }
    setEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove) => {
    setAttendees(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleGenerateLink = (e) => {
    e.preventDefault();
    let link = customMeetUrl.trim();
    if (!link) {
      const seg1 = Math.random().toString(36).substring(2, 5);
      const seg2 = Math.random().toString(36).substring(2, 6);
      const seg3 = Math.random().toString(36).substring(2, 5);
      link = `https://meet.google.com/${seg1}-${seg2}-${seg3}`;
    } else if (!link.startsWith('http://') && !link.startsWith('https://')) {
      link = link.startsWith('meet.google.com/') ? `https://${link}` : `https://meet.google.com/${link}`;
    }

    setCreatedGMeetLink(link);

    const newMeeting = {
      id: `MEET-${Date.now().toString().slice(-4)}`,
      title: formData.title,
      project: formData.project,
      projectName: selectedProjObj.name,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      gmeetLink: link,
      status: 'Scheduled',
      attendees: attendees.map(em => ({ name: em, email: em })),
      agenda: formData.agenda,
      transcript: []
    };

    onMeetingCreated(newMeeting);
  };

  const handleStartNow = () => {
    const status = getMeetingTimeStatus(formData.date, formData.time);
    if (!status.isLive) {
      alert(`⚠️ Meeting Link Locked!\n\nThis meeting is scheduled for ${formData.date} at ${formatTimeForDisplay(formData.time)}.\n\nThe meeting link will work only on the assigned date and time.`);
      return;
    }

    const link = createdGMeetLink || `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    const activeMeeting = {
      id: `MEET-LIVE-${Date.now().toString().slice(-4)}`,
      title: formData.title,
      project: formData.project,
      projectName: selectedProjObj.name,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      gmeetLink: link,
      status: 'In Progress',
      attendees: attendees.map(em => ({ name: em, email: em })),
      agenda: formData.agenda,
      transcript: []
    };
    onStartMeeting(activeMeeting);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Step 1: Meeting Creation & Google Meet Setup
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Create AI-Powered ERPNext Meeting
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl mt-1">
              Schedule your project meeting. The meeting link works strictly on the assigned date and time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={handleStartNow}
              disabled={timeStatus && !timeStatus.isLive}
              className={`px-5 py-3 rounded-xl font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                timeStatus?.isLive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {timeStatus?.isLive ? <PlayCircle className="w-5 h-5 text-amber-300" /> : <Lock className="w-5 h-5 text-amber-400" />}
              <span>{timeStatus?.isLive ? 'Launch GMeet Room Now' : 'Link Locked'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Create & Configure */}
        <div className="lg:col-span-2 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Meeting Details</h2>
              <p className="text-xs text-slate-400">Target project and attendee mapping for ERPNext task sync</p>
            </div>
          </div>

          <form onSubmit={handleGenerateLink} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-emerald-400" /> Google Meet Link (Optional)
              </label>
              <input
                type="text"
                value={customMeetUrl}
                onChange={e => setCustomMeetUrl(e.target.value)}
                placeholder="e.g. https://meet.google.com/abc-defg-hij (auto-generated if empty)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-400" /> ERPNext Project
                </label>
                <select
                  value={formData.project}
                  onChange={e => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {ERPNEXT_PROJECTS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.customer})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Assigned Date & Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-1/2 px-2.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-1/2 px-2.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Attendees By Email ID (No fake emails) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" /> Attendees (Add by Email ID)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="Enter email ID (e.g. colleague@company.com)"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Email
                </button>
              </div>

              {/* List of Attendees: only added email IDs */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {attendees.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic p-3 bg-slate-950/40 rounded-lg text-center border border-dashed border-slate-800/80">
                    No email IDs added yet. Enter email ID above to add participants.
                  </div>
                ) : (
                  attendees.map(email => (
                    <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-mono text-xs text-white truncate">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="p-1 hover:text-rose-400 text-slate-400 transition ml-2"
                        title="Remove Email ID"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Agenda & Core Objectives</label>
              <textarea
                rows={3}
                value={formData.agenda}
                onChange={e => setFormData({ ...formData, agenda: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Link security rule: Meeting link unlocks and works <strong>only on the assigned date and time</strong>.</span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <span>Save & Generate Meeting Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Generated Link & Meeting List */}
        <div className="space-y-6">
          {/* GMeet Link Card */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Video className="w-4 h-4 text-emerald-400" />
                <span>Google Meet Link</span>
              </div>
              {timeStatus && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  timeStatus.isLive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : timeStatus.status === 'upcoming'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {timeStatus.badge}
                </span>
              )}
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400">Google Meet URL:</div>
              <div className="text-xs font-mono text-emerald-400 truncate bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                {createdGMeetLink || 'https://meet.google.com/abc-defg-hij'}
              </div>
            </div>

            {timeStatus && !timeStatus.isLive && (
              <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20 leading-relaxed flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{timeStatus.message}</span>
              </div>
            )}

            <button
              onClick={handleStartNow}
              disabled={timeStatus && !timeStatus.isLive}
              className={`w-full py-3 rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 ${
                timeStatus?.isLive
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {timeStatus?.isLive ? <PlayCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{timeStatus?.isLive ? 'Start Live Room Now' : 'Link Locked Until Scheduled Time'}</span>
            </button>
          </div>

          {/* Past / Scheduled Meetings List */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 backdrop-blur-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Scheduled Meetings</h3>
            <div className="space-y-2">
              {meetings.map(m => {
                const mStatus = getMeetingTimeStatus(m.date, m.time);
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMeeting(m)}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/40 cursor-pointer transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">{m.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                        mStatus.isLive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {mStatus.badge}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{m.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{m.date}</span> • <span>{formatTimeForDisplay(m.time)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
