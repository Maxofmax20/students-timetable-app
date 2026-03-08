import * as React from "react";
import type { ActionLabel, RowAction, Row } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";

const actions: Array<{ icon: string; label: ActionLabel }> = [
  { icon: "add", label: "New" },
  { icon: "save", label: "Save" },
  { icon: "undo", label: "Undo" },
  { icon: "redo", label: "Redo" },
  { icon: "share", label: "Share" },
  { icon: "download", label: "Export" },
  { icon: "visibility", label: "Preview" },
  { icon: "warning", label: "Conflicts" }
];

export function ActionCenter({
  open,
  active,
  onClose,
  onPick,
  onRun
}: {
  open: boolean;
  active: ActionLabel;
  onClose: () => void;
  onPick: (action: ActionLabel) => void;
  onRun: (name: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Action Center" className="w-[500px]">
      <Tabs value={active} onValueChange={(val) => onPick(val as ActionLabel)} variant="action">
        {actions.map((item) => (
          <Tab key={item.label} value={item.label}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </Tab>
        ))}
      </Tabs>

      <div className="mt-4">
        {active === "New" && (
          <div className="w-action-grid">
            <Button variant="primary" onClick={() => onRun("New Workspace")}>New Workspace</Button>
            <Button variant="default" onClick={() => onRun("New Group")}>New Group</Button>
            <Button variant="default" onClick={() => onRun("New Course")}>New Course</Button>
            <Button variant="default" onClick={() => onRun("New Instructor")}>New Instructor</Button>
          </div>
        )}

        {active === "Save" && (
          <div className="w-action-grid">
            <Button variant="primary" onClick={() => onRun("Save now")}>Save now</Button>
            <Button variant="default" onClick={() => onRun("Save as template")}>Save as template</Button>
            <Button variant="default" onClick={() => onRun("Create checkpoint")}>Create checkpoint</Button>
            <Button variant="default" onClick={() => onRun("Auto-save settings")}>Auto-save settings</Button>
          </div>
        )}

        {active === "Share" && (
          <div className="w-action-grid">
            <Button variant="primary" onClick={() => onRun("Create public link")}>Create public link</Button>
            <Button variant="default" onClick={() => onRun("Invite teacher")}>Invite teacher</Button>
            <Button variant="default" onClick={() => onRun("Invite student")}>Invite student</Button>
            <Button variant="default" onClick={() => onRun("Manage permissions")}>Manage permissions</Button>
          </div>
        )}

        {active === "Export" && (
          <div className="w-action-grid">
            <Button variant="default" onClick={() => onRun("Export JSON")}>Export JSON</Button>
            <Button variant="default" onClick={() => onRun("Export CSV")}>Export CSV</Button>
            <Button variant="default" onClick={() => onRun("Export ICS")}>Export ICS</Button>
            <Button variant="default" onClick={() => onRun("Export PDF")}>Export PDF</Button>
          </div>
        )}

        {active === "Preview" && (
          <div className="w-action-grid">
            <Button variant="default" onClick={() => onRun("Desktop preview")}>Desktop preview</Button>
            <Button variant="default" onClick={() => onRun("Tablet preview")}>Tablet preview</Button>
            <Button variant="default" onClick={() => onRun("Mobile preview")}>Mobile preview</Button>
            <Button variant="default" onClick={() => onRun("Public view preview")}>Public view preview</Button>
          </div>
        )}

        {active === "Undo" && (
          <div className="w-action-grid">
            <Button variant="primary" onClick={() => onRun("Undo last change")}>Undo last change</Button>
            <Button variant="default" onClick={() => onRun("Show checkpoints")}>Show checkpoints</Button>
          </div>
        )}

        {active === "Redo" && (
          <div className="w-action-grid">
            <Button variant="primary" onClick={() => onRun("Redo last change")}>Redo last change</Button>
            <Button variant="default" onClick={() => onRun("Show checkpoints")}>Show checkpoints</Button>
          </div>
        )}

        {active === "Conflicts" && (
          <div className="w-action-grid">
            <Button variant="primary" onClick={() => onRun("Scan conflicts")}>Scan conflicts</Button>
            <Button variant="default" onClick={() => onRun("Clear conflict highlights")}>Clear highlights</Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[var(--line)]">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={() => { onRun(`${active} settings applied`); onClose(); }}>Apply</Button>
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
          <div className="w-action-grid">
            <Button variant="default" onClick={() => onEdit(row)}>Edit title</Button>
            <Button variant="default" onClick={() => onPlaceholder(`Edit time of ${row.course}`)}>Edit time</Button>
            <Button variant="default" onClick={() => onPlaceholder(`Edit room of ${row.course}`)}>Edit room</Button>
            <Button variant="primary" onClick={() => onPlaceholder(`Open full edit for ${row.course}`)}>Open editor</Button>
          </div>
        )}

        {active === "Duplicate" && (
          <div className="w-action-grid">
            <Button variant="primary" onClick={() => { onDuplicate(row); onClose(); }}>Confirm duplicate</Button>
            <Button variant="default" onClick={onClose}>Cancel</Button>
          </div>
        )}

        {active === "Delete" && (
          <div className="w-action-grid">
            <Button variant="danger" onClick={() => { onDelete(row); onClose(); }}>Confirm delete</Button>
            <Button variant="default" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end pt-4 border-t border-[var(--line)]">
        <Button variant="ghost" onClick={onClose}>Close menu</Button>
      </div>
    </Modal>
  );
}
