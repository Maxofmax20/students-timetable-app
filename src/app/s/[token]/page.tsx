import Link from "next/link";

export default async function SharedTimetablePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-lg)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--gold)]">
          <span className="material-symbols-outlined text-3xl">link_off</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Legacy shared links are disabled</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
          This URL belongs to an older timetable sharing system that is no longer part of the active workspace product.
          If you need access, ask the workspace owner to invite you directly or export the relevant schedule data.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[var(--gold)] text-[var(--gold-fg)] font-bold">
            Go to Sign In
          </Link>
          <Link href="/workspace" className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-[var(--border)] text-white font-semibold bg-[var(--surface-2)]">
            Open Workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
