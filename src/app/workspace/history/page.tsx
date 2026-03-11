'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
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
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/history/restore`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ entryId }) });
    const payload = await res.json();
    if (!res.ok || !payload?.ok) return toast(payload?.message || 'Restore failed', 'error');
    toast('Restore completed');
    await load();
  };

  return (
    <AppShell title="Workspace History" subtitle="Operational audit trail for major workspace changes.">
      <div className="space-y-3">
        {role === 'TEACHER' ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-secondary)]">Editor view is limited: membership and restore actions are hidden.</div> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{item.summary}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">{item.entityType} • {item.actionType} • {new Date(item.createdAt).toLocaleString()} • {item.actor?.name || item.actor?.email || 'System'}</div>
              </div>
              {item.canRestore ? <Button variant="secondary" onClick={() => void restore(item.id)}>Restore</Button> : null}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
