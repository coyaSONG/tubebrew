'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Bookmark,
  BookmarkCheck,
  Play,
  Clock,
  Eye,
  ThumbsUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DashboardVideo, SummaryLevel } from '@tubebrew/types';

interface VideoCardProps {
  video: DashboardVideo;
  summaryLevel?: SummaryLevel;
  relevanceScore?: number;
  onBookmark?: (videoId: string, action: 'add' | 'remove') => void;
  onWatch?: (videoId: string) => void;
}

export function VideoCard({
  video,
  summaryLevel: initialSummaryLevel = 2,
  relevanceScore,
  onBookmark,
  onWatch,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(video.isBookmarked);
  const [isWatched, setIsWatched] = useState(video.isWatched);
  const [summaryLevel, setSummaryLevel] =
    useState<SummaryLevel>(initialSummaryLevel);
  const [showFullSummary, setShowFullSummary] = useState(false);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const action = isBookmarked ? 'remove' : 'add';
    setIsBookmarked(!isBookmarked);
    onBookmark?.(video.id, action);
  };

  const handleWatch = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWatched(true);
    onWatch?.(video.id);
  };

  const cycleSummaryLevel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const levels: SummaryLevel[] = [1, 2, 3, 4];
    const currentIndex = levels.indexOf(summaryLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    setSummaryLevel(levels[nextIndex]);
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(
        seconds % 60
      )
        .toString()
        .padStart(2, '0')}`;
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

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const summary = video.summaries?.find((s) => s.level === summaryLevel);
  const thumbnailUrl = video.thumbnailUrl || video.channel?.thumbnailUrl || '';

  return (
    <Card
      className="group relative overflow-hidden bg-card border-border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {thumbnailUrl && (
            <Image
              src={thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
          )}

          {/* Duration Badge */}
          {video.duration && (
            <Badge className="absolute bottom-2 right-2 bg-black/80 text-white border-0 font-semibold">
              {formatDuration(video.duration)}
            </Badge>
          )}

          {/* Relevance Score */}
          {relevanceScore && relevanceScore > 70 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 text-white px-2 py-1 rounded-md text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              {relevanceScore}%
            </div>
          )}

          {/* Watched Overlay */}
          {isWatched && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-primary text-primary-foreground rounded-full p-3">
                <Eye className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Hover Play Button */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${
              isHovered && !isWatched ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <a
              href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                handleWatch(e);
              }}
            >
              <Button
                size="lg"
                className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 transition-transform duration-300 hover:scale-110"
              >
                <Play className="w-8 h-8 fill-current" />
              </Button>
            </a>
          </div>
        </div>

        {/* Content - Reduced padding for better thumbnail ratio */}
        <div className="p-3 space-y-3">
          {/* Channel Info */}
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage
                src={video.channel?.thumbnailUrl}
                alt={video.channel?.title}
              />
              <AvatarFallback>
                {video.channel?.title?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors text-base">
                {video.title}
              </h3>
              <p className="text-sm font-medium text-muted-foreground">
                {video.channel?.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {/* Simplified metadata: Show views if significant (>100k), otherwise show time */}
                {video.viewCount && video.viewCount > 100000 ? (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViewCount(video.viewCount)} views
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(video.publishedAt)}
                  </span>
                )}
              </div>
              {video.channel?.category && (
                <div className="mt-1">
                  <Badge variant="outline" className="text-xs">
                    {video.channel.category}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* AI Summary - Always Visible (Core Feature) */}
          {summary && (
            <div className="space-y-2 border border-primary/20 bg-primary/5 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    AI Summary
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-primary/10 md:h-5"
                    onClick={cycleSummaryLevel}
                  >
                    Level {summaryLevel}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 md:h-6 md:w-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowFullSummary(!showFullSummary);
                  }}
                >
                  {showFullSummary ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div
                className={`text-sm text-foreground leading-relaxed transition-all duration-300 ${
                  showFullSummary ? 'line-clamp-none' : 'line-clamp-2'
                }`}
              >
                {summary.content}
              </div>
            </div>
          )}

          {/* Actions - Always visible on mobile, hover on desktop */}
          <div
            className={`flex items-center gap-2 pt-2 border-t border-border transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'
            }`}
          >
            <Button
              variant={isBookmarked ? 'default' : 'outline'}
              size="sm"
              className="flex-1 transition-all duration-300 text-xs h-9 md:h-8"
              onClick={handleBookmark}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-3 h-3 mr-1" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-3 h-3 mr-1" />
                  Save
                </>
              )}
            </Button>

            <Button
              variant={isWatched ? 'secondary' : 'outline'}
              size="sm"
              className="flex-1 transition-all duration-300 text-xs h-9 md:h-8"
              onClick={handleWatch}
              disabled={isWatched}
            >
              {isWatched ? (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Watched
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Watch
                </>
              )}
            </Button>

            <a
              href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="sm" className="px-3 h-9 md:h-8">
                <ThumbsUp className="w-3 h-3" />
              </Button>
            </a>
          </div>
        </div>

        {/* Relevance Indicator Bar */}
        {relevanceScore && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className={`h-full transition-all duration-500 ${getRelevanceColor(
                relevanceScore
              )}`}
              style={{ width: `${relevanceScore}%` }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
