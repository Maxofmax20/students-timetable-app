import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ActionLabel, RowData } from '@/types';
import type { ScheduleItem } from '@/lib/schedule';

export type DashboardStatItem = {
  label: string;
  value: number;
  icon: string;
  tone: 'neutral' | 'warning';
};

export type DashboardLinkItem = {
  label: string;
  href: string;
};

export interface DashboardViewModel {
  now: { day: string; minute: number };
  overviewStats: DashboardStatItem[];
  todaySessions: ScheduleItem[];
  nextSession: ScheduleItem | null;
  quality: {
    conflicts: number;
    missingRoomCount: number;
    missingInstructorCount: number;
    missingGroupCount: number;
    unresolvedCount: number;
  };
  insights: {
    sessionsByType: [string, number][];
    roomsByBuilding: { label: string; value: number }[];
    groupsByRoot: { label: string; value: number }[];
    deliverySplit: { physical: number; online: number; hybrid: number };
    busiestDay: [string, number] | null;
    busiestRoom: [string, number] | null;
    busiestInstructor: [string, number] | null;
    mostActiveGroup: [string, number] | null;
  };
  quickLinks: DashboardLinkItem[];
}

export interface DashboardViewProps {
  model?: DashboardViewModel;
  rows?: RowData[];
  conflictsCount?: number;
  groupsCount?: number;
  instructorsCount?: number;
  roomsCount?: number;
  onAction: (actionName: ActionLabel) => void;
  onSelectSession?: (item: ScheduleItem) => void;
  onPreviewSelect?: (row: RowData) => void;
  isLoading?: boolean;
}

