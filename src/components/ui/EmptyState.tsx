import React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)]/50 w-full min-h-[400px] animate-fade-in",
      className
    )}>
      <div className="w-20 h-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-6 border border-[var(--border)] shadow-[var(--shadow-sm)]">
        <span className="material-symbols-outlined text-[40px] text-[var(--gold)] opacity-80">{icon}</span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-[var(--text-secondary)] max-w-sm mb-8 leading-relaxed">{description}</p>
      {action && <div className="animate-slide-up">{action}</div>}
    </div>
  );
}
