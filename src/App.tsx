import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { TaskInput } from './components/TaskInput';
import { AgentExecutionPanel } from './components/AgentExecutionPanel';
import { PagePerceptionPanel } from './components/PagePerceptionPanel';
import { PrivacyProtectionPanel } from './components/PrivacyProtectionPanel';
import { FuzzyLogicPanel } from './components/FuzzyLogicPanel';
import { FieldMappingPanel } from './components/FieldMappingPanel';
import { VerificationPanel } from './components/VerificationPanel';
import { MLPanel } from './components/MLPanel';
import { TaskPlanPanel } from './components/TaskPlanPanel';
import { ActivityPage } from './components/ActivityPage';
import { LearningPage } from './components/LearningPage';
import { SettingsPage } from './components/SettingsPage';

import {
  NavigationTab,
  TaskExecutionStage,
  PagePerceptionData,
  PrivacyResult,
  FuzzyDecision,
  FieldMapping,
  VerificationResult,
  LearningStats,
  ActivityItem,
  AppSettings,
  DisambiguationCandidate,
  TaskPlan,
  TaskIntent
} from './types';

import {
  getLearningStats,
  executeAgentTask,
  resetLearning,
  resetML,
  submitLearningFeedback,
  analyzePrivacy
} from './api';

const DEFAULT_STAGES: TaskExecutionStage[] = [
  { id: 'stage-1', name: 'Opening webpage', description: 'Navigating to target URL and establishing browser context', status: 'pending' },
  { id: 'stage-2', name: 'Capturing page', description: 'Capturing viewport screenshot and DOM snapshot buffer', status: 'pending' },
  { id: 'stage-3', name: 'Analyzing DOM and screenshot', description: 'Computing layout bounds and visual hierarchy', status: 'pending' },
  { id: 'stage-4', name: 'Detecting form fields', description: 'Identifying interactive inputs, selects, and textareas', status: 'pending' },
  { id: 'stage-5', name: 'Privacy filtering', description: 'Scanning local inputs for sensitive PII and confidential tokens', status: 'pending' },
  { id: 'stage-6', name: 'ML confidence analysis', description: 'Predicting element relevance with Random Forest model', status: 'pending' },
  { id: 'stage-7', name: 'Fuzzy ambiguity resolution', description: 'Resolving candidate conflict with Scikit-fuzzy engine', status: 'pending' },
  { id: 'stage-8', name: 'Intelligent field mapping', description: 'Associating provided information keys with detected DOM fields', status: 'pending' },
  { id: 'stage-9', name: 'Filling form', description: 'Simulating sequential human keystrokes on target fields', status: 'pending' },
  { id: 'stage-10', name: 'Verification', description: 'Verifying DOM post-fill state and receipt assertions', status: 'pending' },
  { id: 'stage-11', name: 'Learning', description: 'Saving sanitized feature vectors to offline training memory', status: 'pending' }
];

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('task');

  // Task Input State
  const [url, setUrl] = useState<string>('https://httpbin.org/forms/post');
  const [task, setTask] = useState<string>('Fill my name, email and phone number and leave the password field for me.');
  const [userData, setUserData] = useState<string>('Name = Devansh Kumar\nEmail = devansh@example.com\nPhone = +1-555-0199');
  const [information, setInformation] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Phase 6 Task Plan & Intent State
  const [taskPlan, setTaskPlan] = useState<TaskPlan | null>(null);
  const [taskIntent, setTaskIntent] = useState<TaskIntent | null>(null);

  // Execution Results State
  const [stages, setStages] = useState<TaskExecutionStage[]>(DEFAULT_STAGES);
  const [perception, setPerception] = useState<PagePerceptionData | null>(null);
  const [privacyResult, setPrivacyResult] = useState<PrivacyResult | null>(null);
  const [fuzzyDecision, setFuzzyDecision] = useState<FuzzyDecision | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);

  // Learning Stats State
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [isResettingLearning, setIsResettingLearning] = useState<boolean>(false);

  // Activity History State
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    ai_provider: 'automatic',
    privacy_protection: true,
    local_processing: true,
    continuous_learning: true,
    verification_strictness: 'strict',
    external_ai_usage: 'ambiguous_only'
  });

  useEffect(() => {
    getLearningStats().then((stats) => {
      setLearningStats(stats);
    });
  }, []);

  // Real-time local privacy analysis as user types information
  useEffect(() => {
    const trimmedInfo = information.trim();
    if (!trimmedInfo) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await analyzePrivacy(trimmedInfo);
        if (res && res.success) {
          setPrivacyResult({
            success: res.success,
            analyzed_count: res.analyzed_count,
            safe_fields: res.safe_data.map((d: any) => d.key),
            protected_fields: res.protected_data.map((d: any) => d.key),
            safe_data: res.safe_data,
            protected_data: res.protected_data,
            external_ai_access: res.external_ai_access,
            redaction_active: res.redaction_active,
            message: res.message,
            scan_status: res.scan_status
          });
        }
      } catch (err) {
        console.error('Real-time privacy scan error:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [information]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleClearTask = () => {
    setUrl('');
    setTask('');
    setUserData('');
    setInformation('');
    setTaskPlan(null);
    setTaskIntent(null);
    setHasRun(false);
    setErrorMsg(null);
    setStages(DEFAULT_STAGES);
    setPerception(null);
    setPrivacyResult(null);
    setFuzzyDecision(null);
    setFieldMappings([]);
    setVerification(null);
  };

  const handleRunAgent = async () => {
    if (isRunning) return;
    const targetUrl = url.trim();
    if (!targetUrl) {
      setErrorMsg('Please enter a target webpage URL (e.g. https://httpbin.org/forms/post).');
      return;
    }

    setIsRunning(true);
    setHasRun(false);
    setErrorMsg(null);

    // Initial progression: show real opening state
    setStages((prev) => [
      { id: 'stage-1', name: 'Opening webpage', description: `Opening target endpoint: ${targetUrl}`, status: 'active' },
      { id: 'stage-2', name: 'Capturing page', description: 'Playwright viewport capture in progress...', status: 'pending' },
      { id: 'stage-3', name: 'Analyzing DOM and screenshot', description: 'Extracting interactive elements & bounding geometry...', status: 'pending' },
      { id: 'stage-4', name: 'Detecting form fields', description: 'ElementDetector confidence evaluation...', status: 'pending' },
      ...prev.slice(4).map(s => ({ ...s, status: 'pending' as const }))
    ]);

    try {
      const combinedInfo = userData.trim()
        ? `${task.trim()}\n\nUser Data:\n${userData.trim()}`
        : (task.trim() || information.trim());

      const response = await executeAgentTask({
        url: targetUrl,
        information: combinedInfo,
        task: task.trim()
      });

      // Update states directly from real backend perception and planning results
      if (response.stages) setStages(response.stages);
      if (response.perception) setPerception(response.perception);
      else if (response.url) setPerception(response);
      if (response.privacy_result) setPrivacyResult(response.privacy_result);
      if (response.task_plan) setTaskPlan(response.task_plan);
      if (response.task_intent) setTaskIntent(response.task_intent);
      if (response.fuzzy_decision) setFuzzyDecision(response.fuzzy_decision);
      if (response.field_mappings) setFieldMappings(response.field_mappings);
      if (response.verification) setVerification(response.verification);
      if (response.learning_stats) setLearningStats(response.learning_stats);

      setHasRun(true);

      // Record in Activity history
      let domain = 'target-host';
      try {
        domain = new URL(targetUrl).hostname;
      } catch (e) {
        domain = targetUrl.replace(/https?:\/\//, '').split('/')[0] || 'target-host';
      }

      const elemCount = response.elements_count || response.elements?.length || response.detected_fields?.length || 0;
      const newActivity: ActivityItem = {
        id: `act_${Date.now()}`,
        url: targetUrl,
        domain: domain,
        status: 'SUCCESS',
        fields_processed: elemCount,
        verification: `Perception complete: ${elemCount} interactive element(s) detected`,
        confidence: 0.95,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setActivities((prev) => [newActivity, ...prev]);
    } catch (err: any) {
      console.error('Error executing task perception:', err);
      const errMsg = err.message || 'Webpage perception failed.';
      setErrorMsg(errMsg);
      setStages([
        { id: 'stage-1', name: 'Opening webpage', description: errMsg, status: 'failed' },
        { id: 'stage-2', name: 'Capturing page', description: 'Cancelled due to navigation error', status: 'pending' },
        { id: 'stage-3', name: 'Analyzing DOM and screenshot', description: 'Cancelled', status: 'pending' },
        { id: 'stage-4', name: 'Detecting form fields', description: 'Cancelled', status: 'pending' },
        { id: 'stage-5', name: 'Privacy filtering', description: 'Pending', status: 'pending' },
        { id: 'stage-6', name: 'ML confidence analysis', description: 'Pending', status: 'pending' },
        { id: 'stage-7', name: 'Fuzzy ambiguity resolution', description: 'Pending', status: 'pending' },
        { id: 'stage-8', name: 'Intelligent field mapping', description: 'Pending', status: 'pending' },
        { id: 'stage-9', name: 'Filling form', description: 'Pending', status: 'pending' },
        { id: 'stage-10', name: 'Verification', description: 'Pending', status: 'pending' },
        { id: 'stage-11', name: 'Learning', description: 'Pending', status: 'pending' }
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetLearning = async () => {
    setIsResettingLearning(true);
    try {
      const newStats = await resetLearning();
      setLearningStats(newStats);
    } catch (err) {
      console.error('Failed to reset learning store:', err);
    } finally {
      setIsResettingLearning(false);
    }
  };

  const handleResetML = async () => {
    setIsResettingLearning(true);
    try {
      await resetML();
      const updatedStats = await getLearningStats();
      setLearningStats(updatedStats);
    } catch (err) {
      console.error('Failed to reset ML model to cold start:', err);
    } finally {
      setIsResettingLearning(false);
    }
  };

  const handleSelectCandidate = async (mappingIndex: number, candidate: DisambiguationCandidate) => {
    const targetMapping = fieldMappings[mappingIndex];
    if (!targetMapping) return;

    // Update the mapped target field in state
    const updatedMappings = [...fieldMappings];
    const previousAlternatives = targetMapping.alternatives || [];
    
    updatedMappings[mappingIndex] = {
      ...targetMapping,
      detected_field: candidate.selector || candidate.id,
      selected_candidate_id: candidate.id,
      confidence: candidate.composite_score,
      decision: 'EXECUTE'
    };
    setFieldMappings(updatedMappings);

    // Compute feedback features for selected vs rejected candidates
    const selectedFeatures = [
      candidate.visual_confidence || 0.85,
      candidate.dom_confidence || 0.85,
      candidate.text_similarity || 0.90
    ];

    const rejectedFeaturesList = previousAlternatives
      .filter((alt) => alt.id !== candidate.id)
      .map((alt) => [alt.visual_confidence || 0.5, alt.dom_confidence || 0.5, alt.text_similarity || 0.5]);

    try {
      await submitLearningFeedback({
        intent: targetMapping.user_field,
        selected_features: selectedFeatures,
        rejected_features_list: rejectedFeaturesList,
        outcome: 'USER_CORRECTION',
        element_type: candidate.tag || 'input',
        action_type: 'fill'
      });

      // Refresh learning stats to reflect the feedback sample
      const newStats = await getLearningStats();
      setLearningStats(newStats);
    } catch (err) {
      console.error('Failed to submit learning feedback for candidate disambiguation:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
      />

      {/* Main Content Areas based on Tab */}
      <main className="flex-1 pb-16">
        {activeTab === 'task' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
            {/* New Task Input Card */}
            <TaskInput
              url={url}
              onUrlChange={setUrl}
              task={task}
              onTaskChange={setTask}
              userData={userData}
              onUserDataChange={setUserData}
              onRunAgent={handleRunAgent}
              onClear={handleClearTask}
              isRunning={isRunning}
            />

            {/* Phase 6 Task Plan & Intent Preview Panel */}
            <TaskPlanPanel
              plan={taskPlan}
              intent={taskIntent}
              hasRun={hasRun}
            />

            {/* Two-Column Structured Panels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Perception, Privacy & Mapping */}
              <div className="lg:col-span-6 space-y-6">
                <PagePerceptionPanel
                  perception={perception}
                  hasRun={hasRun}
                />

                <PrivacyProtectionPanel
                  privacyResult={privacyResult}
                  hasRun={hasRun}
                />

                <FieldMappingPanel
                  mappings={fieldMappings}
                  hasRun={hasRun}
                  onSelectCandidate={handleSelectCandidate}
                />
              </div>

              {/* Right Column: Execution Pipeline, Fuzzy Engine, Verification & ML */}
              <div className="lg:col-span-6 space-y-6">
                <AgentExecutionPanel
                  stages={stages}
                  isRunning={isRunning}
                  hasRun={hasRun}
                  error={errorMsg}
                />

                <FuzzyLogicPanel
                  decision={fuzzyDecision}
                  hasRun={hasRun}
                />

                <VerificationPanel
                  verification={verification}
                  hasRun={hasRun}
                />

                <MLPanel
                  stats={learningStats}
                  hasRun={hasRun}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <ActivityPage activities={activities} />
        )}

        {activeTab === 'learning' && (
          <LearningPage
            stats={learningStats}
            onResetLearning={handleResetLearning}
            onResetML={handleResetML}
            isResetting={isResettingLearning}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>
    </div>
  );
}

export default App;
