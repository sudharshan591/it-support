'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import { Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const schema = z.object({
  title:        z.string().min(5, 'Title must be at least 5 characters'),
  description:  z.string().min(10, 'Description must be at least 10 characters'),
  type:         z.enum(['INCIDENT', 'REQUEST', 'CHANGE']),
  priority:     z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  assignedToId: z.string().optional(),
  departmentId: z.string().optional(),
  tags:         z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateTicketPage() {
  const router  = useRouter();
  const qc      = useQueryClient();

  const { data: users }   = useQuery({ queryKey: ['users', 'agents'], queryFn: () => usersApi.list({ limit: 100 }) });
  const { data: depts }   = useQuery({ queryKey: ['departments'], queryFn: usersApi.departments });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'INCIDENT', priority: 'MEDIUM' },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => ticketsApi.create(data),
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.ticketNumber} created successfully`);
      qc.invalidateQueries({ queryKey: ['tickets'] });
      router.push(`/tickets/${ticket.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create ticket');
    },
  });

  const onSubmit = (data: FormData) => {
    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    createMutation.mutate({ ...data, tags, assignedToId: data.assignedToId || undefined, departmentId: data.departmentId || undefined });
  };

  return (
    <div>
      <Header title="Create Ticket" />
      <div className="p-6 max-w-3xl">
        <Link href="/tickets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </Link>

        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">New Ticket Details</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="label">Title *</label>
                <input {...register('title')} className="input" placeholder="Brief description of the issue" />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>

              <div>
                <label className="label">Description *</label>
                <textarea {...register('description')} rows={5} className="input resize-none" placeholder="Provide detailed information about the issue, steps to reproduce, impact, etc." />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type *</label>
                  <select {...register('type')} className="input">
                    <option value="INCIDENT">Incident</option>
                    <option value="REQUEST">Service Request</option>
                    <option value="CHANGE">Change Request</option>
                  </select>
                </div>
                <div>
                  <label className="label">Priority *</label>
                  <select {...register('priority')} className="input">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Assign To</label>
                  <select {...register('assignedToId')} className="input">
                    <option value="">Unassigned</option>
                    {(users?.data ?? []).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role?.name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select {...register('departmentId')} className="input">
                    <option value="">Select department</option>
                    {(depts ?? []).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Tags</label>
                <input {...register('tags')} className="input" placeholder="network, vpn, urgent (comma-separated)" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary flex items-center gap-2">
                  {(isSubmitting || createMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Ticket
                </button>
                <Link href="/tickets" className="btn-secondary">Cancel</Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
