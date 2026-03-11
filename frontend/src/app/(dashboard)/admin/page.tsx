'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Users, Shield, Building, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

type Tab = 'users' | 'roles' | 'departments';

export default function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab]         = useState<Tab>('users');
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState<any>(null);
  const [showDeptCreate, setShowDeptCreate] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm();
  const { register: regDept, handleSubmit: submitDept, reset: resetDept } = useForm();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', page, search, tab],
    queryFn: () => usersApi.list({ page, limit: 20, search: search || undefined }),
    enabled: tab === 'users',
  });
  const { data: roles }       = useQuery({ queryKey: ['roles'],       queryFn: usersApi.roles });
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: usersApi.departments });
  const { data: permissions } = useQuery({ queryKey: ['permissions'], queryFn: usersApi.permissions, enabled: tab === 'roles' });

  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); reset(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: any) => usersApi.update(id, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); reset(); },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Failed to delete user'),
  });

  const createDeptMutation = useMutation({
    mutationFn: (data: any) => usersApi.createDept(data.name),
    onSuccess: () => { toast.success('Department created'); qc.invalidateQueries({ queryKey: ['departments'] }); setShowDeptCreate(false); resetDept(); },
    onError: () => toast.error('Failed to create department'),
  });

  const openEditUser = (u: any) => {
    setEditUser(u);
    setValue('firstName', u.firstName);
    setValue('lastName', u.lastName);
    setValue('email', u.email);
    setValue('phone', u.phone || '');
    setValue('roleId', u.role?.id || '');
    setValue('departmentId', u.department?.id || '');
    setValue('isActive', u.isActive);
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'users', label: 'Users', icon: Users },
    { key: 'roles', label: 'Roles & Permissions', icon: Key },
    { key: 'departments', label: 'Departments', icon: Building },
  ];

  const userColumns = [
    {
      key: 'name', header: 'User',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-700">{r.firstName?.[0]}{r.lastName?.[0]}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-slate-500">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: (r: any) => <span className="badge bg-indigo-100 text-indigo-700 text-xs">{r.role?.name}</span>,
    },
    {
      key: 'department', header: 'Department',
      render: (r: any) => <span className="text-sm text-slate-600">{r.department?.name || '—'}</span>,
    },
    {
      key: 'isActive', header: 'Status',
      render: (r: any) => (
        <span className={cn('badge text-xs', r.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
          {r.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Joined', render: (r: any) => <span className="text-xs text-slate-500">{timeAgo(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: (r: any) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openEditUser(r)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { if (confirm(`Deactivate ${r.firstName}?`)) deleteUserMutation.mutate(r.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
      width: '80px',
    },
  ];

  return (
    <div>
      <Header title="Admin Panel" subtitle="Manage users, roles, and departments" />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"   value={usersData?.meta?.total ?? '—'} icon={Users}    color="indigo" />
          <StatCard label="Roles"         value={(roles ?? []).length}           icon={Key}      color="blue" />
          <StatCard label="Departments"   value={(departments ?? []).length}     icon={Building} color="green" />
          <StatCard label="Permissions"   value={(permissions ?? []).length}     icon={Shield}   color="slate" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); setSearch(''); }}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="input w-60" />
              <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 ml-auto">
                <Plus className="w-4 h-4" /> Add User
              </button>
            </div>
            <DataTable
              columns={userColumns}
              data={usersData?.data ?? []}
              isLoading={usersLoading}
              page={page}
              totalPages={usersData?.meta?.totalPages}
              total={usersData?.meta?.total}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* Roles Tab */}
        {tab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(roles ?? []).map((role: any) => (
              <div key={role.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{role.name}</h3>
                    {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                  </div>
                  <span className="badge bg-indigo-100 text-indigo-700 text-xs">{role._count?.users ?? 0} users</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(role.permissions ?? []).map((rp: any) => (
                    <span key={rp.permission.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                      {rp.permission.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Departments Tab */}
        {tab === 'departments' && (
          <div className="space-y-4">
            <button onClick={() => setShowDeptCreate(true)} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Department
            </button>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {(departments ?? []).map((d: any) => (
                <div key={d.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building className="w-4 h-4 text-indigo-700" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{d.name}</h3>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>{d._count?.users ?? 0} users</span>
                    <span>{d._count?.tickets ?? 0} tickets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Create User" size="md">
        <form onSubmit={handleSubmit(d => createUserMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input {...register('firstName', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input {...register('lastName', { required: true })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input {...register('email', { required: true })} type="email" className="input" />
          </div>
          <div>
            <label className="label">Password *</label>
            <input {...register('password', { required: true })} type="password" className="input" placeholder="Min 8 characters" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select {...register('roleId', { required: true })} className="input">
                <option value="">Select role...</option>
                {(roles ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select {...register('departmentId')} className="input">
                <option value="">None</option>
                {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} type="tel" className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={createUserMutation.isPending} className="btn-primary">
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => { setEditUser(null); reset(); }} title="Edit User" size="md">
        <form onSubmit={handleSubmit(d => updateUserMutation.mutate({ id: editUser?.id, data: d }))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input {...register('firstName')} className="input" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input {...register('lastName')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" />
          </div>
          <div>
            <label className="label">New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></label>
            <input {...register('password')} type="password" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select {...register('roleId')} className="input">
                {(roles ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select {...register('departmentId')} className="input">
                <option value="">None</option>
                {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('isActive')} type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium text-slate-700">Active account</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={updateUserMutation.isPending} className="btn-primary">
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => { setEditUser(null); reset(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Create Department Modal */}
      <Modal isOpen={showDeptCreate} onClose={() => { setShowDeptCreate(false); resetDept(); }} title="Add Department">
        <form onSubmit={submitDept(d => createDeptMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Department Name *</label>
            <input {...regDept('name', { required: true })} className="input" placeholder="e.g. Engineering" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createDeptMutation.isPending} className="btn-primary">Create</button>
            <button type="button" onClick={() => { setShowDeptCreate(false); resetDept(); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
