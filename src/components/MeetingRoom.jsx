import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Bot, Sparkles, Send, Play, Pause, AlertCircle, ArrowRight, ShieldCheck, Check, Lock } from 'lucide-react';
import { ERPNEXT_USERS } from '../data/erpnextProjects';
import { getMeetingTimeStatus, formatTimeForDisplay } from '../utils/meetingTime';

export default function MeetingRoom({ activeMeeting, onEndMeeting }) {
  const [transcript, setTranscript] = useState(activeMeeting?.transcript || []);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [customUtterance, setCustomUtterance] = useState('');

  const attendeesList = activeMeeting?.attendees || [];
  const getAttendeeEmail = (att) => typeof att === 'string' ? att : (att?.email || att?.name || '');
  const initialSpeaker = attendeesList[0] ? getAttendeeEmail(attendeesList[0]) : 'Host';

  const [currentSpeaker, setCurrentSpeaker] = useState(initialSpeaker);
  const [activeSpeakingUser, setActiveSpeakingUser] = useState(initialSpeaker);

  // Real-time ticking clock every second to update meeting link status
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
  
  const transcriptEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll transcript feed
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Setup Web Speech API for real mic input if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const results = event.results;
        for (let i = event.resultIndex; i < results.length; i++) {
          if (results[i].isFinal) {
            const finalTranscript = results[i][0].transcript.trim();
            if (finalTranscript) {
              const now = new Date();
              const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setTranscript(prev => [
                ...prev,
                {
                  id: `t-mic-${Date.now()}`,
                  timestamp: timeString,
                  speaker: 'You (Host)',
                  text: finalTranscript
                }
              ]);
            }
          }
        }
      };

      recognition.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setSpeechError('Microphone permission or browser speech support issue: ' + err.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            console.error(e);
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechError('Web Speech API is not supported in this browser engine. Use the Team Simulation or Quick Chat box to add transcript entries.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [isListening]);

  // Toggle Live Mic Recording
  const toggleMicListening = () => {
    if (!recognitionRef.current) {
      alert('Browser speech recognition not available. You can use team simulation or type live inputs!');
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

  // Pre-scripted Team Discussion Simulation
  const simulatedTimeline = [
    { speaker: 'Priya Sharma', text: 'Okay team, let us review our ERPNext deployment plan for this week.' },
    { speaker: 'Alex Rivera', text: 'I completed the initial API client. Samantha, could you prepare the ERPNext custom DocType schemas for AI Tasks by Thursday?' },
    { speaker: 'Samantha Chen', text: 'Sure thing, Alex! I will create the custom DocType schema with fields for task description, priority, and parent project by Thursday.' },
    { speaker: 'Devon Marcus', text: 'What about the real-time transcription webhook backend?' },
    { speaker: 'Priya Sharma', text: 'Devon, please implement the Express webhook backend to receive live transcripts from Google Meet bot and store them in Redis. Target deadline is Friday.' },
    { speaker: 'Devon Marcus', text: 'Got it. I will write the Express webhook and write unit tests for transcript ingestion.' },
    { speaker: 'Priya Sharma', text: 'I will draft the UAT test checklist for human approval and sync flow by tomorrow EOD.' }
  ];

  useEffect(() => {
    let timer;
    if (isSimulating) {
      let stepIndex = 0;
      timer = setInterval(() => {
        if (stepIndex < simulatedTimeline.length) {
          const item = simulatedTimeline[stepIndex];
          const now = new Date();
          const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          setActiveSpeakingUser(item.speaker);
          setTranscript(prev => [
            ...prev,
            {
              id: `sim-${Date.now()}-${stepIndex}`,
              timestamp: timeString,
              speaker: item.speaker,
              text: item.text
            }
          ]);
          stepIndex++;
        } else {
          setIsSimulating(false);
          clearInterval(timer);
        }
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  const handleAddCustomEntry = (e) => {
    e.preventDefault();
    if (!customUtterance.trim()) return;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setTranscript(prev => [
      ...prev,
      {
        id: `t-manual-${Date.now()}`,
        timestamp: timeString,
        speaker: currentSpeaker,
        text: customUtterance.trim()
      }
    ]);
    setCustomUtterance('');
  };

  const handleFinishMeeting = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onEndMeeting(transcript);
  };

  return (
    <div className="max-w-7xl mx-auto py-4 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">{activeMeeting?.title || 'ERPNext Live Meeting'}</h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> LIVE ROOM
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              GMeet Link: <a
                href={timeStatus?.isLive ? activeMeeting?.gmeetLink : '#'}
                onClick={e => {
                  if (!timeStatus?.isLive) {
                    e.preventDefault();
                    alert(`⚠️ Meeting Link Locked!\n\n${timeStatus?.message || 'The meeting link works only on the assigned date and time.'}`);
                  }
                }}
                target={timeStatus?.isLive ? "_blank" : undefined}
                rel="noreferrer"
                className={`hover:underline ${timeStatus?.isLive ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {activeMeeting?.gmeetLink || 'https://meet.google.com/abc-defg-hij'}
              </a>
              {timeStatus && (
                <span className="ml-2 font-mono text-[10px] text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {timeStatus.badge}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isSimulating ? 'Simulating Discussion...' : 'Simulate Team Audio'}</span>
          </button>

          <button
            onClick={handleFinishMeeting}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-500/25 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>End & Process AI Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left GMeet Video Tiles, Right Live AI Transcript Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Google Meet UI Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 relative min-h-[460px] flex flex-col justify-between overflow-hidden">
            {/* Top Info Bar */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 backdrop-blur-md">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Google Meet AI Transcript Bot Connected</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{transcript.length} transcript fragments</span>
              </div>
            </div>

            {/* Video Participant Grid */}
            <div className="grid grid-cols-2 gap-3 my-4">
              {ERPNEXT_USERS.slice(0, 4).map((user) => {
                const isSpeaking = activeSpeakingUser === user.name;
                return (
                  <div
                    key={user.id}
                    className={`relative rounded-xl overflow-hidden aspect-video bg-slate-900 border transition flex flex-col justify-between p-3 ${
                      isSpeaking ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10' : 'border-slate-800'
                    }`}
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 filter contrast-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                    <div className="relative z-10 flex justify-end">
                      <div className={`p-1.5 rounded-full backdrop-blur-md ${isSpeaking ? 'bg-emerald-500 text-white' : 'bg-slate-900/80 text-slate-400'}`}>
                        {isSpeaking ? <Mic className="w-3.5 h-3.5 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white drop-shadow">{user.name}</span>
                      {isSpeaking && (
                        <span className="px-2 py-0.5 bg-emerald-500/90 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
                          Speaking...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Controls Bar */}
            <div className="relative z-10 flex items-center justify-center gap-3 pt-2 border-t border-slate-800/80">
              <button
                onClick={toggleMicListening}
                className={`p-3 rounded-full transition ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isListening ? 'Stop Mic Recording' : 'Start Mic Recording'}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button className="p-3 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 transition">
                <Video className="w-5 h-5 text-emerald-400" />
              </button>

              <button
                onClick={handleFinishMeeting}
                className="p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/30"
                title="End Meeting"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live AI Transcript Feed (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900/70 rounded-2xl border border-slate-800 p-5 backdrop-blur-sm h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Live AI Transcript Stream</h3>
                <p className="text-[11px] text-slate-400">Capturing speech & detecting tasks in real time</p>
              </div>
            </div>
            {isListening && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Mic Active
              </span>
            )}
          </div>

          {speechError && (
            <div className="p-2.5 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <Bot className="w-8 h-8 text-slate-600 animate-bounce" />
                <p className="text-xs">No transcript captured yet.</p>
                <p className="text-[11px] text-slate-600">Turn on Mic or click "Simulate Team Audio" to see real-time streaming speech!</p>
              </div>
            ) : (
              transcript.map((item) => {
                const isActionWord = /will|please|prepare|create|write|implement|assign|fix|draft/i.test(item.text);
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs transition space-y-1 ${
                      isActionWord
                        ? 'bg-indigo-950/30 border-indigo-500/30 text-slate-200'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-400">{item.speaker}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{item.text}</p>
                    {isActionWord && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold mt-1">
                        <Sparkles className="w-3 h-3" /> Potential ERPNext Task Detected
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Bottom Manual Utterance Input */}
          <form onSubmit={handleAddCustomEntry} className="mt-3 pt-3 border-t border-slate-800 space-y-2">
            <div className="flex gap-2">
              <select
                value={currentSpeaker}
                onChange={e => setCurrentSpeaker(e.target.value)}
                className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-indigo-400 font-medium focus:outline-none"
              >
                {ERPNEXT_USERS.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={customUtterance}
                onChange={e => setCustomUtterance(e.target.value)}
                placeholder="Type spoken sentence to test live transcript..."
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
