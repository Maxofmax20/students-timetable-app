'use client';

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from 'next/link';
import { DropdownMenu, DropdownItem } from "@/components/ui/DropdownMenu";
import { Avatar } from "@/components/ui/Avatar";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, onMenuClick, actions }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");

  const buildBreadcrumbs = () => {
    const items = [{ label: "Workspace", href: "/workspace" }];
    
    if (pathname.includes('/groups')) items.push({ label: "Groups", href: "/workspace/groups" });
    else if (pathname.includes('/instructors')) items.push({ label: "Instructors", href: "/workspace/instructors" });
    else if (pathname.includes('/rooms')) items.push({ label: "Rooms", href: "/workspace/rooms" });
    else if (pathname.includes('/account')) items[0] = { label: "Account", href: "/account" };
    else if (currentTab) items.push({ label: currentTab, href: `/workspace?tab=${currentTab}` });
    else items.push({ label: "Dashboard", href: "/workspace?tab=Dashboard" });
    
    return items;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-raised)]/80 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="lg:hidden text-[var(--text-secondary)] hover:text-white transition-colors flex items-center justify-center rounded-lg p-2 hover:bg-[var(--surface-2)]"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        
        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <span className="text-[var(--text-muted)] mx-0.5">/</span>}
              <Link 
                href={crumb.href}
                className={cn(
                  "hover:text-[var(--gold)] transition-colors",
                  idx === breadcrumbs.length - 1 ? "text-[var(--gold)]" : "text-[var(--text-muted)]"
                )}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-sm ml-4">
          <SearchInput placeholder="Search everything..." />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
        
        {session?.user && (
           <DropdownMenu
             trigger={
                <button className="flex items-center group gap-2.5 pl-3 pr-1 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border-soft)] hover:border-[var(--text-muted)] transition-all">
                   <div className="flex flex-col items-end hidden sm:flex">
                     <span className="text-xs font-bold text-white leading-none">{session.user.name}</span>
                     <span className="text-[10px] text-[var(--text-muted)] font-medium">Free Plan</span>
                   </div>
                   <Avatar name={session.user.name || 'User'} size="sm" className="border border-[var(--border)]" />
                   <span className="material-symbols-outlined text-[var(--text-muted)] text-lg mr-1 group-hover:text-white transition-colors">expand_more</span>
                </button>
             }
             align="right"
           >
             <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--bg-raised)]/50">
                <p className="text-sm font-bold text-white">{session.user.name}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate max-w-[180px]">{session.user.email}</p>
             </div>
             <div className="p-1">
               <Link href="/account">
                 <DropdownItem icon="person" onClick={() => {}}>Profile Settings</DropdownItem>
               </Link>
               <Link href="/workspace?tab=Settings">
                 <DropdownItem icon="settings_suggest" onClick={() => {}}>Preferences</DropdownItem>
               </Link>
               <div className="h-px bg-[var(--border-soft)] my-1 mx-1"></div>
               <DropdownItem icon="logout" danger onClick={() => signOut({ callbackUrl: '/auth' })}>Sign out</DropdownItem>
             </div>
           </DropdownMenu>
        )}
      </div>
    </header>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
