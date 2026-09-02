import React from 'react';
import { BarChart3, CheckCircle, Sparkles } from 'lucide-react';
import { TopCandidate } from '../types';

interface ConfidencePanelProps {
  candidate?: TopCandidate;
}

export const ConfidencePanel: React.FC<ConfidencePanelProps> = ({ candidate }) => {
  if (!candidate) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-sky-600" />
          <span>Confidence Score Breakdown</span>
        </h3>
        <p className="text-xs text-slate-400">Scores will be calculated upon agent execution.</p>
      </div>
    );
  }

  const items = [
    { label: 'DOM Structure Confidence', score: candidate.dom_confidence, color: 'bg-blue-500', desc: 'Semantic tag & ARIA role match' },
    { label: 'Visual Perception Score', score: candidate.visual_confidence, color: 'bg-indigo-500', desc: 'Viewport placement & visibility' },
    { label: 'Text Similarity Ratio', score: candidate.text_similarity, color: 'bg-emerald-500', desc: 'Fuzzy keyword & token overlap' },
    { label: 'ML Prediction Probability', score: candidate.ml_confidence, color: 'bg-sky-600', desc: 'Scikit-learn model success rate' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-600" />
          <span>Multi-Factor Confidence Scores</span>
        </h3>
        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
          Composite: {(candidate.composite_score * 100).toFixed(0)}%
        </span>
      </div>

      <div className="space-y-3.5">
        {items.map((item, idx) => {
          const percent = Math.round(item.score * 100);
          return (
            <div key={idx}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="font-mono font-bold text-slate-900">{percent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{item.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
