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
      "flex flex-col items-center justify-center p-8 md:p-16 text-center rounded-[32px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] w-full min-h-[400px] animate-fade-in relative overflow-hidden",
      className
    )}>
      {/* Decorative background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--gold)]/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative w-24 h-24 rounded-[2.5rem] bg-[var(--surface-3)] flex items-center justify-center mb-8 border border-[var(--border)] shadow-[var(--shadow-md)]">
        <span className="material-symbols-outlined text-[48px] text-[var(--gold)] opacity-90 drop-shadow-md">{icon}</span>
      </div>
      <h3 className="relative text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">{title}</h3>
      <p className="relative text-[var(--text-secondary)] font-medium max-w-md mb-8 leading-relaxed">{description}</p>
      {action && <div className="relative animate-slide-up z-10">{action}</div>}
    </div>
  );
}
