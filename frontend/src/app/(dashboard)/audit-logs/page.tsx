'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/ui/DataTable';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Shield, Filter, ChevronDown } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  create:   'bg-green-100 text-green-700',
  update:   'bg-blue-100 text-blue-700',
  delete:   'bg-red-100 text-red-700',
  login:    'bg-indigo-100 text-indigo-700',
  logout:   'bg-slate-100 text-slate-600',
  assign:   'bg-purple-100 text-purple-700',
  unassign: 'bg-amber-100 text-amber-700',
};

const RESOURCE_OPTIONS = ['', 'auth', 'tickets', 'assets', 'users', 'kb', 'automation', 'sla'];
const ACTION_OPTIONS   = ['', 'create', 'update', 'delete', 'login', 'logout', 'assign', 'unassign'];

export default function AuditLogsPage() {
  const [page, setPage]         = useState(1);
  const [resource, setResource] = useState('');
  const [action, setAction]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, resource, action, startDate, endDate],
    queryFn: () => auditApi.list({
      page, limit: 25,
      resource:  resource  || undefined,
      action:    action    || undefined,
      startDate: startDate || undefined,
      endDate:   endDate   || undefined,
    }),
  });

  const columns = [
    {
      key: 'createdAt', header: 'Timestamp',
      render: (r: any) => <span className="text-xs font-mono text-slate-600">{formatDateTime(r.createdAt)}</span>,
      width: '160px',
    },
    {
      key: 'user', header: 'User',
      render: (r: any) => r.user
        ? <div><p className="text-sm font-medium text-slate-900">{r.user.firstName} {r.user.lastName}</p><p className="text-xs text-slate-400">{r.user.email}</p></div>
        : <span className="text-xs text-slate-400 italic">System</span>,
    },
    {
      key: 'action', header: 'Action',
      render: (r: any) => (
        <span className={cn('badge text-xs font-mono', ACTION_COLORS[r.action] ?? 'bg-slate-100 text-slate-600')}>
          {r.action}
        </span>
      ),
      width: '100px',
    },
    {
      key: 'resource', header: 'Resource',
      render: (r: any) => (
        <div>
          <span className="text-sm font-medium text-slate-900 capitalize">{r.resource}</span>
          {r.resourceId && <p className="text-xs text-slate-400 font-mono">{r.resourceId.slice(0, 8)}…</p>}
        </div>
      ),
    },
    {
      key: 'ipAddress', header: 'IP Address',
      render: (r: any) => <span className="text-xs font-mono text-slate-500">{r.ipAddress || '—'}</span>,
      width: '120px',
    },
    {
      key: 'changes', header: 'Changes',
      render: (r: any) => {
        const hasChanges = r.oldValues || r.newValues;
        if (!hasChanges) return <span className="text-xs text-slate-400">—</span>;
        return (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(expanded === r.id ? null : r.id); }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            View diff <ChevronDown className={cn('w-3 h-3 transition-transform', expanded === r.id && 'rotate-180')} />
          </button>
        );
      },
      width: '100px',
    },
  ];

  // Flatten expanded row content into data
  const tableData = (data?.data ?? []).flatMap((row: any) =>
    expanded === row.id
      ? [row, { __expandedFor: row.id, oldValues: row.oldValues, newValues: row.newValues }]
      : [row],
  );

  return (
    <div>
      <Header title="Audit Logs" subtitle="Complete audit trail of all system actions" />
      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
          <p className="text-sm text-indigo-800">
            <span className="font-semibold">{data?.meta?.total ?? 0}</span> audit events recorded. All critical actions are immutably logged.
          </p>
        </div>

        {/* Filters */}
        <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select value={resource} onChange={e => { setResource(e.target.value); setPage(1); }} className="input w-36">
            <option value="">All Resources</option>
            {RESOURCE_OPTIONS.slice(1).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }} className="input w-32">
            <option value="">All Actions</option>
            {ACTION_OPTIONS.slice(1).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From</label>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="input w-36" />
            <label className="text-xs text-slate-500">To</label>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="input w-36" />
          </div>
          {(resource || action || startDate || endDate) && (
            <button onClick={() => { setResource(''); setAction(''); setStartDate(''); setEndDate(''); setPage(1); }} className="text-xs text-red-500 hover:underline ml-auto">
              Clear filters
            </button>
          )}
        </div>

        {/* Table with expanded diff rows */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  {columns.map(c => <th key={c.key} className="table-th" style={{ width: c.width }}>{c.header}</th>)}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={columns.length} className="py-12 text-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : (data?.data ?? []).length === 0 ? (
                  <tr><td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">No audit logs found</td></tr>
                ) : (
                  (data?.data ?? []).map((row: any) => (
                    <>
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        {columns.map(col => <td key={col.key} className="table-td">{col.render ? col.render(row) : row[col.key]}</td>)}
                      </tr>
                      {expanded === row.id && (
                        <tr key={`${row.id}-expanded`} className="bg-slate-50">
                          <td colSpan={columns.length} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                              {row.oldValues && (
                                <div>
                                  <p className="font-semibold text-red-600 mb-1">Before</p>
                                  <pre className="bg-red-50 border border-red-200 rounded p-2 text-red-800 overflow-auto max-h-32">
                                    {JSON.stringify(row.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {row.newValues && (
                                <div>
                                  <p className="font-semibold text-green-600 mb-1">After</p>
                                  <pre className="bg-green-50 border border-green-200 rounded p-2 text-green-800 overflow-auto max-h-32">
                                    {JSON.stringify(row.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {(data?.meta?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-500">{data?.meta?.total} total events</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
                <span className="text-sm text-slate-600">Page {page} of {data?.meta?.totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.meta?.totalPages ?? 1)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
