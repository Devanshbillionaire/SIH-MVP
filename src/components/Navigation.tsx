import React from 'react';
import { NavigationTab, AppSettings } from '../types';
import { ShieldCheck, CheckCircle2, Cpu, Activity, GraduationCap, Settings as SettingsIcon, Layers } from 'lucide-react';

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  settings: AppSettings;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  settings
}) => {
  const tabs: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'task', label: 'Task', icon: <Layers className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'learning', label: 'Learning', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> }
  ];

  const providerLabel = {
    automatic: 'Automatic',
    local: 'Local Model',
    external: 'External AI'
  }[settings.ai_provider];

  return (
    <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-sm shadow-indigo-100 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight leading-none">PrivaSight</span>
                <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-100 leading-none">
                  SIH MVP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-normal leading-tight">
                Visual-First Lightweight Intelligent Browser Agent
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav id="nav-tabs" className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Status Badges */}
          <div className="hidden lg:flex items-center space-x-2.5">
            {/* Local Protection Badge */}
            <div
              id="status-local-protection"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
              title="On-device regex and PII redaction active"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Local Protection Active</span>
            </div>

            {/* AI Provider Badge */}
            <div
              id="status-ai-provider"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
              title="Current AI Provider Mode"
            >
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>Provider: {providerLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
