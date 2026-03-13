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

  const handleSignOut = async () => {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(() => null);

    await signOut({ callbackUrl: '/auth' });
  };
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");

  const buildBreadcrumbs = () => {
    if (pathname === '/account' || pathname.startsWith('/account/')) {
      return [{ label: 'Account', href: '/account' }];
    }

    const items = [{ label: 'Workspace', href: '/workspace/dashboard' }];

    if (pathname.includes('/dashboard')) items.push({ label: 'Dashboard', href: '/workspace/dashboard' });
    else if (pathname.includes('/courses')) items.push({ label: 'Courses', href: '/workspace/courses' });
    else if (pathname.includes('/timetable')) items.push({ label: 'Timetable', href: '/workspace/timetable' });
    else if (pathname.includes('/groups')) items.push({ label: 'Groups', href: '/workspace/groups' });
    else if (pathname.includes('/instructors')) items.push({ label: 'Instructors', href: '/workspace/instructors' });
    else if (pathname.includes('/rooms')) items.push({ label: 'Rooms', href: '/workspace/rooms' });
    else if (currentTab) items.push({ label: currentTab, href: `/workspace?tab=${currentTab}` });
    else items.push({ label: 'Dashboard', href: '/workspace/dashboard' });

    return items;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between border-b-2 border-[var(--border)] bg-[var(--bg-raised)] px-4 shadow-[var(--shadow-md)] md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[var(--text-secondary)] transition-colors hover:text-white lg:hidden"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        
        {/* Breadcrumbs */}
        <nav className="hidden items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] md:flex">
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
        <div className="ml-4 hidden max-w-sm flex-1 lg:flex">
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
                <button className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-3.5 pr-2 py-2 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--text-muted)] hover:shadow-[var(--shadow-md)]">
                   <div className="hidden sm:flex flex-col items-end mr-0.5">
                     <span className="text-xs font-bold text-white leading-none">{session.user.name}</span>
                     <span className="text-[10px] text-[var(--text-muted)] font-medium">Free Plan</span>
                   </div>
                   <Avatar name={session.user.name || 'User'} size="sm" className="border border-[var(--border)]" />
                   <span className="material-symbols-outlined text-[var(--text-muted)] text-base group-hover:text-white transition-colors">expand_more</span>
                </button>
             }
             align="right"
           >
             <div className="border-b border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3">
                <p className="text-sm font-bold text-white">{session.user.name}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate max-w-[180px]">{session.user.email}</p>
             </div>
             <div className="p-1">
               <Link href="/account">
                 <DropdownItem icon="person" onClick={() => {}}>Profile Settings</DropdownItem>
               </Link>
               <Link href="/account">
                 <DropdownItem icon="settings_suggest" onClick={() => {}}>Preferences</DropdownItem>
               </Link>
               <div className="h-px bg-[var(--border-soft)] my-1 mx-1"></div>
               <DropdownItem icon="logout" danger onClick={() => { void handleSignOut(); }}>Sign out</DropdownItem>
             </div>
           </DropdownMenu>
        )}
      </div>
    </header>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
