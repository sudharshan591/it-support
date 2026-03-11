'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Eye, EyeOff, Loader2, Ticket, Package, BookOpen, BarChart2, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const FEATURES = [
  {
    icon: Ticket,
    title: 'Ticket Management',
    desc: 'Raise, assign and resolve IT incidents, service requests and change requests with full audit trail.',
  },
  {
    icon: Package,
    title: 'Asset Tracking',
    desc: 'Track every laptop, server, phone and licence — who has it, where it is, and when warranty expires.',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    desc: 'Publish self-service guides so users solve common problems without raising a ticket.',
  },
  {
    icon: Clock,
    title: 'SLA Monitoring',
    desc: 'Set response & resolution deadlines by priority. Get alerted before a breach occurs.',
  },
  {
    icon: Zap,
    title: 'Automation Rules',
    desc: 'Auto-assign, escalate or notify based on ticket conditions — no repetitive manual work.',
  },
  {
    icon: BarChart2,
    title: 'Reports & Analytics',
    desc: 'Track ticket volume, agent performance, MTTR and asset utilisation with live charts.',
  },
];

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login  = useAuthStore(s => s.login);
  const [showPw, setShowPw] = useState(false);

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.email, data.password);
      login({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
      toast.success(`Welcome back, ${res.user.firstName}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Left panel: What you can do ── */}
        <div className="hidden lg:flex flex-col justify-between w-1/2 bg-indigo-600 p-10">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">ITSM Platform</p>
                <p className="text-indigo-200 text-xs">Enterprise IT Support & Service Desk</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Everything your IT team needs</h2>
            <p className="text-indigo-200 text-sm mb-8">
              One platform to manage tickets, assets, SLAs, automation and reporting — no spreadsheets required.
            </p>

            {/* Feature list */}
            <div className="space-y-5">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{title}</p>
                    <p className="text-indigo-200 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badge */}
          <div className="mt-8 flex items-center gap-2 text-indigo-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-indigo-300" />
            Role-based access · JWT auth · Full audit trail
          </div>
        </div>

        {/* ── Right panel: Login form ── */}
        <div className="flex-1 bg-white p-8 lg:p-10 flex flex-col justify-center">
          {/* Mobile logo (only shown on small screens) */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-2xl mb-3">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">ITSM Platform</h1>
            <p className="text-slate-400 text-sm">Enterprise IT Support & Service Desk</p>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 mb-1">Sign in to your account</h2>
          <p className="text-slate-500 text-sm mb-6">Enter your credentials below to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Demo Credentials</p>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Admin</span>
                <span className="font-mono text-slate-500">admin@itsm.local / Admin@1234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">IT Support</span>
                <span className="font-mono text-slate-500">itsupport@itsm.local / Itsupport@1234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">User</span>
                <span className="font-mono text-slate-500">sudharshan@itsm.local / Sudharshan@1234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
