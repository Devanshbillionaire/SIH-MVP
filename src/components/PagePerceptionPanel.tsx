import React, { useState } from 'react';
import { PagePerceptionData, DetectedField } from '../types';
import { Scan, Eye, Box, Layers, Globe, Monitor, Compass, ShieldCheck } from 'lucide-react';

interface PagePerceptionPanelProps {
  perception: PagePerceptionData | null;
  hasRun: boolean;
}

export const PagePerceptionPanel: React.FC<PagePerceptionPanelProps> = ({
  perception,
  hasRun
}) => {
  const [viewMode, setViewMode] = useState<'form' | 'all'>('form');

  const allElements = perception?.elements || perception?.detected_fields || [];
  const formCandidates = perception?.detected_fields || allElements;
  const displayedElements: DetectedField[] = viewMode === 'form' ? formCandidates : allElements;

  const renderConfidence = (val?: number, label?: string) => {
    if (val === undefined || val === null || isNaN(val)) {
      return (
        <span className="text-slate-400 italic text-[11px]">
          {label ? `${label}: ` : ''}Not calculated yet
        </span>
      );
    }
    return (
      <span className="font-mono text-[11px] font-medium">
        {label ? `${label}: ` : ''}{Math.round(val * 100)}%
      </span>
    );
  };

  return (
    <div id="page-perception-panel" className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Page Perception & Visual DOM</h3>
            <p className="text-xs text-slate-500">Live screenshot capture, interactive bounding boxes, and element detection</p>
          </div>
        </div>

        {hasRun && perception && (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Layers className="w-3 h-3" />
              <span>{allElements.length} Total Elements</span>
            </span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {(!hasRun || !perception) && (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Eye className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-slate-700">No Perception Data</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Enter a webpage URL and run the agent to capture live page DOM and screenshots.
          </p>
        </div>
      )}

      {/* Active Perception Results */}
      {hasRun && perception && (
        <div className="mt-5 space-y-4">
          {/* Target URL & Viewport Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center space-x-2 truncate min-w-0 max-w-md">
              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-800 font-mono font-medium truncate">{perception.url}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-500 font-mono text-[11px]">
              {perception.page?.title && (
                <span className="truncate max-w-[200px]" title={perception.page.title}>
                  "{perception.page.title}"
                </span>
              )}
              {perception.page?.viewportWidth && perception.page?.viewportHeight && (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  <Monitor className="w-3 h-3" />
                  <span>{perception.page.viewportWidth}×{perception.page.viewportHeight}px</span>
                </span>
              )}
              <span className="text-emerald-700 font-semibold">Live Perception</span>
            </div>
          </div>

          {/* Real Playwright Screenshot Preview */}
          {(perception.screenshot_url || perception.screenshot) && (
            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-h-80 flex items-center justify-center group shadow-inner">
              <img
                src={perception.screenshot_url || perception.screenshot}
                alt="Webpage perception capture"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2.5 right-2.5 bg-slate-900/85 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-md border border-slate-700 flex items-center space-x-1.5 font-mono">
                <Box className="w-3 h-3 text-indigo-400" />
                <span>Playwright Viewport Capture</span>
              </div>
            </div>
          )}

          {/* Elements Filter Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'form'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Form Candidates ({formCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All DOM Elements ({allElements.length})
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Displaying {displayedElements.length} candidate(s)
            </span>
          </div>

          {/* Detected Elements Table / List */}
          {displayedElements.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {displayedElements.map((el, idx) => {
                const isVis = typeof el.isVisible === 'string'
                  ? ['true', '1', 'yes'].includes(el.isVisible.toLowerCase())
                  : el.isVisible !== false;

                const hasPos = el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined;

                return (
                  <div key={`elem-${el.id || 'el'}-${idx}`} className="p-3 bg-white hover:bg-slate-50/80 text-xs transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Left: Element identifiers */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {el.label || el.name || el.text || el.id || `Element ${idx + 1}`}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                            &lt;{el.tag || 'tag'}&gt;
                          </span>
                          {el.type && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                              type="{el.type}"
                            </span>
                          )}
                          {/* Visibility Badge */}
                          <span
                            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              isVis
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isVis ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{isVis ? 'Visible' : 'Hidden'}</span>
                          </span>
                        </div>

                        {/* Position & Selector Info */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                          {hasPos && (
                            <span className="inline-flex items-center space-x-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              <Compass className="w-3 h-3 text-slate-400" />
                              <span>x:{el.x} y:{el.y} | {el.width}×{el.height}px</span>
                            </span>
                          )}
                          {el.id && (
                            <span className="text-slate-600">id="#{el.id}"</span>
                          )}
                          {el.name && (
                            <span className="text-slate-600">name="{el.name}"</span>
                          )}
                          {el.placeholder && (
                            <span className="text-slate-500 italic">placeholder="{el.placeholder}"</span>
                          )}
                          {el.selector && (
                            <span className="text-indigo-600 truncate max-w-xs" title={el.selector}>
                              {el.selector}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Confidence metrics */}
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                        <div className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200" title="DOM Confidence">
                          {renderConfidence(el.dom_confidence, 'DOM')}
                        </div>
                        <div className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200" title="Visual Confidence">
                          {renderConfidence(el.visual_confidence, 'Vis')}
                        </div>
                        <div className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200" title="ML Confidence">
                          {renderConfidence(el.ml_confidence, 'ML')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
              No interactive form elements detected on this page.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
