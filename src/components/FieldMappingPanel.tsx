import React, { useState } from 'react';
import { FieldMapping, DisambiguationCandidate } from '../types';
import { ArrowRight, Sparkles, Sliders, HelpCircle, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface FieldMappingPanelProps {
  mappings: FieldMapping[];
  hasRun: boolean;
  onSelectCandidate?: (mappingIndex: number, candidate: DisambiguationCandidate) => void;
  onOpenDisambiguation?: (mappingIndex: number) => void;
}

export const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  mappings,
  hasRun,
  onSelectCandidate,
  onOpenDisambiguation
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div id="field-mapping-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Intelligent Field Mapping</h3>
            <p className="text-xs text-slate-500">Semantic alignment between user-provided information and DOM field selectors</p>
          </div>
        </div>

        {hasRun && mappings.length > 0 && (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Sparkles className="w-3 h-3" />
            <span>{mappings.length} Fields Mapped</span>
          </span>
        )}
      </div>

      {/* Empty State */}
      {(!hasRun || mappings.length === 0) && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Sliders className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-slate-700">No Field Mappings Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Field mappings will appear here after DOM perception and field detection.
          </p>
        </div>
      )}

      {/* Active Mappings Table */}
      {hasRun && mappings.length > 0 && (
        <div className="mt-5 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-2.5 bg-slate-50 text-[11px] font-semibold text-slate-600 grid grid-cols-12 uppercase tracking-wider">
            <div className="col-span-4">User Information</div>
            <div className="col-span-1 text-center"></div>
            <div className="col-span-5">Target DOM Field</div>
            <div className="col-span-2 text-right">Confidence</div>
          </div>

          {mappings.map((m, idx) => {
            const hasAlternatives = m.alternatives && m.alternatives.length > 1;
            const isAmbiguous = m.decision === 'ASK_USER' || (m.ambiguity !== undefined && m.ambiguity > 0.40);
            const isExpanded = expandedIndex === idx;

            return (
              <div key={idx} className="flex flex-col bg-white">
                <div
                  className={`p-3 grid grid-cols-12 items-center text-xs transition-colors hover:bg-slate-50/60 ${
                    isAmbiguous ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div className="col-span-4">
                    <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                      <span>{m.user_field}</span>
                      {isAmbiguous && (
                        <button
                          type="button"
                          id={`btn-disambiguate-${idx}`}
                          onClick={() => onOpenDisambiguation ? onOpenDisambiguation(idx) : toggleExpand(idx)}
                          className="inline-flex items-center space-x-0.5 text-[10px] text-amber-800 font-medium px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                        >
                          <HelpCircle className="w-2.5 h-2.5" />
                          <span>Disambiguate</span>
                        </button>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono truncate block">
                      {m.user_value_preview}
                    </span>
                  </div>

                  <div className="col-span-1 flex justify-center text-slate-400">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>

                  <div className="col-span-5 flex items-center justify-between pr-2">
                    <div>
                      <span className="font-medium text-indigo-900 block">{m.detected_field}</span>
                      <span className="text-[10px] text-slate-400">
                        {m.decision ? `Decision: ${m.decision}` : 'Automated DOM binding'}
                      </span>
                    </div>

                    {hasAlternatives && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(idx)}
                        className="inline-flex items-center space-x-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 px-2 py-1 rounded border border-indigo-200 transition-colors"
                        title="View alternative candidates"
                      >
                        <span>{m.alternatives!.length} Candidates</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
                        m.confidence >= 0.70
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : m.confidence >= 0.50
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Interactive Disambiguation Accordion for User-in-the-loop selection */}
                {isExpanded && hasAlternatives && (
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Select Intended Target Element (User Feedback Loop):
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Selection updates ML model weights in real-time
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.alternatives!.map((cand, cIdx) => {
                        const isSelected =
                          m.detected_field.includes(cand.id) ||
                          (cand.selector && m.detected_field.includes(cand.selector)) ||
                          (cIdx === 0 && !m.selected_candidate_id);

                        return (
                          <div
                            key={cIdx}
                            onClick={() => onSelectCandidate && onSelectCandidate(idx, cand)}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                                : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-0.5 pr-2">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono text-[10px] px-1 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold uppercase">
                                  {cand.tag}
                                </span>
                                <span className="font-medium text-slate-800 text-xs truncate max-w-[140px]">
                                  {cand.label}
                                </span>
                              </div>
                              {cand.selector && (
                                <span className="font-mono text-[10px] text-slate-400 block truncate">
                                  {cand.selector}
                                </span>
                              )}
                              <div className="text-[10px] text-slate-500 flex space-x-2 pt-0.5">
                                <span>Sim: {Math.round(cand.text_similarity * 100)}%</span>
                                <span>DOM: {Math.round(cand.dom_confidence * 100)}%</span>
                                <span>Vis: {Math.round(cand.visual_confidence * 100)}%</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end shrink-0">
                              <span className="font-mono font-bold text-xs text-indigo-700">
                                {Math.round(cand.composite_score * 100)}%
                              </span>
                              {isSelected ? (
                                <span className="mt-1 text-emerald-600 flex items-center text-[10px] font-medium">
                                  <Check className="w-3 h-3 mr-0.5" /> Selected
                                </span>
                              ) : (
                                <span className="mt-1 text-slate-400 text-[10px] hover:text-indigo-600">
                                  Choose
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

