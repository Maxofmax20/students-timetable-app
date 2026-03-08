'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { signIn } from 'next-auth/react';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

    // Register mode uses the custom API endpoint to create the user before signing in
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

    // Sign in automatically after registration
    await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    router.push('/workspace');
    router.refresh();
  }

  return (
    <main dir="ltr" className="min-h-screen w-full flex bg-[#070d28] text-white selection:bg-[#d4af37]/30">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:flex-none lg:w-[480px] xl:w-[560px] bg-[#070d28] z-10 relative">
        <div className="absolute top-8 left-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[linear-gradient(45deg,#d4af37,#f3e5ab)] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <span className="material-symbols-outlined font-bold text-[#111] text-lg">calendar_month</span>
            </div>
            <span className="font-bold tracking-tight text-white text-lg">Timetable Workspace</span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[400px]">
          <div className="flex flex-col space-y-2 text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-[#b8c8ee]">
              {mode === 'login' 
                ? 'Enter your credentials to access your workspace' 
                : 'Sign up to build, sync, and share your schedules'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#b8c8ee]">Full Name</label>
                <input 
                  className="w-full bg-[#111a3f]/50 border border-[#2b4278] rounded-xl px-4 py-3 text-white placeholder-[#b8c8ee]/50 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all"
                  placeholder="John Doe"
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-[#b8c8ee]">Email address</label>
              <input 
                type="email" 
                className="w-full bg-[#111a3f]/50 border border-[#2b4278] rounded-xl px-4 py-3 text-white placeholder-[#b8c8ee]/50 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all"
                placeholder="name@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#b8c8ee]">Password</label>
                {mode === 'login' && (
                  <a href="#" className="text-xs text-[#d4af37] hover:text-[#f5db93] transition-colors">
                    Forgot password?
                  </a>
                )}
              </div>
              <input 
                type="password" 
                className="w-full bg-[#111a3f]/50 border border-[#2b4278] rounded-xl px-4 py-3 text-white placeholder-[#b8c8ee]/50 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all"
                placeholder="••••••••"
                minLength={8} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[#e14646]/10 border border-[#e14646]/30 text-[#e14646] text-sm text-center">
                {error}
              </div>
            )}

            <button 
              className="w-full py-3 px-4 bg-[linear-gradient(45deg,#d4af37,#b88a25)] hover:opacity-90 active:scale-[0.98] text-[#111] font-semibold rounded-xl transition-all shadow-[0_4px_14px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-sm text-[#b8c8ee]">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button 
              className="text-sm font-semibold text-[#d4af37] hover:text-[#f5db93] transition-colors"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>

          <div className="mt-8 flex items-center w-full">
            <div className="flex-1 h-px bg-[#2b4278]"></div>
            <span className="px-4 text-xs font-medium text-[#b8c8ee] uppercase">Or continue with</span>
            <div className="flex-1 h-px bg-[#2b4278]"></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button 
              onClick={() => signIn('google', { callbackUrl: '/workspace' })}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2b4278] bg-[#111a3f]/40 hover:bg-[#14224d] transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button 
              onClick={() => signIn('github', { callbackUrl: '/workspace' })}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2b4278] bg-[#111a3f]/40 hover:bg-[#14224d] transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 relative bg-[#0b1438] items-center justify-center p-12 overflow-hidden border-l border-[#2b4278]/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_60%)]"></div>
        
        {/* Abstract shapes / UI Preview */}
        <div className="relative w-full max-w-lg aspect-square">
          <div className="absolute inset-y-12 inset-x-0 bg-[#111a3f] rounded-[2rem] border border-[#2b4278] shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transform rotate-[-3deg] hover:rotate-0 transition-transform duration-700">
            {/* Mock Header */}
            <div className="h-14 border-b border-[#2b4278]/50 flex items-center px-6 gap-3">
              <div className="w-3 h-3 rounded-full bg-[#e14646]"></div>
              <div className="w-3 h-3 rounded-full bg-[#f0c965]"></div>
              <div className="w-3 h-3 rounded-full bg-[#2fb673]"></div>
            </div>
            {/* Mock Content */}
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="w-3/4 h-8 bg-[#14224d] rounded-lg"></div>
              <div className="w-1/2 h-4 bg-[#14224d] rounded mt-2"></div>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="h-24 bg-[linear-gradient(135deg,#d4af3720,#14224d)] rounded-xl border border-[#d4af37]/30"></div>
                <div className="h-24 bg-[#14224d] rounded-xl"></div>
                <div className="h-24 bg-[#14224d] rounded-xl"></div>
                <div className="h-24 bg-[#14224d] rounded-xl"></div>
              </div>
            </div>
          </div>
          
          {/* Floating elements */}
          <div className="absolute top-1/4 -right-12 w-32 h-32 bg-[linear-gradient(45deg,#d4af37,#f3e5ab)] rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-1/4 -left-12 w-40 h-40 bg-[#2563eb] rounded-full blur-2xl opacity-20"></div>
        </div>

        <div className="absolute bottom-12 left-12 right-12 z-10 text-center">
          <p className="text-[#c7d4f5] text-lg font-medium leading-relaxed mb-4">
            "We revolutionized how our university manages thousands of courses. No more conflicts, just seamless scheduling."
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#14224d] flex items-center justify-center border border-[#2b4278]">
              <span className="material-symbols-outlined text-sm text-[#d4af37]">school</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-white">Dr. Sarah Khalil</div>
              <div className="text-xs text-[#b8c8ee]">Head of CS Department</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
