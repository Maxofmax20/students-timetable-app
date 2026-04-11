'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Uncaught client-side error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#08090e] text-[#f0f0f2] px-6">
      <div className="text-center max-w-md animate-panel-pop">
        <div className="relative mb-8 text-[var(--gold)]">
          <span className="material-symbols-outlined text-8xl">error</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">Something went wrong</h1>
        <p className="text-[#8b8d98] font-medium mb-10 leading-relaxed">
          An unexpected error occurred. We&apos;ve been notified and are looking into it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            className="h-12 px-8"
            onClick={() => reset()}
          >
            Try again
          </Button>
          <Button
            variant="secondary"
            className="h-12 px-8"
            onClick={() => window.location.href = '/'}
          >
            Go to Home
          </Button>
        </div>
      </div>
      
      {/* Visual background elements to match theme */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[rgba(200,164,68,0.05)] rounded-full blur-[200px] opacity-20 pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[rgba(59,130,246,0.03)] rounded-full blur-[200px] opacity-15 pointer-events-none" />
    </main>
  );
}
