'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

type AccountProfile = {
  id: string;
  email: string;
  displayName: string;
  hasPassword: boolean;
  providers: string[];
};

export default function AccountPage() {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/auth';
    }
  });
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');

  const providerLabels = useMemo(
    () => ({
      credentials: 'Password',
      google: 'Google',
      github: 'GitHub'
    }),
    []
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/account/profile', { credentials: 'include' });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Failed to load account');
      }

      setProfile(payload.data);
      setDisplayName(payload.data.displayName || '');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load account', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      void loadProfile();
    }
  }, [status]);

  const signOutEverywhere = async () => {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(() => null);

    await signOut({ callbackUrl: '/auth' });
  };

  const saveProfile = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      toast('Display name must be at least 2 characters', 'error');
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName: trimmed })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Profile update failed');
      }

      toast('Profile updated');
      await loadProfile();
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Profile update failed', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) {
      toast('New password must be at least 8 characters', 'error');
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Password update failed');
      }

      toast(profile?.hasPassword ? 'Password updated' : 'Password set successfully');
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      await loadProfile();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Password update failed', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const exportAccount = async () => {
    try {
      const response = await fetch('/api/account/export', { credentials: 'include' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `students-timetable-account-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast('Account export downloaded');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Export failed', 'error');
    }
  };

  const deleteAccount = async () => {
    if (confirmDelete !== 'DELETE') {
      toast('Type DELETE to confirm account removal', 'error');
      return;
    }

    setDeleteSaving(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE' })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Account deletion failed');
      }

      setDeleteOpen(false);
      setConfirmDelete('');
      toast('Account deleted');
      window.location.href = '/auth';
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Account deletion failed', 'error');
    } finally {
      setDeleteSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AppShell title="Account" subtitle="Loading account details">
        <div className="p-8 text-[var(--text-secondary)] flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Loading account details...
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell title="Account" subtitle="Account unavailable">
        <div className="p-8 flex flex-col gap-4">
          <p className="text-[var(--text-secondary)]">We could not load your account details.</p>
          <Button variant="secondary" onClick={() => void loadProfile()} className="w-fit">Retry</Button>
        </div>
      </AppShell>
    );
  }

  const providerBadges = profile.providers.length ? profile.providers : profile.hasPassword ? ['credentials'] : [];

  return (
    <AppShell title="Account Settings" subtitle="Manage your identity, security, and data export">
      <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-8 w-full pb-24">
        <section className="flex flex-col gap-5">
          <h3 className="text-xl font-bold text-[var(--gold-soft)] flex items-center gap-2">
            <span className="material-symbols-outlined">person</span>
            Public Profile
          </h3>
          <div className="bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8 rounded-2xl flex flex-col sm:flex-row gap-8 items-start">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[var(--surface-3)] border-2 border-[var(--border)] flex items-center justify-center text-3xl font-bold text-[var(--gold)] shadow-inner shrink-0">
              {(displayName || profile.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 flex flex-col gap-4 w-full">
              <Input
                label="Display Name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                containerClassName="max-w-md"
              />
              <Input
                label="Email Address"
                type="email"
                value={profile.email}
                disabled
                helperText="Email is controlled by your active sign-in method."
                containerClassName="max-w-md"
              />
              <div className="pt-2">
                <Button variant="secondary" onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-xl font-bold text-[var(--gold-soft)] flex items-center gap-2">
            <span className="material-symbols-outlined">security</span>
            Security & Sign In
          </h3>
          <div className="bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8 rounded-2xl flex flex-col gap-6">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-6">
              <div>
                <h4 className="font-semibold text-white">Connected Sign-In Methods</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">These providers can authenticate this account right now.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {providerBadges.map((provider) => (
                  <span key={provider} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-bold text-white">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    {providerLabels[provider as keyof typeof providerLabels] ?? provider}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-6">
              <div>
                <h4 className="font-semibold text-white">{profile.hasPassword ? 'Password' : 'Set a Password'}</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {profile.hasPassword ? 'Change your current password.' : 'Add a password so you can sign in without an external provider.'}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
                {profile.hasPassword ? 'Update Password' : 'Set Password'}
              </Button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="font-semibold text-white">Current Session</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Sign out cleanly from this browser and clear compatibility cookies.</p>
              </div>
              <Button variant="secondary" onClick={() => void signOutEverywhere()}>
                Sign Out
              </Button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5 mt-2">
          <h3 className="text-xl font-bold text-[var(--danger)] flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Data & Deletion
          </h3>
          <div className="bg-[linear-gradient(135deg,rgba(225,70,70,0.05),var(--surface))] border border-[var(--danger)]/30 p-6 md:p-8 rounded-2xl flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--danger)]/20 pb-6">
              <div>
                <h4 className="font-semibold text-white">Export Account Data</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Download your account profile, workspaces, memberships, and linked data as JSON.</p>
              </div>
              <Button variant="secondary" onClick={() => void exportAccount()} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Export
              </Button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="font-semibold text-[var(--danger)]">Delete Account</h4>
                <p className="text-sm text-[var(--danger)]/70 mt-1">This permanently removes your account and associated owned data. This cannot be undone.</p>
              </div>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Delete Account
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={passwordOpen}
        onClose={() => {
          setPasswordOpen(false);
          setCurrentPassword('');
          setNewPassword('');
        }}
        title={profile.hasPassword ? 'Update Password' : 'Set Password'}
        subtitle={profile.hasPassword ? 'Enter your current password to confirm the change.' : 'Create a password for direct sign-in.'}
        actions={
          <>
            <Button variant="ghost" onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void savePassword()} disabled={passwordSaving}>
              {passwordSaving ? 'Saving...' : profile.hasPassword ? 'Update Password' : 'Save Password'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {profile.hasPassword && (
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
            />
          )}
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            helperText="Use a strong password you have not used elsewhere."
          />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmDelete('');
        }}
        title="Delete Account"
        subtitle="Type DELETE below to confirm permanent account removal."
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => void deleteAccount()} disabled={deleteSaving}>
              {deleteSaving ? 'Deleting...' : 'Delete Account'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            This removes your account, owned workspaces, and associated records. Shared or collaborative content you do not own may be retained under other accounts.
          </p>
          <Input
            label="Confirmation"
            value={confirmDelete}
            onChange={(event) => setConfirmDelete(event.target.value)}
            placeholder="Type DELETE"
          />
        </div>
      </Modal>
    </AppShell>
  );
}
