'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Zap, Plus, ToggleLeft, ToggleRight, Trash2, Edit2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';

const EVENTS = ['ticket.created', 'ticket.updated', 'ticket.resolved', 'ticket.sla_warning'];
const CONDITION_FIELDS = ['priority', 'status', 'type', 'assignedToId', 'departmentId', 'slaBreached'];
const OPERATORS = ['equals', 'not_equals', 'in', 'is_null', 'is_not_null'];
const ACTION_TYPES = ['assign', 'notify', 'update_status', 'update_priority', 'add_tag'];

export default function AutomationPage() {
  const qc   = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule]   = useState<any>(null);
  const { register, handleSubmit, reset, watch } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['automation', 'rules'],
    queryFn: () => automationApi.list({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => automationApi.create(data),
    onSuccess: () => { toast.success('Rule created'); qc.invalidateQueries({ queryKey: ['automation'] }); setShowModal(false); reset(); },
    onError: () => toast.error('Failed to create rule'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => automationApi.toggle(id),
    onSuccess: () => { toast.success('Rule toggled'); qc.invalidateQueries({ queryKey: ['automation'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationApi.delete(id),
    onSuccess: () => { toast.success('Rule deleted'); qc.invalidateQueries({ queryKey: ['automation'] }); },
    onError: () => toast.error('Failed to delete rule'),
  });

  const onSubmit = (formData: any) => {
    const payload = {
      name: formData.name,
      description: formData.description,
      isActive: formData.isActive !== false,
      trigger: { event: formData.triggerEvent },
      conditions: formData.conditionField
        ? [{ field: formData.conditionField, operator: formData.conditionOperator || 'equals', value: formData.conditionValue }]
        : [],
      actions: [{
        type: formData.actionType,
        params: {
          userId:  formData.actionUserId || undefined,
          status:  formData.actionStatus || undefined,
          message: formData.actionMessage || undefined,
          tag:     formData.actionTag || undefined,
        },
      }],
    };
    createMutation.mutate(payload);
  };

  return (
    <div>
      <Header title="Automation Rules" subtitle="Configure automated workflows for tickets" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{data?.meta?.total ?? 0} automation rules configured</p>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Rule
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {(data?.data ?? []).map((rule: any) => (
              <Card key={rule.id} className={cn('p-5', !rule.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className={cn('w-4 h-4', rule.isActive ? 'text-indigo-600' : 'text-slate-400')} />
                      <h3 className="text-sm font-semibold text-slate-900">{rule.name}</h3>
                      <span className={cn('badge text-xs', rule.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {rule.description && <p className="text-xs text-slate-500 mb-3">{rule.description}</p>}

                    {/* Visual representation */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="font-semibold text-blue-700">WHEN</span>
                        <span className="text-blue-600">{(rule.trigger as any)?.event}</span>
                      </div>
                      {((rule.conditions as any[]) ?? []).length > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <span className="font-semibold text-amber-700">IF</span>
                          {(rule.conditions as any[]).map((c: any, i: number) => (
                            <span key={i} className="text-amber-600">{c.field} {c.operator} {String(c.value)}</span>
                          ))}
                        </div>
                      )}
                      {((rule.actions as any[]) ?? []).map((a: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                          <span className="font-semibold text-green-700">THEN</span>
                          <span className="text-green-600">{a.type}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span><Play className="w-3 h-3 inline mr-1" />{rule.executedCount} executions</span>
                      {rule.lastExecutedAt && <span>Last run {timeAgo(rule.lastExecutedAt)}</span>}
                      <span>Created {formatDateTime(rule.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => toggleMutation.mutate(rule.id)} title={rule.isActive ? 'Deactivate' : 'Activate'} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                      {rule.isActive ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => { if (confirm('Delete this rule?')) deleteMutation.mutate(rule.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 text-slate-400">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No automation rules yet. Create your first rule to automate ticket workflows.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); }} title="Create Automation Rule" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Rule Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Auto-assign critical tickets" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input {...register('description')} className="input" placeholder="What does this rule do?" />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-blue-700">TRIGGER — When this event occurs:</p>
            <select {...register('triggerEvent', { required: true })} className="input">
              <option value="">Select event...</option>
              {EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-amber-700">CONDITION (optional) — Only if:</p>
            <div className="grid grid-cols-3 gap-2">
              <select {...register('conditionField')} className="input text-sm">
                <option value="">Select field...</option>
                {CONDITION_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select {...register('conditionOperator')} className="input text-sm">
                {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input {...register('conditionValue')} className="input text-sm" placeholder="Value (e.g. CRITICAL)" />
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-green-700">ACTION — Then do this:</p>
            <select {...register('actionType', { required: true })} className="input">
              <option value="">Select action...</option>
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">Status (for update_status)</label>
                <select {...register('actionStatus')} className="input text-sm">
                  <option value="">Select...</option>
                  {['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Message (for notify)</label>
                <input {...register('actionMessage')} className="input text-sm" placeholder="Notification message" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Rule'}
            </button>
            <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
