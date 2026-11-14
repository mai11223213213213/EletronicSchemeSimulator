
import { Skeleton } from '@/components/ui/skeleton'

export function WorkspaceSkeleton() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#101716]">
      <div className="flex w-64 shrink-0 flex-col gap-4 border-r border-white/10 bg-[#19211f] p-4">
        <Skeleton className="h-8 w-36 bg-stone-700/60" />
        <Skeleton className="h-10 w-full bg-stone-700/60" />

        <div className="mt-4 space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-12 w-full rounded-xl bg-stone-700/50"
            />
          ))}
        </div>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-3">
          <Skeleton className="h-10 w-36 rounded-xl bg-stone-700/60" />
          <Skeleton className="h-10 w-28 rounded-xl bg-stone-700/60" />
        </div>

        <div className="absolute right-4 top-4 flex w-64 flex-col gap-3">
          <Skeleton className="h-52 w-full rounded-2xl bg-stone-700/50" />
          <Skeleton className="h-40 w-full rounded-2xl bg-stone-700/50" />
        </div>

        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4">
          <Skeleton className="h-3 w-3 rounded-full bg-teal-400/40" />
          <Skeleton className="h-3 w-28 bg-stone-700/60" />
        </div>
      </div>
    </main>
  )
}
