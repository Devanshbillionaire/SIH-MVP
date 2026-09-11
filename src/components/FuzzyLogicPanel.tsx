import React from 'react';
import { FuzzyDecision } from '../types';
import { GitBranch, CheckCircle2, AlertTriangle, HelpCircle, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';

interface FuzzyLogicPanelProps {
  decision: FuzzyDecision | null;
  hasRun: boolean;
}

export const FuzzyLogicPanel: React.FC<FuzzyLogicPanelProps> = ({
  decision,
  hasRun
}) => {
  const getDecisionBadge = (d: string) => {
    switch (d) {
      case 'EXECUTE':
        return {
          label: 'EXECUTE',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          tagBg: 'bg-emerald-600 text-white',
          description: decision?.reason || 'Clear candidate superiority with high multi-signal agreement. Autonomous execution approved.'
        };
      case 'VERIFY':
        return {
          label: 'VERIFY',
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: <AlertTriangle className="w-4 h-4 text-blue-600" />,
          tagBg: 'bg-blue-600 text-white',
          description: decision?.reason || 'Moderate confidence margin or high-impact action. Execute with post-action DOM state verification.'
        };
      case 'ASK_USER':
        return {
          label: 'ASK USER',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <HelpCircle className="w-4 h-4 text-amber-600" />,
          tagBg: 'bg-amber-600 text-white',
          description: decision?.reason || 'Candidate ambiguity or competing targets detected. User disambiguation required before dispatch.'
        };
      case 'REJECT':
        return {
          label: 'REJECT',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          tagBg: 'bg-rose-600 text-white',
          description: decision?.reason || 'Candidate match score is below minimum acceptance threshold. Action rejected.'
        };
      case 'RETRY':
      default:
        return {
          label: 'RETRY',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: <RefreshCw className="w-4 h-4 text-rose-600" />,
          tagBg: 'bg-rose-600 text-white',
          description: decision?.reason || 'Insufficient signal confidence or weak DOM elements. Re-perception and viewport rescan advised.'
        };
    }
  };

  return (
    <div id="fuzzy-logic-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Fuzzy Decision Engine</h3>
            <p className="text-xs text-slate-500">Triangular & shouldered membership inference resolving element ambiguity</p>
          </div>
        </div>

        {hasRun && decision && (
          <div className="flex items-center space-x-2">
            {decision.action_risk && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
                decision.action_risk === 'HIGH'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : decision.action_risk === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {decision.action_risk} RISK
              </span>
            )}
            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Score: {decision.raw_score}/100
            </span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {(!hasRun || !decision) && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <GitBranch className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-slate-700">No Fuzzy Decision Evaluated</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Waiting for agent execution to evaluate candidate ambiguity, separation margin, and fuzzy decision rules.
          </p>
        </div>
      )}

      {/* Active Results Display */}
      {hasRun && decision && (
        <div className="mt-5 space-y-4">
          {/* Decision Outcome Card */}
          {(() => {
            const badge = getDecisionBadge(decision.decision);
            return (
              <div className={`p-4 rounded-lg border ${badge.bg} flex items-start space-x-3`}>
                <div className="mt-0.5">{badge.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Fuzzy Output:</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${badge.tagBg}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-500">Decision Confidence: </span>
                      <span className="font-mono font-bold">{Math.round(decision.fuzzy_confidence * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-xs mt-1 font-medium leading-relaxed">{badge.description}</p>
                </div>
              </div>
            );
          })()}

          {/* Membership Inputs Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Candidate Match</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {decision.candidate_confidence !== undefined
                  ? `${Math.round(decision.candidate_confidence * 100)}%`
                  : `${Math.round(decision.dom_confidence * 100)}%`}
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${Math.round((decision.candidate_confidence ?? decision.dom_confidence) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Text Similarity</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {decision.text_similarity !== undefined
                  ? `${Math.round(decision.text_similarity * 100)}%`
                  : `${Math.round(decision.dom_confidence * 100)}%`}
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full"
                  style={{
                    width: `${Math.round((decision.text_similarity ?? decision.dom_confidence) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">DOM / Visual Signals</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {Math.round(decision.dom_confidence * 100)}% / {Math.round(decision.visual_confidence * 100)}%
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden flex">
                <div className="bg-blue-500 h-full" style={{ width: `${decision.dom_confidence * 50}%` }} />
                <div className="bg-sky-400 h-full" style={{ width: `${decision.visual_confidence * 50}%` }} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">ML Confidence</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {decision.ml_confidence !== null ? `${Math.round(decision.ml_confidence * 100)}%` : 'Cold Start'}
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: decision.ml_confidence !== null ? `${decision.ml_confidence * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Ambiguity & Margin Analysis */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Candidate Ambiguity:</span>
              <span className="font-mono font-bold text-slate-800">
                {decision.ambiguity_score !== undefined
                  ? `${Math.round(decision.ambiguity_score * 100)}%`
                  : '5%'}
                <span className="text-slate-500 font-normal ml-1">
                  {(decision.ambiguity_score ?? 0) < 0.25 ? '(Clear Winner)' : (decision.ambiguity_score ?? 0) < 0.60 ? '(Moderate Margin)' : '(High Ambiguity)'}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Confidence Gap (Margin to 2nd):</span>
              <span className="font-mono font-bold text-slate-800">
                {decision.score_gap !== null && decision.score_gap !== undefined
                  ? `${(decision.score_gap * 100).toFixed(1)}% ${decision.score_gap < 0.10 ? '(Close Rivals)' : '(Distinct Leader)'}`
                  : 'Single Viable Candidate'}
              </span>
            </div>
          </div>

          {/* Explainability Reasoning Trace */}
          {decision.reasoning && decision.reasoning.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                Deterministic Explainability Reasoning
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {decision.reasoning.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rules Fired Breakdown */}
          {decision.rules_fired && decision.rules_fired.length > 0 && (
            <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] text-slate-400 font-sans font-semibold">
                <span>Active Fuzzy Rules Fired</span>
                <span>Antecedent Weight</span>
              </div>
              {decision.rules_fired.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2 truncate mr-2">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      rule.consequent_decision === 'EXECUTE' ? 'bg-emerald-900 text-emerald-300' :
                      rule.consequent_decision === 'VERIFY' ? 'bg-blue-900 text-blue-300' :
                      rule.consequent_decision === 'ASK_USER' ? 'bg-amber-900 text-amber-300' :
                      'bg-rose-900 text-rose-300'
                    }`}>
                      {rule.consequent_decision}
                    </span>
                    <span className="text-slate-300 truncate">{rule.name}</span>
                  </div>
                  <span className="text-emerald-400 font-bold shrink-0">
                    {Math.round(rule.antecedent_strength * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Rule Trigger Formula */}
          {decision.rule_activated && (
            <div className="p-2.5 bg-slate-100 text-slate-800 rounded-lg font-mono text-xs flex items-center justify-between border border-slate-200">
              <span className="text-slate-500 text-[11px]">Rule Trigger:</span>
              <span className="text-[11px] text-slate-900 font-medium truncate ml-2">{decision.rule_activated}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
