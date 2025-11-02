# TubeBrew Dashboard Design Specification

**Version:** 1.0
**Date:** 2025-11-02
**Status:** Draft

---

## 1. Overview

The TubeBrew dashboard is the primary interface for users to discover, browse, and consume AI-summarized YouTube videos from their subscribed channels. This document outlines the complete design specification including layout, components, API contracts, and implementation guidelines.

### 1.1 Design Goals

- **Content Discovery**: Enable users to quickly find relevant videos through category filtering and smart sorting
- **Efficient Consumption**: Provide AI summaries at multiple detail levels to save time
- **Personalization**: Respect user preferences for summary levels and channel organization
- **Responsive Design**: Support desktop, tablet, and mobile viewports
- **Performance**: Load quickly with pagination and lazy loading

---

## 2. System Architecture

### 2.1 Component Hierarchy

```
DashboardLayout
├── Header (Sticky)
│   ├── Logo
│   ├── Navigation (Dashboard, Later, Settings)
│   └── UserMenu
├── Sidebar (Desktop Only)
│   ├── CategoryFilter
│   ├── ChannelList
│   └── QuickActions
└── MainContent
    ├── FeedHeader
    │   ├── ViewToggle (Grid/List)
    │   ├── SortSelector
    │   └── SummaryLevelSelector
    ├── VideoFeed
    │   ├── VideoCard[] (Grid View)
    │   └── VideoListItem[] (List View)
    └── LoadMoreButton
```

### 2.2 Data Flow

```
User Authentication (middleware)
    ↓
Server Component: DashboardPage
    ↓
Fetch Initial Data (SSR)
    - User Settings
    - User Channels
    - First Page of Videos
    ↓
Client Component: VideoFeed
    ↓
User Interactions
    - Filter by Category
    - Sort Videos
    - Change Summary Level
    - Bookmark/Watch Actions
    ↓
API Routes (/api/videos/*)
    ↓
Database Updates
    ↓
Optimistic UI Updates
```

---

## 3. Layout Design

### 3.1 Desktop Layout (≥1024px)

