import * as React from "react";
import { useState, useMemo } from "react";
import type { ActionLabel, RowAction, Row } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";

const commandPaletteActions = [
  { category: "New", label: "New Workspace", icon: "create_new_folder" },
  { category: "New", label: "New Group", icon: "group_add" },
  { category: "New", label: "New Course", icon: "add_box" },
  { category: "New", label: "New Instructor", icon: "person_add" },
  { category: "Save", label: "Save now", icon: "save" },
  { category: "Save", label: "Save as template", icon: "save_as" },
  { category: "Save", label: "Save local checkpoint", icon: "flag" },
  { category: "Export", label: "Export JSON", icon: "data_object" },
  { category: "Export", label: "Export CSV", icon: "table_chart" },
  { category: "Export", label: "Export ICS", icon: "calendar_month" },
  { category: "Export", label: "Export PDF", icon: "picture_as_pdf" },
  { category: "Undo", label: "Undo last change", icon: "undo" },
  { category: "Redo", label: "Redo last change", icon: "redo" },
  { category: "Conflicts", label: "Scan conflicts", icon: "warning" },
  { category: "Conflicts", label: "Clear conflict highlights", icon: "cleaning_services" }
];

export function ActionCenter({
  open,
  onClose,
  onRun
}: {
  open: boolean;
  active?: ActionLabel;
  onClose: () => void;
  onPick?: (action: ActionLabel) => void;
  onRun: (name: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredActions = useMemo(() => {
    if (!query) return commandPaletteActions;
    const lowerQuery = query.toLowerCase();
    return commandPaletteActions.filter(
      (a) => a.label.toLowerCase().includes(lowerQuery) || a.category.toLowerCase().includes(lowerQuery)
    );
  }, [query]);

  return (
    <Modal open={open} onClose={onClose} title="" className="w-[550px] !p-0 overflow-hidden bg-[var(--surface)] border border-[var(--line)]">
      <div className="flex items-center px-4 py-3 border-b border-[var(--line)] bg-[var(--surface-2)]">
        <span className="material-symbols-outlined text-[var(--muted)] text-xl mr-3">search</span>
        <input 
          autoFocus
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-[var(--muted)] text-base"
          placeholder="Type a command or search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--surface-3)] px-2 py-1 rounded border border-[var(--line)] font-mono">ESC</span>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {filteredActions.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)] text-sm">
            No commands found for &quot;{query}&quot;
          </div>
        ) : (
          filteredActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                onRun(action.label);
                setQuery("");
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--surface-2)] transition-colors group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] text-[var(--muted)] group-hover:text-[var(--gold)] group-hover:border-[var(--gold)]/30 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                </div>
                <span className="text-white font-medium text-sm group-hover:text-[var(--gold-soft)] transition-colors">{action.label}</span>
              </div>
              <span className="text-xs font-semibold text-[var(--muted)] bg-[var(--surface-3)] px-2 py-0.5 rounded border border-[var(--line)] opacity-0 group-hover:opacity-100 transition-opacity">ENTER</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

export function RowActionCenter({
  open,
  row,
  active,
  onClose,
  onPick,
  onEdit,
  onDuplicate,
  onDelete,
  onPlaceholder
}: {
  open: boolean;
  row: Row | null;
  active: RowAction;
  onClose: () => void;
  onPick: (action: RowAction) => void;
  onEdit: (row: Row) => void;
  onDuplicate: (row: Row) => void;
  onDelete: (row: Row) => void;
  onPlaceholder: (name: string) => void;
}) {
  if (!row) return null;

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Row Action Menu" 
      subtitle={`${row.course} • ${row.group}`}
      className="w-[400px]"
    >
      <Tabs value={active} onValueChange={(val) => onPick(val as RowAction)} variant="action">
        {(["Edit", "Duplicate", "Delete"] as RowAction[]).map((item) => (
          <Tab key={item} value={item}>
            <span className="material-symbols-outlined">
              {item === "Edit" ? "edit" : item === "Duplicate" ? "content_copy" : "delete"}
            </span>
            <span>{item}</span>
          </Tab>
        ))}
      </Tabs>

      <div className="mt-4">
        {active === "Edit" && (
          <div className="grid grid-cols-1 gap-2">
            <Button variant="secondary" onClick={() => { onEdit(row); onClose(); }}>Edit title</Button>
            <Button variant="secondary" onClick={() => { onPlaceholder(`Edit time of ${row.course}`); onClose(); }}>Edit time</Button>
            <Button variant="secondary" onClick={() => { onPlaceholder(`Edit room of ${row.course}`); onClose(); }}>Edit room</Button>
            <Button variant="primary" onClick={() => { onPlaceholder(`Open full edit for ${row.course}`); onClose(); }}>Open editor</Button>
          </div>
        )}

        {active === "Duplicate" && (
          <div className="grid grid-cols-1 gap-2">
            <Button variant="primary" onClick={() => { onDuplicate(row); onClose(); }}>Confirm duplicate</Button>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        )}

        {active === "Delete" && (
          <div className="grid grid-cols-1 gap-2">
            <Button variant="danger" onClick={() => { onDelete(row); onClose(); }}>Confirm delete</Button>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end pt-4 border-t border-[var(--line)]">
        <Button variant="ghost" onClick={onClose}>Close menu</Button>
      </div>
    </Modal>
  );
}
