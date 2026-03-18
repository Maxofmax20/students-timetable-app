'use client';

import { useEffect, type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/Toast';

type PreferencePayload = {
  ok?: boolean;
  data?: {
    item?: {
      theme?: 'SYSTEM' | 'LIGHT' | 'DARK';
      reduceMotion?: boolean;
    };
  };
};

function applyClientPreferences(theme: 'SYSTEM' | 'LIGHT' | 'DARK' = 'SYSTEM', reduceMotion = false) {
  const root = document.documentElement;
  const resolvedTheme = theme === 'SYSTEM'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme.toLowerCase();

  root.dataset.theme = resolvedTheme;
  root.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
}

function PreferenceHydrator() {
  useEffect(() => {
    let disposed = false;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    let currentTheme: 'SYSTEM' | 'LIGHT' | 'DARK' = 'SYSTEM';
    let currentReduceMotion = false;

    const sync = () => {
      if (!disposed) applyClientPreferences(currentTheme, currentReduceMotion);
    };

    const handleSystemThemeChange = () => {
      if (currentTheme === 'SYSTEM') sync();
    };

    applyClientPreferences('SYSTEM', false);
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    fetch('/api/v1/preferences', { credentials: 'include' })
      .then((response) => response.json() as Promise<PreferencePayload>)
      .then((payload) => {
        if (!payload?.ok) return;
        currentTheme = payload.data?.item?.theme || 'SYSTEM';
        currentReduceMotion = Boolean(payload.data?.item?.reduceMotion);
        sync();
      })
      .catch(() => null);

    return () => {
      disposed = true;
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <PreferenceHydrator />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
