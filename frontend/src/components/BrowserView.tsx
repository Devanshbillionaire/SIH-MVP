import React from 'react';
import { Eye, ExternalLink, RefreshCw } from 'lucide-react';
import { TopCandidate } from '../types';

interface BrowserViewProps {
  screenshotUrl: string | null;
  currentUrl: string;
  topCandidate?: TopCandidate;
  uiVersion: string;
  demoSite: string;
  isLoading: boolean;
}

export const BrowserView: React.FC<BrowserViewProps> = ({
  screenshotUrl,
  currentUrl,
  topCandidate,
  uiVersion,
  demoSite,
  isLoading
}) => {
  const getDemoSiteUrl = () => {
    const siteFolder = `${demoSite}-site`;
    const versionFolder = `version-${uiVersion.toLowerCase()}`;
    return `http://localhost:8000/demo-sites/${siteFolder}/${versionFolder}/index.html`;
  };

  const activeUrl = currentUrl || getDemoSiteUrl();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Browser Bar */}
      <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
        </div>

        <div className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1 text-xs text-slate-600 font-mono flex items-center justify-between truncate shadow-inner">
          <span className="truncate">{activeUrl}</span>
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-sky-600 ml-2"
            title="Open in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-mono">
            Version {uiVersion}
          </span>
        </div>
      </div>

      {/* Frame / Screenshot Preview */}
      <div className="relative flex-1 min-h-[420px] bg-slate-900 flex items-center justify-center overflow-hidden group">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-400 mb-3" />
            <p className="font-semibold text-sm">Playwright Agent Executing...</p>
            <p className="text-xs text-slate-400 mt-1">Perceiving DOM & rendering bounding box highlight</p>
          </div>
        )}

        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="Live Agent Browser View"
            className="w-full h-full object-contain max-h-[550px] transition-all"
          />
        ) : (
          <iframe
            src={getDemoSiteUrl()}
            title="Live Demo Preview"
            className="w-full h-full min-h-[450px] bg-white border-0"
          />
        )}

        {/* Bounding Box Highlight Info Chip */}
        {topCandidate && (
          <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white border border-slate-700 backdrop-blur-md px-3 py-2 rounded-lg text-xs shadow-lg z-10 max-w-md">
            <div className="flex items-center gap-2 text-sky-400 font-bold mb-1">
              <Eye className="w-4 h-4" />
              <span>Target UI Element Detected</span>
            </div>
            <div className="font-mono text-[11px] text-slate-300">
              Tag: &lt;{topCandidate.element.tag}&gt; | Class: "{topCandidate.element.className || 'none'}"
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Confidence: Vis ({(topCandidate.visual_confidence * 100).toFixed(0)}%) | DOM ({(topCandidate.dom_confidence * 100).toFixed(0)}%) | ML ({(topCandidate.ml_confidence * 100).toFixed(0)}%)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
