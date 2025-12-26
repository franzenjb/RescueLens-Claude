import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Home, Users, TrendingUp, Building2 } from 'lucide-react';
import { DamageReport, DamageSeverity, HomeType } from '../types';

interface DashboardProps {
  reports: DamageReport[];
}

const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  [DamageSeverity.INACCESSIBLE]: '#a855f7',
  [DamageSeverity.DESTROYED]: '#dc2626',
  [DamageSeverity.MAJOR]: '#f97316',
  [DamageSeverity.MINOR]: '#eab308',
  [DamageSeverity.AFFECTED]: '#3b82f6',
  [DamageSeverity.NO_VISIBLE_DAMAGE]: '#64748b',
  [DamageSeverity.UNKNOWN]: '#6b7280',
};

export const Dashboard: React.FC<DashboardProps> = ({ reports }) => {
  // Calculate stats
  const completedReports = reports.filter(r => r.status === 'completed');

  const severityCounts = completedReports.reduce((acc, r) => {
    const sev = r.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE;
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {} as Record<DamageSeverity, number>);

  const homeTypeCounts = completedReports.reduce((acc, r) => {
    const type = r.analysis?.homeType || HomeType.NONE;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<HomeType, number>);

  const majorAndDestroyed = (severityCounts[DamageSeverity.MAJOR] || 0) + (severityCounts[DamageSeverity.DESTROYED] || 0);
  const avgConfidence = completedReports.length > 0
    ? Math.round(completedReports.reduce((sum, r) => sum + (r.analysis?.confidence || 0), 0) / completedReports.length)
    : 0;

  const pieData = Object.entries(severityCounts).map(([severity, count]) => ({
    name: severity.replace(/_/g, ' '),
    value: count,
    color: SEVERITY_COLORS[severity as DamageSeverity],
  }));

  const barData = Object.entries(homeTypeCounts).map(([type, count]) => ({
    name: type.replace(/_/g, ' '),
    count,
  }));

  // Recent activity (last 7 days)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentReports = reports.filter(r => r.createdAt > weekAgo);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Home}
          label="Total Reports"
          value={reports.length}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={AlertTriangle}
          label="Major/Destroyed"
          value={majorAndDestroyed}
          color="text-red-400"
          bgColor="bg-red-500/10"
        />
        <StatCard
          icon={Users}
          label="This Week"
          value={recentReports.length}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Confidence"
          value={`${avgConfidence}%`}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">
            Damage Severity Distribution
          </h3>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No data available
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
              <div key={severity} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-slate-400 uppercase">
                  {severity.replace(/_/g, ' ')} ({severityCounts[severity as DamageSeverity] || 0})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Home Types */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-red-500" />
            Property Types
          </h3>
          {barData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" stroke="#475569" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">
          Recent Assessments
        </h3>
        {recentReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase tracking-widest border-b border-slate-800">
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">Severity</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.slice(0, 10).map(report => (
                  <tr key={report.id} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-3 pr-4 font-mono text-slate-400 text-xs">{report.id.slice(0, 12)}...</td>
                    <td className="py-3 pr-4 text-slate-300">{report.location.city}, {report.location.state}</td>
                    <td className="py-3 pr-4">
                      <span
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${SEVERITY_COLORS[report.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE]}20`,
                          color: SEVERITY_COLORS[report.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE],
                        }}
                      >
                        {(report.analysis?.overallSeverity || 'PENDING').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{report.analysis?.homeType || '-'}</td>
                    <td className="py-3 text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No recent assessments</p>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, bgColor }) => (
  <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  </div>
);

export default Dashboard;
