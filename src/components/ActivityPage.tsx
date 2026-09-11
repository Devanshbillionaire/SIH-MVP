import React from 'react';
import { ActivityItem } from '../types';
import { Activity, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clock, ExternalLink } from 'lucide-react';

interface ActivityPageProps {
  activities: ActivityItem[];
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ activities }) => {
  return (
    <div id="activity-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Task Activity</h1>
          <p className="text-sm text-slate-500 mt-1">
            Historical log of automated form interactions, verification audits, and confidence scores.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Privacy-Safe Metadata Only</span>
        </div>
      </div>

      {/* Privacy Notice Reminder */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
        <span className="font-medium">
          PrivaSight does not persist or display raw sensitive user credentials in activity history. All records contain sanitized metadata and verification receipts only.
        </span>
      </div>

      {/* Empty State when no previous tasks exist */}
      {activities.length === 0 && (
        <div id="activity-empty-state" className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No previous tasks yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Run your first task to see activity here.
          </p>
        </div>
      )}

      {/* Activities Table */}
      {activities.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Domain / Webpage URL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Fields Processed</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800">{item.domain}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-indigo-600 inline-flex"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs block">
                        {item.url}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.status === 'SUCCESS' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Success
                        </span>
                      )}
                      {item.status === 'WARNING' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Warning
                        </span>
                      )}
                      {item.status === 'FAILED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </span>
                      )}
                      {item.status === 'IN_PROGRESS' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Running
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {item.fields_processed} Fields
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {item.verification}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {Math.round(item.confidence * 100)}%
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-500 text-[11px]">
                      {item.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
