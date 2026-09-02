import React from 'react';
import { Layout, Search, FormInput, ShoppingBag } from 'lucide-react';
import { DemoSite } from '../types';

interface DemoSiteSelectorProps {
  sites: DemoSite[];
  selectedSite: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export const DemoSiteSelector: React.FC<DemoSiteSelectorProps> = ({ sites, selectedSite, onChange, disabled }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'form': return <FormInput className="w-4 h-4" />;
      case 'ecommerce': return <ShoppingBag className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
      {sites.map((site) => {
        const isSelected = site.id === selectedSite;
        return (
          <button
            key={site.id}
            onClick={() => !disabled && onChange(site.id)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              isSelected
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {getIcon(site.id)}
            <span>{site.name.split(' ')[0]} Site</span>
          </button>
        );
      })}
    </div>
  );
};
