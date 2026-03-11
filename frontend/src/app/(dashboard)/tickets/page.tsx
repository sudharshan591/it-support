'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ticketsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/ui/DataTable';
import { Ticket, statusConfig, priorityConfig, typeConfig, timeAgo, getSlaTimeRemaining } from '@/lib/utils';
import { Filter, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['', 'OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TYPE_OPTIONS = ['', 'INCIDENT', 'REQUEST', 'CHANGE'];

export default function TicketsPage() {
  const router      = useRouter();
  const searchParams= useSearchParams();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search:   searchParams.get('search') || '',
    status:   '',
    priority: '',
    type:     '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', page, filters],
    queryFn:  () => ticketsApi.list({ page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }),
  });

  const columns = [
    {
      key: 'ticketNumber',
      header: 'Ticket #',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500">{row.ticketNumber}</span>
          {row.slaBreached && <AlertTriangle className="w-3.5 h-3.5 text-red-500" title="SLA Breached" />}
        </div>
      ),
      width: '110px',
    },
    {
      key: 'title',
      header: 'Title',
      render: (row: any) => (
        <div>
          <p className="font-medium text-slate-900 text-sm truncate max-w-xs">{row.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{row.createdBy?.firstName} {row.createdBy?.lastName}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => (
        <span className={cn('badge text-xs', typeConfig[row.type as keyof typeof typeConfig]?.color)}>
          {typeConfig[row.type as keyof typeof typeConfig]?.label ?? row.type}
        </span>
      ),
      width: '90px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span className={cn('badge text-xs', statusConfig[row.status as keyof typeof statusConfig]?.color)}>
          {statusConfig[row.status as keyof typeof statusConfig]?.label ?? row.status}
        </span>
      ),
      width: '110px',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: any) => (
        <span className={cn('badge text-xs', priorityConfig[row.priority as keyof typeof priorityConfig]?.color)}>
          {priorityConfig[row.priority as keyof typeof priorityConfig]?.label ?? row.priority}
        </span>
      ),
      width: '90px',
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (row: any) => row.assignedTo
        ? <span className="text-sm">{row.assignedTo.firstName} {row.assignedTo.lastName}</span>
        : <span className="text-xs text-slate-400 italic">Unassigned</span>,
    },
    {
      key: 'dueAt',
      header: 'SLA',
      render: (row: any) => {
        if (!row.dueAt) return <span className="text-xs text-slate-400">—</span>;
        const { text, isOverdue, isWarning } = getSlaTimeRemaining(row.dueAt);
        return (
          <span className={cn('text-xs font-medium', isOverdue ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-600')}>
            {text}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: any) => <span className="text-xs text-slate-500">{timeAgo(row.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <Header title="Tickets" subtitle="Manage incidents, requests, and changes" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={filters.search}
            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            placeholder="Search tickets..."
            className="input w-52"
          />
          <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }} className="input w-36">
            <option value="">All Status</option>
            {STATUS_OPTIONS.slice(1).map(s => <option key={s} value={s}>{statusConfig[s as keyof typeof statusConfig]?.label ?? s}</option>)}
          </select>
          <select value={filters.priority} onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }} className="input w-36">
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.slice(1).map(p => <option key={p} value={p}>{priorityConfig[p as keyof typeof priorityConfig]?.label ?? p}</option>)}
          </select>
          <select value={filters.type} onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }} className="input w-32">
            <option value="">All Types</option>
            {TYPE_OPTIONS.slice(1).map(t => <option key={t} value={t}>{typeConfig[t as keyof typeof typeConfig]?.label ?? t}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-500">{data?.meta?.total ?? 0} tickets</span>
            <Link href="/tickets/create" className="btn-primary">+ New Ticket</Link>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages}
          total={data?.meta?.total}
          onPageChange={setPage}
          onRowClick={row => router.push(`/tickets/${row.id}`)}
          emptyMessage="No tickets match your filters"
        />
      </div>
    </div>
  );
}
