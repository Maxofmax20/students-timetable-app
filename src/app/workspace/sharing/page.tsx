'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppSelect } from '@/components/ui/AppSelect';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

type Member = {
  id: string;
  role: 'OWNER' | 'TEACHER' | 'STUDENT' | 'VIEWER';
  user: { id: string; email: string; name?: string | null };
};

export default function WorkspaceSharingPage() {
  const { status } = useSession({ required: true, onUnauthenticated: () => { window.location.href = '/auth'; } });
  const { toast } = useToast();
  const [workspaceId, setWorkspaceId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'VIEWER'>('VIEWER');

  const load = async () => {
    setLoading(true);
    try {
      const coursesResponse = await fetch('/api/v1/courses', { credentials: 'include' });
      const coursesPayload = await coursesResponse.json();
      const resolvedWorkspaceId = coursesPayload?.data?.workspaceId;
      if (!coursesResponse.ok || !coursesPayload?.ok || !resolvedWorkspaceId) {
        throw new Error(coursesPayload?.message || 'Failed to resolve workspace');
      }
      setWorkspaceId(resolvedWorkspaceId);

      const res = await fetch(`/api/v1/workspaces/${resolvedWorkspaceId}/members`, { credentials: 'include' });
      const payload = await res.json();
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || 'Failed to load members');
      setMembers(payload.data?.items || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load member list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') void load();
  }, [status]);

  const addMember = async () => {
    if (!workspaceId) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return toast('Email is required', 'error');

    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: trimmedEmail, role })
    });
    const payload = await res.json();
    if (!res.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to add member', 'error');
      return;
    }
    setEmail('');
    toast('Member added');
    await load();
  };

  const updateRole = async (memberId: string, nextRole: 'TEACHER' | 'VIEWER') => {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: nextRole })
    });
    const payload = await res.json();
    if (!res.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to update role', 'error');
      return;
    }
    toast('Role updated');
    await load();
  };

  const removeMember = async (memberId: string) => {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE', credentials: 'include' });
    const payload = await res.json();
    if (!res.ok || !payload?.ok) {
      toast(payload?.message || 'Failed to remove member', 'error');
      return;
    }
    toast('Member removed');
    await load();
  };

  const ownerCount = useMemo(() => members.filter((member) => member.role === 'OWNER').length, [members]);

  return (
    <AppShell title="Sharing" subtitle="Manage workspace members and collaboration roles.">
      <div className="space-y-4 md:space-y-5">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-raised)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-secondary)]">{members.length} members</span>
            <span className="rounded-full border border-[var(--gold)]/20 bg-[var(--gold-muted)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--gold)]">{ownerCount} owner{ownerCount === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
            <Input label="User email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="existing-user@example.com" helperText="Add an existing account as editor or viewer." />
            <AppSelect value={role} onChange={(v) => setRole(v as 'TEACHER' | 'VIEWER')} options={[{ value: 'TEACHER', label: 'Editor' }, { value: 'VIEWER', label: 'Viewer' }]} />
            <Button onClick={() => void addMember()} className="w-full md:w-auto">Add member</Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
          <h3 className="text-base md:text-lg font-semibold text-white">Members</h3>
          {loading ? <p className="text-sm text-[var(--text-secondary)] mt-2">Loading members…</p> : members.length ? (
            <div className="mt-3 space-y-2.5">
              {members.map((member) => (
                <article key={member.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-3 md:p-3.5">
                  <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white" title={member.user.name || member.user.email}>{member.user.name || member.user.email}</p>
                      <p className="truncate text-sm text-[var(--text-secondary)]" title={member.user.email}>{member.user.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">{member.role === 'OWNER' ? 'Owner' : member.role === 'TEACHER' ? 'Editor' : 'Viewer'}</span>
                      {member.role !== 'OWNER' ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => void updateRole(member.id, member.role === 'TEACHER' ? 'VIEWER' : 'TEACHER')}>Toggle role</Button>
                          <Button variant="ghost-danger" size="sm" onClick={() => void removeMember(member.id)}>Remove</Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState icon="group" title="No members yet" description="Invite collaborators with Editor or Viewer access to start sharing this workspace." />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
