'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { BarChart2, Clock, Users, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_OPTIONS = [7, 14, 30, 60, 90];
const PRIORITY_COLORS: Record<string, string> = { LOW: '#94a3b8', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };

export default function ReportsPage() {
  const [days, setDays] = useState(30);

  const { data: volume }    = useQuery({ queryKey: ['reports', 'volume', days], queryFn: () => reportsApi.ticketVolume(days) });
  const { data: agents }    = useQuery({ queryKey: ['reports', 'agents', days], queryFn: () => reportsApi.agentPerformance(days) });
  const { data: mttr }      = useQuery({ queryKey: ['reports', 'mttr', days], queryFn: () => reportsApi.mttr(days) });
  const { data: assetUtil } = useQuery({ queryKey: ['reports', 'asset-util'], queryFn: reportsApi.assetUtil });

  return (
    <div>
      <Header title="Reports & Analytics" subtitle="Performance metrics and operational insights" />
      <div className="p-6 space-y-6">
        {/* Time period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">Period:</span>
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn('px-3 py-1.5 text-sm rounded-lg transition-colors', days === d ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* MTTR Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(mttr?.byPriority ?? []).map((p: any) => (
            <div key={p.priority} className="card p-4">
              <p className="text-xs text-slate-500 mb-1">MTTR — {p.priority}</p>
              <p className="text-2xl font-bold text-slate-900">{p.avgHours}h</p>
              <p className="text-xs text-slate-400 mt-1">{p.count} resolved</p>
            </div>
          ))}
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Overall MTTR</p>
            <p className="text-2xl font-bold text-slate-900">{mttr?.overall ?? '—'}h</p>
            <p className="text-xs text-slate-400 mt-1">{mttr?.total ?? 0} total resolved</p>
          </div>
        </div>

        {/* Ticket Volume Chart */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Ticket Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={volume ?? []}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="total"     name="Total"    stroke="#6366f1" fill="url(#reqGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#ef4444" fill="url(#incGrad)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="requests"  name="Requests"  stroke="#22c55e" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Performance */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" /> Agent Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="pb-2 text-left">Agent</th>
                    <th className="pb-2 text-right">Assigned</th>
                    <th className="pb-2 text-right">Resolved</th>
                    <th className="pb-2 text-right">Avg Resolution</th>
                    <th className="pb-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(agents ?? []).map((a: any) => (
                    <tr key={a.agentId}>
                      <td className="py-2.5">
                        <p className="font-medium text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-400">{a.email}</p>
                      </td>
                      <td className="py-2.5 text-right font-medium">{a.totalAssigned}</td>
                      <td className="py-2.5 text-right text-green-700 font-medium">{a.resolved}</td>
                      <td className="py-2.5 text-right text-slate-600">{a.avgResolutionHours}h</td>
                      <td className="py-2.5 text-right">
                        <span className={cn('badge text-xs', a.resolutionRate >= 80 ? 'bg-green-100 text-green-700' : a.resolutionRate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                          {a.resolutionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!agents || agents.length === 0) && <p className="text-center py-6 text-slate-400 text-sm">No agent data for this period</p>}
            </div>
          </Card>

          {/* Asset Utilization */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Asset Utilization by Type</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={assetUtil ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={70} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="assigned"  name="Assigned"  stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                <Bar dataKey="available" name="Available" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* MTTR by Priority Bar */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> Mean Time to Resolve by Priority (Hours)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mttr?.byPriority ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="h" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: any) => [`${v}h`, 'Avg Resolution']} />
              <Bar dataKey="avgHours" name="Avg Hours" radius={[4, 4, 0, 0]}>
                {(mttr?.byPriority ?? []).map((entry: any, i: number) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
