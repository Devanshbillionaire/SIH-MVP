import React from 'react';
import { ShieldAlert, Zap } from 'lucide-react';

interface UIVersionToggleProps {
  version: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export const UIVersionToggle: React.FC<UIVersionToggleProps> = ({ version, onChange, disabled }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">UI Topology:</span>
      <div className="inline-flex rounded-lg bg-slate-200 p-1 border border-slate-300">
        <button
          onClick={() => !disabled && onChange('A')}
          disabled={disabled}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            version === 'A'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Version A</span>
        </button>
        <button
          onClick={() => !disabled && onChange('B')}
          disabled={disabled}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            version === 'B'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Version B (Changed Selectors)</span>
        </button>
      </div>
    </div>
  );
};
