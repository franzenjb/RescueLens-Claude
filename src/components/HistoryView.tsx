import React, { useState } from 'react';
import { Trash2, MapPin, Calendar, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Building2, FileText, Download } from 'lucide-react';
import { DamageReport, DamageSeverity } from '../types';
import { exportCaseReport, generateSampleClientInfo } from '../services/pdfService';

interface HistoryViewProps {
  reports: DamageReport[];
  onDelete: (id: string) => void;
}

const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  [DamageSeverity.NO_VISIBLE_DAMAGE]: 'bg-slate-500',
  [DamageSeverity.AFFECTED]: 'bg-blue-500',
  [DamageSeverity.MINOR]: 'bg-yellow-500',
  [DamageSeverity.MAJOR]: 'bg-orange-500',
  [DamageSeverity.DESTROYED]: 'bg-red-600',
};

const SEVERITY_TEXT: Record<DamageSeverity, string> = {
  [DamageSeverity.NO_VISIBLE_DAMAGE]: 'text-slate-400',
  [DamageSeverity.AFFECTED]: 'text-blue-400',
  [DamageSeverity.MINOR]: 'text-yellow-400',
  [DamageSeverity.MAJOR]: 'text-orange-400',
  [DamageSeverity.DESTROYED]: 'text-red-400',
};

export const HistoryView: React.FC<HistoryViewProps> = ({ reports, onDelete }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DamageSeverity | 'all'>('all');

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter(r => r.analysis?.overallSeverity === filter);

  const severityCounts = reports.reduce((acc, r) => {
    const sev = r.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE;
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-2">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({reports.length})
          </button>
          {Object.values(DamageSeverity).map(sev => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                filter === sev
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[sev]}`} />
              {sev.replace(/_/g, ' ')} ({severityCounts[sev] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No reports found</p>
          <p className="text-slate-600 text-sm mt-1">Upload images in the Analyze tab to create reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              expanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
              onDelete={() => {
                if (confirm('Delete this report? This cannot be undone.')) {
                  onDelete(report.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ReportCardProps {
  report: DamageReport;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, expanded, onToggle, onDelete }) => {
  const severity = report.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE;
  const colorClass = SEVERITY_COLORS[severity];
  const textClass = SEVERITY_TEXT[severity];

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={onToggle}
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-700">
          <img
            src={report.imageData}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
            <span className={`text-sm font-bold ${textClass}`}>
              {severity.replace(/_/g, ' ')}
            </span>
            {report.analysis?.homeType && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {report.analysis.homeType}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">
            {report.analysis?.summary || 'Analysis pending...'}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {report.location.address}, {report.location.city}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(report.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Add sample client info if not present
              const reportWithClient = {
                ...report,
                clientInfo: report.clientInfo?.name ? report.clientInfo : generateSampleClientInfo(),
              };
              exportCaseReport(reportWithClient);
            }}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Export Case Report PDF"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Delete Report"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && report.analysis && (
        <div className="border-t border-slate-800 p-4 bg-slate-950/50 space-y-4">
          {/* Full Image */}
          <div className="rounded-lg overflow-hidden">
            <img
              src={report.imageData}
              alt="Damage"
              className="w-full max-h-96 object-contain bg-black"
            />
          </div>

          {/* Analysis Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Structural Assessment</p>
              <p className="text-sm text-slate-300">{report.analysis.structuralAssessment}</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Debris Assessment</p>
              <p className="text-sm text-slate-300">{report.analysis.debrisAssessment}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-lg">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">PDA Justification</p>
            <p className="text-sm text-slate-300 leading-relaxed">{report.analysis.pdaJustification}</p>
          </div>

          {/* Detections */}
          {report.analysis.detections.length > 0 && (
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Detections</p>
              <div className="space-y-2">
                {report.analysis.detections.map((det, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-slate-200">{det.object}</span>
                      <span className="text-xs text-slate-500 ml-2">{det.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${SEVERITY_TEXT[det.severity]}`}>
                        {det.severity.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500">{det.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.analysis.recommendations.length > 0 && (
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Recommendations</p>
              <ul className="space-y-1">
                {report.analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={() => {
              const reportWithClient = {
                ...report,
                clientInfo: report.clientInfo?.name ? report.clientInfo : generateSampleClientInfo(),
              };
              exportCaseReport(reportWithClient);
            }}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Case Report PDF
          </button>

          {/* Meta */}
          <div className="flex items-center justify-between text-[10px] text-slate-600 pt-2 border-t border-slate-800">
            <span className="font-mono">{report.id}</span>
            <span>Confidence: {report.analysis.confidence}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
