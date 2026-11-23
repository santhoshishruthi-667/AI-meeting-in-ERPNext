'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, FolderKanban, ArrowRight, PlayCircle, Plus, X, Mail, Link2, Copy, Check, ExternalLink, Share2, Lock, AlertCircle } from 'lucide-react';
import { createMeeting, addParticipantToMeeting, removeParticipantFromMeeting } from '../services/api';
import { getMeetingTimeStatus, formatTimeForDisplay } from '../utils/meetingTime';

function GoogleMeetIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 8.5V15.5L19 18V6L15 8.5Z" fill="#00832D"/>
      <path d="M5 6H13C14.1 6 15 6.9 15 8V16C15 17.1 14.1 18 13 18H5C3.9 18 3 17.1 3 16V8C3 6.9 3.9 6 5 6Z" fill="#00AC47"/>
      <path d="M19 6L15 8.5V11.5L19 8.5V6Z" fill="#2684FC"/>
      <path d="M15 12.5V15.5L19 18V15.5L15 12.5Z" fill="#EA4335"/>
      <path d="M15 11.5V12.5L19 15.5V8.5L15 11.5Z" fill="#FFBA00"/>
    </svg>
  );
}

export default function MeetingCreation({ meetings, projects, onSelectMeeting, onMeetingCreated, onStartMeeting }) {
  const [platform, setPlatform] = useState('google_meet'); // 'google_meet' | 'jitsi'
  const [customMeetUrl, setCustomMeetUrl] = useState('');

  // Default to today's date and current time
  const getInitialTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [formData, setFormData] = useState({
    title: 'ERPNext AI Meeting & Task Sync',
    project: projects[0]?.id || 'PROJ-001',
    date: new Date().toISOString().split('T')[0],
    time: getInitialTime(),
    agenda: 'Discuss project milestone deliverables, review API endpoints, and sync tasks to ERPNext.',
    jitsiRoomName: ''
  });

  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedMeet, setCopiedMeet] = useState(false);
  const [copiedApp, setCopiedApp] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Real-time ticking clock every second to update meeting link status
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStatus = createdMeeting
    ? getMeetingTimeStatus(createdMeeting.date, createdMeeting.time)
    : null;

  // Submit Step 1: Create Meeting
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setLoading(true);

    const resolvedMeetLink = platform === 'google_meet'
      ? (customMeetUrl.trim() || null)
      : null;

    try {
      const newMeeting = await createMeeting({
        title: formData.title,
        project: formData.project,
        date: formData.date,
        time: formData.time,
        agenda: formData.agenda,
        platform: platform,
        googleMeetLink: resolvedMeetLink,
        jitsiRoomName: formData.jitsiRoomName
      });
      setCreatedMeeting(newMeeting);
      onMeetingCreated(newMeeting);
    } catch (err) {
      alert('Failed to create meeting: ' + err.message);
    }
    setLoading(false);
  };

  // Add Participant Email (Only email ID, no fake emails)
  const handleAddEmail = async (e) => {
    if (e) e.preventDefault();
    if (!createdMeeting) {
      alert('Please create the meeting first!');
      return;
    }
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      alert('Please enter a valid email ID (e.g. colleague@company.com)');
      return;
    }

    try {
      const updated = await addParticipantToMeeting(createdMeeting.id, cleanEmail);
      setCreatedMeeting(updated);
      setEmailInput('');
    } catch (err) {
      alert('Failed to add participant: ' + err.message);
    }
  };

  // Remove Participant Email
  const handleRemoveEmail = async (emailToRemove) => {
    if (!createdMeeting) return;
    try {
      const updated = await removeParticipantFromMeeting(createdMeeting.id, emailToRemove);
      setCreatedMeeting(updated);
    } catch (err) {
      alert('Failed to remove participant: ' + err.message);
    }
  };

  const appMeetingUrl = createdMeeting
    ? (typeof window !== 'undefined' ? `${window.location.origin}/?meetingId=${createdMeeting.id}` : `http://localhost:3000/?meetingId=${createdMeeting.id}`)
    : '';

  const activeVideoUrl = createdMeeting?.platform === 'jitsi'
    ? (createdMeeting.jitsiLink || `https://meet.jit.si/${createdMeeting.jitsiRoomName || 'room'}`)
    : (createdMeeting?.googleMeetLink || 'https://meet.google.com');

  const handleCopyMeet = () => {
    if (activeVideoUrl) {
      navigator.clipboard.writeText(activeVideoUrl);
      setCopiedMeet(true);
      setTimeout(() => setCopiedMeet(false), 2000);
    }
  };

  const handleCopyAppLink = () => {
    if (appMeetingUrl) {
      navigator.clipboard.writeText(appMeetingUrl);
      setCopiedApp(true);
      setTimeout(() => setCopiedApp(false), 2000);
    }
  };

  const handleCopyFullInvite = () => {
    if (!createdMeeting) return;
    const isGMeet = createdMeeting.platform !== 'jitsi';
    const displayTime = formatTimeForDisplay(createdMeeting.time);
    const inviteText = `📅 Meeting: ${createdMeeting.title}
💼 ERPNext Project: ${createdMeeting.projectName}
⏰ Date & Time: ${createdMeeting.date} at ${displayTime} (Link works only on scheduled time)
${isGMeet ? `🎥 Google Meet Call: ${activeVideoUrl}` : `🎥 Jitsi Meet Call: ${activeVideoUrl}`}
🤖 ERPNext AI Transcripts & Task Sync: ${appMeetingUrl}

Agenda: ${createdMeeting.agenda || 'Project sync & task extraction.'}`;

    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // Enforce: The meeting link should work ONLY on the assigned date and time
  const handleOpenDirectVideoCall = (e) => {
    if (e) e.preventDefault();
    if (!timeStatus?.isLive) {
      alert(`⚠️ Meeting Link Locked!\n\n${timeStatus?.message || 'This meeting link works only on the assigned date and time.'}`);
      return;
    }
    if (activeVideoUrl) {
      window.open(activeVideoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLaunchMeeting = () => {
    if (!createdMeeting) return;
    const status = getMeetingTimeStatus(createdMeeting.date, createdMeeting.time);
    if (!status.isLive) {
      alert(`⚠️ Meeting Link Locked!\n\n${status.message}\n\nPlease join when the scheduled meeting time arrives.`);
      return;
    }
    if (createdMeeting.platform !== 'jitsi' && activeVideoUrl) {
      window.open(activeVideoUrl, '_blank', 'noopener,noreferrer');
    }
    onStartMeeting(createdMeeting);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
          <GoogleMeetIcon className="w-3.5 h-3.5" />
          <span>Real Google Meet + ERPNext AI Task Workflow</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Scheduled Meeting & Connect Google Meet</h1>
        <p className="text-xs text-slate-400 mt-1">
          1. Schedule date & time ➔ 2. Add attendee email IDs ➔ 3. Meeting link unlocks only on assigned date & time ➔ 4. Live speech/captions sync to ERPNext Tasks!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Step 1: Create Form (7 Cols) */}
        <div className="md:col-span-7 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">1. Meeting Details & Schedule</h2>
              <p className="text-xs text-slate-400">Meeting links are protected and active only during scheduled time</p>
            </div>
          </div>

          <form onSubmit={handleCreateMeeting} className="space-y-4">
            {/* Platform Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Meeting Platform</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlatform('google_meet')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    platform === 'google_meet'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GoogleMeetIcon className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Google Meet</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold">Recommended</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Real cloud video call</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('jitsi')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    platform === 'jitsi'
                      ? 'bg-blue-500/10 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Jitsi Meet</div>
                    <div className="text-[10px] text-slate-400">Embedded in-browser room</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. ERPNext AI Module Discussion"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Clean Google Meet Link Input (Removed image UI with instant room & guaranteed box) */}
            {platform === 'google_meet' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <GoogleMeetIcon className="w-3.5 h-3.5" /> Google Meet Link (Optional)
                </label>
                <input
                  type="text"
                  value={customMeetUrl}
                  onChange={e => setCustomMeetUrl(e.target.value)}
                  placeholder="e.g. https://meet.google.com/abc-defg-hij (auto-generated if empty)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-400" /> Custom Jitsi Room Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.jitsiRoomName}
                  onChange={e => setFormData({ ...formData, jitsiRoomName: e.target.value })}
                  placeholder="e.g. ERPNext_AI_Sprint_Sync (auto-generated if empty)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-purple-400" /> ERPNext Project
                </label>
                <select
                  value={formData.project}
                  onChange={e => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
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
                    className="w-1/2 px-2.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <input
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-1/2 px-2.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Link security rule: Meeting link unlocks and works <strong>only on the assigned date and time</strong>.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <GoogleMeetIcon className="w-4 h-4" />
              <span>{loading ? 'Creating Meeting...' : 'Schedule Meeting & Generate Meeting Link'}</span>
            </button>
          </form>

          {/* Past meetings list */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <h4 className="text-[11px] uppercase font-bold text-slate-400">Scheduled Demo Meetings</h4>
            {meetings.map(m => {
              const mStatus = getMeetingTimeStatus(m.date, m.time);
              return (
                <div
                  key={m.id}
                  onClick={() => { setCreatedMeeting(m); onSelectMeeting(m); }}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer text-xs flex items-center justify-between transition"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      {m.platform === 'jitsi' ? <Video className="w-3 h-3 text-blue-400" /> : <GoogleMeetIcon className="w-3 h-3" />}
                      <span>{m.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {m.date} at {formatTimeForDisplay(m.time)} • {m.attendees?.length || 0} participants
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                    mStatus.isLive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : mStatus.status === 'upcoming'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {mStatus.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Generated Link & Add Email Attendees (5 Cols) */}
        <div className="md:col-span-5 space-y-4">
          {!createdMeeting ? (
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-8 text-center text-slate-500 space-y-3 h-full flex flex-col items-center justify-center">
              <GoogleMeetIcon className="w-12 h-12 opacity-40 animate-pulse" />
              <p className="text-xs font-semibold text-slate-400">Schedule your meeting to generate the link and invite attendees by email ID.</p>
            </div>
          ) : (
            <div className="bg-slate-900/80 rounded-2xl border border-emerald-500/40 p-5 backdrop-blur-md space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Meeting Ready
                </span>
                <span className="text-[10px] font-mono text-slate-400">{createdMeeting.id}</span>
              </div>

              {/* Primary Video Call Link */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                    {createdMeeting.platform === 'jitsi' ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <GoogleMeetIcon className="w-3.5 h-3.5" />}
                    <span>{createdMeeting.platform === 'jitsi' ? 'Jitsi Video Call Link:' : 'Google Meet Call Link:'}</span>
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

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-900 rounded-lg text-xs font-mono text-emerald-400 border border-slate-800 truncate select-all">
                    {activeVideoUrl}
                  </div>
                  <button
                    onClick={handleCopyMeet}
                    className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg transition text-xs"
                    title="Copy Meeting Link"
                  >
                    {copiedMeet ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleOpenDirectVideoCall}
                    disabled={timeStatus && !timeStatus.isLive}
                    className={`px-2.5 py-2 rounded-lg transition text-xs font-bold shrink-0 flex items-center gap-1 ${
                      timeStatus?.isLive
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                    title={timeStatus?.isLive ? 'Open Call' : timeStatus?.message}
                  >
                    {timeStatus?.isLive ? <ExternalLink className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span>{timeStatus?.isLive ? 'Open' : 'Locked'}</span>
                  </button>
                </div>

                {timeStatus && !timeStatus.isLive && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{timeStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Shareable Companion App Meeting Link */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-2">
                <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ERPNext AI Companion & Transcripts Link:</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-900 rounded-lg text-xs font-mono text-indigo-300 border border-slate-800 truncate select-all">
                    {appMeetingUrl}
                  </div>
                  <button
                    onClick={handleCopyAppLink}
                    className="p-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 rounded-lg transition text-xs"
                    title="Copy Shareable Companion App Link"
                  >
                    {copiedApp ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Copy Full Invitation Action */}
              <button
                onClick={handleCopyFullInvite}
                className="w-full py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copiedInvite ? 'Full Invite Copied to Clipboard!' : 'Copy Full Meeting Invitation Snippet'}</span>
              </button>

              {/* ADD PEOPLE BY EMAIL SECTION (Only added email IDs, no fake emails) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span>2. Add Attendees by Email ID</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {createdMeeting.attendees?.length || 0} added
                  </span>
                </div>

                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="Enter email ID (e.g. colleague@company.com)"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Email
                  </button>
                </form>

                {/* List of Added Email Attendees - Displays ONLY email ID */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(!createdMeeting.attendees || createdMeeting.attendees.length === 0) ? (
                    <div className="text-[11px] text-slate-500 italic p-3 bg-slate-950/40 rounded-lg text-center border border-dashed border-slate-800/80">
                      No email IDs added yet. Enter email ID above to add participants.
                    </div>
                  ) : (
                    createdMeeting.attendees.map(att => {
                      const emailStr = typeof att === 'string' ? att : (att.email || att.name);
                      return (
                        <div key={emailStr} className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200">
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-mono text-xs text-white truncate">{emailStr}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveEmail(emailStr)}
                            className="p-1 hover:text-rose-400 text-slate-400 transition ml-2"
                            title="Remove Email ID"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Launch Call & Open Room Button (Enforced by date & time) */}
              <button
                onClick={handleLaunchMeeting}
                disabled={timeStatus && !timeStatus.isLive}
                className={`w-full py-3.5 rounded-xl text-xs font-extrabold transition shadow-lg flex items-center justify-center gap-2 mt-4 ${
                  timeStatus?.isLive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {timeStatus?.isLive ? <PlayCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>
                  {timeStatus?.isLive
                    ? 'Launch Google Meet & Start AI Companion'
                    : `Link Locked until ${createdMeeting.date} ${formatTimeForDisplay(createdMeeting.time)}`}
                </span>
                {timeStatus?.isLive && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
