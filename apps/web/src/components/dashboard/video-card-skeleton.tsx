import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="relative">
        {/* Thumbnail Skeleton */}
        <Skeleton className="aspect-video w-full" />

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Channel Info */}
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />

            <div className="flex-1 space-y-2">
              {/* Title */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />

              {/* Channel name */}
              <Skeleton className="h-3 w-24" />

              {/* Metadata */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>

              {/* Category badge */}
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>

          {/* AI Summary Skeleton */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>

          {/* Actions Skeleton */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function VideoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}
