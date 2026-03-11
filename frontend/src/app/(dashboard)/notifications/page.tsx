'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Bell, CheckCheck, Trash2, AlertTriangle, Ticket, Package, Settings, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  TICKET_CREATED:  { icon: Ticket,        color: 'text-blue-600',   bg: 'bg-blue-50' },
  TICKET_ASSIGNED: { icon: Ticket,        color: 'text-indigo-600', bg: 'bg-indigo-50' },
  TICKET_UPDATED:  { icon: Ticket,        color: 'text-slate-600',  bg: 'bg-slate-100' },
  TICKET_RESOLVED: { icon: Ticket,        color: 'text-green-600',  bg: 'bg-green-50' },
  SLA_BREACH:      { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50' },
  ASSET_ASSIGNED:  { icon: Package,       color: 'text-purple-600', bg: 'bg-purple-50' },
  SYSTEM:          { icon: Settings,      color: 'text-slate-600',  bg: 'bg-slate-100' },
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () => notificationsApi.list({ page, limit: 25, unreadOnly }),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const unreadCount = data?.meta?.unreadCount ?? 0;

  return (
    <div>
      <Header title="Notifications" subtitle="Stay informed about tickets, assets, and system events" />
      <div className="p-6 max-w-3xl">
        {/* Controls */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setUnreadOnly(false); setPage(1); }}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', !unreadOnly ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              All
            </button>
            <button
              onClick={() => { setUnreadOnly(true); setPage(1); }}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2', unreadOnly ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              Unread
              {unreadCount > 0 && (
                <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-bold', unreadOnly ? 'bg-white text-indigo-600' : 'bg-red-500 text-white')}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">{unreadOnly ? 'No unread notifications' : 'No notifications yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(data?.data ?? []).map((n: any) => {
                const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;
                const Icon = config.icon;
                const ticketId = n.metadata?.ticketId;

                return (
                  <div
                    key={n.id}
                    className={cn('flex items-start gap-4 px-5 py-4 transition-colors', n.isRead ? '' : 'bg-indigo-50/40')}
                    onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                  >
                    <div className={cn('p-2 rounded-xl shrink-0', config.bg)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn('text-sm', n.isRead ? 'text-slate-700' : 'font-semibold text-slate-900')}>
                            {n.title}
                          </p>
                          <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                          {ticketId && (
                            <Link href={`/tickets/${ticketId}`} className="text-xs text-indigo-600 hover:underline mt-1 inline-block" onClick={e => e.stopPropagation()}>
                              View Ticket →
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.isRead && <span className="w-2 h-2 bg-indigo-600 rounded-full" />}
                          <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                            className="p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {(data?.meta?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-500">{data?.meta?.total} notifications</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
                <span className="text-sm">{page} / {data?.meta?.totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.meta?.totalPages ?? 1)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
