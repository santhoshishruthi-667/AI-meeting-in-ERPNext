'use client';
import { Bot, Video, CheckSquare, Sparkles, Server, Plus } from 'lucide-react';

export default function Navbar({ activeStep, setActiveStep, erpConfig, onOpenConfig, onNewMeeting }) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveStep(1)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-base">ERPNext AI</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Next.js + FastAPI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Google Meet Transcript & ERPNext Task Sync</p>
            </div>
          </div>

          {/* Workflow Pipeline Steps */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeStep === 1
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Create Meeting</span>
            </button>

            <span className="text-slate-700">→</span>

            <button
              onClick={() => setActiveStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeStep === 2
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>GMeet & Live Speech</span>
            </button>

            <span className="text-slate-700">→</span>

            <button
              onClick={() => setActiveStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeStep === 3
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>FastAPI AI Extraction</span>
            </button>

            <span className="text-slate-700">→</span>

            <button
              onClick={() => setActiveStep(4)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeStep === 4
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Approval & ERPNext Sync</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNewMeeting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Meeting</span>
            </button>

            <button
              onClick={onOpenConfig}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-lg text-xs font-medium transition border border-slate-700/80"
              title="Configure ERPNext credentials"
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {erpConfig?.useMockMode ? 'ERPNext Mock Engine' : 'FastAPI REST Mode'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
