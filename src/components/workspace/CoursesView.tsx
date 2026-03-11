'use client';

import React, { useState, type ReactNode } from 'react';
import { DataTable } from "@/components/workspace/DataTable";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Row, TimeMode, ActionLabel, RowAction } from "@/types";

import { Skeleton } from '@/components/ui/Skeleton';

export interface CoursesViewProps {
  rows: Row[];
  denseRows: boolean;
  timeMode: TimeMode;
  onAction: (action: ActionLabel) => void;
  onRowAction: (action: RowAction, row: Row) => void;
  isLoading?: boolean;
  extraActions?: ReactNode;
  canCreate?: boolean;
}

export function CoursesView({ rows, denseRows, timeMode, onAction, onRowAction, isLoading, extraActions, canCreate = true }: CoursesViewProps) {
  const [search, setSearch] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 h-full animate-panel-pop">
        <div className="flex justify-between items-end mb-4">
           <div className="space-y-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-72" />
           </div>
           <div className="flex gap-4">
              <Skeleton className="h-11 w-64 rounded-xl" />
              <Skeleton className="h-11 w-32 rounded-xl" />
           </div>
        </div>
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-hidden">
           <div className="h-12 border-b border-[var(--border)] bg-[var(--surface-2)]" />
           <div className="p-4 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                   <Skeleton className="h-12 flex-1 rounded-lg" />
                   <Skeleton className="h-12 w-24 rounded-lg" />
                   <Skeleton className="h-12 w-32 rounded-lg" />
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  const filteredRows = rows.filter(row => 
    row.course.toLowerCase().includes(search.toLowerCase()) ||
    row.group.toLowerCase().includes(search.toLowerCase()) ||
    row.instructor.toLowerCase().includes(search.toLowerCase()) ||
    row.room.toLowerCase().includes(search.toLowerCase())
  );

  return (
     <div className="flex flex-col gap-4 md:gap-6 p-1 md:p-6 flex-1 min-h-0 animate-panel-pop">
        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
           <div className="flex flex-col gap-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Courses</h2>
              <p className="text-[var(--text-secondary)] text-sm">Manage and organize all university courses.</p>
           </div>
           
           <div className="flex w-full flex-col sm:w-auto sm:flex-row items-stretch sm:items-center gap-3">
              <SearchInput 
                placeholder="Search courses, groups, instructors..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                containerClassName="w-full sm:w-auto sm:min-w-[300px]"
              />
              {extraActions}
              {canCreate ? (
                <Button onClick={() => onAction('New')} variant="primary" className="gap-2 w-full sm:w-auto justify-center">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Add Course
                </Button>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">Viewer mode</div>
              )}
           </div>
        </div>

        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] overflow-auto shadow-[var(--shadow-lg)] flex flex-col">
           {filteredRows.length > 0 ? (
             <DataTable 
               rows={filteredRows} 
               dense={denseRows} 
               timeMode={timeMode} 
               onRowAction={onRowAction} 
             />
           ) : (
             <EmptyState 
               icon="search_off"
               title="No courses found"
               description={search ? `No results for "${search}". Try a different term or clear the search.` : "You haven't added any courses to this workspace yet."}
               action={search ? (
                 <Button variant="ghost" onClick={() => setSearch('')}>Clear Search</Button>
               ) : canCreate ? (
                 <Button variant="primary" onClick={() => onAction('New')}>Create Your First Course</Button>
               ) : undefined}
             />
           )}
        </div>
     </div>
  );
}
