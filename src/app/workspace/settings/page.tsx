'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { AppSelect } from '@/components/ui/AppSelect';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { redirectToAuthWithCallback } from '@/lib/auth-redirect';
import type { AcademicTermApiItem, UserPreferenceApiItem } from '@/types';

export const dynamic = 'force-dynamic';

type AccountProfile = {
  id: string;
  email: string;
  displayName: string;
  hasPassword: boolean;
  providers: string[];
};

const defaultPrefs: UserPreferenceApiItem = {
  id: '',
  theme: 'SYSTEM',
  timetableView: 'WEEK',
  dashboardLayout: 'OVERVIEW',
  weekStartsOn: 'SATURDAY',
  reduceMotion: false
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession({ 
    required: true, 
    onUnauthenticated() { redirectToAuthWithCallback(); } 
  });
  const { toast } = useToast();

  // --- Shared States ---
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'general');

  // --- Preference States ---
  const [prefs, setPrefs] = useState<UserPreferenceApiItem>(defaultPrefs);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // --- Academic Term States ---
  const [terms, setTerms] = useState<AcademicTermApiItem[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [termForm, setTermForm] = useState({ name: 'Spring 2025-2026', season: 'SPRING', academicYear: '2025-2026', isActive: true });

  // --- Profile States ---
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // --- Account Action States ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  // --- PWA States ---
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const providerLabels = useMemo(() => ({
    credentials: 'Password',
    google: 'Google',
    github: 'GitHub'
  }), []);

  // --- Data Loading ---
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [prefsRes, termsRes, profileRes] = await Promise.all([
          fetch('/api/v1/preferences', { credentials: 'include' }),
          fetch('/api/v1/academic-terms', { credentials: 'include' }),
          fetch('/api/account/profile', { credentials: 'include' })
        ]);

        const [prefsData, termsData, profileData] = await Promise.all([
          prefsRes.json() as Promise<{ ok: boolean; data: { item: UserPreferenceApiItem } }>,
          termsRes.json() as Promise<{ ok: boolean; data: { items: AcademicTermApiItem[]; workspaceId: string } }>,
          profileRes.json() as Promise<{ ok: boolean; data: AccountProfile }>
        ]);

        if (prefsRes.ok && prefsData?.ok) setPrefs(prefsData.data?.item || defaultPrefs);
        if (termsRes.ok && termsData?.ok) {
          setTerms(termsData.data?.items || []);
          setWorkspaceId(termsData.data?.workspaceId || '');
        }
        if (profileRes.ok && profileData?.ok) {
          setProfile(profileData.data);
          setDisplayName(profileData.data.displayName || '');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadAllData();
  }, [status]);

  // --- PWA Logic ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstallable(false);
    setDeferredPrompt(null);
  };

  // --- Action Handlers ---
  const savePreferences = async () => {
    setPrefsSaving(true);
    try {
      const response = await fetch('/api/v1/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(prefs)
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'Save failed');
      
      setPrefs(payload.data);
      const resolvedTheme = payload.data.theme === 'SYSTEM'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : payload.data.theme.toLowerCase();
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.reduceMotion = payload.data.reduceMotion ? 'true' : 'false';
      toast('Preferences saved');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An error occurred';
      toast(message, 'error');
    } finally {
      setPrefsSaving(false);
    }
  };

  const saveProfile = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) return toast('Display name too short', 'error');

    setProfileSaving(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName: trimmed })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Profile update failed');
      toast('Profile updated');
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An error occurred';
      toast(message, 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) return toast('Password too short', 'error');
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Password update failed');
      toast('Password updated');
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An error occurred';
      toast(message, 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSignOut = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null);
    await signOut({ callbackUrl: '/auth' });
  };

  const exportAccount = async () => {
    try {
      const res = await fetch('/api/account/export', { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timetable-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      toast('Export downloaded');
    } catch { toast('Export failed', 'error'); }
  };

  const deleteAccount = async () => {
    if (confirmDelete !== 'DELETE') return toast('Type DELETE to confirm', 'error');
    setDeleteSaving(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE' })
      });
      if (!res.ok) throw new Error('Deletion failed');
      window.location.href = '/auth';
    } catch { toast('Account deletion failed', 'error'); } finally { setDeleteSaving(false); }
  };

  return (
    <AppShell title="Settings" subtitle="Unified workspace preferences and account management.">
      <div className="max-w-5xl mx-auto w-full pb-20">
        
        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full overflow-x-auto hide-scrollbar pb-1 -mb-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} variant="action" className="w-max min-w-full sm:w-auto">
              <Tab value="general">General</Tab>
              <Tab value="profile">Profile</Tab>
              <Tab value="academic">Academic</Tab>
              <Tab value="device">App</Tab>
              <Tab value="account">Account</Tab>
            </Tabs>
          </div>
          
          <div className="flex items-center gap-3 px-2 sm:px-0 shrink-0">
            <Avatar name={profile?.displayName || 'User'} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-black text-white truncate max-w-[120px]">{profile?.displayName}</div>
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Free Plan</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--gold)] border-t-transparent"></div>
            <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-widest">Loading your settings...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            
            {/* --- GENERAL TAB --- */}
            {activeTab === 'general' && (
              <div className="grid gap-6">
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-[var(--gold)] flex items-center gap-2">
                      <span className="material-symbols-outlined">palette</span>
                      Visual Preferences
                    </h3>
                    <span className="polish-chip">Interface</span>
                  </div>
                  <div className="polish-section-shell p-4 md:p-7 flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AppSelect label="Theme" value={prefs.theme} onChange={(val) => setPrefs(c => ({ ...c, theme: val as UserPreferenceApiItem['theme'] }))} options={[{ value: 'SYSTEM', label: 'System' }, { value: 'LIGHT', label: 'Light' }, { value: 'DARK', label: 'Dark' }]} />
                      <AppSelect label="Week starts on" value={prefs.weekStartsOn} onChange={(val) => setPrefs(c => ({ ...c, weekStartsOn: val as UserPreferenceApiItem['weekStartsOn'] }))} options={[{ value: 'SATURDAY', label: 'Saturday' }, { value: 'SUNDAY', label: 'Sunday' }, { value: 'MONDAY', label: 'Monday' }]} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AppSelect label="Timetable default view" value={prefs.timetableView} onChange={(val) => setPrefs(c => ({ ...c, timetableView: val as UserPreferenceApiItem['timetableView'] }))} options={[{ value: 'WEEK', label: 'Week grid' }, { value: 'DAY', label: 'Day view' }, { value: 'AGENDA', label: 'Agenda' }]} />
                      <AppSelect label="Dashboard density" value={prefs.dashboardLayout} onChange={(val) => setPrefs(c => ({ ...c, dashboardLayout: val as UserPreferenceApiItem['dashboardLayout'] }))} options={[{ value: 'OVERVIEW', label: 'Overview' }, { value: 'FOCUS', label: 'Focus' }, { value: 'COMPACT', label: 'Compact' }]} />
                    </div>
                    <label className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 text-sm font-bold text-white cursor-pointer hover:bg-[var(--surface-3)] transition-all">
                      <span>Reduce animations & motion</span>
                      <div className={cn("flex h-6 w-11 items-center rounded-full p-1 transition-colors duration-200", prefs.reduceMotion ? "bg-[var(--gold)]" : "bg-[var(--surface-3)]")}>
                        <input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => setPrefs(c => ({ ...c, reduceMotion: e.target.checked }))} className="hidden" />
                        <div className={cn("h-4 w-4 rounded-full bg-white transition-transform duration-200", prefs.reduceMotion ? "translate-x-5" : "translate-x-0")} />
                      </div>
                    </label>
                    <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                      <Button variant="primary" onClick={savePreferences} disabled={prefsSaving} className="w-full sm:w-auto h-12 px-8">
                        {prefsSaving ? 'Saving...' : 'Save All Preferences'}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* --- PROFILE TAB --- */}
            {activeTab === 'profile' && (
              <div className="grid gap-6">
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-[var(--gold)] flex items-center gap-2">
                      <span className="material-symbols-outlined">person</span>
                      Public Profile
                    </h3>
                    <span className="polish-chip">Visible identity</span>
                  </div>
                  <div className="polish-section-shell p-4 md:p-7 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="w-20 h-20 rounded-3xl bg-[var(--surface-3)] border-2 border-[var(--border)] flex items-center justify-center text-3xl font-black text-[var(--gold)] shadow-inner shrink-0">
                        {profile?.displayName?.charAt(0) || profile?.email?.charAt(0)}
                      </div>
                      <div className="flex-1 w-full space-y-4">
                        <Input label="Public Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" helperText="Shown in workspaces and shared links." />
                        <Input label="Email Address" type="email" value={profile?.email} disabled helperText="Managed by your login provider." />
                        <div className="pt-2 flex justify-end">
                          <Button variant="primary" onClick={saveProfile} disabled={profileSaving} className="h-12 px-8 w-full sm:w-auto">
                            {profileSaving ? 'Saving...' : 'Update Profile'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-3 mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-[var(--gold)] flex items-center gap-2">
                      <span className="material-symbols-outlined">security</span>
                      Security
                    </h3>
                    <span className="polish-chip">Access controls</span>
                  </div>
                  <div className="polish-section-shell p-4 md:p-7 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-white">{profile?.hasPassword ? 'Login Password' : 'No Password Set'}</div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {profile?.hasPassword ? 'Secure your account with a direct password.' : 'Add a password to sign in without external apps.'}
                        </p>
                      </div>
                      <Button variant="secondary" onClick={() => setPasswordOpen(true)} className="w-full sm:w-auto">
                        {profile?.hasPassword ? 'Change Password' : 'Set Password'}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* --- ACADEMIC TAB --- */}
            {activeTab === 'academic' && (
              <div className="grid gap-6">
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-[var(--gold)] flex items-center gap-2">
                      <span className="material-symbols-outlined">library_books</span>
                      Active Academic Terms
                    </h3>
                    <span className="polish-chip">Workspace</span>
                  </div>
                  <div className="polish-section-shell p-4 md:p-7">
                    <div className="grid gap-4 mb-8">
                      {terms.map((term) => (
                        <div key={term.id} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-raised)] border border-[var(--border)]">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", term.isActive ? "bg-[var(--gold)] text-[var(--gold-fg)] shadow-[var(--shadow-glow)]" : "bg-[var(--surface-3)] text-[var(--text-muted)]")}>
                              {term.season.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white">{term.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">{term.academicYear} • {term.season}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {term.isActive ? (
                              <span className="px-3 py-1 rounded-full bg-[var(--gold-muted)] text-[var(--gold)] text-[10px] font-black uppercase tracking-widest border border-[var(--gold)]/20">Active</span>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => {}}>Set Active</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-raised)]/50 text-center hover:bg-[var(--surface-2)] transition-colors cursor-pointer group">
                      <p className="text-sm text-[var(--text-secondary)] mb-4">Need to start a new semester?</p>
                      <Button variant="secondary" className="gap-2 group-hover:border-[var(--gold)]/50 group-hover:text-[var(--gold)] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Create Academic Term
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* --- DEVICE TAB --- */}
            {activeTab === 'device' && (
              <div className="grid gap-6">
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-[var(--gold)] flex items-center gap-2">
                      <span className="material-symbols-outlined">install_mobile</span>
                      Timetable App
                    </h3>
                    <span className="polish-chip">Mobile Experience</span>
                  </div>
                  <div className="polish-section-shell p-6 md:p-12 text-center flex flex-col items-center justify-center">
                    <div className="mx-auto w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] flex items-center justify-center shadow-[var(--shadow-glow)] mb-8">
                      <span className="material-symbols-outlined text-5xl text-[var(--gold-fg)] font-black">install_mobile</span>
                    </div>
                    <div className="max-w-md mx-auto space-y-3">
                      <h2 className="text-3xl font-black text-white tracking-tight">App Experience</h2>
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        Install the app for instant access from your home screen, better performance, and offline support.
                      </p>
                    </div>
                    <div className="pt-8 flex justify-center w-full max-w-sm">
                      {isInstallable ? (
                        <Button variant="primary" className="h-14 w-full text-lg rounded-2xl" onClick={() => void installApp()}>
                          Install Timetable App
                        </Button>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 w-full p-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]">
                          <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
                          <p className="text-sm font-bold text-[var(--text-secondary)] text-center">App is already installed or your browser doesn&apos;t support automatic installation.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* --- ACCOUNT TAB --- */}
            {activeTab === 'account' && (
              <div className="grid gap-6">
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-[var(--gold)] flex items-center gap-2">
                      <span className="material-symbols-outlined">folder_managed</span>
                      Data & Exports
                    </h3>
                    <span className="polish-chip">Management</span>
                  </div>
                  <div className="polish-section-shell p-4 md:p-7 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-white">Export All Data</div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Download a full JSON archive of your timetable, courses, and account.</p>
                      </div>
                      <Button variant="secondary" onClick={exportAccount} className="gap-2 w-full sm:w-auto">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Download JSON
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-3 mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-bold text-[var(--danger)] flex items-center gap-2">
                      <span className="material-symbols-outlined">warning</span>
                      Danger Zone
                    </h3>
                    <span className="polish-chip text-[var(--danger)] border-[var(--danger)]/30 bg-[var(--danger)]/10">Destructive</span>
                  </div>
                  <div className="polish-section-shell p-4 md:p-7 flex flex-col gap-6 border-[var(--danger)]/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
                      <div>
                        <div className="font-bold text-[var(--danger)]">Sign Out Everywhere</div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Force logout from all active sessions and browsers.</p>
                      </div>
                      <Button variant="secondary" onClick={handleSignOut} className="w-full sm:w-auto">Logout Everywhere</Button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-[var(--danger)]">Delete Account</div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Permanently remove your account and all associated data.</p>
                      </div>
                      <Button variant="danger" onClick={() => setDeleteOpen(true)} className="w-full sm:w-auto shadow-[var(--shadow-sm)]">Delete Forever</Button>
                    </div>
                  </div>
                </section>
              </div>
            )}

          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Security Update" actions={
        <>
          <Button variant="ghost" onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={savePassword} isLoading={passwordSaving}>Save Password</Button>
        </>
      }>
        <div className="space-y-4">
          {profile?.hasPassword && <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />}
          <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} helperText="At least 8 characters." />
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Final Warning" actions={
        <>
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Keep Account</Button>
          <Button variant="danger" onClick={deleteAccount} isLoading={deleteSaving}>Delete My Data</Button>
        </>
      }>
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--danger-muted)]/20 border border-[var(--danger)]/30 text-[var(--danger)] text-sm font-bold">
            THIS ACTION CANNOT BE UNDONE. ALL YOUR DATA WILL BE WIPED.
          </div>
          <Input label='Type "DELETE" to confirm' value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder="DELETE" />
        </div>
      </Modal>

    </AppShell>
  );
}
