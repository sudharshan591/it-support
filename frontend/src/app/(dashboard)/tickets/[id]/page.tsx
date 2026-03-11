'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import {
  statusConfig, priorityConfig, typeConfig, formatDateTime, timeAgo, getSlaTimeRemaining, getInitials, formatFileSize,
} from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Send, AlertTriangle, Clock, User, Tag, Paperclip, Lock, Edit2, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

export default function TicketDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { user, isAgent } = useAuthStore();

  const [comment, setComment]         = useState('');
  const [isInternal, setIsInternal]   = useState(false);
  const [editStatus, setEditStatus]   = useState(false);
  const [newStatus, setNewStatus]     = useState('');
  const [editAssign, setEditAssign]   = useState(false);
  const [newAssignee, setNewAssignee] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id),
  });
  const { data: agents } = useQuery({
    queryKey: ['users', 'agents'],
    queryFn: () => usersApi.list({ limit: 100 }),
    enabled: isAgent(),
  });

  const commentMutation = useMutation({
    mutationFn: () => ticketsApi.addComment(id, { content: comment, isInternal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      setComment('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => ticketsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setEditStatus(false);
      setEditAssign(false);
      toast.success('Ticket updated');
    },
    onError: () => toast.error('Failed to update ticket'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!ticket) return <div className="p-6"><p className="text-slate-500">Ticket not found</p></div>;

  const sla = getSlaTimeRemaining(ticket.dueAt);

  return (
    <div>
      <Header title={ticket.ticketNumber} subtitle={ticket.title} />
      <div className="p-6">
        <Link href="/tickets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Ticket Info */}
            <Card>
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={cn('badge', typeConfig[ticket.type as keyof typeof typeConfig]?.color)}>
                        {typeConfig[ticket.type as keyof typeof typeConfig]?.label}
                      </span>
                      <span className={cn('badge', priorityConfig[ticket.priority as keyof typeof priorityConfig]?.color)}>
                        {priorityConfig[ticket.priority as keyof typeof priorityConfig]?.label}
                      </span>
                      <span className={cn('badge', statusConfig[ticket.status as keyof typeof statusConfig]?.color)}>
                        {statusConfig[ticket.status as keyof typeof statusConfig]?.label}
                      </span>
                      {ticket.slaBreached && (
                        <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> SLA Breached
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900">{ticket.title}</h1>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
                </div>
                {ticket.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {ticket.tags.map((t: any) => (
                      <span key={t.tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        <Tag className="w-2.5 h-2.5" />{t.tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Comments */}
            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  Activity ({ticket.comments?.filter((c: any) => !c.isInternal || isAgent()).length ?? 0})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(ticket.comments ?? [])
                  .filter((c: any) => !c.isInternal || isAgent())
                  .map((c: any) => (
                    <div key={c.id} className={cn('px-5 py-4', c.isInternal && 'bg-amber-50')}>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-indigo-700">
                            {getInitials(c.user?.firstName, c.user?.lastName)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900">
                              {c.user?.firstName} {c.user?.lastName}
                            </span>
                            {c.isInternal && (
                              <span className="badge bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Internal
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {/* Add Comment */}
              <div className="px-5 py-4 border-t border-slate-100">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Add a comment..."
                  className="input resize-none mb-3"
                />
                <div className="flex items-center justify-between">
                  {isAgent() && (
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
                      Internal note
                    </label>
                  )}
                  <button
                    onClick={() => commentMutation.mutate()}
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="btn-primary flex items-center gap-2 ml-auto"
                  >
                    <Send className="w-4 h-4" />
                    {commentMutation.isPending ? 'Sending...' : 'Comment'}
                  </button>
                </div>
              </div>
            </Card>

            {/* Attachments */}
            {ticket.attachments?.length > 0 && (
              <Card>
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Attachments ({ticket.attachments.length})
                  </h3>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {ticket.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      <span className="text-sm text-indigo-600 hover:underline">{att.fileName}</span>
                      <span className="text-xs text-slate-400">{formatFileSize(att.fileSize)}</span>
                    </a>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status Control */}
            {isAgent() && (
              <Card>
                <CardBody className="p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Actions</h3>
                  {!editStatus ? (
                    <button onClick={() => { setEditStatus(true); setNewStatus(ticket.status); }} className="btn-secondary w-full flex items-center gap-2 justify-center">
                      <Edit2 className="w-4 h-4" /> Update Status
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input">
                        {['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'].map(s => (
                          <option key={s} value={s}>{statusConfig[s as keyof typeof statusConfig]?.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => updateMutation.mutate({ status: newStatus })} className="btn-primary flex-1 flex items-center gap-1 justify-center text-sm py-1.5">
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button onClick={() => setEditStatus(false)} className="btn-secondary flex-1 flex items-center gap-1 justify-center text-sm py-1.5">
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {!editAssign ? (
                    <button onClick={() => { setEditAssign(true); setNewAssignee(ticket.assignedTo?.id || ''); }} className="btn-secondary w-full flex items-center gap-2 justify-center mt-2">
                      <User className="w-4 h-4" /> Reassign
                    </button>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="input">
                        <option value="">Unassigned</option>
                        {(agents?.data ?? []).map((a: any) => (
                          <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => updateMutation.mutate({ assignedToId: newAssignee || null })} className="btn-primary flex-1 text-sm py-1.5">Save</button>
                        <button onClick={() => setEditAssign(false)} className="btn-secondary flex-1 text-sm py-1.5">Cancel</button>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardBody className="p-4 space-y-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</h3>
                {[
                  { label: 'Ticket #',   value: ticket.ticketNumber },
                  { label: 'Created',    value: formatDateTime(ticket.createdAt) },
                  { label: 'Updated',    value: timeAgo(ticket.updatedAt) },
                  { label: 'Created By', value: `${ticket.createdBy?.firstName} ${ticket.createdBy?.lastName}` },
                  { label: 'Assigned',   value: ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned' },
                  { label: 'Department', value: ticket.department?.name || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-900">{value}</p>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* SLA Info */}
            {ticket.slaPolicy && (
              <Card>
                <CardBody className="p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> SLA
                  </h3>
                  <p className="text-sm font-medium text-slate-900">{ticket.slaPolicy.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Response: {ticket.slaPolicy.responseTimeHours}h · Resolution: {ticket.slaPolicy.resolutionTimeHours}h
                  </p>
                  {ticket.dueAt && (
                    <p className={cn('text-xs font-semibold mt-2', sla.isOverdue ? 'text-red-600' : sla.isWarning ? 'text-amber-600' : 'text-green-700')}>
                      {sla.text}
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
