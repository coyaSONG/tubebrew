# TubeBrew Frontend Components Documentation

**Version**: 0.1.0
**Framework**: Next.js 16 (App Router) + React 19
**UI Library**: shadcn/ui + Tailwind CSS 4

---

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Layout Components](#layout-components)
3. [Dashboard Components](#dashboard-components)
4. [UI Components](#ui-components)
5. [State Management](#state-management)
6. [Styling Guidelines](#styling-guidelines)
7. [Component Development Guide](#component-development-guide)

---

## Component Architecture

### Directory Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── auth/
│   │       ├── signin/page.tsx         # Sign-in page
│   │       └── error/page.tsx          # Auth error page
│   ├── (dashboard)/
│   │   ├── components/                 # Layout components
│   │   │   ├── header.tsx              # Dashboard header
│   │   │   ├── sidebar.tsx             # Category sidebar
│   │   │   ├── mobile-menu.tsx         # Mobile navigation
│   │   │   └── video-feed-client.tsx   # Client-side feed wrapper
│   │   ├── onboarding/page.tsx         # Onboarding flow
│   │   ├── settings/page.tsx           # Settings page
│   │   ├── layout.tsx                  # Dashboard layout
│   │   └── page.tsx                    # Main dashboard
│   └── layout.tsx                      # Root layout
├── components/
│   ├── ui/                             # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   └── skeleton.tsx
│   ├── dashboard/                      # Domain components
│   │   ├── video-card.tsx
│   │   ├── video-grid.tsx
│   │   └── video-card-skeleton.tsx
│   └── providers.tsx                   # React Query provider
└── lib/
    └── utils.ts                        # Component utilities
```

### Component Categories

1. **Layout Components**: Page structure and navigation
2. **Domain Components**: Business logic (videos, channels)
3. **UI Components**: Reusable primitives (buttons, cards)
4. **Provider Components**: State and context management

---

## Layout Components

### Root Layout

**File**: `src/app/layout.tsx`
**Type**: Server Component
**Purpose**: Global application layout

**Features**:
- Sets HTML lang and body classes
- Loads global styles
- Wraps app in React Query provider
- Configures Sonner toast notifications

**Usage**:
```tsx
// Automatic - wraps all pages
```

**Key Code**:
```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
```

---

### Dashboard Layout

**File**: `src/app/(dashboard)/layout.tsx`
**Type**: Server Component
**Purpose**: Dashboard page structure with sidebar and header

**Structure**:
```
┌─────────────────────────────────────┐
│          Header                     │
├──────────┬─────────────────────────┤
│          │                          │
│ Sidebar  │   Page Content          │
│          │                          │
│          │                          │
└──────────┴─────────────────────────┘
```

**Features**:
- Responsive layout (desktop: sidebar + content, mobile: full-width)
- Header with user info and navigation
- Sidebar with category filtering
- Mobile menu toggle

**Usage**:
```tsx
// Automatic - wraps all /dashboard/* pages
```

---

### Header Component

**File**: `src/app/(dashboard)/components/header.tsx`
**Type**: Server Component
**Purpose**: Dashboard top navigation

**Features**:
- Logo and app title
- Mobile menu toggle button
- User avatar and name
- Sign out button

**Props**: None (server component)

**UI Elements**:
- Logo (Coffee cup emoji)
- Title: "TubeBrew"
- User Avatar (from Google OAuth)
- Sign Out button

**Example**:
```tsx
<Header />
```

---

### Sidebar Component

**File**: `src/app/(dashboard)/components/sidebar.tsx`
**Type**: Client Component (`'use client'`)
**Purpose**: Category navigation and filtering

**Props**:
```typescript
interface SidebarProps {
  className?: string
}
```

**Features**:
- Category list with icons
- Active category highlighting
- Category count badges (future)
- Responsive visibility (hidden on mobile)

**Categories**:
```typescript
const CATEGORIES = [
  { id: 'all', name: '전체', icon: Home },
  { id: 'tech', name: '개발/기술', icon: Code },
  { id: 'music', name: '음악/엔터', icon: Music },
  // ... 15 total categories
]
```

**State**:
- Uses URL search params for active category
- Updates URL on category selection

**Example**:
```tsx
<Sidebar className="hidden lg:block" />
```

---

### Mobile Menu Component

**File**: `src/app/(dashboard)/components/mobile-menu.tsx`
**Type**: Client Component
**Purpose**: Mobile navigation drawer

**Features**:
- Slide-in menu from left
- Category selection
- Close on category select
- Overlay background

**Usage**:
```tsx
<MobileMenu />
```

---

## Dashboard Components

### Video Card

**File**: `src/components/dashboard/video-card.tsx`
**Type**: Client Component
**Purpose**: Display individual video with summary and actions

**Props**:
```typescript
interface VideoCardProps {
  video: {
    id: string
    youtubeId: string
    title: string
    description?: string
    thumbnailUrl: string
    duration: number
    publishedAt: string
    channel: {
      title: string
      category: string
    }
    summaries?: Array<{
      level: number
      content: string
    }>
    isBookmarked?: boolean
    isWatched?: boolean
  }
  onBookmark?: (videoId: string) => void
  onWatch?: (videoId: string) => void
}
```

**Features**:
- Thumbnail with play icon
- Title and channel name
- Publication time (relative)
- Duration badge
- AI summary (collapsible, 3 levels)
- Action buttons: Watch, Bookmark, Mark as Watched
- Visual indicators for watched/bookmarked state

**State**:
- `showFullSummary`: Toggle between level 1/2 and level 3
- `isBookmarked`: Local bookmark state
- `isWatched`: Local watched state

**Methods**:
```typescript
const cycleSummaryLevel = () => {
  // Toggles between summary levels
}

const handleBookmark = async () => {
  // Calls API to bookmark video
}

const handleWatch = async () => {
  // Calls API to mark as watched
}
```

**Styling**:
- Card with hover effect
- Responsive layout
- Smooth transitions
- Badge variants for different states

**Example**:
```tsx
<VideoCard
  video={video}
  onBookmark={handleBookmark}
  onWatch={handleWatch}
/>
```

**Summary Levels**:
1. **Level 1**: One-line summary (~20 characters)
2. **Level 2**: Three-line summary (~150 characters)
3. **Level 3**: Chapter breakdown with timestamps

---

### Video Grid

**File**: `src/components/dashboard/video-grid.tsx`
**Type**: Client Component
**Purpose**: Grid layout for video cards

**Props**:
```typescript
interface VideoGridProps {
  videos: Video[]
  isLoading?: boolean
}
```

**Features**:
- Responsive grid (1-3 columns)
- Loading skeletons
- Empty state message
- Automatic layout adjustments

**Grid Breakpoints**:
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns

**Example**:
```tsx
<VideoGrid videos={videos} isLoading={loading} />
```

---

### Video Card Skeleton

**File**: `src/components/dashboard/video-card-skeleton.tsx`
**Type**: Client Component
**Purpose**: Loading placeholder for video cards

**Features**:
- Mimics video card structure
- Animated shimmer effect
- Matches card dimensions

**Example**:
```tsx
{isLoading && (
  <>
    <VideoCardSkeleton />
    <VideoCardSkeleton />
    <VideoCardSkeleton />
  </>
)}
```

---

### Video Feed Client

**File**: `src/app/(dashboard)/components/video-feed-client.tsx`
**Type**: Client Component
**Purpose**: Client-side video feed with TanStack Query

**Features**:
- Fetches videos from API
- Infinite scroll (future)
- Category filtering
- Loading states
- Error handling

**Query**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['videos', category],
  queryFn: () => fetch(`/api/videos/feed?category=${category}`)
})
```

**Example**:
```tsx
<VideoFeedClient category={selectedCategory} />
```

---

## UI Components

All UI components are from shadcn/ui library with Tailwind CSS.

### Button

**File**: `src/components/ui/button.tsx`
**Purpose**: Reusable button component

**Variants**:
- `default`: Primary button
- `secondary`: Secondary style
- `outline`: Outlined button
- `ghost`: Transparent button
- `link`: Link-styled button

**Sizes**:
- `sm`: Small button
- `md`: Default size
- `lg`: Large button
- `icon`: Square icon button

**Example**:
```tsx
<Button variant="default" size="md">
  Click Me
</Button>

<Button variant="outline" size="icon">
  <Icon />
</Button>
```

---

### Card

**File**: `src/components/ui/card.tsx`
**Purpose**: Container component

**Sub-components**:
- `Card`: Main container
- `CardHeader`: Header section
- `CardTitle`: Title text
- `CardDescription`: Description text
- `CardContent`: Main content
- `CardFooter`: Footer section

**Example**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

### Badge

**File**: `src/components/ui/badge.tsx`
**Purpose**: Status or category tags

**Variants**:
- `default`: Primary badge
- `secondary`: Secondary style
- `outline`: Outlined badge
- `destructive`: Error/warning badge

**Example**:
```tsx
<Badge variant="default">New</Badge>
<Badge variant="secondary">Tech</Badge>
```

---

### Avatar

**File**: `src/components/ui/avatar.tsx`
**Purpose**: User profile images

**Sub-components**:
- `Avatar`: Container
- `AvatarImage`: Image element
- `AvatarFallback`: Fallback text/icon

**Example**:
```tsx
<Avatar>
  <AvatarImage src={user.avatarUrl} alt={user.name} />
  <AvatarFallback>{user.name[0]}</AvatarFallback>
</Avatar>
```

---

### Skeleton

**File**: `src/components/ui/skeleton.tsx`
**Purpose**: Loading placeholders

**Example**:
```tsx
<Skeleton className="h-4 w-full" />
<Skeleton className="h-20 w-20 rounded-full" />
```

---

## State Management

### React Query (TanStack Query)

**Provider**: `src/components/providers.tsx`
**Purpose**: Server state management

**Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
})
```

**Usage**:
```tsx
// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['videos'],
  queryFn: fetchVideos,
})

// Mutate data
const mutation = useMutation({
  mutationFn: bookmarkVideo,
  onSuccess: () => {
    queryClient.invalidateQueries(['videos'])
  },
})
```

---

### URL State (Search Params)

**Purpose**: Category and filter state
**Method**: Next.js `useSearchParams` and `useRouter`

**Example**:
```tsx
const searchParams = useSearchParams()
const router = useRouter()

const category = searchParams.get('category') || 'all'

const setCategory = (newCategory: string) => {
  const params = new URLSearchParams(searchParams)
  params.set('category', newCategory)
  router.push(`?${params.toString()}`)
}
```

---

### Future: Zustand

**Purpose**: Client-side UI state (not yet implemented)
**Use Cases**: Sidebar open/close, theme, user preferences

---

## Styling Guidelines

### Tailwind CSS Conventions

**Spacing**:
- Use consistent spacing scale: `p-4`, `gap-4`, `space-y-4`
- Prefer `gap` over margin for flex/grid layouts

**Colors**:
- Use semantic colors from Tailwind config
- Primary: `bg-primary`, `text-primary`
- Secondary: `bg-secondary`, `text-secondary-foreground`
- Muted: `bg-muted`, `text-muted-foreground`

**Responsive Design**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Dark Mode** (future):
```tsx
<div className="bg-white dark:bg-gray-900">
```

---

### Component Styling Patterns

**Card Hover**:
```tsx
className="transition-all hover:shadow-lg hover:scale-[1.02]"
```

**Button Loading**:
```tsx
<Button disabled={isLoading}>
  {isLoading ? <Spinner /> : 'Submit'}
</Button>
```

**Conditional Classes**:
```tsx
className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes"
)}
```

---

## Component Development Guide

### Creating a New Component

1. **Choose Location**:
   - UI primitives → `src/components/ui/`
   - Domain logic → `src/components/dashboard/` or `src/components/[feature]/`
   - Page-specific → `src/app/[route]/components/`

2. **Create File**:
   ```bash
   # UI component
   touch src/components/ui/my-component.tsx

   # Domain component
   touch src/components/dashboard/my-feature.tsx
   ```

3. **Component Template**:
   ```tsx
   'use client' // Only if needed (state, events, effects)

   import { cn } from '@/lib/utils'

   interface MyComponentProps {
     title: string
     className?: string
   }

   export function MyComponent({ title, className }: MyComponentProps) {
     return (
       <div className={cn("base-styles", className)}>
         <h2>{title}</h2>
       </div>
     )
   }
   ```

4. **Export from Index** (if creating UI component):
   ```tsx
   // src/components/ui/index.ts
   export * from './my-component'
   ```

---

### Server vs Client Components

**Use Server Components** (default):
- Static content
- Data fetching
- SEO-critical pages
- No interactivity needed

**Use Client Components** (`'use client'`):
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Browser APIs (localStorage, window)
- Third-party libraries with DOM access

**Example**:
```tsx
// Server Component (default)
export default function Page() {
  return <StaticContent />
}

