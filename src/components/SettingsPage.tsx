import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Settings as SettingsIcon, Shield, Cpu, Lock, CheckCircle2, Sliders, Zap } from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [systemStatus, setSystemStatus] = useState<{
    external_ai_configured?: boolean;
    external_ai_status?: string;
    ml_engine?: string;
  }>({});

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setSystemStatus({
          external_ai_configured: data.external_ai_configured,
          external_ai_status: data.external_ai_status,
          ml_engine: data.ml_engine
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div id="settings-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Agent & Privacy Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure on-device privacy protections, AI provider selection, and verification parameters.
        </p>
      </div>

      <div className="space-y-6">
        {/* AI Provider Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Provider Selection</h2>
              <p className="text-xs text-slate-500">Determine how reasoning and perception tasks are dispatched</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'automatic',
                label: 'Automatic',
                desc: 'Local heuristics first; escalates only when candidate ambiguity requires LLM.'
              },
              {
                id: 'local',
                label: 'Local Model',
                desc: 'Strictly on-device Online SGD Logistic Regression + Fuzzy Logic without any cloud API requests.'
              },
              {
                id: 'external',
                label: 'External AI',
                desc: 'Leverages Gemini cloud assistant for ambiguous label disambiguation (sanitized, zero-leak).'
              }
            ].map((opt) => {
              const isSelected = settings.ai_provider === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ai_provider: opt.id as any })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy & Local Processing Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Privacy & Confidentiality</h2>
              <p className="text-xs text-slate-500">On-device sanitization, zero-leak boundary, and PII protection</p>
            </div>
          </div>

          {/* Privacy Protection Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Privacy Protection Engine</span>
              <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
                Automatically scans inputs for passwords, payment card numbers, OTPs, and government IDs to redact them locally.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy_protection}
                onChange={(e) => onUpdateSettings({ privacy_protection: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Local Processing Status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Local On-Device Processing</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Engine: {systemStatus.ml_engine || 'Online SGD Logistic Regression'}
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active</span>
            </div>
          </div>

          {/* External AI Usage Policy */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              External AI Usage Boundary
            </label>
            <select
              value={settings.external_ai_usage}
              onChange={(e) => onUpdateSettings({ external_ai_usage: e.target.value as any })}
              className="block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="never">Never (Air-Gapped / Zero External Requests)</option>
              <option value="ambiguous_only">Only When Ambiguous (Default / Fallback Only)</option>
              <option value="always">Always Allowed (Full Multimodal Cloud Assistance)</option>
            </select>
            <div className="flex items-center space-x-2 text-xs text-slate-500 pt-1">
              <span>External AI Connectivity:</span>
              <span className={`font-semibold ${systemStatus.external_ai_configured ? 'text-emerald-600' : 'text-slate-600'}`}>
                {systemStatus.external_ai_status || 'Local Fallback Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Verification & Learning Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Verification & Learning Controls</h2>
              <p className="text-xs text-slate-500">Heuristic thresholding and online learning persistence</p>
            </div>
          </div>

          {/* Verification Strictness */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Verification Strictness
            </label>
            <select
              value={settings.verification_strictness}
              onChange={(e) => onUpdateSettings({ verification_strictness: e.target.value as any })}
              className="block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="strict">Strict (Requires DOM confirmation & mutation receipts before completing)</option>
              <option value="balanced">Balanced (Standard assertions with fuzzy tolerance)</option>
              <option value="lenient">Lenient (Optimistic execution for single-step inputs)</option>
            </select>
          </div>

          {/* Continuous Learning Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-sm font-semibold text-slate-800 block">Continuous Offline Learning</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically retrains the local Online SGD Logistic Regression model after verified form completions.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.continuous_learning}
                onChange={(e) => onUpdateSettings({ continuous_learning: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
