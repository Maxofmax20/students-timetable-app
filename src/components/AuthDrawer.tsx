'use client';

import { FormEvent, useState } from 'react';

type User = {
  id: string;
  email: string;
  displayName?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
};

export default function AuthDrawer({ open, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload =
      mode === 'login'
        ? { email, password }
        : {
            email,
            password,
            displayName: displayName || undefined
          };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      setError(data?.message || 'تعذر تنفيذ العملية');
      setLoading(false);
      return;
    }

    onSuccess(data.user);
    setLoading(false);
    onClose();
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="auth-head">
          <h3>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h3>
          <button className="btn ghost" type="button" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <label>
              الاسم
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="اسمك" />
            </label>
          )}

          <label>
            البريد الإلكتروني
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
          </label>

          <label>
            كلمة المرور
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
          </label>

          {error && <div className="notice error">{error}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="auth-foot">
          {mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button className="link" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'أنشئ حسابًا' : 'سجل دخول'}
          </button>
        </div>
      </div>
    </div>
  );
}
