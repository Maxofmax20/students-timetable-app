'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppSelect } from '@/components/ui/AppSelect';
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
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, role })
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

  return (
    <AppShell title="Sharing" subtitle="Manage workspace members and roles.">
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Input label="User email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="existing-user@example.com" />
          <div className="mt-3 max-w-xs">
            <AppSelect value={role} onChange={(v) => setRole(v as 'TEACHER' | 'VIEWER')} options={[{ value: 'TEACHER', label: 'Editor' }, { value: 'VIEWER', label: 'Viewer' }]} />
          </div>
          <Button onClick={() => void addMember()} className="mt-3">Add member</Button>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="text-lg font-semibold text-white">Members</h3>
          {loading ? <p className="text-sm text-[var(--text-secondary)] mt-2">Loading...</p> : (
            <div className="mt-3 space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] p-3">
                  <div>
                    <p className="font-semibold text-white">{member.user.name || member.user.email}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">{member.role === 'OWNER' ? 'Owner' : member.role === 'TEACHER' ? 'Editor' : 'Viewer'}</span>
                    {member.role !== 'OWNER' ? (
                      <>
                        <Button variant="ghost" onClick={() => void updateRole(member.id, member.role === 'TEACHER' ? 'VIEWER' : 'TEACHER')}>Toggle role</Button>
                        <Button variant="danger" onClick={() => void removeMember(member.id)}>Remove</Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
