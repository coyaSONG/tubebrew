# TubeBrew Dashboard Architecture

## Component Architecture Diagram

```mermaid
graph TD
    A[DashboardPage - RSC] --> B[DashboardLayout]
    B --> C[Header]
    B --> D[Sidebar]
    B --> E[VideoFeedClient]

    C --> C1[Logo]
    C --> C2[Navigation]
    C --> C3[UserMenu]

    D --> D1[CategoryFilter]
    D --> D2[ChannelList]
    D --> D3[QuickActions]

    E --> E1[FeedHeader]
    E --> E2[VideoGrid/VideoList]
    E --> E3[LoadMoreButton]

    E1 --> E1A[ViewToggle]
    E1 --> E1B[SortSelector]
    E1 --> E1C[SummaryLevelSelector]

    E2 --> E2A[VideoCard]
    E2 --> E2B[VideoListItem]

    E2A --> E2A1[Thumbnail]
    E2A --> E2A2[VideoInfo]
    E2A --> E2A3[SummaryPreview]
    E2A --> E2A4[ActionButtons]

    style A fill:#e1f5ff
    style B fill:#fff4e6
    style E fill:#f0f9ff
    style E2A fill:#fef3c7
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant RSC as Server Component
    participant API as API Routes
    participant DB as Database

    User->>Browser: Navigate to /dashboard
    Browser->>RSC: Request Page
    RSC->>DB: Fetch User Settings
    RSC->>DB: Fetch Initial Videos
    DB-->>RSC: Return Data
    RSC-->>Browser: Render HTML + Initial State
    Browser->>User: Display Dashboard

    User->>Browser: Click Filter/Sort
    Browser->>API: GET /api/videos/feed?category=tech
    API->>DB: Query Filtered Videos
    DB-->>API: Return Videos
    API-->>Browser: JSON Response
    Browser->>User: Update Video List

    User->>Browser: Click Bookmark
    Browser->>Browser: Optimistic Update UI
    Browser->>API: POST /api/videos/bookmark
    API->>DB: Insert Bookmark
    DB-->>API: Success
    API-->>Browser: Confirmation
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Loading: Initial Load
    Loading --> Displaying: Data Fetched

    Displaying --> Filtering: User Filters
    Filtering --> Loading: Fetch New Data

    Displaying --> Sorting: User Sorts
    Sorting --> Loading: Fetch Sorted Data

    Displaying --> BookmarkAction: User Bookmarks
    BookmarkAction --> OptimisticUpdate: UI Update
    OptimisticUpdate --> APICall: Background Save
    APICall --> Displaying: Success
    APICall --> ErrorState: Failure

    ErrorState --> Displaying: Retry Success
    ErrorState --> [*]: Give Up

    Displaying --> LoadMore: Scroll to Bottom
    LoadMore --> Loading: Fetch Next Page
```

## API Architecture

```mermaid
graph LR
    A[Client] --> B{API Gateway}
    B --> C[/api/videos/feed]
    B --> D[/api/videos/bookmark]
    B --> E[/api/videos/watch]
    B --> F[/api/videos/:id]

    C --> G[DBUtils.getRecentVideos]
    D --> H[DBUtils.addBookmark]
    D --> I[DBUtils.removeBookmark]
    E --> J[DBUtils.markAsWatched]
    F --> K[DBUtils.getVideoWithSummaries]

    G --> L[(Supabase)]
    H --> L
    I --> L
    J --> L
    K --> L

    style B fill:#e0f2fe
    style L fill:#dcfce7
```

## Responsive Layout Flow

```mermaid
graph TD
    A[Screen Size Detection] --> B{Width >= 1024px?}
    B -->|Yes| C[Desktop Layout]
    B -->|No| D{Width >= 768px?}
    D -->|Yes| E[Tablet Layout]
    D -->|No| F[Mobile Layout]

    C --> C1[3-Column Grid]
    C --> C2[Persistent Sidebar]
    C --> C3[Full Header]

    E --> E1[2-Column Grid]
    E --> E2[Collapsible Sidebar]
    E --> E3[Compact Header]

    F --> F1[Single Column]
    F --> F2[No Sidebar]
    F --> F3[Hamburger Menu]

    style C fill:#dcfce7
    style E fill:#fef3c7
    style F fill:#fee2e2
```

## Database Schema Relations

