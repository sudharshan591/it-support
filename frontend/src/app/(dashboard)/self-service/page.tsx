'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, kbApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { statusConfig, priorityConfig, timeAgo, getSlaTimeRemaining } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Plus, BookOpen, Ticket, Clock, CheckCircle2, Eye, AlertTriangle, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title:       z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Please provide more details (min 20 characters)'),
  type:        z.enum(['INCIDENT', 'REQUEST', 'CHANGE']),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

type FormData = z.infer<typeof schema>;

const QUICK_TEMPLATES = [
  { title: 'Password Reset Request', description: 'I need help resetting my account password. I am unable to login to my work account.', type: 'REQUEST' as const, priority: 'MEDIUM' as const },
  { title: 'Software Installation Request', description: 'I need the following software installed on my workstation. Please provide license and installation support.', type: 'REQUEST' as const, priority: 'LOW' as const },
  { title: 'Hardware Issue - Not Working', description: 'My hardware device is not functioning correctly. This is impacting my ability to work.', type: 'INCIDENT' as const, priority: 'HIGH' as const },
  { title: 'Network Connectivity Issue', description: 'I am experiencing network connectivity issues. I cannot access internal systems or the internet.', type: 'INCIDENT' as const, priority: 'HIGH' as const },
];

export default function SelfServicePage() {
  const qc  = useQueryClient();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [kbSearch, setKbSearch]     = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'INCIDENT', priority: 'MEDIUM' },
  });

  const { data: myTickets } = useQuery({
    queryKey: ['tickets', 'mine', user?.id],
    queryFn: () => ticketsApi.list({ createdById: user?.id, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
    enabled: !!user?.id,
  });

  const { data: kbData } = useQuery({
    queryKey: ['kb', 'self-service', kbSearch],
    queryFn: () => kbApi.list({ search: kbSearch || undefined, limit: 6 }),
  });

  const { data: popular } = useQuery({
    queryKey: ['kb', 'popular-self-service'],
    queryFn: () => kbApi.popular(4),
  });

  const createMutation = useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.ticketNumber} submitted! Our team will respond shortly.`);
      qc.invalidateQueries({ queryKey: ['tickets', 'mine'] });
      setShowCreate(false);
      reset();
    },
    onError: () => toast.error('Failed to submit ticket'),
  });

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setValue('title', t.title);
    setValue('description', t.description);
    setValue('type', t.type);
    setValue('priority', t.priority);
  };

  const stats = {
    open:       (myTickets?.data ?? []).filter((t: any) => t.status === 'OPEN').length,
    inProgress: (myTickets?.data ?? []).filter((t: any) => t.status === 'IN_PROGRESS').length,
    resolved:   (myTickets?.data ?? []).filter((t: any) => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
  };

  return (
    <div>
      <Header title="Self-Service Portal" subtitle="Submit tickets and find answers in the knowledge base" />
      <div className="p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-semibold mb-1">Hello, {user?.firstName}! 👋</h2>
          <p className="text-indigo-200 text-sm mb-4">How can IT Support help you today?</p>
          <button onClick={() => setShowCreate(true)} className="bg-white text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2 inline-flex">
            <Plus className="w-4 h-4" /> Submit a Support Request
          </button>
        </div>

        {/* My Ticket Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open',        value: stats.open,       color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
            { label: 'Resolved',    value: stats.resolved,   color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl p-4 border', s.bg, s.border)}>
              <p className="text-xs font-medium text-slate-500 mb-0.5">{s.label}</p>
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Recent Tickets */}
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Ticket className="w-4 h-4 text-indigo-600" /> My Tickets</h3>
              <Link href="/tickets?createdById=me" className="text-xs text-indigo-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(myTickets?.data ?? []).slice(0, 6).map((t: any) => {
                const sla = getSlaTimeRemaining(t.dueAt);
                return (
                  <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-slate-400">{t.ticketNumber}</span>
                        <span className={cn('badge text-xs', statusConfig[t.status as keyof typeof statusConfig]?.color)}>
                          {statusConfig[t.status as keyof typeof statusConfig]?.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">{timeAgo(t.createdAt)}</span>
                        {t.dueAt && !['RESOLVED','CLOSED'].includes(t.status) && (
                          <span className={cn('text-xs font-medium', sla.isOverdue ? 'text-red-500' : sla.isWarning ? 'text-amber-500' : 'text-slate-400')}>
                            {sla.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={cn('badge text-xs shrink-0', priorityConfig[t.priority as keyof typeof priorityConfig]?.color)}>
                      {priorityConfig[t.priority as keyof typeof priorityConfig]?.label}
                    </span>
                  </Link>
                );
              })}
              {(!myTickets?.data || myTickets.data.length === 0) && (
                <div className="px-5 py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No open tickets — great!</p>
                </div>
              )}
            </div>
          </Card>

          {/* Knowledge Base */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">Knowledge Base</h3>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={kbSearch}
                  onChange={e => setKbSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="input pl-9"
                />
              </div>
              <div className="space-y-2">
                {((kbSearch ? kbData?.data : popular) ?? []).map((a: any) => (
                  <Link key={a.id} href="/knowledge-base" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 truncate">{a.title}</p>
                      <p className="text-xs text-slate-400">{a.category}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0 ml-2">
                      <Eye className="w-3 h-3" />{a.viewCount}
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/knowledge-base" className="block text-center text-xs text-indigo-600 hover:underline mt-3 font-medium">
                Browse all articles →
              </Link>
            </Card>

            {/* Quick Submit Templates */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Request Templates</h3>
              <div className="space-y-2">
                {QUICK_TEMPLATES.map(t => (
                  <button
                    key={t.title}
                    onClick={() => { applyTemplate(t); setShowCreate(true); }}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                  >
                    <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">{t.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={cn('badge text-xs', priorityConfig[t.priority]?.color)}>{t.priority}</span>
                      <span className="badge bg-slate-100 text-slate-600 text-xs">{t.type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Submit Support Request" size="lg">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="label">What do you need help with? *</label>
            <input {...register('title')} className="input" placeholder="Brief description of your issue" />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Please describe the issue in detail *</label>
            <textarea {...register('description')} rows={5} className="input resize-none" placeholder="Include: what happened, when it started, what you've tried, and how it's affecting your work..." />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Request Type</label>
              <select {...register('type')} className="input">
                <option value="INCIDENT">Something is broken (Incident)</option>
                <option value="REQUEST">I need something new (Request)</option>
                <option value="CHANGE">I need a change (Change)</option>
              </select>
            </div>
            <div>
              <label className="label">How urgent is this?</label>
              <select {...register('priority')} className="input">
                <option value="LOW">Low — Can wait a few days</option>
                <option value="MEDIUM">Medium — Need it this week</option>
                <option value="HIGH">High — Affecting my work today</option>
                <option value="CRITICAL">Critical — Cannot work at all</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex items-center gap-2">
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
