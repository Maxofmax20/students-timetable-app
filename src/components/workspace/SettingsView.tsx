'use client';

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { TimeMode, WeekStartOption, ConflictPolicy } from "@/types";

export interface SettingsViewProps {
  denseRows: boolean;
  onSetDenseRows: (val: boolean) => void;
  miniMap: boolean;
  onSetMiniMap: (val: boolean) => void;
  animationsEnabled: boolean;
  onSetAnimationsEnabled: (val: boolean) => void;
  fontScale: number;
  onSetFontScale: (val: number) => void;
  autoSave: boolean;
  onSetAutoSave: (val: boolean) => void;
  smartPlacement: boolean;
  onSetSmartPlacement: (val: boolean) => void;
  timeMode: TimeMode;
  onSetTimeMode: (val: TimeMode) => void;
  weekStart: WeekStartOption;
  onSetWeekStart: (val: WeekStartOption) => void;
  conflictPolicy: ConflictPolicy;
  onSetConflictPolicy: (val: ConflictPolicy) => void;
  snapMinutes: number;
  onSetSnapMinutes: (val: number) => void;
  onExportJson?: () => void;
  onCreateSnapshot?: () => void;
  onDeleteWorkspace?: () => void;
}

type TabId = "general" | "appearance" | "engine" | "data" | "about";

