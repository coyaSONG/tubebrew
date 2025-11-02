'use client';

import { VideoCard } from './video-card';
import type { DashboardVideo } from '@tubebrew/types';

interface VideoGridProps {
  videos: DashboardVideo[];
  summaryLevel?: 1 | 2 | 3 | 4;
  onBookmark?: (videoId: string, action: 'add' | 'remove') => void;
  onWatch?: (videoId: string) => void;
}

export function VideoGrid({
  videos,
  summaryLevel = 2,
  onBookmark,
  onWatch,
}: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-5xl">📭</div>
        <h3 className="text-xl font-semibold">No Videos Found</h3>
        <p className="text-muted-foreground">
          Your subscribed channels haven't posted recently.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          summaryLevel={summaryLevel}
          onBookmark={onBookmark}
          onWatch={onWatch}
        />
      ))}
    </div>
  );
}
