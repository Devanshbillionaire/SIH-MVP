import React from 'react';
import { CheckCircle2, AlertTriangle, Cpu, Eye, MousePointer, ShieldCheck, ArrowRight } from 'lucide-react';
import { TimelineStep } from '../types';

interface AgentTimelineProps {
  timeline: TimelineStep[];
  isLoading: boolean;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ timeline, isLoading }) => {
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'INTENT': return <Cpu className="w-4 h-4 text-purple-600" />;
      case 'PERCEPTION': return <Eye className="w-4 h-4 text-blue-600" />;
      case 'DECISION': return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case 'ACTION': return <MousePointer className="w-4 h-4 text-emerald-600" />;
      case 'VERIFICATION': return <CheckCircle2 className="w-4 h-4 text-sky-600" />;
      default: return <ArrowRight className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStepBadge = (type: string) => {
    switch (type) {
      case 'INTENT': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PERCEPTION': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DECISION': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ACTION': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'VERIFICATION': return 'bg-sky-100 text-sky-800 border-sky-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
        <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">No active task execution timeline yet.</p>
        <p className="text-xs text-slate-400 mt-1">Enter a task prompt and click "RUN AGENT" to start execution.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Cpu className="w-5 h-5 text-sky-600" />
          <span>Agent Reasoning & Action Timeline</span>
        </h3>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
          {timeline.length} Steps Logged
        </span>
      </div>

      <div className="space-y-4">
        {timeline.map((step) => (
          <div key={step.step} className="flex gap-3 items-start relative group">
            {/* Step Number Circle */}
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
              {step.step}
            </div>

            {/* Content Box */}
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${getStepBadge(step.type)}`}>
                  {getStepIcon(step.type)}
                  {step.type}
                </span>

                {step.confidence !== undefined && (
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    Conf: {(step.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-slate-800 mt-1 leading-relaxed">
                {step.message}
              </p>

              {/* Confidence Details Grid for Perception Step */}
              {step.type === 'PERCEPTION' && step.visual_confidence !== undefined && (
                <div className="mt-2 grid grid-cols-4 gap-1.5 bg-white p-2 rounded border border-slate-200 text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Visual</span>
                    <span className="font-bold text-slate-700">{(step.visual_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">DOM</span>
                    <span className="font-bold text-slate-700">{(step.dom_confidence! * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Text Sim</span>
                    <span className="font-bold text-slate-700">{(step.text_similarity! * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ML Conf</span>
                    <span className="font-bold text-sky-700">{(step.ml_confidence! * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
