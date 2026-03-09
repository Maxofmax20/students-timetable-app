'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { AppSelect } from '@/components/ui/AppSelect';
import type { TimeMode, WeekStartOption, ConflictPolicy } from '@/types';

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

type TabId = 'general' | 'appearance' | 'engine' | 'data' | 'about';

const tabs = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'engine', label: 'Timetable Engine', icon: 'settings_suggest' },
  { id: 'data', label: 'Data & Security', icon: 'database' },
  { id: 'about', label: 'About', icon: 'info' }
] as const;

export function SettingsView(props: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="flex h-full flex-col gap-6 p-1 md:p-6 lg:flex-row lg:gap-8 lg:p-8 animate-panel-pop">
      <aside className="w-full shrink-0 lg:w-72">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-2))] p-3 shadow-[var(--shadow-sm)]">
          <div className="mb-3 px-2 pt-1">
            <h2 className="text-2xl font-black tracking-tight text-white">Configuration</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Tune how the workspace behaves, looks, and saves data.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  'flex min-w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all lg:w-full',
                  activeTab === tab.id
                    ? 'border border-[var(--gold)]/30 bg-[var(--gold-muted)] text-[var(--gold)] shadow-[var(--shadow-sm)]'
                    : 'border border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-white'
                )}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex min-h-[540px] flex-1 flex-col overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="h-full overflow-y-auto p-5 md:p-8">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader title="General settings" desc="Set the core workspace defaults your team depends on every day." />
              <div className="space-y-4">
                <OptionCard title="Auto save" desc="Automatically persist changes to the database as you work.">
                  <ToggleButton checked={props.autoSave} onChange={props.onSetAutoSave} />
                </OptionCard>
                <OptionCard title="Week start" desc="Define the first day of the academic week for timetable rendering.">
                  <div className="w-full md:w-[280px]">
                    <AppSelect
                      value={props.weekStart}
                      onChange={(value) => props.onSetWeekStart(value as WeekStartOption)}
                      options={[
                        { value: 'SATURDAY', label: 'Saturday', description: 'Common for current academic setup' },
                        { value: 'SUNDAY', label: 'Sunday' },
                        { value: 'MONDAY', label: 'Monday' }
                      ]}
                    />
                  </div>
                </OptionCard>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader title="Appearance" desc="Improve readability, density, and motion for the whole workspace." />
              <div className="space-y-4">
                <OptionCard title="Dense mode" desc="Fit more rows into course tables without changing the data model.">
                  <ToggleButton checked={props.denseRows} onChange={props.onSetDenseRows} />
                </OptionCard>
                <OptionCard title="UI animations" desc="Keep the workspace feeling alive with subtle transitions and micro-interactions.">
                  <ToggleButton checked={props.animationsEnabled} onChange={props.onSetAnimationsEnabled} />
                </OptionCard>
                <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-sm)]">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold tracking-tight text-white">Base font scale</span>
                    <span className="text-xs text-[var(--text-secondary)]">Adjust the global UI density without affecting saved data.</span>
                  </div>
                  <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center">
                    <input
                      type="range"
                      min="80"
                      max="140"
                      step="5"
                      value={props.fontScale}
                      onChange={(event) => props.onSetFontScale(Number(event.target.value))}
                      className="flex-1 accent-[var(--gold)]"
                    />
                    <span className="inline-flex w-fit items-center rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-bold text-[var(--gold)]">
                      {props.fontScale}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'engine' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader title="Timetable engine" desc="Control scheduling format, snapping, and conflict handling." />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectCard
                  label="Time format"
                  value={props.timeMode}
                  options={[
                    { value: '12h', label: '12-hour', description: 'AM / PM display' },
                    { value: '24h', label: '24-hour', description: 'Military / compact format' }
                  ]}
                  onChange={(value) => props.onSetTimeMode(value as TimeMode)}
                />
                <SelectCard
                  label="Conflict policy"
                  value={props.conflictPolicy}
                  options={[
                    { value: 'WARNING', label: 'Highlight', description: 'Show conflicts visually' },
                    { value: 'STRICT', label: 'Prevent saving', description: 'Block invalid placements' },
                    { value: 'OFF', label: 'Ignore', description: 'Do not warn about overlaps' }
                  ]}
                  onChange={(value) => props.onSetConflictPolicy(value as ConflictPolicy)}
                />
                <SelectCard
                  label="Snap interval"
                  value={props.snapMinutes.toString()}
                  options={[
                    { value: '5', label: '5 minutes' },
                    { value: '15', label: '15 minutes' },
                    { value: '30', label: '30 minutes' },
                    { value: '60', label: '1 hour' }
                  ]}
                  onChange={(value) => props.onSetSnapMinutes(Number(value))}
                />
                <OptionCard title="Smart placement" desc="Automatically favor better open slots when arranging sessions.">
                  <ToggleButton checked={props.smartPlacement} onChange={props.onSetSmartPlacement} />
                </OptionCard>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader title="Data & security" desc="Export your workspace or take administrative actions when needed." />
              <div className="rounded-[28px] border border-[var(--danger)]/25 bg-[linear-gradient(135deg,rgba(225,70,70,0.06),var(--surface))] p-5 shadow-[var(--shadow-sm)] md:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--danger-muted)] text-[var(--danger)]">
                    <span className="material-symbols-outlined text-xl">warning</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold tracking-tight text-white">Danger zone</h4>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Use these actions carefully. They affect stored data, exports, or destructive cleanup.</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="secondary" size="sm" onClick={props.onExportJson}>Export JSON</Button>
                  <Button variant="secondary" size="sm" onClick={props.onCreateSnapshot}>Save Local Checkpoint</Button>
                  <Button variant="danger" size="sm" onClick={props.onDeleteWorkspace}>Delete Workspace</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="flex h-full flex-col items-center justify-center space-y-6 text-center animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] shadow-[var(--shadow-glow)]">
                <span className="material-symbols-outlined text-4xl text-[var(--gold-fg)]">calendar_month</span>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white">Timetable Workspace</h3>
                <p className="mt-1 text-[var(--text-secondary)]">Version 2.0.0 — premium scheduling workspace</p>
              </div>
              <div className="max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--bg-raised)] p-6">
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  Designed for higher education scheduling with a stronger control system, cleaner hierarchy, and a more modern workspace feel.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-b border-[var(--border-soft)] pb-5">
      <h3 className="text-2xl font-black tracking-tight text-white">{title}</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{desc}</p>
    </div>
  );
}

function OptionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-sm)] md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold tracking-tight text-white">{title}</span>
        <span className="text-sm text-[var(--text-secondary)]">{desc}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SelectCard({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-3">
        <div className="text-sm font-bold tracking-tight text-white">{label}</div>
        <div className="mt-1 text-sm text-[var(--text-secondary)]">Choose the default behavior for this workspace.</div>
      </div>
      <AppSelect value={value} onChange={onChange} options={options} />
    </div>
  );
}

function ToggleButton({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 rounded-full border transition-all duration-300',
        checked ? 'border-[var(--gold)] bg-[var(--gold)] shadow-[var(--shadow-glow)]' : 'border-[var(--border)] bg-[var(--surface-3)]'
      )}
      aria-pressed={checked}
    >
      <div
        className={cn(
          'absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform duration-300',
          checked && 'translate-x-5'
        )}
      />
    </button>
  );
}
