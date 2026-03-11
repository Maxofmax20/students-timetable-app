'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

type Item = {
  id: string;
  entityType: string;
  actionType: string;
  summary: string;
  createdAt: string;
  actor: { name?: string | null; email: string } | null;
  canRestore: boolean;
};

export default function WorkspaceHistoryPage() {
  const { status } = useSession({ required: true, onUnauthenticated: () => { window.location.href = '/auth'; } });
  const { toast } = useToast();
  const [workspaceId, setWorkspaceId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [role, setRole] = useState<string>('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = async () => {
    const coursesRes = await fetch('/api/v1/courses', { credentials: 'include' });
    const coursesPayload = await coursesRes.json();
    const ws = coursesPayload?.data?.workspaceId;
    if (!coursesRes.ok || !coursesPayload?.ok || !ws) throw new Error('Failed to resolve workspace');
    setWorkspaceId(ws);

    const res = await fetch(`/api/v1/workspaces/${ws}/history`, { credentials: 'include' });
    const payload = await res.json();
    if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'Failed to load history');
    setItems(payload.data.items || []);
    setRole(payload.data.role || '');
  };

  useEffect(() => { if (status === 'authenticated') void load().catch((e) => toast(e.message, 'error')); }, [status]);

  const restore = async (entryId: string) => {
    setRestoringId(entryId);
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/history/restore`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ entryId }) });
    const payload = await res.json();
    if (!res.ok || !payload?.ok) {
      setRestoringId(null);
      return toast(payload?.message || 'Restore failed', 'error');
    }
    toast('Restore completed');
    await load();
    setRestoringId(null);
  };

  const restoreCount = useMemo(() => items.filter((item) => item.canRestore).length, [items]);

  return (
    <AppShell title="Workspace History" subtitle="Audit timeline for major workspace changes.">
      <div className="space-y-4 md:space-y-5">
        {role === 'TEACHER' ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs md:text-sm text-[var(--text-secondary)]">Editor view is limited: membership and restore actions are hidden.</div> : null}

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:px-5 md:py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">{items.length} entries</span>
            <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">{restoreCount} restorable</span>
          </div>
        </section>

        {items.length ? (
          <div className="space-y-2.5 md:space-y-3">
            {items.map((item) => {
              const actorLabel = item.actor?.name || item.actor?.email || 'System';
              return (
                <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 md:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white break-words" title={item.summary}>{item.summary}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-2 py-0.5 uppercase tracking-[0.08em]">{item.entityType}</span>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-2 py-0.5 uppercase tracking-[0.08em]">{item.actionType}</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-[var(--text-muted)]" title={actorLabel}>By {actorLabel}</div>
                    </div>
                    {item.canRestore ? <Button variant="ghost" size="sm" onClick={() => void restore(item.id)} disabled={restoringId === item.id}>{restoringId === item.id ? 'Restoring...' : 'Restore'}</Button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="history" title="No history entries yet" description="Major workspace changes will appear here for audit and restore workflows." />
        )}
      </div>
    </AppShell>
  );
}
