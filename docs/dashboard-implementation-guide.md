# Dashboard Implementation Guide

## Quick Start Guide for Implementing the TubeBrew Dashboard

This guide provides step-by-step instructions for implementing the dashboard based on the design specification.

---

## Phase 1: Foundation Setup (Day 1)

### Step 1.1: Create Layout Structure

Create the main dashboard layout file:

**File:** `apps/web/src/app/(dashboard)/layout.tsx`

```typescript
import { Header } from './components/header';
import { Sidebar } from './components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      <div className="flex">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-64 border-r border-border min-h-[calc(100vh-4rem)] sticky top-16">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Step 1.2: Create Header Component

**File:** `apps/web/src/app/(dashboard)/components/header.tsx`

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-full items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            TubeBrew
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex gap-4">
            <Link href="/" className="text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/later" className="text-sm font-medium text-muted-foreground">
              Later
            </Link>
            <Link href="/settings" className="text-sm font-medium text-muted-foreground">
              Settings
            </Link>
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

### Step 1.3: Create Basic Sidebar

**File:** `apps/web/src/app/(dashboard)/components/sidebar.tsx`

```typescript
'use client';

import { useState } from 'react';

const CATEGORIES = [
  '전체',
  '기술',
  '게임',
  '교육',
  '엔터테인먼트',
  '음악',
  '스포츠',
  '뉴스',
  '기타',
];

interface SidebarProps {
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
}

