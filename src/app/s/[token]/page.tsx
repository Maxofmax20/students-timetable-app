import Link from "next/link";

export default async function SharedTimetablePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 flex items-center justify-center">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold mb-2">Shared View Removed</h1>
        <p className="text-sm text-slate-600 mb-4">
          Old shared pages were removed during the full reset. New sharing will return in the rebuilt platform.
        </p>
        <p className="text-xs text-slate-500 mb-5 break-all">Token: {params.token}</p>

        <Link href="/" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm">
          <span>Go Home</span>
        </Link>
      </div>
    </main>
  );
}
