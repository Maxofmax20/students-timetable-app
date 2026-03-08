import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full bg-[#111] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          title={title} 
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          actions={actions}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
