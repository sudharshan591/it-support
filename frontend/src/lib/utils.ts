import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export const priorityConfig = {
  LOW:      { label: 'Low',      color: 'bg-slate-100 text-slate-700',  dot: 'bg-slate-400' },
  MEDIUM:   { label: 'Medium',   color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  HIGH:     { label: 'High',     color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
};

export const statusConfig = {
  OPEN:        { label: 'Open',        color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-indigo-100 text-indigo-700' },
  PENDING:     { label: 'Pending',     color: 'bg-amber-100 text-amber-700' },
  RESOLVED:    { label: 'Resolved',    color: 'bg-green-100 text-green-700' },
  CLOSED:      { label: 'Closed',      color: 'bg-slate-100 text-slate-600' },
};

export const typeConfig = {
  INCIDENT: { label: 'Incident', color: 'bg-red-100 text-red-700' },
  REQUEST:  { label: 'Request',  color: 'bg-blue-100 text-blue-700' },
  CHANGE:   { label: 'Change',   color: 'bg-purple-100 text-purple-700' },
};

export const assetStatusConfig = {
  AVAILABLE: { label: 'Available', color: 'bg-green-100 text-green-700' },
  ASSIGNED:  { label: 'Assigned',  color: 'bg-blue-100 text-blue-700' },
  IN_REPAIR: { label: 'In Repair', color: 'bg-amber-100 text-amber-700' },
  RETIRED:   { label: 'Retired',   color: 'bg-slate-100 text-slate-600' },
  DISPOSED:  { label: 'Disposed',  color: 'bg-red-100 text-red-700' },
};

export function getSlaTimeRemaining(dueAt: string | undefined): {
  text: string;
  isOverdue: boolean;
  isWarning: boolean;
} {
  if (!dueAt) return { text: 'No SLA', isOverdue: false, isWarning: false };
  const due = new Date(dueAt);
  const now = new Date();
  const diff = due.getTime() - now.getTime();

  if (diff < 0) {
    return { text: `Overdue by ${formatDistanceToNow(due)}`, isOverdue: true, isWarning: false };
  }

  const hours = diff / 3600000;
  if (hours < 2) {
    return { text: `${Math.round(hours * 60)} min remaining`, isOverdue: false, isWarning: true };
  }

  return { text: `${Math.round(hours)}h remaining`, isOverdue: false, isWarning: false };
}
