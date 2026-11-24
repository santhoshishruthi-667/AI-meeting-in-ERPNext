'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import MeetingCreation from '../components/MeetingCreation';
import MeetingRoom from '../components/MeetingRoom';
import AIExtraction from '../components/AIExtraction';
import ERPNextSyncHub from '../components/ERPNextSyncHub';
import ERPNextConfigModal from '../components/ERPNextConfigModal';
import { getProjects, getMeetings, getMeetingById, updateMeeting, getERPConfig, extractAITasks } from '../services/api';

export default function Home() {
  const [activeStep, setActiveStep] = useState(1);
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [erpConfig, setErpConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedLinkNotice, setSharedLinkNotice] = useState(null);

  const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function loadInitialData() {
      try {
        const pList = await getProjects();
        setProjects(pList);

        const mList = await getMeetings();
        setMeetings(mList);

        const cfg = await getERPConfig();
        setErpConfig(cfg);

        // Check for shareable meeting link URL parameter ?meetingId=MEET-XXXX
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const meetingIdParam = urlParams.get('meetingId') || urlParams.get('m');
          if (meetingIdParam) {
            let found = mList.find(m => m.id.toLowerCase() === meetingIdParam.toLowerCase());
            if (!found) {
              try {
                found = await getMeetingById(meetingIdParam);
              } catch (e) {
                console.warn('Meeting not found via API:', meetingIdParam);
              }
            }
            if (found) {
              setActiveMeeting(found);
              setActiveStep(2);
              setSharedLinkNotice(`Joined meeting "${found.title}" via shared link!`);
              if (found.transcript && found.transcript.length > 0) {
                extractAITasks(found.transcript, found.project, found.projectName, found.attendees || [])
                  .then(tasks => setExtractedTasks(tasks))
                  .catch(e => console.error(e));
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load from FastAPI backend:', err);
        setError(`Could not connect to FastAPI backend at ${apiEndpoint}.`);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [apiEndpoint]);

  const handleSelectMeeting = async (meeting) => {
    setActiveMeeting(meeting);
    if (meeting.transcript && meeting.transcript.length > 0) {
      try {
        const tasks = await extractAITasks(meeting.transcript, meeting.project, meeting.projectName, meeting.attendees || []);
        setExtractedTasks(tasks);
      } catch (e) {
        console.error(e);
      }
    }
    setActiveStep(2);
  };

  const handleMeetingCreated = (newMeeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
    setActiveMeeting(newMeeting);
  };

  const handleStartMeeting = (meeting) => {
    setMeetings(prev => [meeting, ...prev.filter(m => m.id !== meeting.id)]);
    setActiveMeeting(meeting);
    setActiveStep(2);
  };

  const handleEndMeetingRoom = async (finalTranscript) => {
    const updatedMeeting = {
      ...activeMeeting,
      status: 'Completed',
      transcript: finalTranscript
    };
    setActiveMeeting(updatedMeeting);
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));

    try {
      if (activeMeeting?.id) {
        await updateMeeting(activeMeeting.id, { status: 'Completed', transcript: finalTranscript });
      }
      const tasks = await extractAITasks(finalTranscript, updatedMeeting.project, updatedMeeting.projectName, updatedMeeting.attendees || []);
      setExtractedTasks(tasks);
    } catch (e) {
      console.error(e);
    }

    setActiveStep(3);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono">Connecting to FastAPI Backend ({apiEndpoint})...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        erpConfig={erpConfig}
        onOpenConfig={() => setIsConfigOpen(true)}
        onNewMeeting={() => { setActiveMeeting(null); setActiveStep(1); }}
      />

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 text-center text-xs text-rose-300 font-mono">
          ⚠️ {error}
        </div>
      )}

      {sharedLinkNotice && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-3 text-center text-xs text-emerald-300 font-mono flex items-center justify-center gap-2">
          <span>🔗 {sharedLinkNotice}</span>
          <button onClick={() => setSharedLinkNotice(null)} className="text-emerald-400 hover:underline text-[10px] ml-2">Dismiss</button>
        </div>
      )}

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4">
        {activeStep === 1 && (
          <MeetingCreation
            meetings={meetings}
            projects={projects}
            onSelectMeeting={handleSelectMeeting}
            onMeetingCreated={handleMeetingCreated}
            onStartMeeting={handleStartMeeting}
          />
        )}

        {activeStep === 2 && (
          <MeetingRoom
            activeMeeting={activeMeeting}
            onEndMeeting={handleEndMeetingRoom}
          />
        )}

        {activeStep === 3 && (
          <AIExtraction
            activeMeeting={activeMeeting}
            extractedTasks={extractedTasks}
            setExtractedTasks={setExtractedTasks}
            onProceedToSync={() => setActiveStep(4)}
          />
        )}

        {activeStep === 4 && (
          <ERPNextSyncHub
            extractedTasks={extractedTasks}
            setExtractedTasks={setExtractedTasks}
            erpConfig={erpConfig}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        )}
      </main>

      <ERPNextConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        erpConfig={erpConfig}
        onConfigSaved={(cfg) => setErpConfig(cfg)}
      />

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 gap-2">
          <span>Clean Demo Mode: Next.js + FastAPI ERPNext Meeting Suite</span>
          <span className="text-slate-600">FastAPI REST Server: {apiEndpoint}</span>
        </div>
      </footer>
    </div>
  );
}
