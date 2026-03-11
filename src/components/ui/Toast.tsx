import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION_MS: Record<ToastType, number> = {
  success: 1650,
  info: 2200,
  warning: 3400,
  error: 4100
};

const EXIT_ANIMATION_MS = 180;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-4 sm:bottom-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: () => void }) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const autoDismissTimer = setTimeout(() => {
      setIsLeaving(true);
    }, TOAST_DURATION_MS[toast.type]);

    return () => clearTimeout(autoDismissTimer);
  }, [toast.type]);

  useEffect(() => {
    if (!isLeaving) return;

    const removeTimer = setTimeout(onRemove, EXIT_ANIMATION_MS);
    return () => clearTimeout(removeTimer);
  }, [isLeaving, onRemove]);

  const dismissNow = () => {
    setIsLeaving(true);
  };

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
  };

  const colors = {
    success: 'bg-[var(--success-muted)]/95 border-[var(--success)]/45 text-[var(--success)]',
    error: 'bg-[var(--danger-muted)]/95 border-[var(--danger)]/45 text-[var(--danger)]',
    info: 'bg-[var(--info-muted)]/95 border-[var(--info)]/45 text-[var(--info)]',
    warning: 'bg-[var(--warning-muted)]/95 border-[var(--warning)]/45 text-[var(--warning)]'
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] border shadow-[0_8px_20px_rgba(0,0,0,0.14)] backdrop-blur-[1px] w-full sm:w-auto sm:min-w-[260px] sm:max-w-[360px] max-w-[min(24rem,calc(100vw-1.5rem))] transition-[opacity,transform] duration-180 ease-out',
        isLeaving ? 'opacity-0 translate-y-1 scale-[0.985]' : 'opacity-100 translate-y-0 scale-100',
        colors[toast.type]
      )}
    >
      <span className="material-symbols-outlined text-[18px] leading-none mt-0.5">{icons[toast.type]}</span>
      <span className="text-[13px] sm:text-sm font-medium leading-[1.35] flex-1">{toast.message}</span>
      <button
        onClick={dismissNow}
        className="opacity-60 hover:opacity-100 transition-opacity leading-none"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
