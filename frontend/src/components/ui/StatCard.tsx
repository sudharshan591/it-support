import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label:  string;
  value:  string | number;
  icon:   LucideIcon;
  color?: string;
  change?: number;
  changeLabel?: string;
}

export function StatCard({ label, value, icon: Icon, color = 'indigo', change, changeLabel }: StatCardProps) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    amber:  'bg-amber-50 text-amber-700',
    blue:   'bg-blue-50 text-blue-700',
    slate:  'bg-slate-50 text-slate-700',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              }
              <span className={cn('text-xs font-medium', change >= 0 ? 'text-green-600' : 'text-red-500')}>
                {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-slate-400">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colorMap[color] || colorMap.indigo)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