function minutesToTimeLabel(total: number) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${hour}:${`${minute}`.padStart(2, '0')}`;
}

export function DashboardView({ model, rows, conflictsCount, groupsCount, instructorsCount, roomsCount, onAction, onSelectSession, onPreviewSelect, isLoading }: DashboardViewProps) {
  const fallbackModel: DashboardViewModel = {
    now: { day: 'Sat', minute: 0 },
    overviewStats: [
      { label: 'Total Courses', value: rows?.length || 0, icon: 'menu_book', tone: 'neutral' },
      { label: 'Total Sessions', value: rows?.length || 0, icon: 'calendar_view_week', tone: 'neutral' },
      { label: 'Groups', value: groupsCount || 0, icon: 'groups', tone: 'neutral' },
      { label: 'Rooms', value: roomsCount || 0, icon: 'meeting_room', tone: 'neutral' },
      { label: 'Instructors', value: instructorsCount || 0, icon: 'school', tone: 'neutral' }
    ],
    todaySessions: [],
    nextSession: null,
    quality: {
      conflicts: conflictsCount || 0,
      missingRoomCount: 0,
      missingInstructorCount: 0,
      missingGroupCount: 0,
      unresolvedCount: conflictsCount || 0
    },
    insights: {
      sessionsByType: [],
      roomsByBuilding: [],
      groupsByRoot: [],
      deliverySplit: { physical: 0, online: 0, hybrid: 0 },
      busiestDay: null,
      busiestRoom: null,
      busiestInstructor: null,
      mostActiveGroup: null
    },
    quickLinks: []
  };

  const effectiveModel = model || fallbackModel;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 pb-16">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const inProgressNow = effectiveModel.todaySessions.find((session) => session.startMinute <= effectiveModel.now.minute && effectiveModel.now.minute < session.endMinute) || null;

  return (
    <div className="animate-panel-pop flex flex-col gap-6 pb-16">
      <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-4 shadow-[var(--shadow-sm)] md:p-5">
        <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Workspace overview</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {effectiveModel.overviewStats.map((stat) => (
            <article key={stat.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">{stat.label}</p>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-secondary)]">{stat.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-black tracking-tight text-white">{stat.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Today</p>
              <h3 className="text-lg font-black tracking-tight text-white">Sessions ({effectiveModel.now.day})</h3>
            </div>
            {inProgressNow ? <span className="rounded-full border border-[var(--success)]/30 bg-[var(--success-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--success)]">In progress now</span> : null}
          </div>
          {effectiveModel.todaySessions.length ? (
            <div className="space-y-2">
              {effectiveModel.todaySessions.slice(0, 6).map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    if (onSelectSession) {
                      onSelectSession(session);
                      return;
                    }
                    if (onPreviewSelect && rows?.length) {
                      const previewRow = rows.find((row) => row.day === session.day && row.course === session.course);
                      if (previewRow) onPreviewSelect(previewRow);
                    }
                  }}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-[1px] hover:border-[var(--text-muted)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]"
                >
                  <p className="truncate text-sm font-black text-white">{session.course}</p>
                  <p className="text-xs font-medium text-[var(--text-secondary)]">{session.timeLabel} • {session.room}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm text-[var(--text-secondary)]">No sessions scheduled today.</p>
          )}
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Upcoming</p>
          <h3 className="text-lg font-black tracking-tight text-white">Next session</h3>
          {effectiveModel.nextSession ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-base font-black text-white">{effectiveModel.nextSession.course}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{effectiveModel.nextSession.day} • {effectiveModel.nextSession.timeLabel}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{effectiveModel.nextSession.group} • {effectiveModel.nextSession.instructor} • {effectiveModel.nextSession.room}</p>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)] p-4 text-sm text-[var(--text-secondary)]">No upcoming sessions found.</p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { label: 'Now', value: minutesToTimeLabel(effectiveModel.now.minute) },
              { label: 'Day', value: effectiveModel.now.day },
              { label: 'Unresolved', value: String(effectiveModel.quality.unresolvedCount) }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-2">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">{item.label}</p>
                <p className="mt-1 font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Health</p>
          <h3 className="text-lg font-black tracking-tight text-white">Quality checks</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Conflicts', effectiveModel.quality.conflicts],
              ['Missing rooms', effectiveModel.quality.missingRoomCount],
              ['Missing instructors', effectiveModel.quality.missingInstructorCount],
              ['Missing groups', effectiveModel.quality.missingGroupCount]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
                <p className={cn('mt-1 text-2xl font-black', Number(value) > 0 ? 'text-[var(--danger)]' : 'text-white')}>{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            {effectiveModel.quality.unresolvedCount > 0
              ? `${effectiveModel.quality.unresolvedCount} unresolved issue${effectiveModel.quality.unresolvedCount === 1 ? '' : 's'} need attention.`
              : 'No unresolved issues detected in current timetable data.'}
          </p>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Action center</p>
          <h3 className="text-lg font-black tracking-tight text-white">Quick actions & links</h3>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { id: 'New', label: 'New course' },
              { id: 'Conflicts', label: 'Scan conflicts' },
              { id: 'Export', label: 'Export calendar' }
            ].map((action) => (
              <Button
                key={action.id}
                variant="secondary"
                size="sm"
                onClick={() => onAction(action.id as ActionLabel)}
                className="justify-center"
              >
                {action.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {effectiveModel.quickLinks.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Insights</p>
        <h3 className="text-lg font-black tracking-tight text-white">Schedule distribution</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Insight label="Busiest day" value={effectiveModel.insights.busiestDay ? `${effectiveModel.insights.busiestDay[0]} (${effectiveModel.insights.busiestDay[1]})` : '—'} />
          <Insight label="Busiest room" value={effectiveModel.insights.busiestRoom ? `${effectiveModel.insights.busiestRoom[0]} (${effectiveModel.insights.busiestRoom[1]})` : '—'} />
          <Insight label="Busiest instructor" value={effectiveModel.insights.busiestInstructor ? `${effectiveModel.insights.busiestInstructor[0]} (${effectiveModel.insights.busiestInstructor[1]})` : '—'} />
          <Insight label="Most active group" value={effectiveModel.insights.mostActiveGroup ? `${effectiveModel.insights.mostActiveGroup[0]} (${effectiveModel.insights.mostActiveGroup[1]})` : '—'} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ListInsight title="Sessions by type" items={effectiveModel.insights.sessionsByType.map(([label, value]) => ({ label, value }))} />
          <ListInsight title="Rooms by building" items={effectiveModel.insights.roomsByBuilding} />
          <ListInsight title="Groups by root" items={effectiveModel.insights.groupsByRoot} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Chip label="Physical" value={effectiveModel.insights.deliverySplit.physical} />
          <Chip label="Online" value={effectiveModel.insights.deliverySplit.online} />
          <Chip label="Hybrid" value={effectiveModel.insights.deliverySplit.hybrid} />
        </div>
      </section>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ListInsight({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-3">
      <p className="text-sm font-black text-white">{title}</p>
      <div className="mt-2 space-y-1.5">
        {(items.length ? items.slice(0, 5) : [{ label: 'No data', value: 0 }]).map((item) => (
          <div key={`${title}-${item.label}`} className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="truncate">{item.label}</span>
            <span className="font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">{label}: {value}</span>;
}
