'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { AppSelect } from '@/components/ui/AppSelect';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { redirectToAuthWithCallback } from '@/lib/auth-redirect';
import type { AcademicTermApiItem, UserPreferenceApiItem } from '@/types';

export const dynamic = 'force-dynamic';

const defaultPrefs: UserPreferenceApiItem = {
  id: '',
  theme: 'SYSTEM',
  timetableView: 'WEEK',
  dashboardLayout: 'OVERVIEW',
  weekStartsOn: 'SATURDAY',
  reduceMotion: false
};

export default function SettingsPage() {
  const { status } = useSession({ required: true, onUnauthenticated() { redirectToAuthWithCallback(); } });
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<UserPreferenceApiItem>(defaultPrefs);
  const [terms, setTerms] = useState<AcademicTermApiItem[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [termForm, setTermForm] = useState({ name: 'Spring 2025-2026', season: 'SPRING', academicYear: '2025-2026', isActive: true });

  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      setLoading(true);
      try {
        const [prefsResponse, termsResponse] = await Promise.all([
          fetch('/api/v1/preferences', { credentials: 'include' }),
          fetch('/api/v1/academic-terms', { credentials: 'include' })
        ]);
        const [prefsPayload, termsPayload] = await Promise.all([prefsResponse.json(), termsResponse.json()]);
        if (!prefsResponse.ok || !prefsPayload?.ok) throw new Error(prefsPayload?.message || 'Failed to load settings');
        setPrefs(prefsPayload.data?.item || defaultPrefs);
        setTerms(termsResponse.ok && termsPayload?.ok ? termsPayload.data?.items || [] : []);
        setWorkspaceId(termsPayload.data?.workspaceId || prefsPayload.data?.workspaceId || '');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [status, toast]);

  const save = async () => {
    const response = await fetch('/api/v1/preferences', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(prefs)
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to save preferences', 'error');
      return;
    }
    setPrefs(payload.data);
    const resolvedTheme = payload.data.theme === 'SYSTEM'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : payload.data.theme.toLowerCase();
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.reduceMotion = payload.data.reduceMotion ? 'true' : 'false';
    toast('Preferences saved');
  };

  const createTerm = async () => {
    const response = await fetch('/api/v1/academic-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...termForm,
        ...(workspaceId ? { workspaceId } : {})
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to create academic term', 'error');
      return;
    }
    setTerms((current) => [payload.data, ...current.filter((term) => term.id !== payload.data.id).map((term) => payload.data.isActive ? { ...term, isActive: false } : term)].sort((a, b) => Number(b.isActive) - Number(a.isActive)));
    toast('Academic term created');
  };

  const activateTerm = async (termId: string) => {
    if (!workspaceId) {
      toast('Workspace is still loading', 'error');
      return;
    }
    const response = await fetch(`/api/v1/academic-terms/${termId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspaceId, isActive: true })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to activate term', 'error');
      return;
    }
    setTerms((current) => current.map((term) => term.id === termId ? payload.data : { ...term, isActive: false }).sort((a, b) => Number(b.isActive) - Number(a.isActive)));
    toast('Academic term activated');
  };

  const deleteTerm = async (term: AcademicTermApiItem) => {
    if (!workspaceId) {
      toast('Workspace is still loading', 'error');
      return;
    }
    const hasLinkedWork = Boolean((term._count?.exams || 0) + (term._count?.assignments || 0));
    const confirmed = window.confirm(hasLinkedWork
      ? `Delete ${term.name}? This term already has linked exams or assignments.`
      : `Delete ${term.name}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/v1/academic-terms/${term.id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to delete term', 'error');
      return;
    }
    setTerms((current) => current.filter((item) => item.id !== term.id));
    toast('Academic term removed');
  };

  return (
    <AppShell title="Settings" subtitle="Personalize theme, dashboard density, timetable defaults, and motion preferences.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,560px)_1fr]">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] space-y-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Preferences</div>
            <h2 className="mt-2 text-xl font-black text-white">Your workspace defaults</h2>
          </div>
          <AppSelect label="Theme" value={prefs.theme} onChange={(value) => setPrefs((current) => ({ ...current, theme: value as UserPreferenceApiItem['theme'] }))} options={[{ value: 'SYSTEM', label: 'System' }, { value: 'LIGHT', label: 'Light' }, { value: 'DARK', label: 'Dark' }]} />
          <AppSelect label="Timetable default view" value={prefs.timetableView} onChange={(value) => setPrefs((current) => ({ ...current, timetableView: value as UserPreferenceApiItem['timetableView'] }))} options={[{ value: 'WEEK', label: 'Week grid' }, { value: 'DAY', label: 'Day view' }, { value: 'AGENDA', label: 'Agenda' }]} />
          <AppSelect label="Dashboard layout" value={prefs.dashboardLayout} onChange={(value) => setPrefs((current) => ({ ...current, dashboardLayout: value as UserPreferenceApiItem['dashboardLayout'] }))} options={[{ value: 'OVERVIEW', label: 'Overview' }, { value: 'FOCUS', label: 'Focus' }, { value: 'COMPACT', label: 'Compact' }]} />
          <AppSelect label="Week starts on" value={prefs.weekStartsOn} onChange={(value) => setPrefs((current) => ({ ...current, weekStartsOn: value as UserPreferenceApiItem['weekStartsOn'] }))} options={[{ value: 'SATURDAY', label: 'Saturday' }, { value: 'SUNDAY', label: 'Sunday' }, { value: 'MONDAY', label: 'Monday' }]} />
          <label className="flex-row items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3 text-sm font-medium text-white">
            Reduce motion
            <input type="checkbox" checked={prefs.reduceMotion} onChange={(event) => setPrefs((current) => ({ ...current, reduceMotion: event.target.checked }))} className="h-4 w-4" />
          </label>
          <Button variant="primary" onClick={() => void save()} disabled={loading}>Save preferences</Button>
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-lg)]">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Academic terms</div>
            <h2 className="mt-2 text-2xl font-black text-white">Anchor the semester</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input label="Term name" value={termForm.name} onChange={(event) => setTermForm((current) => ({ ...current, name: event.target.value }))} />
              <Input label="Academic year" value={termForm.academicYear} onChange={(event) => setTermForm((current) => ({ ...current, academicYear: event.target.value }))} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <AppSelect label="Season" value={termForm.season} onChange={(value) => setTermForm((current) => ({ ...current, season: value }))} options={[{ value: 'SPRING', label: 'Spring' }, { value: 'SUMMER', label: 'Summer' }, { value: 'FALL', label: 'Fall' }, { value: 'WINTER', label: 'Winter' }]} />
              <label className="flex-row items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-white md:mt-[28px]">
                Set active immediately
                <input type="checkbox" checked={termForm.isActive} onChange={(event) => setTermForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => void createTerm()}>Create term</Button>
            </div>
            <div className="mt-4 space-y-2">
              {terms.length ? terms.map((term) => (
                <div key={term.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{term.name}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">{term.season} • {term.academicYear}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
                        <span>{term._count?.exams || 0} exams</span>
                        <span>•</span>
                        <span>{term._count?.assignments || 0} tasks</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {term.isActive ? <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-3 py-1 text-[11px] font-black text-[var(--gold)]">Active</span> : <button onClick={() => void activateTerm(term.id)} className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 text-[11px] font-black text-white">Set active</button>}
                      <button onClick={() => void deleteTerm(term)} className="rounded-full border border-[var(--danger)]/30 bg-[var(--danger-muted)] px-3 py-1 text-[11px] font-black text-[var(--danger)]">Delete</button>
                    </div>
                  </div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">No academic terms yet. Create Spring 2025-2026 first, then start adding exams and tasks.</div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--bg-raised),var(--surface-2))] p-5 shadow-[var(--shadow-lg)]">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">V2 direction</div>
            <h2 className="mt-2 text-2xl font-black text-white">Student-first workspace defaults</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
              <p>Settings now anchor the new V2 planning model: dashboard behavior, timetable defaults, visual preferences, and term setup live in one place.</p>
              <p>Next passes can extend this with notification preferences, dashboard widgets, and print/export defaults without changing the data model again.</p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
