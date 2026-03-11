'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi, ticketsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Ticket, AlertTriangle, CheckCircle2, Clock, Package, Shield,
} from 'lucide-react';
import Link from 'next/link';
import { statusConfig, priorityConfig, formatDateTime, timeAgo } from '@/lib/utils';

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { data: kpis }    = useQuery({ queryKey: ['reports', 'dashboard'], queryFn: reportsApi.dashboard });
  const { data: volume }  = useQuery({ queryKey: ['reports', 'volume'], queryFn: () => reportsApi.ticketVolume(14) });
  const { data: byStatus }= useQuery({ queryKey: ['reports', 'byStatus'], queryFn: reportsApi.byStatus });
  const { data: byPriority }= useQuery({ queryKey: ['reports', 'byPriority'], queryFn: reportsApi.byPriority });
  const { data: tickets } = useQuery({ queryKey: ['tickets', 'recent'], queryFn: () => ticketsApi.list({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }) });

  return (
    <div>
      <Header title="Dashboard" subtitle="IT Support & Service Desk Overview" />
      <div className="p-6 space-y-6">

        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Tickets"       value={kpis?.totalTickets ?? '—'}      icon={Ticket}       color="indigo"
            change={kpis?.weekOverWeek?.change} changeLabel="vs last week" />
          <StatCard label="Open Tickets"        value={kpis?.openTickets ?? '—'}       icon={Clock}        color="blue" />
          <StatCard label="Critical Incidents"  value={kpis?.criticalOpen ?? '—'}      icon={AlertTriangle} color="red" />
          <StatCard label="Resolved This Month" value={kpis?.resolvedThisMonth ?? '—'} icon={CheckCircle2} color="green" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="In Progress"    value={kpis?.inProgressTickets ?? '—'} icon={Clock}    color="amber" />
          <StatCard label="SLA Breaches"   value={kpis?.slaBreached ?? '—'}      icon={Shield}   color="red" />
          <StatCard label="Total Assets"   value={kpis?.totalAssets ?? '—'}      icon={Package}  color="slate" />
          <StatCard label="Assigned Assets"value={kpis?.assignedAssets ?? '—'}   icon={Package}  color="indigo" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Volume */}
          <div className="lg:col-span-2 card p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Ticket Volume (14 days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={volume ?? []}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#totalGrad)" strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="incidents" stroke="#ef4444" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" name="Incidents" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* By Status Pie */}
          <div className="card p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-4">By Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {(byStatus ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 + Recent Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* By Priority */}
          <div className="card p-5">
            <h3 className="text-base font-semibold text-slate-900 mb-4">By Priority</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byPriority ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="priority" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={65} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]}>
                  {(byPriority ?? []).map((entry: any, i: number) => {
                    const colors = { LOW: '#94a3b8', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };
                    return <Cell key={i} fill={colors[entry.priority as keyof typeof colors] || '#6366f1'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Tickets */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Recent Tickets</h3>
              <Link href="/tickets" className="text-xs text-indigo-600 hover:underline font-medium">View all</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(tickets?.data ?? []).map((t: any) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-400">{t.ticketNumber}</span>
                      <span className={`badge text-xs ${statusConfig[t.status as keyof typeof statusConfig]?.color ?? ''}`}>
                        {statusConfig[t.status as keyof typeof statusConfig]?.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.createdBy?.firstName} {t.createdBy?.lastName} · {timeAgo(t.createdAt)}</p>
                  </div>
                  <span className={`badge text-xs shrink-0 ${priorityConfig[t.priority as keyof typeof priorityConfig]?.color ?? ''}`}>
                    {priorityConfig[t.priority as keyof typeof priorityConfig]?.label}
                  </span>
                </Link>
              ))}
              {(!tickets?.data || tickets.data.length === 0) && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No tickets yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
