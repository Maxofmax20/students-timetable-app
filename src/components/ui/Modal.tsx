import * as React from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, subtitle, children, actions, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="w-settings-overlay" onClick={onClose}>
      <div className={cn("w-settings-panel action-center", className)} onClick={(e) => e.stopPropagation()}>
        <div className="w-settings-head">
          <h3>{title}</h3>
          <button className="w-icon-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {subtitle && <p className="w-settings-sub">{subtitle}</p>}
        
        <div className="w-action-content" style={{ marginTop: '1rem', minHeight: 'auto' }}>
          {children}
        </div>
        
        {actions && (
          <div className="w-settings-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
