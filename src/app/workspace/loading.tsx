'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export default function WorkspaceLoading() {
  return (
    <div className="flex h-screen w-full bg-[var(--bg)] overflow-hidden">
      {/* Sidebar skeleton */}
      <aside className="w-[240px] hidden lg:flex flex-col bg-[var(--bg-raised)] border-r border-[var(--border)] p-4 gap-4">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <div className="mt-4 space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header skeleton */}
        <div className="h-16 border-b border-[var(--border)] bg-[var(--bg-raised)]/80 flex items-center px-6 gap-4">
          <Skeleton className="h-5 w-48 rounded" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-8 space-y-6">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
