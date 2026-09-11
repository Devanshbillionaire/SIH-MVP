import React from 'react';
import { Globe, Terminal, Play, RotateCcw, ShieldCheck, Loader2 } from 'lucide-react';

interface TaskInputProps {
  url: string;
  onUrlChange: (value: string) => void;
  task: string;
  onTaskChange: (value: string) => void;
  userData: string;
  onUserDataChange: (value: string) => void;
  onRunAgent: () => void;
  onClear: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

export const TaskInput: React.FC<TaskInputProps> = ({
  url,
  onUrlChange,
  task,
  onTaskChange,
  userData,
  onUserDataChange,
  onRunAgent,
  onClear,
  isRunning,
  disabled = false
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRunning && url.trim()) {
      onRunAgent();
    }
  };

  return (
    <div id="new-task-card" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900 tracking-tight">PrivaSight Task Planner</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Provide a target webpage URL and natural language instructions. Phase 6 plans, explains, and verifies execution steps.
          </p>
        </div>
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local Privacy & Intent Engine Active</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* 1. Website URL Input */}
        <div>
          <label htmlFor="target-url-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Website URL
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Globe className="w-4 h-4" />
            </div>
            <input
              id="target-url-input"
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://example.com/form"
              disabled={isRunning || disabled}
              className="block w-full pl-9 pr-4 py-2.5 bg-slate-50/70 border border-slate-300/80 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-60"
            />
          </div>
        </div>

        {/* 2. What should I do? */}
        <div>
          <label htmlFor="task-instruction-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            What should I do?
          </label>
          <div className="relative rounded-lg shadow-2xs">
            <div className="absolute top-3 left-3 flex items-center pointer-events-none text-slate-400">
              <Terminal className="w-4 h-4" />
            </div>
            <textarea
              id="task-instruction-input"
              rows={3}
              value={task}
              onChange={(e) => onTaskChange(e.target.value)}
              placeholder="e.g. Fill my name, email and phone number and leave the password field for me."
              disabled={isRunning || disabled}
              className="block w-full pl-9 pr-4 py-2.5 bg-slate-50/70 border border-slate-300/80 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all resize-y disabled:opacity-60 font-sans"
            />
          </div>
        </div>

        {/* 3. Information to fill — Immediately Visible */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="user-data-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Information to fill
            </label>
            <span className="text-[11px] text-slate-400 font-mono">Key = Value or plain text</span>
          </div>
          <div className="relative rounded-lg shadow-2xs">
            <textarea
              id="user-data-input"
              rows={3}
              value={userData}
              onChange={(e) => onUserDataChange(e.target.value)}
              placeholder="Name = Devansh Kumar&#10;Email = devansh@example.com&#10;Phone = +1-555-0199"
              disabled={isRunning || disabled}
              className="block w-full p-3 bg-slate-50/70 border border-slate-300/80 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all resize-y disabled:opacity-60"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Data separated from instructions: sensitive values are routed to local vault and never sent to external models.
          </p>
        </div>

        {/* Privacy Notice Banner */}
        <div id="privacy-callout-banner" className="flex items-start space-x-2.5 p-3 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-medium">
            Task planner separates intentions from user secrets. Passwords & private credentials remain local only.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            id="btn-clear-task"
            onClick={onClear}
            disabled={isRunning || (!url && !task && !userData)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="submit"
            id="btn-run-agent"
            disabled={isRunning || !url.trim()}
            className="inline-flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm shadow-indigo-200 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Perceiving & Planning...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>START TASK</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
