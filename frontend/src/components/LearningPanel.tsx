import React from 'react';
import { BrainCircuit, ShieldCheck, TrendingUp, RefreshCw } from 'lucide-react';
import { LearningStats } from '../types';

interface LearningPanelProps {
  stats: LearningStats;
  onReset: () => void;
}

export const LearningPanel: React.FC<LearningPanelProps> = ({ stats, onReset }) => {
  const successPercent = Math.round(stats.success_rate * 100);
  const beforePercent = Math.round(stats.before_learning_avg * 100);
  const afterPercent = Math.round(stats.after_learning_avg * 100);
  const improvementPercent = Math.round(stats.learning_improvement * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-emerald-600" />
          <span>Privacy-Aware ML Learning Metrics</span>
        </h3>
        
        <button
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
          title="Reset interaction logs to seed baseline"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset Data</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Interactions</span>
          <span className="text-xl font-extrabold text-slate-900">{stats.total_interactions}</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-slate-500 block">Action Success Rate</span>
          <span className="text-xl font-extrabold text-emerald-600">{successPercent}%</span>
        </div>
      </div>

      {/* Learning Progression Progress */}
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 mb-4">
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="font-bold text-emerald-900 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Learning Rate Progression
          </span>
          <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
            +{improvementPercent}% Improvement
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-emerald-800 font-mono mt-2">
          <div>
            <span className="text-[10px] text-slate-500 block">Before Learning:</span>
            <span className="font-bold">{beforePercent}%</span>
          </div>
          <div className="text-slate-300 font-bold">→</div>
          <div>
            <span className="text-[10px] text-slate-500 block">After Learning:</span>
            <span className="font-bold text-emerald-700">{afterPercent}%</span>
          </div>
        </div>
      </div>

      {/* Privacy Guarantee Badge */}
      <div className="flex items-center gap-2.5 bg-sky-50 border border-sky-200 rounded-lg p-2.5 text-xs text-sky-900 font-medium">
        <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
        <span>Privacy-Aware Filter active: Passwords, emails & PII redacted before logging features to JSON.</span>
      </div>
    </div>
  );
};
