'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { assetsApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { assetStatusConfig, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Package, Monitor, Server, Filter, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const ASSET_TYPES = ['LAPTOP', 'DESKTOP', 'SERVER', 'NETWORK', 'PHONE', 'PRINTER', 'SOFTWARE', 'OTHER'];
const ASSET_STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'DISPOSED'];

export default function AssetsPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [showCreate, setShowCreate] = useState(false);

  const { data: stats }  = useQuery({ queryKey: ['assets', 'stats'], queryFn: assetsApi.stats });
  const { data, isLoading } = useQuery({
    queryKey: ['assets', page, filters],
    queryFn: () => assetsApi.list({ page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const createMutation = useMutation({
    mutationFn: assetsApi.create,
    onSuccess: () => { toast.success('Asset created'); qc.invalidateQueries({ queryKey: ['assets'] }); setShowCreate(false); reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create asset'),
  });

  const columns = [
    {
      key: 'assetTag',
      header: 'Asset Tag',
      render: (row: any) => <span className="font-mono text-sm font-medium text-indigo-700">{row.assetTag}</span>,
      width: '110px',
    },
    {
      key: 'name',
      header: 'Name',
      render: (row: any) => (
        <div>
          <p className="font-medium text-slate-900 text-sm">{row.name}</p>
          <p className="text-xs text-slate-500">{row.manufacturer} {row.model}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => <span className="badge bg-slate-100 text-slate-700 text-xs">{row.type}</span>,
      width: '100px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span className={cn('badge text-xs', assetStatusConfig[row.status as keyof typeof assetStatusConfig]?.color)}>
          {assetStatusConfig[row.status as keyof typeof assetStatusConfig]?.label ?? row.status}
        </span>
      ),
      width: '105px',
    },
    {
      key: 'currentUser',
      header: 'Assigned To',
      render: (row: any) => {
        const active = row.assignments?.find((a: any) => !a.returnedAt);
        return active ? <span className="text-sm">{active.user?.firstName} {active.user?.lastName}</span>
          : <span className="text-xs text-slate-400 italic">Available</span>;
      },
    },
    { key: 'location', header: 'Location', render: (row: any) => <span className="text-sm text-slate-600">{row.location || '—'}</span> },
    {
      key: 'warrantyEnd',
      header: 'Warranty',
      render: (row: any) => {
        if (!row.warrantyEnd) return <span className="text-xs text-slate-400">—</span>;
        const expired = new Date(row.warrantyEnd) < new Date();
        return <span className={cn('text-xs', expired ? 'text-red-600 font-medium' : 'text-slate-600')}>{formatDate(row.warrantyEnd)}{expired ? ' (Expired)' : ''}</span>;
      },
    },
  ];

  return (
    <div>
      <Header title="Asset Management" subtitle="Track and manage IT hardware and software assets" />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Assets"    value={stats?.total ?? '—'}     icon={Package} color="slate" />
          <StatCard label="Available"       value={stats?.available ?? '—'} icon={Package} color="green" />
          <StatCard label="Assigned"        value={stats?.assigned ?? '—'}  icon={Monitor} color="blue" />
          <StatCard label="In Repair"       value={stats?.inRepair ?? '—'}  icon={Server}  color="amber" />
          <StatCard label="Retired"         value={stats?.retired ?? '—'}   icon={Package} color="slate" />
        </div>

        {/* Filters */}
        <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <input value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} placeholder="Search assets..." className="input w-52" />
          <select value={filters.type} onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }} className="input w-36">
            <option value="">All Types</option>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }} className="input w-36">
            <option value="">All Status</option>
            {ASSET_STATUSES.map(s => <option key={s} value={s}>{assetStatusConfig[s as keyof typeof assetStatusConfig]?.label ?? s}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages}
          total={data?.meta?.total}
          onPageChange={setPage}
          onRowClick={row => router.push(`/assets/${row.id}`)}
        />
      </div>

      {/* Create Asset Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Add New Asset" size="lg">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Asset Tag *</label>
              <input {...register('assetTag', { required: true })} className="input" placeholder="LT-001" />
            </div>
            <div>
              <label className="label">Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Dell XPS 15" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type *</label>
              <select {...register('type', { required: true })} className="input">
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input {...register('location')} className="input" placeholder="New York HQ" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Manufacturer</label>
              <input {...register('manufacturer')} className="input" placeholder="Dell" />
            </div>
            <div>
              <label className="label">Model</label>
              <input {...register('model')} className="input" placeholder="XPS 15 9530" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Serial Number</label>
              <input {...register('serialNumber')} className="input" />
            </div>
            <div>
              <label className="label">IP Address</label>
              <input {...register('ipAddress')} className="input" placeholder="192.168.1.1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Date</label>
              <input {...register('purchaseDate')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Warranty End</label>
              <input {...register('warrantyEnd')} type="date" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} rows={2} className="input resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Asset'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
