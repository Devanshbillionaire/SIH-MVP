import React from 'react';
import { PrivacyResult, PrivacyAnalyzedField } from '../types';
import { ShieldCheck, Lock, CheckCircle2, ShieldAlert, ShieldX, EyeOff, FileText, Check } from 'lucide-react';

interface PrivacyProtectionPanelProps {
  privacyResult: PrivacyResult | null;
  hasRun: boolean;
}

export const PrivacyProtectionPanel: React.FC<PrivacyProtectionPanelProps> = ({
  privacyResult,
  hasRun
}) => {
  // Baseline exemplary fallback lists if not run yet
  const defaultSafeExamples = [
    { key: 'Full Name', category: 'NAME', sensitivity: 'PERSONAL', reason: 'Personal identity name', allowed_for_external_ai: true },
    { key: 'City / Location', category: 'GENERAL', sensitivity: 'LOW_SENSITIVITY', reason: 'Geographic attribute', allowed_for_external_ai: true },
    { key: 'Country / Region', category: 'GENERAL', sensitivity: 'LOW_SENSITIVITY', reason: 'Geographic attribute', allowed_for_external_ai: true },
    { key: 'Delivery Notes', category: 'ADDRESS', sensitivity: 'PERSONAL', reason: 'Non-credential instructions', allowed_for_external_ai: true }
  ];

  const defaultProtectedExamples = [
    { key: 'Password / Passcode', category: 'PASSWORD', sensitivity: 'HIGHLY_SENSITIVE', reason: 'Explicit authentication credential', allowed_for_external_ai: false },
    { key: 'SMS OTP / 2FA Code', category: 'OTP', sensitivity: 'HIGHLY_SENSITIVE', reason: 'One-time verification token', allowed_for_external_ai: false },
    { key: 'Payment Card / CVV', category: 'PAYMENT', sensitivity: 'HIGHLY_SENSITIVE', reason: 'Financial payment credential', allowed_for_external_ai: false },
    { key: 'API Keys / Tokens', category: 'API_KEY', sensitivity: 'HIGHLY_SENSITIVE', reason: 'Secret programmatic authorization token', allowed_for_external_ai: false }
  ];

  const hasRealData = Boolean(hasRun && privacyResult);

  const safeItems: (PrivacyAnalyzedField | { key: string; category?: string; sensitivity?: string; reason?: string; allowed_for_external_ai?: boolean })[] =
    hasRealData && privacyResult?.safe_data && privacyResult.safe_data.length > 0
      ? privacyResult.safe_data
      : (hasRealData && privacyResult?.safe_fields && privacyResult.safe_fields.length > 0)
        ? privacyResult.safe_fields.map((f) => ({ key: f, category: 'GENERAL', sensitivity: 'LOW_SENSITIVITY', reason: 'Standard field attribute', allowed_for_external_ai: true }))
        : defaultSafeExamples;

  const protectedItems: (PrivacyAnalyzedField | { key: string; category?: string; sensitivity?: string; reason?: string; allowed_for_external_ai?: boolean })[] =
    hasRealData && privacyResult?.protected_data && privacyResult.protected_data.length > 0
      ? privacyResult.protected_data
      : (hasRealData && privacyResult?.protected_fields && privacyResult.protected_fields.length > 0)
        ? privacyResult.protected_fields.map((f) => ({ key: f, category: 'PASSWORD', sensitivity: 'HIGHLY_SENSITIVE', reason: 'Sensitive field isolated locally', allowed_for_external_ai: false }))
        : defaultProtectedExamples;

  const totalAnalyzed = hasRealData && privacyResult?.analyzed_count !== undefined
    ? privacyResult.analyzed_count
    : (hasRealData ? safeItems.length + protectedItems.length : 8);

  const isBlocked = hasRealData
    ? (privacyResult?.external_ai_access === 'BLOCKED_FOR_PROTECTED' || protectedItems.length > 0)
    : true;

  const isFailed = hasRealData && privacyResult?.scan_status === 'failed';

  return (
    <div id="privacy-protection-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Privacy Protection Gateway</h3>
              {hasRealData && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{totalAnalyzed} values analyzed</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Local PII boundary, on-device sanitization, and fail-closed confidential token isolation</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isFailed ? (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldX className="w-3.5 h-3.5 text-rose-600" />
              <span>Fail-Closed: Scan Failed</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Local Engine Active</span>
            </span>
          )}
        </div>
      </div>

      {/* External AI Access Status Banner */}
      <div className="mt-5">
        {isFailed ? (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-950">
                External AI Access: Paused Under Fail-Closed Security Rule
              </h4>
              <p className="text-xs font-medium mt-0.5 leading-relaxed text-rose-800">
                Privacy analysis could not verify candidate fields. No data or screenshots will be transmitted to external services.
              </p>
            </div>
          </div>
        ) : isBlocked ? (
          <div className="p-3.5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                  External AI Access: Blocked for Protected Values
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 uppercase">
                  Protected Locally
                </span>
              </div>
              <p className="text-xs font-medium mt-0.5 leading-relaxed text-amber-800">
                Sensitive credentials (passwords, OTPs, PINs, tokens) remain strictly inside the local in-memory vault. Only non-sensitive form fields are approved for external AI processing.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-emerald-50/90 border border-emerald-200 text-emerald-900 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-950">
                  External AI Access: Approved for Safe Attributes
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 uppercase">
                  Clean Scan
                </span>
              </div>
              <p className="text-xs font-medium mt-0.5 leading-relaxed text-emerald-800">
                All parsed attributes belong to general or public categories. No confidential credentials or tokens detected.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Safe vs Protected Categories */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Safe to Process */}
        <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Safe to Process
                </h4>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-full">
                {safeItems.length} Approved
              </span>
            </div>

            <ul className="space-y-2">
              {safeItems.map((item, idx) => (
                <li key={idx} className="flex items-start justify-between p-2 rounded-md bg-white border border-slate-200/60 text-xs">
                  <div className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800">{item.key}</span>
                      {item.reason && (
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1 shrink-0 ml-2">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {item.sensitivity || 'LOW_SENSITIVITY'}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-medium">Safe for AI</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-200/60 flex items-center space-x-1.5">
            <FileText className="w-3 h-3 text-slate-400" />
            <span>Passed to external agent services via <code className="font-mono text-slate-700">get_external_ai_safe_data()</code></span>
          </p>
        </div>

        {/* Protected / Local Only */}
        <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Protected Locally
                </h4>
              </div>
              <span className="text-[10px] font-semibold bg-amber-100/90 text-amber-900 px-2 py-0.5 rounded-full">
                {protectedItems.length} Redacted
              </span>
            </div>

            <ul className="space-y-2">
              {protectedItems.map((item, idx) => (
                <li key={idx} className="flex items-start justify-between p-2 rounded-md bg-white border border-amber-200/70 text-xs">
                  <div className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-slate-900">{item.key}</span>
                        <span className="inline-flex items-center space-x-0.5 text-[10px] text-amber-800 font-mono bg-amber-50 px-1 rounded border border-amber-200">
                          <EyeOff className="w-2.5 h-2.5" />
                          <span>[PROTECTED]</span>
                        </span>
                      </div>
                      {item.reason && (
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1 shrink-0 ml-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                      {item.sensitivity || 'HIGHLY_SENSITIVE'}
                    </span>
                    <span className="text-[9px] text-rose-600 font-medium">Blocked from AI</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-200/60 flex items-center space-x-1.5">
            <Lock className="w-3 h-3 text-amber-600" />
            <span>Retained in local volatile memory only; never exposed to external API requests</span>
          </p>
        </div>
      </div>

      {/* Screenshot Privacy Architecture Note */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <EyeOff className="w-4 h-4 text-slate-500" />
          <span>
            <strong>Screenshot Privacy Guard:</strong>{' '}
            {hasRealData && privacyResult?.screenshot_external_allowed === false
              ? 'External screenshot transmission restricted due to presence of sensitive credentials.'
              : 'Screenshots evaluated for credential privacy prior to any external transmission.'}
          </span>
        </div>
        <span className="text-[10px] font-mono bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
          Redaction Ready
        </span>
      </div>
    </div>
  );
};
