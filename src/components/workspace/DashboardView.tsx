import type { ActionLabel, RowData } from "@/types";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export interface DashboardViewProps {
  rows: RowData[];
  conflictsCount: number;
  groupsCount: number;
  instructorsCount: number;
  onAction: (actionName: ActionLabel) => void;
  isLoading?: boolean;
}

export function DashboardView({ 
  rows, 
  conflictsCount, 
  groupsCount, 
  instructorsCount,
  onAction,
  isLoading
}: DashboardViewProps) {
  // Get upcoming classes (mocking "today" logic for preview)
  const upcomingToday = rows.slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 pb-20 animate-panel-pop">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
             <div key={i} className="p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex justify-between items-start mb-4">
                   <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-16" />
                   </div>
                   <Skeleton className="w-10 h-10 rounded-xl" />
                </div>
             </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
             <Skeleton className="h-4 w-32 ml-1" />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                   <div key={i} className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-2xl" />
                      <div className="flex flex-col gap-2">
                         <Skeleton className="h-4 w-28" />
                         <Skeleton className="h-3 w-40" />
                      </div>
                   </div>
                ))}
             </div>
          </div>
          <div className="flex flex-col gap-4">
             <Skeleton className="h-4 w-36 ml-1" />
             <div className="flex-1 p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
                {[...Array(3)].map((_, i) => (
                   <div key={i} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)] flex items-center gap-3">
                      <Skeleton className="w-1.5 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                         <Skeleton className="h-4 w-3/4" />
                         <Skeleton className="h-3 w-1/2" />
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8 pb-20 animate-panel-pop">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold text-white tracking-tight">Overview</h2>
        <p className="text-[var(--text-secondary)]">Manage your workspace and monitor university scheduling health.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: rows.length, icon: 'calendar_view_week', color: 'var(--gold)' },
          { label: 'Active Conflicts', value: conflictsCount, icon: 'warning', color: 'var(--danger)', isAlert: conflictsCount > 0 },
          { label: 'Student Groups', value: groupsCount, icon: 'group_work', color: 'var(--success)' },
          { label: 'Instructors', value: instructorsCount, icon: 'school', color: 'var(--info)' },
        ].map((stat) => (
          <div 
            key={stat.label}
            className={cn(
              "p-6 rounded-[var(--radius-lg)] border bg-[var(--surface)] transition-all duration-300 relative overflow-hidden group hover:shadow-[var(--shadow-md)]",
              stat.isAlert ? "border-[var(--danger)]/30 shadow-[0_0_20px_rgba(229,72,77,0.05)]" : "border-[var(--border)] hover:border-[var(--text-muted)]"
            )}
          >
            {stat.isAlert && <div className="absolute inset-0 bg-[var(--danger)]/5 animate-pulse"></div>}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{stat.label}</span>
                <span className={cn(
                  "text-4xl font-bold tracking-tight",
                  stat.isAlert ? "text-[var(--danger)]" : "text-white"
                )}>
                  {stat.value}
                </span>
              </div>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] group-hover:scale-110 transition-transform"
                style={{ color: stat.color }}
              >
                <span className="material-symbols-outlined text-xl">{stat.icon}</span>
              </div>
            </div>
            {stat.isAlert && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--danger)] relative z-10">
                <span className="material-symbols-outlined text-sm">error</span>
                Requires immediate resolution
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em] ml-1">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[
               { id: 'New', label: 'New Course', desc: 'Create a new schedule entry', icon: 'add_box', color: 'var(--gold)' },
               { id: 'Conflicts', label: 'Scan Integrity', desc: 'Verify scheduling logic', icon: 'rule', color: 'var(--danger)' },
               { id: 'Export', label: 'Export Calendar', desc: 'Download an ICS calendar file', icon: 'cloud_download', color: 'var(--info)' },
             ].map((action) => (
               <button 
                 key={action.id}
                 onClick={() => onAction(action.id as ActionLabel)} 
                 className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--text-muted)] text-left flex items-center gap-4 transition-all group shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
               >
                 <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center border border-[var(--border)] group-hover:scale-110 transition-transform" style={{ color: action.color }}>
                   <span className="material-symbols-outlined text-2xl">{action.icon}</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="font-bold text-white text-base">{action.label}</span>
                   <span className="text-xs text-[var(--text-secondary)]">{action.desc}</span>
                 </div>
               </button>
             ))}
          </div>
        </div>

        {/* Status/Activity */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em] ml-1">Schedule Preview</h3>
          <div className="flex-1 p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-4">
            {upcomingToday.length > 0 ? (
              <div className="space-y-3">
                {upcomingToday.map((row, i) => (
                  <div key={i} className="group p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-soft)] hover:border-[var(--text-muted)] transition-all flex items-center gap-3">
                    <div className="w-1.5 h-10 rounded-full bg-[var(--gold)]"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{row.course}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{row.time}</p>
                    </div>
                    <span className="material-symbols-outlined text-[var(--text-muted)] group-hover:text-white transition-colors">chevron_right</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--bg-raised)]/50 rounded-xl border border-[var(--border)] border-dashed">
                 <span className="material-symbols-outlined text-4xl text-[var(--text-muted)] mb-3">event_busy</span>
                 <p className="text-[var(--text-secondary)] text-sm font-medium">No classes today</p>
                 <p className="text-[var(--text-muted)] text-[10px] mt-1 text-center">Your schedule is clear</p>
              </div>
            )}
            
            <div className="mt-auto pt-4 border-t border-[var(--border-soft)]">
              <HealthItem label="Workspace Sync" status="Operational" color="var(--success)" progress={100} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function HealthItem({ label, status, color, progress }: { label: string, status: string, color: string, progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        <span style={{ color }}>{status}</span>
      </div>
      <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000" 
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
