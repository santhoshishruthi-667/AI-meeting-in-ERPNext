'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Video, PhoneOff, Bot, Sparkles, Send, Play, Pause,
  AlertCircle, ArrowRight, ShieldCheck, Mail, Link2, Copy, Check,
  ExternalLink, Share2, FileText, UploadCloud, Users, Edit3, Zap, Globe, Lock
} from 'lucide-react';
import { addTranscriptLine, addBulkTranscript, updateMeeting } from '../services/api';
import { getMeetingTimeStatus, formatTimeForDisplay } from '../utils/meetingTime';

function GoogleMeetIcon({ className = "w-5 h-5" }) {
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

export default function MeetingRoom({ activeMeeting, onEndMeeting }) {
  const [transcript, setTranscript] = useState(activeMeeting?.transcript || []);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [customUtterance, setCustomUtterance] = useState('');
  const [copiedMeet, setCopiedMeet] = useState(false);
  const [copiedApp, setCopiedApp] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Live URL management to prevent invalid Google Meet code errors
  const isGoogleMeet = activeMeeting?.platform !== 'jitsi';
  const rawMeetLink = activeMeeting?.googleMeetLink || activeMeeting?.meetingUrl || '';
  const initialCallUrl = (isGoogleMeet && (!rawMeetLink || rawMeetLink.includes('erp-next-ai')))
    ? 'https://meet.google.com/new'
    : (rawMeetLink || 'https://meet.google.com/new');

  const [currentVideoUrl, setCurrentVideoUrl] = useState(
    isGoogleMeet ? initialCallUrl : (activeMeeting?.jitsiLink || `https://meet.jit.si/${activeMeeting?.jitsiRoomName || 'room'}`)
  );
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(currentVideoUrl);
  const [savingUrl, setSavingUrl] = useState(false);

  // Paste / Import Google Meet Transcript Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawTranscriptInput, setRawTranscriptInput] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Live ticking clock to keep meeting link status in sync every second
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStatus = activeMeeting
    ? getMeetingTimeStatus(activeMeeting.date, activeMeeting.time)
    : null;

  const attendeesList = activeMeeting?.attendees || [];
  const getAttendeeEmail = (att) => typeof att === 'string' ? att : (att?.email || att?.name || '');
  const defaultSpeaker = attendeesList[0] ? getAttendeeEmail(attendeesList[0]) : 'speaker@company.com';
  const [currentSpeakerEmail, setCurrentSpeakerEmail] = useState(defaultSpeaker);
  const [activeSpeakingUser, setActiveSpeakingUser] = useState(defaultSpeaker);

  const transcriptEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const jitsiRoomName = activeMeeting?.jitsiRoomName || `ERPNext_AI_Meeting_${activeMeeting?.id || 'DEMO'}`;
  const jitsiEmbedUrl = `https://meet.jit.si/${jitsiRoomName}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(currentSpeakerEmail.split('@')[0])}`;

  const shareableAppUrl = typeof window !== 'undefined' && activeMeeting?.id
    ? `${window.location.origin}/?meetingId=${activeMeeting.id}`
    : `http://localhost:3000/?meetingId=${activeMeeting?.id || 'MEET-DEMO-01'}`;

  const isInstantGateway = currentVideoUrl === 'https://meet.google.com/new';

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = async (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript.trim();
            if (finalTranscript) {
              const lineData = { speaker: currentSpeakerEmail, text: finalTranscript };
              try {
                if (activeMeeting?.id) {
                  const res = await addTranscriptLine(activeMeeting.id, lineData);
                  setTranscript(prev => [...prev, res.entry]);
                } else {
                  throw new Error('No active meeting');
                }
              } catch (e) {
                const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setTranscript(prev => [...prev, {
                  id: `t-mic-${Date.now()}`,
                  timestamp: timeString,
                  speaker: currentSpeakerEmail,
                  text: finalTranscript
                }]);
              }
            }
          }
        }
      };

      recognition.onerror = (err) => {
        setSpeechError('Microphone or speech API issue: ' + err.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechError('Web Speech API not supported in this browser. Use Paste Transcript or team simulation below.');
    }
  }, [activeMeeting, currentSpeakerEmail]);

  const toggleMicListening = () => {
    if (!recognitionRef.current) {
      alert('Browser speech recognition not available. Use Paste Transcript or text input below!');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpeechError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Simulation script using actual added email IDs
  const speakerA = attendeesList[0] ? getAttendeeEmail(attendeesList[0]) : defaultSpeaker;
  const speakerB = attendeesList[1] ? getAttendeeEmail(attendeesList[1]) : speakerA;
  const simulatedTimeline = attendeesList.length >= 2 ? [
    { speaker: speakerA, text: 'Welcome everyone! Let us review our ERPNext deployment and task distribution.' },
    { speaker: speakerB, text: 'I will prepare the ERPNext custom DocType schemas and database triggers by Thursday.' },
    { speaker: speakerA, text: 'Awesome! Could you also write the FastAPI webhook endpoint for live transcript ingestion by Friday?' },
    { speaker: speakerB, text: 'Yes, I will write the FastAPI webhook and complete unit tests before staging deployment.' }
  ] : [
    { speaker: defaultSpeaker, text: 'Welcome everyone! Let us review our ERPNext deployment and task distribution.' },
    { speaker: defaultSpeaker, text: 'I will prepare the ERPNext custom DocType schemas and database triggers by Thursday.' },
    { speaker: defaultSpeaker, text: 'I will write the FastAPI webhook endpoint and complete unit tests before staging deployment.' }
  ];

  useEffect(() => {
    let timer;
    if (isSimulating) {
      let stepIndex = 0;
      timer = setInterval(async () => {
        if (stepIndex < simulatedTimeline.length) {
          const item = simulatedTimeline[stepIndex];
          setActiveSpeakingUser(item.speaker);
          try {
            if (activeMeeting?.id) {
              const res = await addTranscriptLine(activeMeeting.id, { speaker: item.speaker, text: item.text });
              setTranscript(prev => [...prev, res.entry]);
            } else {
              throw new Error('No active meeting');
            }
          } catch (e) {
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setTranscript(prev => [...prev, {
              id: `sim-${Date.now()}`,
              timestamp: timeString,
              speaker: item.speaker,
              text: item.text
            }]);
          }
          stepIndex++;
        } else {
          setIsSimulating(false);
          clearInterval(timer);
        }
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  const handleAddCustomEntry = async (e) => {
    e.preventDefault();
    if (!customUtterance.trim()) return;
    try {
      if (activeMeeting?.id) {
        const res = await addTranscriptLine(activeMeeting.id, { speaker: currentSpeakerEmail, text: customUtterance.trim() });
        setTranscript(prev => [...prev, res.entry]);
      } else {
        throw new Error('No active meeting');
      }
    } catch (e) {
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTranscript(prev => [...prev, {
        id: `t-${Date.now()}`,
        timestamp: timeString,
        speaker: currentSpeakerEmail,
        text: customUtterance.trim()
      }]);
    }
    setCustomUtterance('');
  };

  // Import / Paste Google Meet Transcript or captions
  const handleImportTranscript = async (e) => {
    e.preventDefault();
    if (!rawTranscriptInput.trim()) return;
    setImportLoading(true);

    try {
      if (activeMeeting?.id) {
        const res = await addBulkTranscript(activeMeeting.id, {
          raw_text: rawTranscriptInput,
          default_speaker: currentSpeakerEmail
        });
        if (res.entries && res.entries.length > 0) {
          setTranscript(prev => [...prev, ...res.entries]);
        }
      }
      setIsImportModalOpen(false);
      setRawTranscriptInput('');
    } catch (err) {
      alert('Failed to import transcript: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Update real Google Meet link once created
  const handleSaveLiveUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setSavingUrl(true);

    let clean = urlInput.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = clean.startsWith('meet.google.com') ? `https://${clean}` : `https://meet.google.com/${clean}`;
    }

    try {
      if (activeMeeting?.id) {
        await updateMeeting(activeMeeting.id, { googleMeetLink: clean, meetingUrl: clean });
        activeMeeting.googleMeetLink = clean;
        activeMeeting.meetingUrl = clean;
      }
      setCurrentVideoUrl(clean);
      setIsEditingUrl(false);
    } catch (err) {
      alert('Failed to update URL: ' + err.message);
    } finally {
      setSavingUrl(false);
    }
  };

  const handleFinishMeeting = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onEndMeeting(transcript);
  };

  const handleOpenVideoCall = (e) => {
    if (e) e.preventDefault();
    if (!timeStatus?.isLive) {
      alert(`⚠️ Meeting Link Locked!\n\n${timeStatus?.message || 'The meeting link works only on the assigned date and time.'}`);
      return;
    }
    if (currentVideoUrl) {
      window.open(currentVideoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyMeetLink = () => {
    if (currentVideoUrl) {
      navigator.clipboard.writeText(currentVideoUrl);
      setCopiedMeet(true);
      setTimeout(() => setCopiedMeet(false), 2000);
    }
  };

  const handleCopyAppLink = () => {
    if (shareableAppUrl) {
      navigator.clipboard.writeText(shareableAppUrl);
      setCopiedApp(true);
      setTimeout(() => setCopiedApp(false), 2000);
    }
  };

  const handleCopyFullInvite = () => {
    const inviteText = `📅 Meeting: ${activeMeeting?.title || 'ERPNext Sync'}
💼 ERPNext Project: ${activeMeeting?.projectName || 'ERPNext AI Module'}
⏰ Date & Time: ${activeMeeting?.date} at ${activeMeeting?.time}
${isGoogleMeet ? `🎥 Google Meet Call: ${currentVideoUrl}` : `🎥 Video Call: ${currentVideoUrl}`}
🤖 ERPNext AI Transcripts & Task Sync: ${shareableAppUrl}

Agenda: ${activeMeeting?.agenda || 'Project sync and automated task extraction into ERPNext.'}`;

    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto py-4 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            {isGoogleMeet ? <GoogleMeetIcon className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">{activeMeeting?.title || 'ERPNext Live Meeting'}</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>{isGoogleMeet ? 'Google Meet Connected' : 'Jitsi Embedded Room'}</span>
              </span>
              {timeStatus && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                  timeStatus.isLive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : timeStatus.status === 'upcoming'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  {timeStatus.badge}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
              <span>Project: <strong className="text-slate-300 font-semibold">{activeMeeting?.projectName || activeMeeting?.project || 'PROJ-001'}</strong></span>
              <span>•</span>
              <span>Date & Time: <strong className="text-emerald-400 font-semibold">{activeMeeting?.date} {formatTimeForDisplay(activeMeeting?.time)}</strong></span>
              <span>•</span>
              <span>ID: <strong className="text-emerald-400">{activeMeeting?.id}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Open Video Call Button (Protected by date & time) */}
          <button
            onClick={handleOpenVideoCall}
            disabled={timeStatus && !timeStatus.isLive}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              timeStatus?.isLive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 cursor-pointer'
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
            }`}
            title={timeStatus?.isLive ? 'Open Call' : timeStatus?.message}
          >
            {timeStatus?.isLive ? (
              isGoogleMeet ? <GoogleMeetIcon className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{timeStatus?.isLive ? (isGoogleMeet ? 'Open Google Meet Call' : 'Open Video Call') : 'Call Locked'}</span>
            {timeStatus?.isLive && <ExternalLink className="w-3 h-3" />}
          </button>

          {/* Simulate Dialogue Button */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
              isSimulating ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Simulate multi-person audio conversation"
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isSimulating ? 'Simulating Audio...' : 'Simulate Audio'}</span>
          </button>

          {/* End Meeting Button */}
          <button
            onClick={handleFinishMeeting}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>End & Extract AI Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Video Call Workspace (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {isGoogleMeet ? (
            /* GOOGLE MEET COMPANION HERO CARD */
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <GoogleMeetIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Google Meet Video Session</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Call
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Join call via Google Meet & use this dashboard for AI sync</p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  {transcript.length} speech entries logged
                </div>
              </div>

              {/* Call Launch & Link Card */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 rounded-xl p-5 border border-slate-800 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                      {isInstantGateway ? <Zap className="w-3.5 h-3.5 text-amber-300" /> : <Globe className="w-3.5 h-3.5 text-blue-400" />}
                      <span>{isInstantGateway ? 'Instant Creation Link (meet.google.com/new):' : 'Direct Google Meet Room Link:'}</span>
                    </span>

                    {!isEditingUrl && (
                      <button
                        onClick={() => { setUrlInput(currentVideoUrl); setIsEditingUrl(true); }}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                        title="Click to paste your specific room code once Google Meet opens"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isInstantGateway ? 'Set specific room code' : 'Edit link'}</span>
                      </button>
                    )}
                  </div>

                  {isEditingUrl ? (
                    <form onSubmit={handleSaveLiveUrl} className="flex gap-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        placeholder="Paste Google Meet room URL e.g. https://meet.google.com/abc-defg-hij"
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-emerald-500/50 rounded-lg text-xs text-emerald-400 font-mono focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={savingUrl}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                      >
                        {savingUrl ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingUrl(false)}
                        className="px-2.5 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex-1 truncate">
                        <a
                          href={timeStatus?.isLive ? currentVideoUrl : '#'}
                          onClick={timeStatus?.isLive ? undefined : handleOpenVideoCall}
                          target={timeStatus?.isLive ? "_blank" : undefined}
                          rel="noreferrer"
                          className={`text-xs font-mono hover:underline flex items-center gap-1.5 truncate ${
                            timeStatus?.isLive ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          <span>{currentVideoUrl}</span>
                          {timeStatus?.isLive ? <ExternalLink className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </a>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleCopyMeetLink}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Copy Google Meet Link"
                        >
                          {copiedMeet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedMeet ? 'Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                          onClick={handleOpenVideoCall}
                          disabled={timeStatus && !timeStatus.isLive}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg ${
                            timeStatus?.isLive
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                          title={timeStatus?.isLive ? 'Launch Call' : timeStatus?.message}
                        >
                          {timeStatus?.isLive ? <GoogleMeetIcon className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{timeStatus?.isLive ? 'Launch Call' : 'Call Locked'}</span>
                          {timeStatus?.isLive && <ExternalLink className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {timeStatus && !timeStatus.isLive && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex-1">
                        <strong className="font-bold">Meeting Link Locked:</strong> {timeStatus.message}
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
                        {timeStatus.badge}
                      </span>
                    </div>
                  )}
                </div>

                {/* Companion Mode Guidance Box */}
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-xs text-emerald-200/90 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-300 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>How Google Meet + AI Transcripts Work Together:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    1. Click <strong>"Launch Call"</strong> above to open Google Meet without any code errors.
                    <br />
                    2. Keep this tab open alongside Google Meet.
                    <br />
                    3. Click <strong>"Start Live Audio Transcription"</strong> below to record speech through your microphone, or click <strong>"Paste GMeet Captions"</strong> to import Google Meet transcript text anytime!
                  </p>
                </div>

                {/* Quick Share Links Row */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyAppLink}
                      className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition"
                      title="Copy shareable link to this web dashboard"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>{copiedApp ? 'Companion Link Copied!' : 'Copy Companion Link'}</span>
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      onClick={handleCopyFullInvite}
                      className="text-blue-400 hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1 transition"
                      title="Copy calendar/email invitation snippet"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{copiedInvite ? 'Invite Snippet Copied!' : 'Copy Full Invite Snippet'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <FileText className="w-3 h-3 text-indigo-400" />
                    <span>Paste GMeet Captions</span>
                  </button>
                </div>
              </div>

              {/* Bottom Transcription Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={toggleMicListening}
                  className={`px-4 py-2.5 rounded-xl transition font-bold text-xs flex items-center gap-2 shadow-lg ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                  title="Toggle Web Speech Speech-to-Text audio listener"
                >
                  {isListening ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-emerald-100" />}
                  <span>{isListening ? 'Live Speech Transcribing Active...' : 'Start Live Audio Transcription'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Import Transcript</span>
                  </button>

                  <button
                    onClick={handleFinishMeeting}
                    className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>End Call</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* JITSI EMBEDDED IFRAME */
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 relative flex flex-col justify-between overflow-hidden shadow-2xl space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Jitsi Video Call Connected ({jitsiRoomName})</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {transcript.length} speech entries
                </div>
              </div>

              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                {timeStatus && !timeStatus.isLive ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-slate-950/90">
                    <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-white">Video Call Room Locked</h4>
                    <p className="text-xs text-slate-400 max-w-md">{timeStatus.message}</p>
                    <span className="text-xs px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 font-mono border border-amber-500/30">
                      {timeStatus.badge}
                    </span>
                  </div>
                ) : (
                  <iframe
                    src={jitsiEmbedUrl}
                    allow="camera; microphone; display-capture; autoplay; clipboard-write; speaker-selection"
                    className="w-full h-full border-0"
                    title="Embedded Jitsi Video Call"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <button
                  onClick={toggleMicListening}
                  className={`px-3 py-2 rounded-xl transition font-semibold text-xs flex items-center gap-2 ${
                    isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {isListening ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-slate-400" />}
                  <span>{isListening ? 'Live Speech Transcribing...' : 'Start Speech Rec'}</span>
                </button>

                <button
                  onClick={handleFinishMeeting}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Leave Meeting</span>
                </button>
              </div>
            </div>
          )}

          {/* Attendees List & Speaker Selector */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Call Attendees & Active Speaker:</span>
              </div>
              <span className="text-[10px] text-slate-400">{attendeesList.length} participants</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {attendeesList.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/40 rounded-lg">
                  No attendee email IDs added.
                </div>
              ) : (
                attendeesList.map(a => {
                  const emailStr = getAttendeeEmail(a);
                  const isCurrent = currentSpeakerEmail === emailStr;
                  return (
                    <button
                      key={emailStr}
                      onClick={() => setCurrentSpeakerEmail(emailStr)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                      <span>{emailStr}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Live Transcript Feed & Utterance Form (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900/70 rounded-2xl border border-slate-800 p-5 backdrop-blur-sm h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Google Meet Transcript Feed</h3>
                <p className="text-[11px] text-slate-400">Real-time speech & action items</p>
              </div>
            </div>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 border border-slate-700 transition"
              title="Paste text copied from Google Meet"
            >
              <FileText className="w-3 h-3 text-emerald-400" />
              <span>Paste Text</span>
            </button>
          </div>

          {speechError && (
            <div className="p-2.5 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Transcript Scroll Container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-2">
                <Bot className="w-8 h-8 opacity-40 animate-pulse" />
                <p className="text-xs font-semibold text-slate-400">No transcript captured yet.</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Click "Start Live Audio Transcription", "Simulate Audio", or paste captions from Google Meet.
                </p>
              </div>
            ) : (
              transcript.map((item) => {
                const isActionWord = /will|please|prepare|create|write|implement|assign|fix|draft|test|deploy|setup|schedule/i.test(item.text);
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs transition space-y-1 ${
                      isActionWord
                        ? 'bg-indigo-950/40 border-indigo-500/40 text-slate-200 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400">{item.speaker}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{item.text}</p>
                    {isActionWord && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold mt-1">
                        <Sparkles className="w-3 h-3" /> ERPNext Task Candidate
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Quick Spoken Utterance Input */}
          <form onSubmit={handleAddCustomEntry} className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
            <select
              value={currentSpeakerEmail}
              onChange={e => setCurrentSpeakerEmail(e.target.value)}
              className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-400 max-w-[130px] font-mono"
            >
              {attendeesList.map(a => (
                <option key={a.email} value={a.email}>{a.name || a.email.split('@')[0]}</option>
              ))}
            </select>
            <input
              type="text"
              value={customUtterance}
              onChange={e => setCustomUtterance(e.target.value)}
              placeholder="Type spoken sentence from Google Meet..."
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center"
              title="Add Spoken Sentence"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* IMPORT / PASTE GOOGLE MEET TRANSCRIPT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <GoogleMeetIcon className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Import Google Meet Transcript or Captions</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Copy-paste live captions, chat notes, or exported transcript from Google Meet. Our NLP parser will automatically extract speakers, timestamps, and actionable text.
            </p>

            <form onSubmit={handleImportTranscript} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paste Raw Google Meet Text:
                </label>
                <textarea
                  rows={8}
                  value={rawTranscriptInput}
                  onChange={e => setRawTranscriptInput(e.target.value)}
                  placeholder={`Example Google Meet transcript format:
Alex Johnson 10:30 AM
I will prepare the ERPNext custom DocType schemas by Thursday.

Sarah Chen 10:32 AM
I will write the FastAPI webhook endpoint and complete unit tests before staging deployment.`}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={importLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{importLoading ? 'Parsing...' : 'Parse & Add to Transcript'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
