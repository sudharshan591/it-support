'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = accessToken || localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
    }
  }, [accessToken, router]);

  // Render nothing until mounted to avoid SSR/client mismatch
  if (!mounted) {
    return null;
  }

  const token = accessToken || localStorage.getItem('accessToken');
  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
