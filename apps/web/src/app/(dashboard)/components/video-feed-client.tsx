'use client';

import { useState, useEffect, useTransition } from 'react';
import { VideoGrid } from '@/components/dashboard/video-grid';
import { VideoGridSkeleton } from '@/components/dashboard/video-card-skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Video, RefreshCcw } from 'lucide-react';
import type { DashboardVideo } from '@tubebrew/types';

interface VideoFeedClientProps {
  userId: string;
  defaultSummaryLevel?: 1 | 2 | 3 | 4;
}

export function VideoFeedClient({
  userId,
  defaultSummaryLevel = 2,
}: VideoFeedClientProps) {
  const [videos, setVideos] = useState<DashboardVideo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [summaryLevel, setSummaryLevel] =
    useState<1 | 2 | 3 | 4>(defaultSummaryLevel);
  const [category, setCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    loadVideos(1, true);
  }, [category, sortBy]);

  async function loadVideos(pageNum: number, replace = false) {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sortBy,
      });

      if (category) {
        params.set('category', category);
      }

      const response = await fetch(`/api/videos/feed?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch videos');
      }

      if (data.success) {
        setVideos((prev) =>
          replace ? data.data.videos : [...prev, ...data.data.videos]
        );
        setPage(pageNum);
        setHasMore(data.data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      setError(error instanceof Error ? error.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBookmark(videoId: string, action: 'add' | 'remove') {
    try {
      const response = await fetch('/api/videos/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action }),
      });

      if (!response.ok) {
        throw new Error('Failed to bookmark video');
      }
    } catch (error) {
      console.error('Error bookmarking video:', error);
      // Optionally show error toast
    }
  }

  async function handleWatch(videoId: string) {
    try {
      const response = await fetch('/api/videos/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as watched');
      }
    } catch (error) {
      console.error('Error marking as watched:', error);
      // Optionally show error toast
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card border border-border rounded-lg p-4">
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="views">Most Viewed</option>
            <option value="duration">Shortest</option>
          </select>
        </div>

        <div className="flex gap-3 items-center">
          <span className="text-sm text-muted-foreground">Summary Level:</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => setSummaryLevel(level as 1 | 2 | 3 | 4)}
                className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-all ${
                  summaryLevel === level
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                }`}
                title={`Level ${level}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadVideos(1, true)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Video Grid */}
      {isLoading && page === 1 ? (
        <VideoGridSkeleton count={6} />
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="bg-muted rounded-full p-6 mb-6">
            <Video className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No videos found</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {category
              ? `No videos in "${category}" category. Try selecting a different category.`
              : "We couldn't find any videos. Try adjusting your filters or check back later."}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCategory(null);
                setSortBy('newest');
                loadVideos(1, true);
              }}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <VideoGrid
          videos={videos}
          summaryLevel={summaryLevel}
          onBookmark={handleBookmark}
          onWatch={handleWatch}
        />
      )}

      {/* Load More */}
      {hasMore && !isLoading && videos.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => loadVideos(page + 1, false)}
            disabled={isPending}
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Videos'
            )}
          </Button>
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && videos.length > 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          You've reached the end of your feed
        </div>
      )}
    </div>
  );
}
