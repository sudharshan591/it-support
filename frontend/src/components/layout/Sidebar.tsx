'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Ticket, Package, BookOpen, Clock, Zap,
  BarChart2, Users, Shield, Bell, HelpCircle, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/tickets',        label: 'Tickets',          icon: Ticket },
  { href: '/assets',         label: 'Assets',           icon: Package },
  { href: '/knowledge-base', label: 'Knowledge Base',   icon: BookOpen },
  { href: '/sla',            label: 'SLA Monitoring',   icon: Clock },
  { href: '/automation',     label: 'Automation',       icon: Zap,     roles: ['Admin', 'Manager'] },
  { href: '/reports',        label: 'Reports',          icon: BarChart2, roles: ['Admin', 'Manager'] },
];

const adminItems = [
  { href: '/admin',          label: 'Admin Panel',      icon: Settings, roles: ['Admin'] },
  { href: '/audit-logs',     label: 'Audit Logs',       icon: Shield,   roles: ['Admin', 'Manager'] },
];

const selfServiceItems = [
  { href: '/notifications',  label: 'Notifications',    icon: Bell },
  { href: '/self-service',   label: 'Self-Service',     icon: HelpCircle },
];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout, isAdmin, isAgent } = useAuthStore();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') ?? undefined;
      await authApi.logout(refreshToken);
    } catch {}
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const canSee = (roles?: string[]) => {
    if (!roles) return true;
    return roles.includes(user?.roleName || '');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">ITSM Platform</p>
            <p className="text-xs text-slate-500">Enterprise Support</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Main</p>
        {navItems.filter(i => canSee(i.roles)).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'sidebar-link',
              pathname.startsWith(item.href) ? 'sidebar-link-active' : 'sidebar-link-inactive',
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        ))}

        {selfServiceItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'sidebar-link',
              pathname.startsWith(item.href) ? 'sidebar-link-active' : 'sidebar-link-inactive',
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        ))}

        {adminItems.some(i => canSee(i.roles)) && (
          <>
            <p className="px-3 mt-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</p>
            {adminItems.filter(i => canSee(i.roles)).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'sidebar-link',
                  pathname.startsWith(item.href) ? 'sidebar-link-active' : 'sidebar-link-inactive',
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-200 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.roleName}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