```
┌────────────────────────────────────────────────────────┐
│  Header (h-16, fixed top)                              │
│  [Logo] [Dashboard] [Later] [Settings]     [UserMenu]  │
├──────────┬─────────────────────────────────────────────┤
│          │                                             │
│ Sidebar  │  Main Content Area                         │
│ (w-64)   │                                             │
│          │  ┌─────────────────────────────────────┐   │
│ Categories│  │ Feed Header                        │   │
│ ○ All    │  │ [Grid/List] [Sort] [Level]         │   │
│ ○ Tech   │  └─────────────────────────────────────┘   │
│ ○ Gaming │                                             │
│ ...      │  ┌───┬───┬───┐                             │
│          │  │ V │ V │ V │  Video Grid                 │
│ Channels │  ├───┼───┼───┤                             │
│ [Filter] │  │ V │ V │ V │                             │
│ • Chan 1 │  └───┴───┴───┘                             │
│ • Chan 2 │                                             │
│ ...      │  [Load More]                                │
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

### 3.2 Mobile Layout (<768px)

```
┌────────────────────────────┐
│  Header (fixed)            │
│  [☰] TubeBrew    [User]    │
├────────────────────────────┤
│                            │
│  Filter Bar (sticky)       │
│  [Category ▼] [Sort ▼]     │
│                            │
├────────────────────────────┤
│  Video Card                │
│  ┌────────────────────┐   │
│  │ Thumbnail          │   │
│  │                    │   │
│  ├────────────────────┤   │
│  │ Title              │   │
│  │ Channel • 2h ago   │   │
│  │ Summary preview... │   │
│  └────────────────────┘   │
│                            │
│  Video Card                │
│  ...                       │
│                            │
└────────────────────────────┘
```

---

## 4. Component Specifications

### 4.1 VideoCard Component

**Purpose:** Display video information with AI summary preview

**Props:**
```typescript
interface VideoCardProps {
  video: DashboardVideo;
  summaryLevel: SummaryLevel;
  onBookmark: (videoId: string) => void;
  onWatch: (videoId: string) => void;
  onOpenDetail: (videoId: string) => void;
}
```

**Layout:**
```
┌─────────────────────────────┐
│  [Thumbnail]                │
│  [Play Icon Overlay]        │
│  [Duration Badge]           │
├─────────────────────────────┤
│  [Channel Avatar] [Title]   │
│  Channel Name • Upload Time │
│  [Category Badge]           │
├─────────────────────────────┤
│  📝 AI Summary (Level X)    │
│  Summary content preview... │
│  [Read More →]              │
├─────────────────────────────┤
│  [👁️ Watch] [🔖 Save]       │
│  [View Count] [Duration]    │
└─────────────────────────────┘
```

**States:**
- Default
- Hover (show actions)
- Bookmarked (filled bookmark icon)
- Watched (opacity reduced, checkmark)

### 4.2 CategoryFilter Component

**Purpose:** Filter videos by channel category

**Props:**
```typescript
interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  videoCounts?: Record<string, number>;
}
```

**Layout:**
```
Categories
○ All (124)
○ Tech (45)
○ Gaming (32)
○ Education (28)
○ Entertainment (19)
```

### 4.3 VideoDetailModal Component

**Purpose:** Display full video details with all summary levels

**Props:**
```typescript
interface VideoDetailModalProps {
  video: DashboardVideo;
  isOpen: boolean;
  onClose: () => void;
  onBookmark: (videoId: string) => void;
  onWatch: (videoId: string) => void;
}
```

**Layout:**
```
┌──────────────────────────────────────────┐
│  ✕ Close                                 │
├──────────────────────────────────────────┤
│  [YouTube Embed / Thumbnail]             │
├──────────────────────────────────────────┤
│  Title: [Video Title]                    │
│  Channel: [Channel Name]                 │
│  Published: [Date] • Duration: [Time]    │
│  Views: [Count] • Category: [Badge]      │
├──────────────────────────────────────────┤
│  [🔖 Bookmark] [👁️ Mark Watched]         │
│  [🔗 Open on YouTube]                    │
├──────────────────────────────────────────┤
│  AI Summaries                            │
│  ┌──────────────────────────────────┐   │
│  │ [Level 1] [Level 2] [Level 3] [4]│   │
│  ├──────────────────────────────────┤   │
│  │ Summary content for selected     │   │
│  │ level...                          │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [Copy Summary] [Share]                  │
└──────────────────────────────────────────┘
```

### 4.4 FeedHeader Component

**Purpose:** Control feed display and filtering options

**Props:**
```typescript
interface FeedHeaderProps {
  viewMode: 'grid' | 'list';
  sortBy: 'newest' | 'oldest' | 'views' | 'duration';
  summaryLevel: SummaryLevel;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onSortChange: (sort: string) => void;
  onSummaryLevelChange: (level: SummaryLevel) => void;
}
```

**Layout:**
```
┌────────────────────────────────────────────┐
│  [⊞ Grid] [☰ List]  Sort: [Newest ▼]      │
│  Summary Level: [○ ○ ◉ ○] (Level 3)       │
└────────────────────────────────────────────┘
```

---

## 5. API Contracts

### 5.1 GET /api/videos/feed

**Purpose:** Fetch paginated video feed with filters

**Request:**
```typescript
interface FeedRequest {
  page?: number;          // Default: 1
  limit?: number;         // Default: 20, Max: 50
  category?: string;      // Optional: filter by category
  sortBy?: 'newest' | 'oldest' | 'views' | 'duration';
  channelIds?: string[];  // Optional: filter by specific channels
  includeWatched?: boolean; // Default: false
}
```

**Response:**
```typescript
interface FeedResponse {
  success: true;
  data: {
    videos: DashboardVideo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

interface DashboardVideo {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
  viewCount: number;
  channel: {
    id: string;
    youtubeId: string;
    title: string;
    thumbnailUrl: string;
    category: string;
  };
  summaries: {
    level: 1 | 2 | 3 | 4;
    content: string;
  }[];
  isBookmarked: boolean;
  isWatched: boolean;
  userSummaryLevel: 1 | 2 | 3 | 4;
}
```

**Implementation Notes:**
- Use `DBUtils.getRecentVideos()` as base query
- Join with `bookmarks` and `watch_history` to set flags
- Filter out watched videos unless `includeWatched=true`
- Apply category filter by joining with `channels`
- Apply sorting based on `sortBy` parameter

### 5.2 POST /api/videos/bookmark

**Purpose:** Add or remove video bookmark

**Request:**
```typescript
interface BookmarkRequest {
  videoId: string;
  action: 'add' | 'remove';
  priority?: 1 | 2 | 3; // Only for 'add'
}
```

**Response:**
```typescript
interface BookmarkResponse {
  success: true;
  data: {
    videoId: string;
    isBookmarked: boolean;
  };
}
```

**Implementation:**
- Use `DBUtils.addBookmark()` or `DBUtils.removeBookmark()`
- Verify user owns the video access
- Return updated bookmark state

### 5.3 POST /api/videos/watch

**Purpose:** Mark video as watched

**Request:**
```typescript
interface WatchRequest {
  videoId: string;
  source?: 'tubebrew' | 'youtube'; // Default: 'tubebrew'
}
```

**Response:**
```typescript
interface WatchResponse {
  success: true;
  data: {
    videoId: string;
    watchedAt: string;
  };
}
```

**Implementation:**
- Use `DBUtils.markAsWatched()`
- Handle duplicate watch (idempotent operation)

### 5.4 GET /api/videos/[id]

**Purpose:** Get detailed video information

**Response:**
```typescript
interface VideoDetailResponse {
  success: true;
  data: {
    video: DashboardVideo;
    transcript?: {
      language: string;
      content: string;
    };
  };
}
```

**Implementation:**
- Use `DBUtils.getVideoWithSummaries()`
- Include transcript if available
- Verify user has access to video

---

## 6. State Management

### 6.1 Server State (React Server Components)

**Initial Page Load:**
```typescript
// apps/web/src/app/(dashboard)/page.tsx
async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user settings
  const settings = await db.getUserSettings(userId);

  // Fetch initial videos (first page)
  const initialVideos = await fetchVideos({
    page: 1,
    limit: 20,
    sortBy: 'newest',
  });

  return (
    <DashboardLayout>
      <VideoFeedClient
        initialVideos={initialVideos}
        userSettings={settings}
      />
    </DashboardLayout>
  );
}
```

### 6.2 Client State (React Client Components)

**VideoFeedClient Component:**
```typescript
'use client';

interface VideoFeedState {
  videos: DashboardVideo[];
  filters: {
    category: string | null;
    sortBy: 'newest' | 'oldest' | 'views' | 'duration';
    viewMode: 'grid' | 'list';
  };
  pagination: {
    page: number;
    hasMore: boolean;
  };
  preferences: {
    summaryLevel: SummaryLevel;
  };
  ui: {
    isLoading: boolean;
    selectedVideo: DashboardVideo | null;
  };
}
```

**State Management Approach:**
- Use `useState` for local UI state
- Use `useOptimistic` for bookmark/watch actions
- Use `useTransition` for loading states
- Consider React Query or SWR for server state caching (optional)

### 6.3 Optimistic Updates

**Example: Bookmark Action**
```typescript
const [optimisticVideos, setOptimisticVideos] = useOptimistic(
  videos,
  (state, { videoId, action }) =>
    state.map(v =>
      v.id === videoId
        ? { ...v, isBookmarked: action === 'add' }
        : v
    )
);

async function handleBookmark(videoId: string, action: 'add' | 'remove') {
  // Optimistically update UI
  setOptimisticVideos({ videoId, action });

  // Make API call
  const response = await fetch('/api/videos/bookmark', {
    method: 'POST',
    body: JSON.stringify({ videoId, action }),
  });

  // Revalidate if needed
  if (!response.ok) {
    // Rollback will happen automatically
  }
}
```

---

## 7. Styling and Design System

### 7.1 Color Palette

```typescript
const colors = {
  primary: 'hsl(var(--primary))',      // Brand color
  secondary: 'hsl(var(--secondary))',  // Accent color
  background: 'hsl(var(--background))', // Page background
  card: 'hsl(var(--card))',            // Card background
  muted: 'hsl(var(--muted))',          // Subtle backgrounds
  border: 'hsl(var(--border))',        // Borders
  foreground: 'hsl(var(--foreground))', // Text color
};
```

### 7.2 Typography

```typescript
const typography = {
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
  body: 'text-base',
  small: 'text-sm',
  muted: 'text-muted-foreground',
};
```

### 7.3 Spacing

- Use Tailwind spacing scale: 0, 1, 2, 3, 4, 6, 8, 12, 16, 24
- Card padding: `p-4` (16px)
- Section spacing: `space-y-6` (24px)
- Grid gap: `gap-4` (16px)

### 7.4 Component Variants

**VideoCard:**
- Grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- List: Full width, horizontal layout

**Buttons:**
- Primary: Filled background, high contrast
- Secondary: Outlined, subtle
- Ghost: No background, text only

---

## 8. Responsive Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
};
```

**Layout Behavior:**
- `< 768px`: Mobile (no sidebar, stacked layout)
- `768px - 1024px`: Tablet (collapsible sidebar)
- `≥ 1024px`: Desktop (persistent sidebar)

---

## 9. Performance Optimization

### 9.1 Initial Load

- **SSR First Page**: Render first 20 videos server-side
- **Critical CSS**: Inline above-the-fold styles
- **Image Optimization**: Use Next.js Image component with blur placeholder
- **Font Loading**: Preload Geist fonts

### 9.2 Runtime Performance

- **Virtualization**: Consider `react-window` for long lists (>100 items)
- **Lazy Loading**: Load images as they enter viewport
- **Pagination**: Fetch 20 videos per page
- **Debouncing**: Debounce filter/sort changes (300ms)

### 9.3 Caching Strategy

- **Server Cache**: Cache feed results for 60 seconds (SWR)
- **Client Cache**: Keep last 3 pages in memory
- **Image Cache**: Browser cache with long TTL (7 days)

---

## 10. Accessibility

### 10.1 Keyboard Navigation

- Tab order: Header → Sidebar → Main content
- Focus indicators: Visible outline on all interactive elements
- Shortcuts:
  - `/`: Focus search (future feature)
  - `Esc`: Close modals
  - Arrow keys: Navigate video cards

### 10.2 Screen Readers

- Semantic HTML: Use `<main>`, `<nav>`, `<article>`, `<aside>`
- ARIA labels: Label all interactive elements
- Live regions: Announce loading states
- Alt text: Descriptive alt text for thumbnails

### 10.3 Color Contrast

- WCAG AA compliance (4.5:1 for normal text)
- Support dark mode
- Don't rely solely on color for information

---

## 11. Error Handling

### 11.1 Error States

**Network Error:**
```
┌────────────────────────────┐
│  ⚠️ Connection Error        │
│  Failed to load videos.    │
│  [Retry]                   │
└────────────────────────────┘
```

**Empty State:**
```
┌────────────────────────────┐
│  📭 No Videos Found         │
│  Your subscribed channels  │
│  haven't posted recently.  │
│  [Refresh] [Add Channels]  │
└────────────────────────────┘
```

**Authentication Error:**
```
Redirect to /auth/signin
```

### 11.2 Error Recovery

- Auto-retry failed requests (exponential backoff)
- Show error toast for user actions
- Preserve user state during errors
- Log errors to monitoring service

---

## 12. Implementation Plan

### Phase 1: Core Layout (Priority: High)
- [ ] Create DashboardLayout component
- [ ] Implement Header with navigation
- [ ] Build Sidebar with category filter
- [ ] Set up responsive behavior

### Phase 2: Video Display (Priority: High)
- [ ] Build VideoCard component
- [ ] Implement VideoGrid container
- [ ] Add thumbnail loading states
- [ ] Create VideoListItem variant

### Phase 3: API Integration (Priority: High)
- [ ] Implement /api/videos/feed endpoint
- [ ] Add pagination support
- [ ] Implement filtering logic
- [ ] Add error handling

### Phase 4: Interactions (Priority: Medium)
- [ ] Implement bookmark functionality
- [ ] Add watch marking
- [ ] Create VideoDetailModal
- [ ] Add optimistic updates

### Phase 5: Polish (Priority: Low)
- [ ] Add loading skeletons
- [ ] Implement animations
- [ ] Add empty states
- [ ] Optimize performance

---

## 13. Testing Strategy

### 13.1 Unit Tests

- Component rendering
- State management logic
- API utility functions
- Error handling

### 13.2 Integration Tests

- API endpoint responses
- Database queries
- Auth middleware
- User flows

### 13.3 E2E Tests (Future)

- Complete user journey
- Bookmark/watch flows
- Filter and sort interactions
- Modal interactions

---

## 14. Migration Notes

### Current State
- Placeholder homepage (apps/web/src/app/page.tsx)
- DB utilities available (packages/db/src/index.ts)
- Type definitions ready (packages/types/src/index.ts)
- Auth middleware functional

### Required Changes
1. Convert homepage to full dashboard
2. Create new component files in apps/web/src/components/
3. Implement API routes in apps/web/src/app/api/videos/
4. Add client-side state management
5. Update middleware for dashboard route protection

---

## 15. Future Enhancements

### P1 (Next Iteration)
- Search functionality
- Video filtering by duration
- Bulk actions (mark multiple as watched)
- Keyboard shortcuts

### P2 (Later)
- Video player integration
- Transcript display
- Share functionality
- Custom playlists

### P3 (Nice to Have)
- Offline support (PWA)
- Browser notifications
- Video recommendations
- Analytics dashboard

---

## Appendix A: File Structure

```
apps/web/src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Dashboard layout wrapper
│   │   ├── page.tsx            # Main dashboard page (SSR)
│   │   └── components/
│   │       ├── video-feed-client.tsx
│   │       ├── feed-header.tsx
│   │       └── category-filter.tsx
│   └── api/
│       └── videos/
│           ├── feed/
│           │   └── route.ts
│           ├── bookmark/
│           │   └── route.ts
│           ├── watch/
│           │   └── route.ts
│           └── [id]/
│               └── route.ts
├── components/
│   ├── dashboard/
│   │   ├── video-card.tsx
│   │   ├── video-grid.tsx
│   │   ├── video-list-item.tsx
│   │   ├── video-detail-modal.tsx
│   │   └── sidebar.tsx
│   └── ui/
│       └── ... (existing components)
└── lib/
    └── utils/
        ├── video-helpers.ts
        └── format-helpers.ts
```

## Appendix B: Data Models

See `packages/types/src/index.ts` for complete type definitions.

**Key Types:**
- `DashboardVideo`: Extended video with user-specific flags
- `VideoWithChannel`: Video joined with channel data
- `PaginatedResponse<T>`: Standard pagination wrapper

---

**End of Design Specification**
