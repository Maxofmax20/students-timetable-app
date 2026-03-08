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
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
  };

  const colors = {
    success: 'bg-[var(--success-muted)] border-[var(--success)] text-[var(--success)]',
    error: 'bg-[var(--danger-muted)] border-[var(--danger)] text-[var(--danger)]',
    info: 'bg-[var(--info-muted)] border-[var(--info)] text-[var(--info)]',
    warning: 'bg-[var(--warning-muted)] border-[var(--warning)] text-[var(--warning)]'
  };

  return (
    <div 
      className={cn(
        "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border shadow-[var(--shadow-lg)] min-w-[300px] animate-[slideUp_0.3s_ease-out]",
        colors[toast.type]
      )}
    >
      <span className="material-symbols-outlined text-xl">{icons[toast.type]}</span>
      <span className="text-sm font-semibold flex-1">{toast.message}</span>
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