export function SettingsView(props: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const tabs = [
    { id: "general", label: "General", icon: "settings" },
    { id: "appearance", label: "Appearance", icon: "palette" },
    { id: "engine", label: "Timetable Engine", icon: "settings_suggest" },
    { id: "data", label: "Data & Security", icon: "database" },
    { id: "about", label: "About", icon: "info" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full animate-panel-pop p-1 md:p-6 lg:p-8">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 shrink-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-6 px-1 lg:hidden">Settings</h2>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left",
                activeTab === tab.id 
                  ? "bg-[var(--gold-muted)] text-[var(--gold)] shadow-sm border border-[var(--gold)]/10" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-white"
              )}
            >
              <span className="material-symbols-outlined text-xl">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-8 h-full overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-fade-in">
              <Header title="General Settings" desc="Basic workspace configuration and user preferences." />
              <div className="space-y-6">
                <OptionRow title="Auto Save" desc="Automatically persist changes to the database.">
                   <ToggleButton checked={props.autoSave} onChange={props.onSetAutoSave} />
                </OptionRow>
                <OptionRow title="Weekly Start" desc="Define the first day of the academic week.">
                   <select value={props.weekStart} onChange={(e) => props.onSetWeekStart(e.target.value as WeekStartOption)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--gold)]">
                     <option value="SATURDAY">Saturday</option>
                     <option value="SUNDAY">Sunday</option>
                     <option value="MONDAY">Monday</option>
                   </select>
                </OptionRow>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-fade-in">
              <Header title="Appearance" desc="Customize how your workspace looks and feels." />
              <div className="space-y-6">
                <OptionRow title="Dense Mode" desc="Fit more rows in the course table.">
                   <ToggleButton checked={props.denseRows} onChange={props.onSetDenseRows} />
                </OptionRow>
                <OptionRow title="UI Animations" desc="Enable smooth transitions and micro-interactions.">
                   <ToggleButton checked={props.animationsEnabled} onChange={props.onSetAnimationsEnabled} />
                </OptionRow>
                <div className="p-4 rounded-xl bg-[var(--bg-raised)]/50 border border-[var(--border-soft)] space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white tracking-tight">Base Font Scale</span>
                    <span className="text-xs text-[var(--text-secondary)]">Adjust UI density globally.</span>
                  </div>
                  <div className="flex items-center gap-6">
                     <input type="range" min="80" max="140" step="5" value={props.fontScale} onChange={(e) => props.onSetFontScale(Number(e.target.value))} className="flex-1 accent-[var(--gold)]" />
                     <span className="text-xs font-bold font-mono bg-[var(--surface-3)] px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--gold)]">{props.fontScale}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'engine' && (
            <div className="space-y-8 animate-fade-in">
              <Header title="Timetable Engine" desc="Advanced logic and conflict resolution settings." />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <SelectBlock 
                   label="Time Format" 
                   value={props.timeMode} 
                   options={[{v:'12h', l:'12-Hour'}, {v:'24h', l:'24-Hour'}]} 
                   onChange={(v) => props.onSetTimeMode(v as TimeMode)} 
                 />
                 <SelectBlock 
                   label="Conflict Policy" 
                   value={props.conflictPolicy} 
                   options={[{v:'WARNING', l:'Highlight'}, {v:'STRICT', l:'Prevent Saving'}, {v:'OFF', l:'Ignore'}]} 
                   onChange={(v) => props.onSetConflictPolicy(v as ConflictPolicy)} 
                 />
                 <SelectBlock 
                   label="Snap Interval" 
                   value={props.snapMinutes.toString()} 
                   options={[{v:'5', l:'5 Min'}, {v:'15', l:'15 Min'}, {v:'30', l:'30 Min'}, {v:'60', l:'1 Hour'}]} 
                   onChange={(v) => props.onSetSnapMinutes(Number(v))} 
                 />
                 <OptionRow title="Smart Placement" desc="Auto-pick best available slot.">
                    <ToggleButton checked={props.smartPlacement} onChange={props.onSetSmartPlacement} />
                 </OptionRow>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-8 animate-fade-in">
              <Header title="Data & Security" desc="Manage workspace exports and administrative actions." />
              <div className="p-6 rounded-2xl bg-[var(--danger)]/5 border border-[var(--danger)]/20 space-y-4">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--danger-muted)] flex items-center justify-center text-[var(--danger)] shrink-0">
                       <span className="material-symbols-outlined text-xl">warning</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Danger Zone</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Actions performed here are permanent and cannot be undone.</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="secondary" size="sm" className="bg-[var(--surface-3)]" onClick={props.onExportJson}>Export JSON</Button>
                    <Button variant="secondary" size="sm" className="bg-[var(--surface-3)]" onClick={props.onCreateSnapshot}>Create Snapshot</Button>
                    <Button variant="danger" size="sm" onClick={props.onDeleteWorkspace}>Delete Workspace</Button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-8 animate-fade-in h-full flex flex-col items-center justify-center text-center">
               <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] flex items-center justify-center shadow-[var(--shadow-glow)] mb-4">
                  <span className="material-symbols-outlined text-4xl text-[var(--gold-fg)]">calendar_month</span>
               </div>
               <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Timetable Workspace</h3>
                  <p className="text-[var(--text-secondary)] mt-1">Version 2.0.0 (Premium Rework)</p>
               </div>
               <div className="max-w-md bg-[var(--bg-raised)] p-6 rounded-2xl border border-[var(--border)] mt-4">
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    Designed for higher education institutions to manage complex scheduling logic with ease and precision. Built on Next.js and Tailwind CSS.
                  </p>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Header({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="border-b border-[var(--border-soft)] pb-6">
      <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
      <p className="text-[var(--text-secondary)] text-sm mt-1">{desc}</p>
    </div>
  );
}

function OptionRow({ title, desc, children }: { title: string, desc: string, children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-white tracking-tight">{title}</span>
        <span className="text-xs text-[var(--text-secondary)]">{desc}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SelectBlock({ label, value, options, onChange }: { label: string, value: string, options: {v:string, l:string}[], onChange: (v:string) => void }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-[var(--bg-raised)]/50 border border-[var(--border-soft)]">
      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="bg-transparent text-sm font-semibold text-white outline-none cursor-pointer hover:text-[var(--gold)] transition-colors"
      >
        {options.map(o => <option key={o.v} value={o.v} className="bg-[var(--surface)] text-white">{o.l}</option>)}
      </select>
    </div>
  );
}

function ToggleButton({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={cn(
        "w-11 h-6 rounded-full relative transition-all duration-300",
        checked ? "bg-[var(--gold)]" : "bg-[var(--surface-3)]"
      )}
    >
      <div className={cn(
        "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300",
        checked && "translate-x-5"
      )} />
    </button>
  );
}
