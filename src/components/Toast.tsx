import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/* ── 全域 toast 狀態（singleton，不需要 context）── */
let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;
let _counter = 0;

export function toast(message: string, type: ToastType = 'success') {
  if (!_setToasts) return;
  const id = ++_counter;
  _setToasts(prev => [...prev, { id, message, type }]);
  setTimeout(() => {
    _setToasts!(prev => prev.filter(t => t.id !== id));
  }, 3500);
}

/* ── Toast 容器（掛在 App 根層）── */
export function ToastContainer() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  _setToasts = setToasts;

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium pointer-events-auto',
            'animate-in slide-in-from-right-4 duration-300',
            t.type === 'success' && 'bg-white border-green-100 text-[#3D2B1F]',
            t.type === 'error'   && 'bg-white border-red-100 text-[#3D2B1F]',
            t.type === 'info'    && 'bg-white border-orange-100 text-[#3D2B1F]',
          )}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
          {t.type === 'error'   && <XCircle      className="w-4 h-4 text-red-500 shrink-0" />}
          {t.type === 'info'    && <Info         className="w-4 h-4 text-[#F5A623] shrink-0" />}
          <span className="flex-1 max-w-[240px]">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
