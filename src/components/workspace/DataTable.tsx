import * as React from "react";
import type { Row, RowAction, TimeMode } from "@/types";
import { formatTimeRange } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface DataTableProps {
  rows: Row[];
  dense?: boolean;
  timeMode: TimeMode;
  onRowAction: (action: RowAction, row: Row) => void;
}

export function DataTable({ rows, dense = false, timeMode, onRowAction }: DataTableProps) {
  return (
    <div className={`w-table-wrap ${dense ? "dense" : ""}`}>
      <table>
        <thead>
          <tr>
            <th>Course</th>
            <th>Group</th>
            <th>Instructor</th>
            <th>Room</th>
            <th>Day</th>
            <th>Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", opacity: 0.8, padding: "1rem" }}>
                No courses yet. Use <strong>New → New Course</strong> to create your first real row.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${row.id}-${row.course}`}>
                <td>{row.course}</td>
                <td>{row.group}</td>
                <td>{row.instructor}</td>
                <td>{row.room}</td>
                <td>{row.day}</td>
                <td>{formatTimeRange(row.time, timeMode)}</td>
                <td>
                  <Badge status={row.status} />
                </td>
                <td>
                  <div className="w-row-actions">
                    <Button variant="ghost" size="icon" onClick={() => onRowAction("Edit", row)}>
                      <span className="material-symbols-outlined">edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onRowAction("Duplicate", row)}>
                      <span className="material-symbols-outlined">content_copy</span>
                    </Button>
                    <Button variant="danger" size="icon" onClick={() => onRowAction("Delete", row)} className="text-[var(--danger)] bg-transparent hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]">
                      <span className="material-symbols-outlined">delete</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
