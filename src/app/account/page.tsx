'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export default function AccountPage() {
  const { data: session, status } = useSession({ required: true, onUnauthenticated() { window.location.href = '/auth'; } });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePlaceholder = (feature: string) => {
    toast(`${feature} feature coming soon!`, 'info');
  };

  if (status === 'loading') {
    return <AppShell title="Account" subtitle="Loading..."><div className="p-8 text-[var(--muted)] flex items-center gap-2"><span className="material-symbols-outlined animate-spin">progress_activity</span> Loading account details...</div></AppShell>;
  }

  return (
    <AppShell title="Account Settings" subtitle="Manage your personal profile and security preferences">
       <div className="p-6 max-w-4xl mx-auto flex flex-col gap-8 animate-[panelPop_0.4s_ease] w-full pb-32">
          
          {/* Profile Section */}
          <section className="flex flex-col gap-5">
             <h3 className="text-xl font-bold text-[var(--gold-soft)] flex items-center gap-2">
               <span className="material-symbols-outlined">person</span>
               Public Profile
             </h3>
             <div className="bg-[var(--surface)] border border-[var(--line)] p-8 rounded-2xl flex flex-col sm:flex-row gap-8 items-start">
                <div className="relative group">
                   <div className="w-24 h-24 rounded-2xl bg-[var(--surface-3)] border-2 border-[var(--line)] flex items-center justify-center text-3xl font-bold text-[var(--gold)] shadow-inner">
                      {session?.user?.name ? session.user.name.charAt(0) : 'U'}
                   </div>
                   <button className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white backdrop-blur-sm">
                      <span className="material-symbols-outlined">photo_camera</span>
                   </button>
                </div>
                <div className="flex-1 flex flex-col gap-4 w-full">
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--muted)]">Display Name</label>
                      <input type="text" defaultValue={session?.user?.name || ''} className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[var(--gold)] transition-colors max-w-sm" />
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--muted)]">Email Address</label>
                      <input type="email" defaultValue={session?.user?.email || ''} disabled className="w-full bg-[var(--surface-2)] opacity-60 border border-[var(--line)] rounded-xl px-4 py-2.5 text-[var(--muted)] cursor-not-allowed max-w-sm" />
                      <p className="text-xs text-[var(--muted)] mt-1">Email is tied to your identity provider.</p>
                   </div>
                   <div className="pt-2">
                      <Button variant="secondary" onClick={() => handlePlaceholder('Save Profile')}>
                         Save Changes
                      </Button>
                   </div>
                </div>
             </div>
          </section>

          {/* Security Section */}
          <section className="flex flex-col gap-5">
             <h3 className="text-xl font-bold text-[var(--gold-soft)] flex items-center gap-2">
               <span className="material-symbols-outlined">security</span>
               Security & Sign In
             </h3>
             <div className="bg-[var(--surface)] border border-[var(--line)] p-8 rounded-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-6">
                   <div>
                      <h4 className="font-semibold text-white">Password</h4>
                      <p className="text-sm text-[var(--muted)] mt-1">Change your password to secure your account.</p>
                   </div>
                   <Button variant="secondary" onClick={() => handlePlaceholder('Update Password')}>
                      Update Password
                   </Button>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-6">
                   <div>
                      <h4 className="font-semibold text-white">Two-Factor Authentication</h4>
                      <p className="text-sm text-[var(--muted)] mt-1">Add an extra layer of security to your account.</p>
                   </div>
                   <Button variant="secondary" onClick={() => handlePlaceholder('Enable 2FA')} className="gap-2">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Enable 2FA
                   </Button>
                </div>
                <div className="flex items-center justify-between">
                   <div>
                      <h4 className="font-semibold text-white">Sign Out of All Devices</h4>
                      <p className="text-sm text-[var(--muted)] mt-1">Force a logout on all other browsers and devices.</p>
                   </div>
                   <Button variant="secondary" onClick={() => signOut({ callbackUrl: '/auth' })}>
                      Sign Out All
                   </Button>
                </div>
             </div>
          </section>

          {/* Danger Zone */}
          <section className="flex flex-col gap-5 mt-4">
             <h3 className="text-xl font-bold text-[var(--danger)] flex items-center gap-2">
               <span className="material-symbols-outlined">warning</span>
               Danger Zone
             </h3>
             <div className="bg-[linear-gradient(135deg,rgba(225,70,70,0.05),var(--surface))] border border-[var(--danger)]/30 p-8 rounded-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[var(--danger)]/20 pb-6">
                   <div>
                      <h4 className="font-semibold text-white">Export Account Data</h4>
                      <p className="text-sm text-[var(--muted)] mt-1">Download a copy of all your workspaces, courses, and settings in JSON format.</p>
                   </div>
                   <Button variant="secondary" onClick={() => handlePlaceholder('Data Export')} className="gap-2">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Request Export
                   </Button>
                </div>
                <div className="flex items-center justify-between">
                   <div>
                      <h4 className="font-semibold text-[var(--danger)]">Delete Account</h4>
                      <p className="text-sm text-[var(--danger)]/70 mt-1">Permanently remove your account and all associated data. This action cannot be undone.</p>
                   </div>
                   <Button variant="danger" onClick={() => handlePlaceholder('Delete Account')}>
                      Delete Account
                   </Button>
                </div>
             </div>
          </section>

       </div>
    </AppShell>
  );
}
