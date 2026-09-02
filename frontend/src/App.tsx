import React, { useState, useEffect } from 'react';
import { Eye, Sparkles, RefreshCw, Cpu, Layers } from 'lucide-react';
import { TaskInput } from './components/TaskInput';
import { BrowserView } from './components/BrowserView';
import { AgentTimeline } from './components/AgentTimeline';
import { ConfidencePanel } from './components/ConfidencePanel';
import { DecisionPanel } from './components/DecisionPanel';
import { LearningPanel } from './components/LearningPanel';
import { DemoSiteSelector } from './components/DemoSiteSelector';
import { UIVersionToggle } from './components/UIVersionToggle';

import { getDemoSites, getLearningStats, runAgentTask, resetLearning } from './api';
import { DemoSite, LearningStats, RunTaskResponse } from './types';

export function App() {
  const [task, setTask] = useState('Search for Python courses and open the first result');
  const [demoSites, setDemoSites] = useState<DemoSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('search');
  const [uiVersion, setUiVersion] = useState<string>('A');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [agentResult, setAgentResult] = useState<RunTaskResponse | null>(null);
  const [learningStats, setLearningStats] = useState<LearningStats>({
    total_interactions: 4,
    successful_actions: 4,
    success_rate: 1.0,
    average_confidence: 0.87,
    before_learning_avg: 0.72,
    after_learning_avg: 0.89,
    learning_improvement: 0.17
  });

  useEffect(() => {
    getDemoSites().then(setDemoSites);
    getLearningStats().then(setLearningStats);
  }, []);

  const handleRunTask = async () => {
    if (!task.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await runAgentTask(task, selectedSite, uiVersion);
      setAgentResult(res);
      if (res.learning_stats) {
        setLearningStats(res.learning_stats);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing agent task.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetLearning = async () => {
    try {
      const newStats = await resetLearning();
      setLearningStats(newStats);
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-12">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm font-bold text-xl">
              👁️
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg md:text-xl leading-tight flex items-center gap-2">
                <span>PrivaSight</span>
                <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">SIH MVP</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Visual-First Intelligent Browser Agent via Visual Perception, DOM Heuristics & Scikit-Fuzzy Decision Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <DemoSiteSelector
              sites={demoSites}
              selectedSite={selectedSite}
              onChange={setSelectedSite}
              disabled={isLoading}
            />
            <UIVersionToggle
              version={uiVersion}
              onChange={setUiVersion}
              disabled={isLoading}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 pt-6 flex-1 w-full">
        {/* Task Input Section */}
        <TaskInput
          task={task}
          setTask={setTask}
          onRun={handleRunTask}
          isLoading={isLoading}
          selectedSite={selectedSite}
        />

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* 2-Column Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Browser View */}
          <div className="lg:col-span-6 flex flex-col">
            <BrowserView
              screenshotUrl={agentResult?.perception?.screenshot_url || null}
              currentUrl={agentResult?.perception?.url || ''}
              topCandidate={agentResult?.perception?.top_candidate}
              uiVersion={uiVersion}
              demoSite={selectedSite}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column: Reasoning & Intelligence Panels */}
          <div className="lg:col-span-6 space-y-6">
            <AgentTimeline
              timeline={agentResult?.timeline || []}
              isLoading={isLoading}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfidencePanel candidate={agentResult?.perception?.top_candidate} />
              <DecisionPanel decision={agentResult?.fuzzy_decision} />
            </div>

            <LearningPanel stats={learningStats} onReset={handleResetLearning} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
