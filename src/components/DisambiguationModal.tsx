import React from 'react';
import { HelpCircle, Check, X, Shield, ArrowRight } from 'lucide-react';
import { FieldMapping, DisambiguationCandidate } from '../types';

interface DisambiguationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: FieldMapping | null;
  mappingIndex: number;
  onSelectCandidate: (mappingIndex: number, candidate: DisambiguationCandidate) => void;
  isExecuting?: boolean;
}

export const DisambiguationModal: React.FC<DisambiguationModalProps> = ({
  isOpen,
  onClose,
  mapping,
  mappingIndex,
  onSelectCandidate,
  isExecuting = false
}) => {
  if (!isOpen || !mapping) return null;

  const alternatives = mapping.alternatives || [];

  return (
    <div
      id="disambiguation-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="disambiguation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disambiguation-title"
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/70 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Fuzzy Ambiguity Detected (ASK_USER)
              </span>
              <h3 id="disambiguation-title" className="text-base font-semibold text-slate-900 mt-0.5">
                Disambiguate Target for &ldquo;{mapping.user_field}&rdquo;
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Multiple DOM elements scored closely. Please select the intended target element to safely proceed with execution:
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-disambiguation"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Candidate List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Available Candidate Matches ({alternatives.length}):
          </div>

          {alternatives.map((cand, idx) => {
            const isSelected =
              mapping.detected_field.includes(cand.id) ||
              (cand.selector && mapping.detected_field.includes(cand.selector)) ||
              mapping.selected_candidate_id === cand.id;

            return (
              <div
                key={cand.id || idx}
                id={`candidate-option-${idx}`}
                onClick={() => {
                  if (!isExecuting) {
                    onSelectCandidate(mappingIndex, cand);
                  }
                }}
                className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between group ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1 pr-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold uppercase">
                      {cand.tag || 'input'}
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {cand.label || cand.selector || `Candidate #${idx + 1}`}
                    </span>
                  </div>

                  {cand.selector && (
                    <span className="font-mono text-xs text-indigo-700 block bg-slate-50 px-2 py-0.5 rounded border border-slate-200 max-w-fit">
                      {cand.selector}
                    </span>
                  )}

                  <div className="grid grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Text Sim</span>
                      <span className="font-semibold">{Math.round(cand.text_similarity * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOM Conf</span>
                      <span className="font-semibold">{Math.round(cand.dom_confidence * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Visual Conf</span>
                      <span className="font-semibold">{Math.round(cand.visual_confidence * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Score</span>
                      <span className="font-bold text-indigo-700">{Math.round(cand.composite_score * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  <button
                    type="button"
                    id={`btn-select-candidate-${idx}`}
                    className={`inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}
                  >
                    <span>Select</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Safety verified: execution strictly honors user selection</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
