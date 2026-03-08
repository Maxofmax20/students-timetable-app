import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] px-6">
      <div className="text-center max-w-md animate-panel-pop">
        {/* Large 404 */}
        <div className="relative mb-8">
          <span className="text-[160px] font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-[var(--text-muted)] to-transparent select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-[var(--gold-hover)] flex items-center justify-center shadow-[var(--shadow-glow)]">
              <span className="material-symbols-outlined text-4xl text-[var(--gold-fg)]">explore_off</span>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
          Page not found
        </h1>
        <p className="text-[var(--text-secondary)] font-medium mb-10 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-hover)] text-[var(--gold-fg)] font-bold text-sm hover:opacity-90 transition-opacity shadow-[var(--shadow-glow)]"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            Back to Home
          </Link>
          <Link
            href="/workspace"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-white font-bold text-sm hover:bg-[var(--surface-2)] transition-all"
          >
            <span className="material-symbols-outlined text-lg">dashboard</span>
            Go to Workspace
          </Link>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[var(--gold-muted)] rounded-full blur-[200px] opacity-20 pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--info-muted)] rounded-full blur-[200px] opacity-15 pointer-events-none" />
    </main>
  );
}