export function Sidebar({
  selectedCategory,
  onCategoryChange,
}: SidebarProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-3">Categories</h3>
        <div className="space-y-1">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange?.(category === '전체' ? null : category)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                (category === '전체' && !selectedCategory) ||
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 2: API Implementation (Day 1-2)

### Step 2.1: Create Video Feed API

**File:** `apps/web/src/app/api/videos/feed/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const includeWatched = searchParams.get('includeWatched') === 'true';

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('google_id', user.id)
      .single();

    if (!userData) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.id;

    // Build query for user's channels
    let channelsQuery = supabase
      .from('user_channels')
      .select('channel_id')
      .eq('user_id', userId)
      .eq('is_hidden', false);

    const { data: userChannels } = await channelsQuery;

    if (!userChannels || userChannels.length === 0) {
      return Response.json({
        success: true,
        data: {
          videos: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
          },
        },
      });
    }

    const channelIds = userChannels.map((uc) => uc.channel_id);

    // Build videos query
    let videosQuery = supabase
      .from('videos')
      .select(`
        *,
        channel:channels(*),
        summaries(*)
      `, { count: 'exact' })
      .in('channel_id', channelIds);

    // Apply category filter
    if (category) {
      videosQuery = videosQuery.eq('channel.category', category);
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        videosQuery = videosQuery.order('published_at', { ascending: true });
        break;
      case 'views':
        videosQuery = videosQuery.order('view_count', { ascending: false });
        break;
      case 'duration':
        videosQuery = videosQuery.order('duration', { ascending: true });
        break;
      default: // newest
        videosQuery = videosQuery.order('published_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    videosQuery = videosQuery.range(from, to);

    const { data: videos, error: videosError, count } = await videosQuery;

    if (videosError) {
      throw videosError;
    }

    // Get bookmarks for these videos
    const videoIds = videos?.map((v) => v.id) || [];
    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('video_id')
      .eq('user_id', userId)
      .in('video_id', videoIds);

    const bookmarkedIds = new Set(bookmarks?.map((b) => b.video_id) || []);

    // Get watch history
    const { data: watchHistory } = await supabase
      .from('watch_history')
      .select('video_id')
      .eq('user_id', userId)
      .in('video_id', videoIds);

    const watchedIds = new Set(watchHistory?.map((w) => w.video_id) || []);

    // Get user settings for default summary level
    const { data: settings } = await supabase
      .from('user_settings')
      .select('summary_level')
      .eq('user_id', userId)
      .single();

    // Enrich videos with user-specific data
    const enrichedVideos = videos?.map((video) => ({
      ...video,
      isBookmarked: bookmarkedIds.has(video.id),
      isWatched: watchedIds.has(video.id),
      userSummaryLevel: settings?.summary_level || 2,
    }));

    // Filter out watched videos if needed
    const filteredVideos = includeWatched
      ? enrichedVideos
      : enrichedVideos?.filter((v) => !v.isWatched);

    return Response.json({
      success: true,
      data: {
        videos: filteredVideos,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > to + 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching video feed:', error);
    return Response.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
```

### Step 2.2: Create Bookmark API

**File:** `apps/web/src/app/api/videos/bookmark/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { videoId, action, priority = 1 } = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('google_id', user.id)
      .single();

    if (!userData) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.id;

    if (action === 'add') {
      // Add bookmark
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          video_id: videoId,
          priority,
        });

      if (error && error.code !== '23505') { // Ignore duplicate errors
        throw error;
      }

      return Response.json({
        success: true,
        data: { videoId, isBookmarked: true },
      });
    } else {
      // Remove bookmark
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId);

      if (error) {
        throw error;
      }

      return Response.json({
        success: true,
        data: { videoId, isBookmarked: false },
      });
    }
  } catch (error) {
    console.error('Error managing bookmark:', error);
    return Response.json(
      { error: 'Failed to update bookmark' },
      { status: 500 }
    );
  }
}
```

### Step 2.3: Create Watch API

**File:** `apps/web/src/app/api/videos/watch/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { videoId, source = 'tubebrew' } = await request.json();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('google_id', user.id)
      .single();

    if (!userData) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userData.id;

    // Add to watch history (idempotent)
    const { data, error } = await supabase
      .from('watch_history')
      .insert({
        user_id: userId,
        video_id: videoId,
        source,
      })
      .select()
      .single();

    // Ignore duplicate errors (already watched)
    if (error && error.code === '23505') {
      return Response.json({
        success: true,
        data: { videoId, watchedAt: new Date().toISOString() },
      });
    }

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      data: { videoId, watchedAt: data.watched_at },
    });
  } catch (error) {
    console.error('Error marking as watched:', error);
    return Response.json(
      { error: 'Failed to mark as watched' },
      { status: 500 }
    );
  }
}
```

---

## Phase 3: Video Components (Day 2-3)

### Step 3.1: Create VideoCard Component

**File:** `apps/web/src/components/dashboard/video-card.tsx`

```typescript
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
  const thumbnailUrl = video.thumbnailUrl || video.channel.thumbnailUrl;

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

  return (
    <Card className={`overflow-hidden transition-opacity ${isWatched ? 'opacity-60' : ''}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        <Image
          src={thumbnailUrl}
          alt={video.title}
          fill
          className="object-cover"
        />
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
          <p className="text-xs text-muted-foreground">
            {video.channel.title} • {new Date(video.publishedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Summary */}
        {summary && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <div className="font-medium mb-1">📝 Summary (Level {summaryLevel})</div>
            <p className="line-clamp-3">{summary.content}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant={isBookmarked ? 'default' : 'outline'}
            size="sm"
            onClick={handleBookmark}
            className="flex-1"
          >
            <Bookmark className={`w-4 h-4 mr-1 ${isBookmarked ? 'fill-current' : ''}`} />
            {isBookmarked ? 'Saved' : 'Save'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWatch}
            disabled={isWatched}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            {isWatched ? 'Watched' : 'Mark Read'}
          </Button>
        </div>

        {/* Open on YouTube */}
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline block text-center"
        >
          Watch on YouTube →
        </a>
      </div>
    </Card>
  );
}
```

### Step 3.2: Create VideoGrid Component

**File:** `apps/web/src/components/dashboard/video-grid.tsx`

```typescript
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
      <div className="text-center py-12">
        <p className="text-muted-foreground">No videos found</p>
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
```

---

## Phase 4: Main Dashboard Page (Day 3-4)

### Step 4.1: Update Dashboard Page

**File:** `apps/web/src/app/(dashboard)/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { VideoFeedClient } from './components/video-feed-client';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/signin');
  }

  // Get user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('google_id', user.id)
    .single();

  if (userError || !userData) {
    redirect('/onboarding');
  }

  // Check if user has channels
  const { count } = await supabase
    .from('user_channels')
    .select('channel_id', { count: 'exact' })
    .eq('user_id', userData.id)
    .eq('is_hidden', false);

  if (!count || count === 0) {
    redirect('/onboarding');
  }

  // Get user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userData.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your personalized video feed with AI summaries
        </p>
      </div>

      <VideoFeedClient
        userId={userData.id}
        defaultSummaryLevel={settings?.summary_level || 2}
      />
    </div>
  );
}
```

### Step 4.2: Create VideoFeedClient Component

**File:** `apps/web/src/app/(dashboard)/components/video-feed-client.tsx`

```typescript
'use client';

