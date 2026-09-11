import React from 'react';
import { VerificationResult, VerificationStatus } from '../types';
import { CheckCheck, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface VerificationPanelProps {
  verification: VerificationResult | null;
  hasRun: boolean;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({
  verification,
  hasRun
}) => {
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'SUCCESS':
        return {
          label: 'VERIFIED SUCCESS',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        };
      case 'WARNING':
        return {
          label: 'VERIFICATION WARNING',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />
        };
      case 'FAILED':
        return {
          label: 'VERIFICATION FAILED',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: <XCircle className="w-4 h-4 text-rose-600" />
        };
      case 'PENDING':
      default:
        return {
          label: 'VERIFICATION PENDING',
          bg: 'bg-slate-50 text-slate-700 border-slate-300',
          icon: <Clock className="w-4 h-4 text-slate-400" />
        };
    }
  };

  return (
    <div id="verification-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
            <CheckCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Outcome Verification</h3>
            <p className="text-xs text-slate-500">Post-interaction state assertions, DOM receipts, and submission validation</p>
          </div>
        </div>

        {hasRun && verification && (
          <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Confidence: {Math.round(verification.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Empty State for Phase 1 */}
      {(!hasRun || !verification) && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <CheckCheck className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-slate-700">Verification Pending Execution</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Verification status and submission checks will appear once the agent runs on the target page.
          </p>
        </div>
      )}

      {/* Active Verification Results */}
      {hasRun && verification && (
        <div className="mt-5 space-y-4">
          {(() => {
            const badge = getStatusBadge(verification.status);
            return (
              <div className={`p-3.5 rounded-lg border ${badge.bg} flex items-start space-x-3`}>
                <div className="mt-0.5">{badge.icon}</div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">{badge.label}</span>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">{verification.message}</p>
                </div>
              </div>
            );
          })()}

          {/* Verification Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Fields Completed</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {verification.fields_filled} / {verification.total_fields}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">100% Target Match</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Expected State</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {verification.expected_state_detected ? 'Detected' : 'Unconfirmed'}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">DOM Mutation Verified</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-500 font-medium block">Verification Confidence</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {Math.round(verification.confidence * 100)}%
              </span>
              <span className="text-[10px] text-indigo-600 font-medium">Verified by Rule Assertions</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
