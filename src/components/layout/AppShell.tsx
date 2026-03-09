'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";

export interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = React.useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[var(--bg)]">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <React.Suspense fallback={<div className="w-[240px] hidden lg:block bg-[var(--bg-raised)] border-r border-[var(--border)]" />}>
          <Sidebar 
            isOpen={sidebarOpen}
            userName={session?.user?.name || undefined} 
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleCollapse}
            onClose={() => setSidebarOpen(false)} 
          />
        </React.Suspense>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <React.Suspense fallback={<div className="h-14 border-b border-[var(--border)] bg-[var(--bg-raised)]/50" />}>
            <Header 
              title={title} 
              subtitle={subtitle}
              onMenuClick={() => setSidebarOpen(true)}
              actions={actions}
            />
          </React.Suspense>
          
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 animate-fade-in">
            <div className="mx-auto max-w-7xl h-full flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