import { useState, useEffect, useTransition } from 'react';
import { VideoGrid } from '@/components/dashboard/video-grid';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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

  const [summaryLevel, setSummaryLevel] = useState(defaultSummaryLevel);
  const [category, setCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    loadVideos(1, true);
  }, [category, sortBy]);

  async function loadVideos(pageNum: number, replace = false) {
    setIsLoading(true);

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

      if (data.success) {
        setVideos((prev) =>
          replace ? data.data.videos : [...prev, ...data.data.videos]
        );
        setPage(pageNum);
        setHasMore(data.data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBookmark(videoId: string, action: 'add' | 'remove') {
    try {
      await fetch('/api/videos/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action }),
      });
    } catch (error) {
      console.error('Error bookmarking video:', error);
    }
  }

  async function handleWatch(videoId: string) {
    try {
      await fetch('/api/videos/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
    } catch (error) {
      console.error('Error marking as watched:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="views">Most Viewed</option>
            <option value="duration">Shortest</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Summary Level:</span>
          {[1, 2, 3, 4].map((level) => (
            <button
              key={level}
              onClick={() => setSummaryLevel(level as 1 | 2 | 3 | 4)}
              className={`w-8 h-8 rounded-full border-2 ${
                summaryLevel === level
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/30'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      {isLoading && page === 1 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
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
      {hasMore && !isLoading && (
        <div className="flex justify-center">
          <Button
            onClick={() => loadVideos(page + 1, false)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Videos display in grid layout
- [ ] Thumbnail images load correctly
- [ ] Summaries display for each video
- [ ] Bookmark button toggles state
- [ ] Watch button marks video as read
- [ ] Category filter works
- [ ] Sort selector changes order
- [ ] Summary level selector updates previews
- [ ] Load more button fetches next page
- [ ] Responsive on mobile
- [ ] Sidebar collapses on mobile
- [ ] YouTube links open correctly

---

## Next Steps

After completing the basic dashboard:

1. Add loading skeletons
2. Implement error boundaries
3. Add video detail modal
4. Improve mobile UX
5. Add search functionality
6. Implement settings page
7. Create "Later" page for bookmarks

---

## Troubleshooting

**Videos not loading:**
- Check user has completed onboarding
- Verify worker has collected videos
- Check database permissions (RLS policies)

**Summaries not showing:**
- Verify summary generation job has run
- Check summaries table has data
- Verify summary level exists

**Images not loading:**
- Check thumbnail URLs in database
- Verify Next.js Image configuration
- Check CORS settings for YouTube thumbnails

---

## Performance Tips

1. Use Next.js Image for automatic optimization
2. Implement virtual scrolling for 100+ videos
3. Add intersection observer for lazy loading
4. Cache API responses with SWR or React Query
5. Prefetch next page on scroll approach

---

**End of Implementation Guide**
