import { useState } from 'react';
import Navbar from './components/Navbar';
import MeetingCreation from './components/MeetingCreation';
import MeetingRoom from './components/MeetingRoom';
import AIExtraction from './components/AIExtraction';
import ERPNextSyncHub from './components/ERPNextSyncHub';
import ERPNextConfigModal from './components/ERPNextConfigModal';
import { INITIAL_MEETINGS } from './data/sampleMeetings';
import { extractTasksFromTranscript } from './services/aiProcessor';
import { getERPNextConfig } from './services/erpnextApi';

export default function App() {
  const [activeStep, setActiveStep] = useState(1);
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [activeMeeting, setActiveMeeting] = useState(INITIAL_MEETINGS[0]);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [erpnextConfig, setErpnextConfig] = useState(getERPNextConfig());

  // Step 1 -> Select existing meeting
  const handleSelectMeeting = (meeting) => {
    setActiveMeeting(meeting);
    if (meeting.transcript && meeting.transcript.length > 0) {
      const tasks = extractTasksFromTranscript(meeting.transcript, {
        project: meeting.project,
        projectName: meeting.projectName
      });
      setExtractedTasks(tasks);
    } else {
      setExtractedTasks([]);
    }
    setActiveStep(2);
  };

  // Step 1 -> Created new meeting form submit
  const handleMeetingCreated = (newMeeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
    setActiveMeeting(newMeeting);
  };

  // Step 1 -> Direct launch to Step 2
  const handleStartMeeting = (meeting) => {
    setMeetings(prev => [meeting, ...prev.filter(m => m.id !== meeting.id)]);
    setActiveMeeting(meeting);
    setActiveStep(2);
  };

  // Step 2 -> End meeting room & transition to Step 3 AI task capture
  const handleEndMeetingRoom = (finalTranscript) => {
    const updatedMeeting = {
      ...activeMeeting,
      status: 'Completed',
      transcript: finalTranscript
    };
    setActiveMeeting(updatedMeeting);
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));

    // Process tasks
    const tasks = extractTasksFromTranscript(finalTranscript, {
      project: updatedMeeting.project,
      projectName: updatedMeeting.projectName
    });
    setExtractedTasks(tasks);

    // Navigate to Step 3
    setActiveStep(3);
  };

  // Step 3 -> Proceed to Step 4 Human Approval & ERPNext Sync Hub
  const handleProceedToSync = () => {
    setActiveStep(4);
  };

  // Reset workflow for new meeting
  const handleNewMeetingClick = () => {
    setActiveStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        erpnextConfig={erpnextConfig}
        onOpenConfig={() => setIsConfigOpen(true)}
        onNewMeeting={handleNewMeetingClick}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4">
        {activeStep === 1 && (
          <MeetingCreation
            meetings={meetings}
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
            onProceedToSync={handleProceedToSync}
          />
        )}

        {activeStep === 4 && (
          <ERPNextSyncHub
            extractedTasks={extractedTasks}
            setExtractedTasks={setExtractedTasks}
            erpnextConfig={erpnextConfig}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        )}
      </main>

      <ERPNextConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigSaved={(newCfg) => setErpnextConfig(newCfg)}
      />

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 gap-2">
          <span>ERPNext AI Meeting Intelligence Suite • Google Meet Live Transcription</span>
          <span className="text-slate-600">Connected with ERPNext REST API / Task DocType</span>
        </div>
      </footer>
    </div>
  );
}
