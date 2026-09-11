import React from 'react';
import { LearningStats } from '../types';
import { Cpu, TrendingUp, CheckCircle2, BarChart2, Zap } from 'lucide-react';

interface MLPanelProps {
  stats: LearningStats | null;
  hasRun: boolean;
}

export const MLPanel: React.FC<MLPanelProps> = ({
  stats,
  hasRun
}) => {
  const hasData = stats && stats.total_interactions > 0;

  return (
    <div id="ml-learning-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Machine Learning Model</h3>
            <p className="text-xs text-slate-500">Online SGD Logistic Regression predicting candidate probability from privacy-safe feature vectors</p>
          </div>
        </div>

        {hasData && (
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${
                stats.model_metadata?.status === 'TRAINED'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}
            >
              {stats.model_metadata?.status === 'TRAINED' ? 'Model: Trained SGD' : 'Mode: Cold-Start'}
            </span>
            <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
              {stats.model_metadata?.model_version || 'v1.0'}
            </span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Cpu className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-slate-700">Waiting for Verified Interactions</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No learning data yet. The ML model learns continuously from privacy-safe features and verified execution outcomes.
          </p>
        </div>
      )}

      {/* Active Learning Metrics */}
      {hasData && stats && (
        <div className="mt-5 space-y-4">
          {stats.model_metadata?.status === 'COLD_START' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
              <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Cold Start Baseline Active: </span>
                <span>
                  Using deterministic heuristic fallback ({stats.model_metadata.training_samples} of{' '}
                  {stats.model_metadata.min_samples_for_trained} verified samples required for active SGD classifier weights).
                </span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Interactions Learned</span>
              <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                {stats.total_interactions}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center space-x-1 mt-1">
                <CheckCircle2 className="w-3 h-3 inline" />
                <span>{stats.successful_actions} Verified Actions</span>
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Prediction Accuracy</span>
              <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                {Math.round(stats.success_rate * 100)}%
              </span>
              <span className="text-[10px] text-indigo-600 font-medium flex items-center space-x-1 mt-1">
                <Zap className="w-3 h-3 inline" />
                <span>Out-of-Bag Score</span>
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Average Confidence</span>
              <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
                {Math.round(stats.average_confidence * 100)}%
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                Baseline: {Math.round(stats.before_learning_avg * 100)}%
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Model Improvement</span>
              <span className="text-xl font-bold text-emerald-600 font-mono mt-0.5 block flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>+{(stats.learning_improvement * 100).toFixed(1)}%</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-medium mt-1 block">
                Post-Retrain Gain
              </span>
            </div>
          </div>

          {/* Confidence Trend Bar */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Continuous Learning Progression</span>
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {Math.round(stats.before_learning_avg * 100)}% → {Math.round(stats.after_learning_avg * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round(stats.average_confidence * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
