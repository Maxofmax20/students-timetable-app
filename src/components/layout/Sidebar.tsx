'use client';

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  userName?: string;
}

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/workspace?tab=Dashboard", icon: "dashboard", label: "Dashboard" },
      { href: "/workspace?tab=Timetable", icon: "calendar_view_week", label: "Timetable" },
    ]
  },
  {
    label: "Resources",
    items: [
      { href: "/workspace?tab=Courses", icon: "menu_book", label: "Courses" },
      { href: "/workspace/groups", icon: "group_work", label: "Groups" },
      { href: "/workspace/instructors", icon: "school", label: "Instructors" },
      { href: "/workspace/rooms", icon: "meeting_room", label: "Rooms" },
    ]
  },
  {
    label: "Settings",
    items: [
      { href: "/workspace?tab=Settings", icon: "settings_suggest", label: "Configuration" },
    ]
  }
];

export function Sidebar({ isOpen, isCollapsed, onToggleCollapse, onClose, userName }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");

  const isActive = (href: string) => {
    if (href.includes("?tab=")) {
      const tab = href.split("?tab=")[1];
      return pathname === "/workspace" && currentTab === tab;
    }
    return pathname === href;
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-[60] flex h-dvh flex-col border-r border-[var(--border)] bg-[var(--bg-raised)] shadow-2xl transition-transform duration-200 ease-out lg:static lg:h-auto lg:translate-x-0 lg:shadow-none",
        isCollapsed ? "lg:w-[68px]" : "lg:w-[240px]",
        isOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full lg:translate-x-0"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--border-soft)] shrink-0">
        <Link href="/" className="flex items-center gap-3 group px-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] flex items-center justify-center shadow-[var(--shadow-glow)] group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined font-bold text-[var(--gold-fg)] text-lg">calendar_month</span>
          </div>
          {!isCollapsed && (
            <span className="font-bold tracking-tight text-white text-lg animate-fade-in">Timetable</span>
          )}
        </Link>
        <button className="lg:hidden text-[var(--text-secondary)] hover:text-white" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 scrollbar-hide">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] animate-fade-in">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href) || (!currentTab && item.label === "Dashboard" && pathname === "/workspace");
              
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group border border-transparent whitespace-nowrap",
                    active 
                      ? "bg-[var(--gold-muted)] text-[var(--gold)] border-[var(--gold)]/10" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-white"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={cn(
                    "material-symbols-outlined text-lg transition-colors",
                    active ? "text-[var(--gold)]" : "text-[var(--text-muted)] group-hover:text-white"
                  )}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="animate-fade-in">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-soft)] space-y-4">
        <button 
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-white transition-all group"
        >
          <span className={cn(
            "material-symbols-outlined text-lg transition-transform duration-300",
            isCollapsed ? "rotate-180" : ""
          )}>
            first_page
          </span>
          {!isCollapsed && <span className="animate-fade-in">Collapse</span>}
        </button>

        <Link href="/account" className="flex items-center gap-3 rounded-xl p-2 bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] transition-all cursor-pointer border border-[var(--border-soft)] hover:border-[var(--text-muted)] group">
          <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--bg)] flex items-center justify-center border border-[var(--border)] text-[var(--gold)] group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="text-xs font-bold text-white truncate">{userName || "Account"}</span>
              <span className="text-[10px] text-[var(--text-muted)] truncate">View Profile</span>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
