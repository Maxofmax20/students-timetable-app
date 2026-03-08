'use client';

import * as React from "react";
import { useState } from "react";
import type { Row, RowAction, TimeMode } from "@/types";
import { formatTimeRange, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface DataTableProps {
  rows: Row[];
  dense?: boolean;
  timeMode: TimeMode;
  onRowAction: (action: RowAction, row: Row) => void;
}

export function DataTable({ rows, dense = false, timeMode, onRowAction }: DataTableProps) {
  const [sortCol, setSortCol] = useState<keyof Row | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (col: keyof Row) => {
     if (sortCol === col) {
        setSortAsc(!sortAsc);
     } else {
        setSortCol(col);
        setSortAsc(true);
     }
  };

  const sortedRows = [...rows].sort((a, b) => {
     if (!sortCol) return 0;
     const valA = a[sortCol] || "";
     const valB = b[sortCol] || "";
     if (valA < valB) return sortAsc ? -1 : 1;
     if (valA > valB) return sortAsc ? 1 : -1;
     return 0;
  });

  const renderSortIcon = (col: keyof Row) => {
     if (sortCol !== col) return <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-40 transition-opacity">arrow_downward</span>;
     return <span className={`material-symbols-outlined text-sm text-[var(--gold)] transition-transform ${sortAsc ? 'rotate-180' : ''}`}>arrow_downward</span>;
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <table className="w-full border-collapse text-left min-w-[800px]">
        <thead>
          <tr className="bg-[var(--bg-raised)]/50 text-[var(--text-secondary)] border-b border-[var(--border)]">
            {[
              { key: 'course', label: 'Course' },
              { key: 'group', label: 'Group' },
              { key: 'instructor', label: 'Instructor' },
              { key: 'room', label: 'Room' },
              { key: 'day', label: 'Day' },
              { key: 'time', label: 'Time' },
              { key: 'status', label: 'Status' },
            ].map(col => (
              <th 
                key={col.key}
                className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] cursor-pointer hover:text-white transition-colors group select-none" 
                onClick={() => handleSort(col.key as keyof Row)}
              >
                 <div className="flex items-center gap-2">
                   {col.label} 
                   {renderSortIcon(col.key as keyof Row)}
                 </div>
              </th>
            ))}
            <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-[0.15em] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-soft)]">
          {sortedRows.map((row) => (
            <tr key={row.id} className="group/row hover:bg-[var(--surface-2)]/30 transition-all">
              <td className={cn("px-6 font-semibold text-white", dense ? "py-2 text-xs" : "py-4 text-sm")}>
                {row.course}
              </td>
              <td className={cn("px-6 text-[var(--text-secondary)]", dense ? "py-2 text-xs" : "py-4 text-sm")}>
                {row.group}
              </td>
              <td className={cn("px-6 text-[var(--text-secondary)]", dense ? "py-2 text-xs" : "py-4 text-sm")}>
                {row.instructor}
              </td>
              <td className={cn("px-6 text-[var(--text-secondary)]", dense ? "py-2 text-xs" : "py-4 text-sm")}>
                <span className="bg-[var(--surface-3)] px-2 py-0.5 rounded text-[10px] font-bold border border-[var(--border)]">{row.room}</span>
              </td>
              <td className={cn("px-6 font-bold text-[var(--gold)]", dense ? "py-2 text-xs" : "py-4 text-sm")}>
                {row.day}
              </td>
              <td className={cn("px-6 text-[var(--text-secondary)] font-mono", dense ? "py-2 text-[11px]" : "py-4 text-xs")}>
                {formatTimeRange(row.time, timeMode)}
              </td>
              <td className={cn("px-6", dense ? "py-2" : "py-4")}>
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  row.status === 'Active' && "bg-[var(--success-muted)] text-[var(--success)] border-[var(--success)]/20",
                  row.status === 'Conflict' && "bg-[var(--danger-muted)] text-[var(--danger)] border-[var(--danger)]/20",
                  row.status === 'Draft' && "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]"
                )}>
                  <div className={cn(
                    "w-1 h-1 rounded-full",
                    row.status === 'Active' && "bg-[var(--success)]",
                    row.status === 'Conflict' && "bg-[var(--danger)]",
                    row.status === 'Draft' && "bg-[var(--text-secondary)]"
                  )} />
                  {row.status}
                </div>
              </td>
              <td className={cn("px-6 text-right", dense ? "py-2" : "py-4")}>
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all translate-x-1 group-hover/row:translate-x-0">
                  <Button variant="ghost" size="sm" onClick={() => onRowAction("Edit", row)} className="h-8 w-8 p-0 rounded-lg">
                    <span className="material-symbols-outlined text-[18px]">edit_square</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onRowAction("Duplicate", row)} className="h-8 w-8 p-0 rounded-lg">
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </Button>
                  <Button variant="ghost-danger" size="sm" onClick={() => onRowAction("Delete", row)} className="h-8 w-8 p-0 rounded-lg">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
