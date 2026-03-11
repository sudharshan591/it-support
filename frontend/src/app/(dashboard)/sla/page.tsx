'use client';

import { useQuery } from '@tanstack/react-query';
import { slaApi, ticketsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Shield, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { cn, statusConfig, priorityConfig, getSlaTimeRemaining, timeAgo } from '@/lib/utils';

export default function SlaPage() {
  const { data: metrics } = useQuery({ queryKey: ['sla', 'metrics'], queryFn: () => slaApi.metrics(30) });
  const { data: atRisk }  = useQuery({ queryKey: ['sla', 'at-risk'], queryFn: slaApi.atRisk, refetchInterval: 60000 });
  const { data: breached } = useQuery({
    queryKey: ['tickets', 'breached'],
    queryFn: () => ticketsApi.list({ slaBreached: true, limit: 10, sortBy: 'updatedAt', sortOrder: 'desc' }),
  });
  const { data: policies } = useQuery({ queryKey: ['sla', 'policies'], queryFn: slaApi.policies });

  const complianceColor = metrics?.compliance >= 95 ? 'text-green-600' : metrics?.compliance >= 80 ? 'text-amber-600' : 'text-red-600';

  const priorityColors: Record<string, string> = { LOW: '#94a3b8', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };

  const atRiskColumns = [
    { key: 'ticketNumber', header: 'Ticket', render: (r: any) => <span className="font-mono text-xs text-slate-500">{r.ticketNumber}</span> },
    { key: 'title', header: 'Title', render: (r: any) => <span className="text-sm font-medium text-slate-900 line-clamp-1">{r.title}</span> },
    { key: 'priority', header: 'Priority', render: (r: any) => <span className={cn('badge text-xs', priorityConfig[r.priority as keyof typeof priorityConfig]?.color)}>{priorityConfig[r.priority as keyof typeof priorityConfig]?.label}</span> },
    {
      key: 'dueAt', header: 'Time Remaining',
      render: (r: any) => {
        const { text, isOverdue, isWarning } = getSlaTimeRemaining(r.dueAt);
        return <span className={cn('text-xs font-semibold', isOverdue ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-600')}>{text}</span>;
      },
    },
    { key: 'assignedTo', header: 'Agent', render: (r: any) => r.assignedTo ? <span className="text-sm">{r.assignedTo.firstName} {r.assignedTo.lastName}</span> : <span className="text-xs text-red-500 font-medium">Unassigned</span> },
  ];

  const breachedColumns = [
    { key: 'ticketNumber', header: 'Ticket', render: (r: any) => <span className="font-mono text-xs text-red-600 font-medium">{r.ticketNumber}</span> },
    { key: 'title', header: 'Title', render: (r: any) => <span className="text-sm font-medium line-clamp-1">{r.title}</span> },
    { key: 'status', header: 'Status', render: (r: any) => <span className={cn('badge text-xs', statusConfig[r.status as keyof typeof statusConfig]?.color)}>{statusConfig[r.status as keyof typeof statusConfig]?.label}</span> },
    { key: 'priority', header: 'Priority', render: (r: any) => <span className={cn('badge text-xs', priorityConfig[r.priority as keyof typeof priorityConfig]?.color)}>{priorityConfig[r.priority as keyof typeof priorityConfig]?.label}</span> },
    { key: 'createdAt', header: 'Age', render: (r: any) => <span className="text-xs text-slate-500">{timeAgo(r.createdAt)}</span> },
  ];

  return (
    <div>
      <Header title="SLA Monitoring" subtitle="Service Level Agreement compliance and breach tracking" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="SLA Compliance"    value={`${metrics?.compliance ?? '—'}%`} icon={Shield}       color={metrics?.compliance >= 95 ? 'green' : 'red'} />
          <StatCard label="Total SLA Tickets" value={metrics?.total ?? '—'}            icon={CheckCircle2} color="blue" />
          <StatCard label="Breached"          value={metrics?.breached ?? '—'}         icon={AlertTriangle} color="red" />
          <StatCard label="At Risk (2h)"      value={(atRisk ?? []).length}             icon={Clock}        color="amber" />
        </div>

        {/* Compliance gauge + by priority */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 flex flex-col items-center justify-center">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Overall Compliance</h3>
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: metrics?.compliance ?? 0, fill: metrics?.compliance >= 95 ? '#22c55e' : metrics?.compliance >= 80 ? '#f59e0b' : '#ef4444' }]} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className={cn('text-2xl font-bold', complianceColor)}>{metrics?.compliance ?? '—'}%</p>
                  <p className="text-xs text-slate-500">Last 30 days</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">By Priority</h3>
            <div className="space-y-3">
              {(metrics?.byPriority ?? []).map((p: any) => (
                <div key={p.priority}>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span className="font-medium">{p.priority}</span>
                    <span>{p._count?.id ?? 0} tickets</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((p._count?.id ?? 0) / (metrics?.total || 1)) * 100)}%`,
                        backgroundColor: priorityColors[p.priority] || '#6366f1',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA Policies */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">SLA Policies</h3>
            <div className="space-y-3">
              {(policies ?? []).map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('badge text-xs', priorityConfig[p.priority as keyof typeof priorityConfig]?.color)}>{p.priority}</span>
                    <span className={cn('text-xs font-medium', p.isActive ? 'text-green-600' : 'text-slate-400')}>{p.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">Response: {p.responseTimeHours}h · Resolution: {p.resolutionTimeHours}h</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* At Risk Tickets */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" /> Tickets at Risk (Next 2 Hours)
          </h2>
          <DataTable
            columns={atRiskColumns}
            data={atRisk ?? []}
            emptyMessage="No tickets at risk of SLA breach"
          />
        </div>

        {/* Breached Tickets */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" /> Active SLA Breaches
          </h2>
          <DataTable
            columns={breachedColumns}
            data={breached?.data ?? []}
            emptyMessage="No active SLA breaches"
          />
        </div>
      </div>
    </div>
  );
}
