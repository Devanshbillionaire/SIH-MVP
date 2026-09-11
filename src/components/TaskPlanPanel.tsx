import React from 'react';
import {
  ListOrdered,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Shield,
  Lock,
  ArrowRight,
  Eye,
  Info,
  CornerDownRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { TaskPlan, TaskIntent, TaskPlanStep } from '../types';

interface TaskPlanPanelProps {
  plan: TaskPlan | null;
  intent?: TaskIntent | null;
  hasRun: boolean;
  onExecutePlan?: () => void;
  isExecuting?: boolean;
}

export const TaskPlanPanel: React.FC<TaskPlanPanelProps> = ({
  plan,
  intent,
  hasRun,
  onExecutePlan,
  isExecuting = false
}) => {
  if (!hasRun && !plan) {
    return (
      <div id="task-plan-panel-empty" className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-600">
          <ListOrdered className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Task Planner & Intent Representation</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Enter a webpage URL and task prompt above to generate a structured, privacy-verified, and ordered task execution plan.
        </p>
      </div>
    );
  }

  const activePlan = plan;
  const activeIntent = intent || activePlan?.intent;

  if (!activePlan) return null;

  // Status badge styling
  const getStatusBadge = (status: TaskPlan['status']) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>READY</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>BLOCKED (User Input Required)</span>
          </span>
        );
      case 'NEEDS_CLARIFICATION':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
            <span>NEEDS CLARIFICATION</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>DRAFT</span>
          </span>
        );
    }
  };

  const getStepStatusBadge = (stepStatus: TaskPlanStep['status']) => {
    switch (stepStatus) {
      case 'READY':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">READY</span>;
      case 'BLOCKED':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">BLOCKED</span>;
      case 'SKIPPED':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">SKIPPED</span>;
      case 'NEEDS_CLARIFICATION':
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">CLARIFY</span>;
      default:
        return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">PENDING</span>;
    }
  };

  return (
    <div id="task-plan-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ListOrdered className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Task Plan & Intent Understanding</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Phase 6 Structured Representation — Predictable, explainable, and privacy-governed execution plan.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(activePlan.status)}
          {onExecutePlan && (
            <button
              type="button"
              id="btn-execute-plan-direct"
              onClick={onExecutePlan}
              disabled={isExecuting || activePlan.status === 'NEEDS_CLARIFICATION'}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing Actions...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Execute Plan ({activePlan.steps.length} actions)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 space-y-5">
        {/* Task Understood Overview */}
        <div id="task-understood-section" className="rounded-lg bg-indigo-50/40 border border-indigo-100/80 p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">
                Task Understood
              </span>
              <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                {activeIntent?.explanation || activePlan.explanation?.summary || 'Task recognized'}
              </h3>
            </div>
            <span className="text-xs font-mono font-medium px-2 py-1 bg-white rounded border border-indigo-200 text-indigo-700">
              ACTION: {activeIntent?.action || 'FILL'}
            </span>
          </div>

          {activeIntent?.clarification_reason && (
            <div className="mt-3 flex items-start space-x-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{activeIntent.clarification_reason}</span>
            </div>
          )}
        </div>

        {/* Structured Intent Fields Grid */}
        {activeIntent?.fields && activeIntent.fields.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Recognized Fields & Privacy Controls ({activeIntent.fields.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Sensitivity & Boundary Checks
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeIntent.fields.map((f, i) => {
                const isSensitive = f.sensitivity === 'HIGHLY_SENSITIVE';
                const isPersonal = f.sensitivity === 'PERSONAL';
                const isSkip = f.preferred_action === 'SKIP';

                return (
                  <div
                    key={`${f.field_name}_${i}`}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      isSensitive
                        ? 'bg-rose-50/50 border-rose-200'
                        : isPersonal
                        ? 'bg-amber-50/40 border-amber-200'
                        : isSkip
                        ? 'bg-slate-50 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-900 capitalize">
                        {f.field_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSensitive
                            ? 'bg-rose-100 text-rose-800'
                            : isPersonal
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {f.sensitivity}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Execution:</span>
                        <span className={`font-medium ${isSensitive ? 'text-rose-700 flex items-center gap-1' : 'text-slate-700'}`}>
                          {isSensitive && <Lock className="w-3 h-3" />}
                          {f.execution}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Action:</span>
                        <span className="font-medium text-slate-800">{f.preferred_action}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Source:</span>
                        <span className="font-mono text-[10px] text-slate-700">{f.value_source}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ordered Plan Steps List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Ordered Execution Steps ({activePlan.steps.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Dependency: Perceive → Match → Fuzzy Resolve → Execute → Verify
            </span>
          </div>

          <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/40">
            {activePlan.steps.map((step) => {
              const isBlocked = step.status === 'BLOCKED';
              const isSkipped = step.status === 'SKIPPED';

              return (
                <div
                  key={step.step_id}
                  className={`p-2.5 rounded-md border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                    isBlocked
                      ? 'bg-amber-50/80 border-amber-300'
                      : isSkipped
                      ? 'bg-slate-100/80 border-slate-200 text-slate-500'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start sm:items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700 shrink-0">
                      {step.step_id}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{step.description}</span>
                        {step.decision && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono">
                            {step.decision}
                          </span>
                        )}
                      </div>
                      {step.blocked_reason && (
                        <p className="text-[11px] text-amber-800 mt-0.5 flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          {step.blocked_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                      {step.action}
                    </span>
                    {getStepStatusBadge(step.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deterministic Explanation Box (Section 24) */}
        {activePlan.explanation && (
          <div id="plan-explanation-box" className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Plan Explanation & Privacy Verification</span>
            </div>

            <div className="text-slate-600 space-y-1 pl-5">
              <p><strong className="text-slate-700">Summary:</strong> {activePlan.explanation.summary}</p>
              {activePlan.explanation.privacy_notes?.length > 0 && (
                <div>
                  <strong className="text-slate-700">Privacy Notes:</strong>
                  <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-slate-600">
                    {activePlan.explanation.privacy_notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p><strong className="text-slate-700">Next Action:</strong> {activePlan.explanation.next_step}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
