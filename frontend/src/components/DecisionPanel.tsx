import React from 'react';
import { ShieldCheck, Zap, AlertCircle, HelpCircle, RotateCcw } from 'lucide-react';
import { FuzzyDecision } from '../types';

interface DecisionPanelProps {
  decision?: FuzzyDecision;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({ decision }) => {
  if (!decision) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Fuzzy Logic Decision Engine</span>
        </h3>
        <p className="text-xs text-slate-400">Scikit-fuzzy decision rules ready.</p>
      </div>
    );
  }

  const getDecisionBadge = (type: string) => {
    switch (type) {
      case 'EXECUTE':
        return {
          bg: 'bg-emerald-500 text-white border-emerald-600',
          icon: <Zap className="w-5 h-5 fill-white" />,
          desc: 'High confidence match. Action executed automatically.'
        };
      case 'VERIFY':
        return {
          bg: 'bg-amber-500 text-white border-amber-600',
          icon: <ShieldCheck className="w-5 h-5" />,
          desc: 'Moderate confidence match. Verification check mandated.'
        };
      case 'ASK_USER':
        return {
          bg: 'bg-sky-600 text-white border-sky-700',
          icon: <HelpCircle className="w-5 h-5" />,
          desc: 'High risk or ambiguous UI element. User confirmation requested.'
        };
      default:
        return {
          bg: 'bg-rose-500 text-white border-rose-600',
          icon: <RotateCcw className="w-5 h-5" />,
          desc: 'Low confidence match. Retrying perception with candidate fallbacks.'
        };
    }
  };

  const badge = getDecisionBadge(decision.decision);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Scikit-Fuzzy Decision Output</span>
        </h3>
        <span className="text-xs font-mono font-bold text-slate-500">
          Raw Score: {decision.raw_score}/100
        </span>
      </div>

      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
        <div className={`w-12 h-12 rounded-xl ${badge.bg} flex items-center justify-center shadow-sm shrink-0`}>
          {badge.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-wide text-slate-900">
              {decision.decision}
            </span>
            <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
              {(decision.fuzzy_confidence * 100).toFixed(0)}% Conf
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {badge.desc}
          </p>
        </div>
      </div>

      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-900 font-mono text-[11px]">
        <span className="font-bold text-amber-800 block mb-0.5">Fuzzy Rule Evaluated:</span>
        {decision.rule_activated}
      </div>
    </div>
  );
};
