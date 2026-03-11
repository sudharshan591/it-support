'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthMap = { sm: 'w-96', md: 'w-[520px]', lg: 'w-[680px]' };

export function Drawer({ isOpen, onClose, title, children, width = 'md' }: DrawerProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity backdrop-blur-sm',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300',
          widthMap[width],
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
}
