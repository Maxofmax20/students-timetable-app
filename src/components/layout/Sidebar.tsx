'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type SidebarProps = {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  userName?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/workspace/dashboard', icon: 'dashboard' },
  { label: 'Courses', href: '/workspace/courses', icon: 'book_2' },
  { label: 'Timetable', href: '/workspace/timetable', icon: 'calendar_month' },
  { label: 'Groups', href: '/workspace/groups', icon: 'groups' },
  { label: 'Instructors', href: '/workspace/instructors', icon: 'school' },
  { label: 'Rooms', href: '/workspace/rooms', icon: 'meeting_room' },
  { label: 'Account', href: '/account', icon: 'person' }
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-[60] flex h-dvh flex-col border-r border-[var(--border)] bg-[var(--bg-raised)] shadow-2xl transition-transform duration-200 ease-out lg:static lg:h-auto lg:translate-x-0 lg:shadow-none',
        isCollapsed ? 'lg:w-[76px]' : 'lg:w-[248px]',
        isOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 lg:px-5">
        <div className={cn('min-w-0', isCollapsed && 'lg:hidden')}>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Students Timetable</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">Scheduling workspace</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white lg:inline-flex"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">left_panel_open</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-white lg:hidden"
            aria-label="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-[var(--gold)] text-[var(--gold-fg)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-white',
                  isCollapsed && 'lg:justify-center lg:px-0'
                )}
              >
                <span className="material-symbols-outlined shrink-0 text-[20px]">{item.icon}</span>
                <span className={cn('truncate', isCollapsed && 'lg:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="space-y-4 border-t border-[var(--border-soft)] p-4">
        <button
          onClick={onToggleCollapse}
          className="group hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-2)] hover:text-white lg:flex"
        >
          <span
            className={cn(
              'material-symbols-outlined text-lg transition-transform duration-300',
              isCollapsed ? 'rotate-180' : ''
            )}
          >
            first_page
          </span>
          {!isCollapsed && <span className="animate-fade-in">Collapse</span>}
        </button>

        <Link
          href="/account"
          className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)]/50 p-2 transition-all hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--gold)] transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 animate-fade-in flex flex-col">
              <span className="truncate text-xs font-bold text-white">{userName || 'Account'}</span>
              <span className="truncate text-[10px] text-[var(--text-muted)]">View Profile</span>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