// Client Component
'use client'
export function InteractiveWidget() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

---

### Testing Components

**Manual Testing**:
1. Start dev server: `pnpm dev`
2. Navigate to component page
3. Test interactions and states
4. Check responsive behavior
5. Verify accessibility (keyboard navigation)

**Future: Automated Testing**:
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright

---

### Accessibility Guidelines

**Semantic HTML**:
```tsx
// Good
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Bad
<div onClick={navigate}>Home</div>
```

**ARIA Labels**:
```tsx
<button aria-label="Close menu">
  <X />
</button>
```

**Keyboard Navigation**:
- All interactive elements must be keyboard-accessible
- Use proper focus styles
- Support Tab, Enter, Escape keys

**Color Contrast**:
- Ensure 4.5:1 contrast ratio for text
- Test with browser DevTools

---

## Component Checklist

When creating or modifying components:

- [ ] TypeScript types defined for props
- [ ] Proper server/client component designation
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessible (semantic HTML, ARIA labels)
- [ ] Follows naming conventions
- [ ] Uses Tailwind CSS classes
- [ ] Handles loading and error states
- [ ] Optimized for performance (memoization if needed)
- [ ] Documented in this file (for new components)

---

## Future Enhancements

### Planned Components

1. **Search Bar** (Phase 2)
   - Full-text search
   - Filter by category, date
   - Autocomplete suggestions

2. **Statistics Dashboard** (Phase 2)
   - Weekly summary charts
   - Category distribution
   - Watch time analytics

3. **Notification Center** (Phase 2)
   - New video alerts
   - Weekly digest preview
   - Notification preferences

4. **Dark Mode Toggle** (Phase 2)
   - Theme switcher
   - Persistent preference
   - System preference detection

---

## Changelog

### Version 0.1.0 (2025-11-08)
- Initial component documentation
- Core dashboard components implemented
- shadcn/ui integration complete

---

**Maintained By**: TubeBrew Development Team
**Last Updated**: 2025-11-08
