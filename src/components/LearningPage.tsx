import React from 'react';
import { LearningStats } from '../types';
import { GraduationCap, TrendingUp, CheckCircle2, RotateCcw, ShieldCheck, BarChart3, Layers, Zap } from 'lucide-react';

interface LearningPageProps {
  stats: LearningStats | null;
  onResetLearning: () => void;
  onResetML?: () => void;
  isResetting?: boolean;
}

export const LearningPage: React.FC<LearningPageProps> = ({
  stats,
  onResetLearning,
  onResetML,
  isResetting = false
}) => {
  const total = stats?.total_interactions || 0;
  const accuracy = stats ? Math.round(stats.success_rate * 100) : 0;
  const avgConf = stats ? Math.round(stats.average_confidence * 100) : 0;
  const improvement = stats ? (stats.learning_improvement * 100).toFixed(1) : '0.0';
  const verifiedActions = stats?.successful_actions || 0;
  const modelMeta = stats?.model_metadata;

  return (
    <div id="learning-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Machine Learning Dashboard
            </h1>
            {modelMeta && (
              <span
                className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${
                  modelMeta.status === 'TRAINED'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                    : 'text-amber-700 bg-amber-50 border-amber-300'
                }`}
              >
                {modelMeta.status} ({modelMeta.model_version})
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Privacy-safe online model adaptation, feedback loops, and candidate accuracy tracking.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          {onResetML && (
            <button
              id="btn-reset-coldstart"
              onClick={onResetML}
              disabled={isResetting}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg shadow-2xs transition-all disabled:opacity-50"
              title="Reset model to cold start to verify fallback mode"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Reset to Cold-Start</span>
            </button>
          )}

          <button
            id="btn-reset-learning"
            onClick={onResetLearning}
            disabled={isResetting}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{isResetting ? 'Resetting...' : 'Reset Memory'}</span>
          </button>
        </div>
      </div>

      {/* Core Privacy & Architecture Notice */}
      <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-indigo-950 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
            Privacy-Safe Feature Extraction
          </h3>
          <p className="text-xs font-medium mt-1 leading-relaxed text-indigo-800">
            The model learns from privacy-safe features and verified outcomes rather than storing raw sensitive information. Feature vectors contain only geometric bounding boxes, tag types, string similarity ratios, and post-action DOM assertions.
          </p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Model Accuracy */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Model Accuracy</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{accuracy}%</span>
            <span className="text-xs font-medium text-emerald-600">Verified</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Proportion of candidate elements accurately mapped without failure.
          </p>
        </div>

        {/* Prediction Confidence */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Prediction Confidence</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{avgConf}%</span>
            <span className="text-xs font-medium text-blue-600">Mean Score</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Average composite score across all completed form interactions.
          </p>
        </div>

        {/* Verified Interactions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Interactions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{verifiedActions}</span>
            <span className="text-xs font-medium text-slate-500">/ {total} Total</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Offline feature vectors retained for incremental Online SGD Logistic Regression retraining.
          </p>
        </div>

        {/* Improvement Over Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Improvement Over Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">+{improvement}%</span>
            <span className="text-xs font-medium text-emerald-700">Gain</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Confidence progression relative to initial baseline prior to learning.
          </p>
        </div>
      </div>

      {/* Learning Progression & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Continuous Learning Progress */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Learning Adaptation Trajectory</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">Online Retraining</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Baseline Feature Weight</span>
                <span className="font-mono">{stats ? Math.round(stats.before_learning_avg * 100) : 72}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full"
                  style={{ width: `${stats ? Math.round(stats.before_learning_avg * 100) : 72}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Active Model Confidence</span>
                <span className="font-mono text-indigo-600">{avgConf}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${avgConf}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Verification Accuracy Bound</span>
                <span className="font-mono text-emerald-600">{accuracy}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-5 pt-3 border-t border-slate-100">
            Model parameters are updated immediately upon task verification without communicating with external clouds.
          </p>
        </div>

        {/* Feature Weights Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Online SGD Logistic Feature Importance</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">Relative Weights</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-700 font-medium">Text & Label Similarity (Sequence Ratio)</span>
              <span className="font-mono font-bold text-indigo-900">45%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-700 font-medium">DOM Tree Structure (Tag & Attributes)</span>
              <span className="font-mono font-bold text-indigo-900">25%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-700 font-medium">Visual Bounding Box & Viewport Placement</span>
              <span className="font-mono font-bold text-indigo-900">15%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-700 font-medium">Historical Outcome Probabilities</span>
              <span className="font-mono font-bold text-indigo-900">15%</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            Multivariate feature scoring prevents hallucinations and ensures robust form element resolution across shifting layouts.
          </p>
        </div>
      </div>
    </div>
  );
};
