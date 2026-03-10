'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';
type ProviderMap = Record<string, { id: string; name: string }>;

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg)]"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthPageInner />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  OTP Split Input                                                    */
/* ------------------------------------------------------------------ */
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = useCallback((i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = '';
      onChange(next.join(''));
      refs.current[i - 1]?.focus();
    }
  }, [digits, onChange]);

  const handleChange = useCallback((i: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const next = [...digits];
    next[i] = char;
    onChange(next.join('').replace(/\s/g, ''));
    if (char && i < 5) refs.current[i + 1]?.focus();
  }, [digits, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }, [onChange]);

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d || ''}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-12 h-14 rounded-xl border-2 bg-[var(--surface)] text-center text-xl font-bold text-white
                     border-[var(--border)] focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--focus-ring)]
                     transition-all outline-none disabled:opacity-40
                     sm:w-14 sm:h-16 sm:text-2xl"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Auth Page Inner                                               */
/* ------------------------------------------------------------------ */
function AuthPageInner() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams?.get('mode') as Mode) || 'login';
  const resetToken = searchParams?.get('token') || '';

  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : initialMode);
  const [providers, setProviders] = useState<ProviderMap>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/providers')
      .then(r => r.json())
      .then(d => setProviders(d ?? {}))
      .catch(() => setProviders({}));
  }, []);

  useEffect(() => { setError(''); setSuccess(''); }, [mode]);

  /* ---------- Handlers ---------- */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await signIn('credentials', { redirect: false, email, password });
    if (res?.error) {
      if (res.error === 'EMAIL_NOT_VERIFIED' || res.error.includes('EMAIL_NOT_VERIFIED')) {
        setMode('verify'); setLoading(false); return;
      }
      setError(res.error === 'CredentialsSignin' ? 'Invalid email or password' : res.error);
      setLoading(false); return;
    }
    router.push('/workspace'); router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: displayName || undefined })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { setError(data?.message || 'Registration failed'); setLoading(false); return; }
    if (data.requiresVerification) { setMode('verify'); setLoading(false); return; }
    await signIn('credentials', { redirect: false, email, password });
    router.push('/workspace'); router.refresh();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: verifyCode })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { setError(data?.message || 'Invalid code'); setLoading(false); return; }
    setSuccess('Verified! Signing you in...');
    const signInRes = await signIn('credentials', { redirect: false, email, password });
    if (signInRes?.error) { setMode('login'); setSuccess('Email verified. Please sign in.'); setLoading(false); return; }
    router.push('/workspace'); router.refresh();
  }

  async function handleResend() {
    setError(''); setLoading(true);
    await fetch('/api/auth/resend-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    setSuccess('New code sent! Check your inbox.'); setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    setSuccess('If an account exists, a reset link has been sent to your email.'); setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { setError(data?.message || 'Reset failed'); setLoading(false); return; }
    setSuccess('Password reset! Redirecting to sign in...');
    setTimeout(() => setMode('login'), 2000); setLoading(false);
  }

  function onSubmit(e: React.FormEvent) {
    if (mode === 'login') return handleLogin(e);
    if (mode === 'register') return handleRegister(e);
    if (mode === 'verify') return handleVerify(e);
    if (mode === 'forgot') return handleForgot(e);
    if (mode === 'reset') return handleReset(e);
  }

  const h: Record<Mode, { icon: string; title: string; sub: string }> = {
    login:    { icon: 'login',           title: 'Welcome back',       sub: 'Sign in to continue to your workspace.' },
    register: { icon: 'person_add',      title: 'Get started',        sub: 'Create your account in seconds.' },
    verify:   { icon: 'mark_email_read', title: 'Check your email',   sub: `We sent a 6-digit code to ${email || 'your email'}.` },
    forgot:   { icon: 'lock_reset',      title: 'Forgot password?',   sub: 'Enter your email to receive a reset link.' },
    reset:    { icon: 'lock_open',       title: 'New password',       sub: 'Choose a strong new password for your account.' },
  };

  const heading = h[mode];
  const oauthProviders = Object.keys(providers).filter(id => id !== 'credentials');

  return (
    <main className="min-h-screen w-full flex bg-[var(--bg)] text-[var(--text)] font-sans">
      
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex flex-1 relative bg-[var(--bg-raised)] items-center justify-center p-12 overflow-hidden border-r border-[var(--border)]">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[var(--gold-muted)] rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] bg-[var(--info-muted)] rounded-full blur-[100px] opacity-30" />
        
        <div className="max-w-xl w-full relative z-10">
          <Link href="/" className="inline-flex items-center gap-4 mb-16 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] flex items-center justify-center shadow-[var(--shadow-glow)] group-hover:scale-110 transition-transform duration-500">
              <span className="material-symbols-outlined font-bold text-[var(--gold-fg)] text-2xl">calendar_month</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-3xl text-white leading-none">Timetable</span>
              <span className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-[0.3em] mt-1 ml-0.5">Workspace Premium</span>
            </div>
          </Link>

          <div className="space-y-10">
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Design your academic future<br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--gold)] to-white">with precision.</span>
            </h1>
            <div className="grid gap-6">
              <Feature icon="analytics" title="Conflict Visibility" desc="Track courses, instructors, and rooms in one shared workspace." />
              <Feature icon="calendar_month" title="Calendar Exports" desc="Download timetable data as JSON, CSV, or ICS." />
              <Feature icon="devices" title="Responsive Workspace" desc="Works across desktop and mobile browsers." />
            </div>
          </div>

          <div className="mt-16 p-5 rounded-2xl bg-[var(--surface)]/40 border border-[var(--border)] backdrop-blur-xl">
            <p className="text-[var(--text-secondary)] italic text-sm font-medium leading-relaxed mb-3">
              &ldquo;Clear scheduling with less spreadsheet chaos.&rdquo;
            </p>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Students Timetable Workspace</div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:px-20 bg-[var(--bg)] relative">
        <div className="w-full max-w-[400px] animate-panel-pop">
           
          {/* Mode icon + heading */}
          <div className="mb-8">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[var(--gold)] text-xl">{heading.icon}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">{heading.title}</h2>
            <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed">{heading.sub}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">

            {/* Register: Name */}
            {mode === 'register' && (
              <Input label="Full Name" placeholder="John Doe" value={displayName}
                onChange={e => setDisplayName(e.target.value)} icon="person" />
            )}

            {/* Email field */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <Input label="Email" type="email" placeholder="name@university.edu" value={email}
                onChange={e => setEmail(e.target.value)} required icon="mail" />
            )}

            {/* Password field */}
            {(mode === 'login' || mode === 'register') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.16em]">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')}
                      className="text-[10px] font-bold text-[var(--gold)] hover:text-[var(--gold-hover)] uppercase tracking-wider transition-colors">
                      Forgot?
                    </button>
                  )}
                </div>
                <Input type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required icon="lock" hideLabel />
              </div>
            )}

            {/* Verify: OTP split input */}
            {mode === 'verify' && (
              <div className="space-y-5 py-2">
                <OtpInput value={verifyCode} onChange={setVerifyCode} disabled={loading} />
                <div className="flex items-center justify-between px-1">
                  <button type="button" onClick={() => void handleResend()} disabled={loading}
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">refresh</span>
                    Resend code
                  </button>
                  <button type="button" onClick={() => setMode('login')}
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors">
                    Back to sign in
                  </button>
                </div>
              </div>
            )}

            {/* Reset: New password */}
            {mode === 'reset' && (
              <Input label="New Password" type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required icon="lock" />
            )}

            {/* Messages */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[var(--danger-muted)] border border-[var(--danger)]/20 text-[var(--danger)] text-xs font-bold flex items-center gap-2.5 animate-panel-pop">
                <span className="material-symbols-outlined text-base">error</span>{error}
              </div>
            )}
            {success && (
              <div className="p-3.5 rounded-xl bg-[var(--success-muted,var(--info-muted))] border border-[var(--success,var(--info))]/20 text-[var(--success,var(--info))] text-xs font-bold flex items-center gap-2.5 animate-panel-pop">
                <span className="material-symbols-outlined text-base">check_circle</span>{success}
              </div>
            )}

            {/* CTA */}
            <Button variant="primary" className="w-full h-12 text-sm font-black tracking-wide" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : ({
                login: 'Sign In',
                register: 'Create Account',
                verify: 'Verify Email',
                forgot: 'Send Reset Link',
                reset: 'Set New Password',
              }[mode])}
            </Button>
          </form>

          {/* OAuth */}
          {(mode === 'login' || mode === 'register') && oauthProviders.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-soft)]" /></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
                  <span className="bg-[var(--bg)] px-4">Or continue with</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {providers.google && (
                  <Button type="button" variant="secondary" className="h-11 bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                    onClick={() => signIn('google', { callbackUrl: '/workspace' })}>
                    <GoogleIcon /> <span className="ml-2 font-bold text-sm">Google</span>
                  </Button>
                )}
                {providers.github && (
                  <Button type="button" variant="secondary" className="h-11 bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                    onClick={() => signIn('github', { callbackUrl: '/workspace' })}>
                    <GithubIcon /> <span className="ml-2 font-bold text-sm">GitHub</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="mt-6 text-center">
            {(mode === 'login' || mode === 'register') && (
              <p className="text-sm text-[var(--text-secondary)]">
                {mode === 'login' ? 'New here? ' : 'Already have an account? '}
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="font-bold text-[var(--gold)] hover:text-[var(--gold-hover)] transition-colors underline underline-offset-4 decoration-[var(--gold)]/30">
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <button onClick={() => setMode('login')}
                className="text-sm font-bold text-[var(--gold)] hover:text-[var(--gold-hover)] transition-colors underline underline-offset-4 decoration-[var(--gold)]/30">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center w-full px-6">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
            &copy; 2024 Timetable Workspace
          </p>
        </div>
      </div>
    </main>
  );
}

/* ---- Supporting components ---- */
function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-9 h-9 rounded-lg bg-[var(--surface-3)] flex items-center justify-center shrink-0 border border-[var(--border)]">
        <span className="material-symbols-outlined text-[var(--gold)] text-lg">{icon}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <h4 className="text-white font-bold text-sm leading-none">{title}</h4>
        <p className="text-[var(--text-secondary)] text-xs font-medium">{desc}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}
