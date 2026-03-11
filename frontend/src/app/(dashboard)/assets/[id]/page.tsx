'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { assetStatusConfig, formatDate, formatDateTime, timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ArrowLeft, User, RotateCcw, History, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc     = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.get(id),
  });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list({ limit: 100 }) });

  const assignMutation = useMutation({
    mutationFn: (data: any) => assetsApi.assign(id, data),
    onSuccess: () => { toast.success('Asset assigned'); qc.invalidateQueries({ queryKey: ['asset', id] }); setShowAssign(false); reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to assign'),
  });

  const unassignMutation = useMutation({
    mutationFn: () => assetsApi.unassign(id),
    onSuccess: () => { toast.success('Asset returned'); qc.invalidateQueries({ queryKey: ['asset', id] }); },
    onError: () => toast.error('Failed to return asset'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!asset) return <p className="p-6 text-slate-500">Asset not found</p>;

  const currentAssignment = asset.assignments?.find((a: any) => !a.returnedAt);
  const isWarrantyExpired = asset.warrantyEnd && new Date(asset.warrantyEnd) < new Date();

  const fields = [
    { label: 'Asset Tag',      value: asset.assetTag },
    { label: 'Type',           value: asset.type },
    { label: 'Manufacturer',   value: asset.manufacturer || '—' },
    { label: 'Model',          value: asset.model || '—' },
    { label: 'Serial Number',  value: asset.serialNumber || '—' },
    { label: 'Location',       value: asset.location || '—' },
    { label: 'IP Address',     value: asset.ipAddress || '—' },
    { label: 'MAC Address',    value: asset.macAddress || '—' },
    { label: 'Purchase Date',  value: asset.purchaseDate ? formatDate(asset.purchaseDate) : '—' },
    { label: 'Warranty End',   value: asset.warrantyEnd ? formatDate(asset.warrantyEnd) : '—' },
  ];

  return (
    <div>
      <Header title={asset.name} subtitle={`Asset Tag: ${asset.assetTag}`} />
      <div className="p-6">
        <Link href="/assets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Assets
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Asset Info */}
            <Card>
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{asset.name}</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{asset.manufacturer} {asset.model}</p>
                  </div>
                  <span className={cn('badge text-sm', assetStatusConfig[asset.status as keyof typeof assetStatusConfig]?.color)}>
                    {assetStatusConfig[asset.status as keyof typeof assetStatusConfig]?.label}
                  </span>
                </div>

                {isWarrantyExpired && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <p className="text-sm text-red-700">Warranty expired on {formatDate(asset.warrantyEnd!)}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {fields.map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                {asset.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{asset.notes}</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Assignment History */}
            <Card>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Assignment History</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(asset.assignments ?? []).map((a: any) => (
                  <div key={a.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.user?.firstName} {a.user?.lastName}</p>
                      <p className="text-xs text-slate-500">{a.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-600">{formatDate(a.assignedAt)}</p>
                      {a.returnedAt
                        ? <p className="text-xs text-green-600">Returned {formatDate(a.returnedAt)}</p>
                        : <span className="badge bg-blue-100 text-blue-700 text-xs">Currently Assigned</span>
                      }
                    </div>
                  </div>
                ))}
                {(!asset.assignments || asset.assignments.length === 0) && (
                  <p className="px-5 py-6 text-sm text-slate-400 text-center">No assignment history</p>
                )}
              </div>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardBody className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</h3>
                {!currentAssignment ? (
                  <button onClick={() => setShowAssign(true)} className="btn-primary w-full flex items-center gap-2 justify-center">
                    <User className="w-4 h-4" /> Assign Asset
                  </button>
                ) : (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium mb-1">Currently Assigned To</p>
                      <p className="text-sm font-semibold text-blue-900">{currentAssignment.user?.firstName} {currentAssignment.user?.lastName}</p>
                      <p className="text-xs text-blue-700">Since {formatDate(currentAssignment.assignedAt)}</p>
                    </div>
                    <button
                      onClick={() => unassignMutation.mutate()}
                      disabled={unassignMutation.isPending}
                      className="btn-secondary w-full flex items-center gap-2 justify-center"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {unassignMutation.isPending ? 'Processing...' : 'Return Asset'}
                    </button>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal isOpen={showAssign} onClose={() => { setShowAssign(false); reset(); }} title="Assign Asset">
        <form onSubmit={handleSubmit((data) => assignMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">Assign To *</label>
            <select {...register('userId', { required: true })} className="input">
              <option value="">Select user...</option>
              {(users?.data ?? []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} rows={2} className="input resize-none" placeholder="Assignment notes..." />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={assignMutation.isPending} className="btn-primary">
              {assignMutation.isPending ? 'Assigning...' : 'Assign Asset'}
            </button>
            <button type="button" onClick={() => { setShowAssign(false); reset(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