```mermaid
erDiagram
    USERS ||--o{ USER_CHANNELS : subscribes
    USERS ||--o{ BOOKMARKS : creates
    USERS ||--o{ WATCH_HISTORY : tracks
    USERS ||--|| USER_SETTINGS : has

    CHANNELS ||--o{ USER_CHANNELS : included_in
    CHANNELS ||--o{ VIDEOS : contains

    VIDEOS ||--o{ SUMMARIES : has
    VIDEOS ||--o{ TRANSCRIPTS : has
    VIDEOS ||--o{ BOOKMARKS : referenced_by
    VIDEOS ||--o{ WATCH_HISTORY : logged_in

    USERS {
        uuid id PK
        string google_id
        string email
        string name
        string avatar_url
        string provider_token
    }

    CHANNELS {
        uuid id PK
        string youtube_id
        string title
        string category
        string thumbnail_url
    }

    VIDEOS {
        uuid id PK
        string youtube_id
        uuid channel_id FK
        string title
        integer duration
        timestamp published_at
    }

    SUMMARIES {
        uuid id PK
        uuid video_id FK
        integer level
        text content
    }

    BOOKMARKS {
        uuid user_id FK
        uuid video_id FK
        integer priority
        timestamp created_at
    }
```

## Component Props Flow

```mermaid
graph TD
    A[DashboardPage Props] --> B[initialVideos]
    A --> C[userSettings]

    B --> D[VideoFeedClient]
    C --> D

    D --> E[videos: DashboardVideo[]]
    D --> F[filters: FilterState]
    D --> G[preferences: UserPreferences]

    E --> H[VideoCard]
    F --> I[FeedHeader]
    G --> I

    H --> H1[video: DashboardVideo]
    H --> H2[onBookmark: Function]
    H --> H3[onWatch: Function]
    H --> H4[summaryLevel: SummaryLevel]

    I --> I1[sortBy: string]
    I --> I2[viewMode: string]
    I --> I3[summaryLevel: number]

    style A fill:#dbeafe
    style D fill:#fef3c7
    style H fill:#dcfce7
```

## User Interaction Flow

```mermaid
journey
    title User Dashboard Experience
    section Initial Load
      Navigate to dashboard: 5: User
      Authenticate: 3: System
      Fetch user settings: 3: System
      Load initial videos: 4: System
      Display dashboard: 5: User
    section Browsing
      Scroll through videos: 5: User
      Read AI summaries: 5: User
      Filter by category: 4: User
      Change summary level: 4: User
    section Interaction
      Bookmark interesting video: 5: User
      Mark video as watched: 4: User
      Open video details: 5: User
      Watch on YouTube: 5: User
    section Load More
      Scroll to bottom: 3: User
      Load next page: 4: System
      Continue browsing: 5: User
```

## Error Handling Flow

```mermaid
graph TD
    A[User Action] --> B{Action Type}
    B -->|Page Load| C[Fetch Initial Data]
    B -->|Filter/Sort| D[Fetch Filtered Data]
    B -->|Bookmark/Watch| E[Mutate Data]

    C --> F{Success?}
    D --> F
    E --> G{Success?}

    F -->|Yes| H[Display Data]
    F -->|No| I{Error Type}

    I -->|Network| J[Show Network Error]
    I -->|Auth| K[Redirect to Login]
    I -->|Server| L[Show Error Toast]

    J --> M[Retry Button]
    M --> C

    G -->|Yes| N[Optimistic Update]
    G -->|No| O[Rollback + Toast]

    N --> H
    O --> H

    style F fill:#dcfce7
    style G fill:#dcfce7
    style I fill:#fee2e2
```

## Performance Optimization Strategy

```mermaid
mindmap
  root((Performance))
    Initial Load
      SSR First Paint
      Critical CSS Inline
      Font Preloading
      Image Optimization
    Runtime
      Virtual Scrolling
      Lazy Loading
      Debounced Filters
      Optimistic Updates
    Caching
      SWR Strategy
      Browser Cache
      Client State
      Stale While Revalidate
    Code Splitting
      Route Based
      Component Based
      Dynamic Imports
      Lazy Components
```

---

## Implementation Priority Matrix

| Component | Priority | Complexity | Dependencies |
|-----------|----------|------------|--------------|
| DashboardLayout | P0 | Low | None |
| Header | P0 | Low | UserMenu |
| VideoCard | P0 | Medium | None |
| VideoFeedClient | P0 | High | VideoCard, API |
| API /videos/feed | P0 | Medium | DBUtils |
| CategoryFilter | P1 | Low | None |
| FeedHeader | P1 | Medium | None |
| VideoDetailModal | P1 | Medium | VideoCard |
| API /videos/bookmark | P1 | Low | DBUtils |
| API /videos/watch | P1 | Low | DBUtils |
| Sidebar | P2 | Medium | CategoryFilter |
| LoadMore/Pagination | P2 | Medium | VideoFeedClient |

---

## Technology Stack

```
Frontend:
├── Framework: Next.js 15 (App Router)
├── UI: React 19
├── Styling: Tailwind CSS
├── Components: Radix UI primitives
├── State: React useState, useOptimistic
└── Type Safety: TypeScript

Backend:
├── API: Next.js API Routes
├── Database: Supabase (PostgreSQL)
├── ORM: Supabase Client
├── Auth: Supabase Auth
└── Utilities: @tubebrew/db

Infrastructure:
├── Hosting: Vercel
├── CDN: Vercel Edge Network
├── Database: Supabase Cloud
└── Monitoring: (TBD - Sentry?)
```
