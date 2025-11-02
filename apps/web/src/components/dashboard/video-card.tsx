'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, Check, Eye } from 'lucide-react';
import type { DashboardVideo } from '@tubebrew/types';

interface VideoCardProps {
  video: DashboardVideo;
  summaryLevel?: 1 | 2 | 3 | 4;
  onBookmark?: (videoId: string, action: 'add' | 'remove') => void;
  onWatch?: (videoId: string) => void;
}

export function VideoCard({
  video,
  summaryLevel = 2,
  onBookmark,
  onWatch,
}: VideoCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(video.isBookmarked);
  const [isWatched, setIsWatched] = useState(video.isWatched);

  const summary = video.summaries?.find((s) => s.level === summaryLevel);
  const thumbnailUrl = video.thumbnailUrl || video.channel?.thumbnailUrl || '';

  const handleBookmark = async () => {
    const action = isBookmarked ? 'remove' : 'add';
    setIsBookmarked(!isBookmarked);
    onBookmark?.(video.id, action);
  };

  const handleWatch = async () => {
    setIsWatched(true);
    onWatch?.(video.id);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string | Date | undefined) => {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}초 전`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}주 전`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}개월 전`;
    return `${Math.floor(months / 12)}년 전`;
  };

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg ${
        isWatched ? 'opacity-60' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
        {isWatched && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Channel & Title */}
        <div>
          <h3 className="font-medium line-clamp-2 text-sm mb-1">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{video.channel?.title}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.publishedAt)}</span>
          </div>
          {video.channel?.category && (
            <div className="mt-1">
              <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded-full">
                {video.channel.category}
              </span>
            </div>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <div className="text-xs bg-muted/50 p-3 rounded-md space-y-1">
            <div className="font-medium text-muted-foreground">
              📝 AI Summary (Level {summaryLevel})
            </div>
            <p className="line-clamp-3 text-foreground/90">{summary.content}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant={isBookmarked ? 'default' : 'outline'}
            size="sm"
            onClick={handleBookmark}
            className="flex-1 text-xs"
          >
            <Bookmark
              className={`w-3 h-3 mr-1 ${isBookmarked ? 'fill-current' : ''}`}
            />
            {isBookmarked ? 'Saved' : 'Save'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWatch}
            disabled={isWatched}
            className="flex-1 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            {isWatched ? 'Watched' : 'Mark Read'}
          </Button>
        </div>

        {/* Open on YouTube */}
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline block text-center pt-1"
        >
          Watch on YouTube →
        </a>
      </div>
    </Card>
  );
}
