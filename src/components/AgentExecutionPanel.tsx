import React from 'react';
import { TaskExecutionStage, StageStatus } from '../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Cpu,
  Shield,
  Search,
  CheckCheck,
  GraduationCap,
  Sparkles,
  Layers
} from 'lucide-react';

interface AgentExecutionPanelProps {
  stages: TaskExecutionStage[];
  isRunning: boolean;
  hasRun: boolean;
  error?: string | null;
}

export const AgentExecutionPanel: React.FC<AgentExecutionPanelProps> = ({
  stages,
  isRunning,
  hasRun,
  error
}) => {
  const getStatusIcon = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-slate-300" />;
    }
  };

  const getStatusBadge = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            Active
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Warning
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Failed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  const getStageIcon = (id: string) => {
    if (id.includes('1') || id.includes('2')) return <Search className="w-3.5 h-3.5 text-slate-400" />;
    if (id.includes('3') || id.includes('4')) return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    if (id.includes('5')) return <Shield className="w-3.5 h-3.5 text-slate-400" />;
    if (id.includes('6') || id.includes('7')) return <Cpu className="w-3.5 h-3.5 text-slate-400" />;
    if (id.includes('8') || id.includes('9')) return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    if (id.includes('10')) return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
    return <GraduationCap className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div id="agent-execution-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Agent Execution Pipeline</h3>
            <p className="text-xs text-slate-500">Real-time perception, decision engine, and verification stages</p>
          </div>
        </div>

        <div>
          {isRunning && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>In Progress</span>
            </span>
          )}
          {!isRunning && hasRun && !error && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>Execution Verified</span>
            </span>
          )}
          {!isRunning && !hasRun && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <span>Idle / Ready</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Execution error: {error}</span>
        </div>
      )}

      {/* When no task has run and not currently running */}
      {!hasRun && !isRunning && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-slate-700">Execution Pipeline Idle</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Provide a target form URL and information above, then click Run Agent to begin automated perception and field mapping.
          </p>
        </div>
      )}

      {/* Execution Stages List */}
      {(hasRun || isRunning) && (
        <div className="mt-5 space-y-2">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              id={`stage-item-${idx + 1}`}
              className={`flex items-start justify-between p-3 rounded-lg border transition-all ${
                stage.status === 'active'
                  ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                  : stage.status === 'completed'
                  ? 'bg-slate-50/70 border-slate-200/80'
                  : stage.status === 'failed'
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-white border-slate-100 text-slate-400'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">{getStatusIcon(stage.status)}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500">Stage {idx + 1}:</span>
                    <span className={`text-sm font-medium ${stage.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>
                      {stage.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                  {stage.detail && (
                    <p className="text-[11px] text-indigo-700 font-mono mt-1 bg-indigo-50/80 px-2 py-0.5 rounded inline-block">
                      {stage.detail}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 ml-3">
                {getStatusBadge(stage.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
