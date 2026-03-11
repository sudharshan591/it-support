'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router    = useRouter();
  const [search, setSearch] = useState('');

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn:  notificationsApi.unreadCount,
    refetchInterval: 30000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/tickets?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-10">
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      {/* Global Search */}
      <form onSubmit={handleSearch} className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
        />
      </form>

      {/* Notifications */}
      <Link href="/notifications" className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
        <Bell className="w-5 h-5" />
        {(unread?.count ?? 0) > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unread.count > 9 ? '9+' : unread.count}
          </span>
        )}
      </Link>

      {/* Create Ticket CTA */}
      <Link href="/tickets/create" className="btn-primary flex items-center gap-1.5">
        <Plus className="w-4 h-4" />
        New Ticket
      </Link>
    </header>
  );
}
