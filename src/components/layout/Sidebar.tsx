import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/workspace", icon: "dashboard", label: "Dashboard" },
  { href: "/workspace?tab=Timetable", icon: "calendar_month", label: "Timetable" },
  { href: "/workspace?tab=Courses", icon: "menu_book", label: "Courses" },
  { href: "/workspace?tab=Settings", icon: "settings", label: "Settings" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[var(--line)] bg-[var(--surface-1)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 hidden lg:flex", // Hide by default on mobile unless isOpen
        isOpen && "flex translate-x-0",
        !isOpen && "max-lg:-translate-x-full"
      )}
    >
      <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--line)] shrink-0">
        <Link href="/" className="flex items-center gap-3 group px-2">
          <div className="w-8 h-8 rounded-lg bg-[linear-gradient(45deg,#d4af37,#f3e5ab)] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            <span className="material-symbols-outlined font-bold text-[#111] text-lg">calendar_month</span>
          </div>
          <span className="font-bold tracking-tight text-[var(--text)] text-lg">Timetable</span>
        </Link>
        <button className="lg:hidden text-[var(--muted)] hover:text-white" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5">
        <div className="px-3 mb-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
          Workspace
        </div>
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => onClose()}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-all hover:bg-[var(--surface-2)] hover:text-[var(--gold-soft)] group"
          >
            <span className="material-symbols-outlined text-lg opacity-70 group-hover:opacity-100">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-1)]">
        <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--surface-2)] transition-colors cursor-pointer border border-transparent hover:border-[var(--line)]">
          <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--surface-2)] flex items-center justify-center border border-[var(--line)] text-[var(--text)]">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-[var(--text)] truncate">My Account</span>
            <span className="text-xs text-[var(--gold-soft)] truncate">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
