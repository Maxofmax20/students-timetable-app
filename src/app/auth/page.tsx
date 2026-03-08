'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'login' | 'register';
type ProviderMap = Record<string, { id: string; name: string }>;

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [providers, setProviders] = useState<ProviderMap>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((response) => response.json())
      .then((data) => setProviders(data ?? {}))
      .catch(() => setProviders({}));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'login') {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error === 'CredentialsSignin' ? 'Invalid credentials' : res.error);
        setLoading(false);
        return;
      }
      
      router.push('/workspace');
      router.refresh();
      return;
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: displayName || undefined })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data?.message || 'Registration failed');
      setLoading(false);
      return;
    }

    await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    router.push('/workspace');
    router.refresh();
  }

  return (
    <main className="min-h-screen w-full flex bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--gold)]/30 font-sans selection:text-[var(--gold-fg)]">
      
      {/* Left Panel - Information & Aesthetics */}
      <div className="hidden lg:flex flex-1 relative bg-[var(--bg-raised)] items-center justify-center p-12 overflow-hidden border-r border-[var(--border)]">
        {/* Ambient background effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[var(--gold-muted)] rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] bg-[var(--info-muted)] rounded-full blur-[100px] opacity-30"></div>
        
        <div className="max-w-xl w-full relative z-10">
           {/* Logo Branding */}
           <Link href="/" className="inline-flex items-center gap-4 mb-20 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] flex items-center justify-center shadow-[var(--shadow-glow)] group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined font-bold text-[var(--gold-fg)] text-2xl">calendar_month</span>
              </div>
              <div className="flex flex-col">
                 <span className="font-black tracking-tight text-3xl text-white leading-none">Timetable</span>
                 <span className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-[0.3em] mt-1 ml-0.5">Workspace Premium</span>
              </div>
           </Link>

           <div className="space-y-12">
              <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
                Design your academic future <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--gold)] to-white">with precision.</span>
              </h1>
              
              <div className="grid gap-8">
                 <VisualFeature icon="analytics" title="Conflict Visibility" desc="Track courses, instructors, and rooms in one shared workspace." />
                 <VisualFeature icon="calendar_month" title="Calendar Exports" desc="Download timetable data as JSON, CSV, or ICS when you need to share it elsewhere." />
                 <VisualFeature icon="devices" title="Responsive Workspace" desc="Use the same scheduling workspace across desktop and mobile browsers." />
              </div>
           </div>

           {/* Testimonial Snippet */}
           <div className="mt-20 p-6 rounded-3xl bg-[var(--surface)]/40 border border-[var(--border)] backdrop-blur-xl">
              <p className="text-[var(--text-secondary)] italic font-medium leading-relaxed mb-4">
                Built for managing academic scheduling data clearly, with less spreadsheet chaos and fewer hidden admin steps.
              </p>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-[var(--surface-3)]"></div>
                 <div className="text-xs font-bold text-white uppercase tracking-wider">Students Timetable Workspace</div>
              </div>
           </div>
        </div>
      </div>

      {/* Right Panel - Authentication Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-24 bg-[var(--bg)] relative">
        <div className="w-full max-w-[420px] space-y-10 animate-panel-pop">
           
           <div className="flex flex-col gap-2">
              <h2 className="text-4xl font-extrabold text-white tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-[var(--text-secondary)] font-medium">
                 {mode === 'login' 
                   ? 'Enter your details to continue to your workspace.' 
                   : 'Create an account to start building your timetable.'}
              </p>
           </div>

           <form onSubmit={submit} className="space-y-5">
              {mode === 'register' && (
                <div className="animate-fade-in">
                  <Input 
                    label="Full Name" 
                    placeholder="John Doe" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    icon="person"
                  />
                </div>
              )}
              
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="name@university.edu" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                icon="mail"
              />

              <div className="space-y-1">
                 <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Password</label>
                    {mode === 'login' && (
                      <Link href="#" className="text-[10px] font-bold text-[var(--gold)] hover:text-[var(--gold-hover)] uppercase tracking-wider">Forgot?</Link>
                    )}
                 </div>
                 <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    icon="lock"
                    hideLabel
                 />
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-[var(--danger-muted)] border border-[var(--danger)]/20 text-[var(--danger)] text-xs font-bold flex items-center gap-3 animate-panel-pop">
                   <span className="material-symbols-outlined text-lg">error</span>
                   {error}
                </div>
              )}

              <Button 
                variant="primary" 
                className="w-full h-14 text-lg font-black tracking-wide" 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
           </form>

           {Object.keys(providers).filter((id) => id !== 'credentials').length > 0 && (
             <>
               <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-soft)]"></div></div>
                  <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
                     <span className="bg-[var(--bg)] px-4">Or continue with</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {providers.google && (
                    <Button 
                      type="button"
                      variant="secondary" 
                      className="h-12 bg-[var(--surface)] hover:bg-[var(--surface-2)]" 
                      onClick={() => signIn('google', { callbackUrl: '/workspace' })}
                    >
                       <GoogleIcon /> <span className="ml-2 font-bold">Google</span>
                    </Button>
                  )}
                  {providers.github && (
                    <Button 
                      type="button"
                      variant="secondary" 
                      className="h-12 bg-[var(--surface)] hover:bg-[var(--surface-2)]" 
                      onClick={() => signIn('github', { callbackUrl: '/workspace' })}
                    >
                       <GithubIcon /> <span className="ml-2 font-bold">GitHub</span>
                    </Button>
                  )}
               </div>
             </>
           )}

           <div className="text-center">
              <span className="text-sm text-[var(--text-secondary)] font-medium">
                {mode === 'login' ? "New here?" : "Joined us before?"}
              </span>
              <button 
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="ml-2 text-sm font-bold text-[var(--gold)] hover:text-[var(--gold-hover)] transition-colors underline underline-offset-4 decoration-[var(--gold)]/30"
              >
                {mode === 'login' ? 'Create an account' : 'Log in to your account'}
              </button>
           </div>
        </div>

        {/* Footer Links */}
        <div className="absolute bottom-8 text-center w-full px-6">
           <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
             &copy; 2024 Timetable Workspace &bull; <Link href="/" className="hover:text-white transition-colors">Privacy</Link> &bull; <Link href="/" className="hover:text-white transition-colors">Terms</Link>
           </p>
        </div>
      </div>
    </main>
  );
}

function VisualFeature({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="flex gap-5">
       <div className="w-10 h-10 rounded-xl bg-[var(--surface-3)] flex items-center justify-center shrink-0 border border-[var(--border)]">
          <span className="material-symbols-outlined text-[var(--gold)] text-xl">{icon}</span>
       </div>
       <div className="flex flex-col gap-1">
          <h4 className="text-white font-bold tracking-tight text-lg leading-none">{title}</h4>
          <p className="text-[var(--text-secondary)] text-sm font-medium">{desc}</p>
       </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}
