'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Row, RowAction } from '@/types';
import { Button } from '@/components/ui/Button';

import { Skeleton } from '@/components/ui/Skeleton';

interface TimetableViewProps {
  rows: Row[];
  timeMode: string;
  weekStart: string;
  onRowAction?: (action: RowAction, row: Row) => void;
  isLoading?: boolean;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

export function TimetableView({ rows, timeMode, weekStart, onRowAction, isLoading }: TimetableViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const orderedDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const startIdx = orderedDays.findIndex(d => d.toUpperCase() === weekStart) || 0;
  const displayDays = [...orderedDays.slice(startIdx), ...orderedDays.slice(0, startIdx)];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg)] animate-panel-pop rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex-1 p-6">
           <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
              <div className="flex border-b border-[var(--border)] h-12">
                 <div className="w-20 border-r border-[var(--border)] bg-[var(--surface-2)]"></div>
                 {displayDays.map(d => <div key={d} className="flex-1 border-r border-[var(--border-soft)] last:border-0 p-3 flex justify-center"><Skeleton className="h-4 w-12" /></div>)}
              </div>
              <div className="flex">
                 <div className="w-20 border-r border-[var(--border)] space-y-12 p-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-3 w-10" />)}
                 </div>
                 <div className="flex-1 grid grid-cols-6 divide-x divide-[var(--border-soft)]">
                    {[...Array(6)].map((_, i) => (
                       <div key={i} className="p-4 space-y-8">
                          {i % 2 === 0 && <Skeleton className="h-32 w-full rounded-xl" />}
                          <div className="h-20" />
                          {i % 3 === 0 && <Skeleton className="h-24 w-full rounded-xl" />}
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // Helper to parse "09:30-10:45"
  const parseTime = (timeStr: string) => {
    if (!timeStr || timeStr === '--') return null;
    const [start, end] = timeStr.split('-');
    if (!start || !end) return null;
    
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    
    return {
      startHour: h1 + m1 / 60,
      endHour: h2 + m2 / 60,
      duration: (h2 + m2 / 60) - (h1 + m1 / 60)
    };
  };

  const getCourseColor = (groupId: string | null | undefined) => {
    const variants = [
      'bg-blue-500/10 border-blue-500/30 text-blue-400',
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      'bg-rose-500/10 border-rose-500/30 text-rose-400',
      'bg-amber-500/10 border-amber-500/30 text-amber-400',
      'bg-purple-500/10 border-purple-500/30 text-purple-400',
    ];
    if (!groupId) return variants[0];
    const sum = groupId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return variants[sum % variants.length];
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] animate-panel-pop rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border)] shadow-[var(--shadow-md)]">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between p-6 gap-4 border-b border-[var(--border-soft)] bg-[var(--bg-raised)]/50">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Timetable Grid</h2>
          <p className="text-[var(--text-secondary)] text-sm">Visualize and resolve scheduling overlaps.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--border)] shadow-inner">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                viewMode === 'grid' ? "bg-[var(--surface-3)] text-white shadow-md border border-[var(--border)]" : "text-[var(--text-muted)] hover:text-white"
              )}
            >
              Grid
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                viewMode === 'list' ? "bg-[var(--surface-3)] text-white shadow-md border border-[var(--border)]" : "text-[var(--text-muted)] hover:text-white"
              )}
            >
              List
            </button>
          </div>
          
          <Button variant="secondary" size="sm" className="gap-2">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Export ICS
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative scrollbar-hide">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] min-w-[1000px] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col relative">
          
          {/* Header Row */}
          <div className="flex border-b border-[var(--border)]">
            <div className="w-20 border-r border-[var(--border)] shrink-0 bg-[var(--surface-2)] z-10 sticky left-0 shadow-[4px_0_8px_rgba(0,0,0,0.1)]"></div>
            {displayDays.map(day => (
              <div key={day} className="flex-1 py-4 text-center font-bold text-[var(--gold)] text-xs uppercase tracking-[0.15em] border-r border-[var(--border-soft)] last:border-0 min-w-[150px] bg-[var(--surface-2)]/50">
                {day}
              </div>
            ))}
          </div>

          {/* Time Rows Container */}
          <div className="flex flex-col relative">
            
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              {HOURS.map(h => (
                <div key={h} className="h-20 border-b border-[var(--border-soft)]/50 w-full last:border-0" />
              ))}
            </div>

            <div className="flex relative">
              {/* Time Labels Column */}
              <div className="w-20 flex flex-col border-r border-[var(--border)] shrink-0 bg-[var(--surface)]/95 backdrop-blur-sm z-10 sticky left-0 text-center shadow-[4px_0_8px_rgba(0,0,0,0.05)]">
                {HOURS.map(h => (
                  <div key={h} className="h-20 flex items-start justify-center pr-2 pt-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider w-full">
                    {timeMode === '12h' ? `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}` : `${h}:00`}
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              {displayDays.map(day => (
                <div key={day} className="flex-1 border-r border-[var(--border-soft)] last:border-0 relative min-w-[150px] hover:bg-white/[0.01] transition-colors">
                  
                  {/* Course Cards for this day */}
                  {rows.filter(r => r.day.substring(0,3).toLowerCase() === day.toLowerCase() && r.time !== '--').map(course => {
                     const timeInfo = parseTime(course.time);
                     if (!timeInfo) return null;
                     
                     const topOffset = (timeInfo.startHour - 8) * 5; // 1 hr = 5rem (80px)
                     const heightPx = timeInfo.duration * 5;
                     const isConflict = course.status === 'Conflict';
                     
                     return (
                       <div 
                         key={course.id} 
                         className={cn(
                           "absolute left-1.5 right-1.5 rounded-xl border p-3 shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all z-20 group",
                           getCourseColor(course.groupId),
                           isConflict && "border-[var(--danger)]/50 bg-[var(--danger)]/15 ring-2 ring-[var(--danger)]/10"
                         )}
                         style={{ 
                           top: `${topOffset}rem`, 
                           height: `${heightPx}rem`,
                         }}
                         onClick={() => onRowAction?.('Edit', course)}
                       >
                         <div className="flex flex-col h-full justify-between">
                            <div className="space-y-1">
                               <div className="font-bold text-xs truncate text-white leading-tight flex items-center justify-between">
                                 {course.course}
                                 {isConflict && <span className="material-symbols-outlined text-[var(--danger)] text-sm ml-1">warning</span>}
                               </div>
                               <div className="text-[10px] opacity-70 font-semibold uppercase tracking-tighter truncate">
                                 {course.group}
                               </div>
                            </div>
                            <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                               <span className="text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{course.room}</span>
                               <span className="material-symbols-outlined text-sm">edit_square</span>
                            </div>
                         </div>
                       </div>
                     );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
