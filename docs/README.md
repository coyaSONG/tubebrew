# TubeBrew Dashboard Design Documentation

This directory contains comprehensive design documentation for the TubeBrew dashboard implementation.

## 📚 Documentation Files

### 1. [Dashboard Design Specification](./dashboard-design.md)
**Primary design document** containing:
- Complete component specifications
- API contract definitions
- State management strategy
- UI/UX guidelines
- Performance optimization
- Accessibility requirements
- Implementation phases

**Use this for:** Understanding the overall design vision and detailed specifications

### 2. [Dashboard Architecture](./dashboard-architecture.md)
**Visual architecture diagrams** including:
- Component hierarchy (Mermaid diagrams)
- Data flow sequences
- State management flow
- API architecture
- Database relations
- Responsive layout strategy
- Technology stack

**Use this for:** Visual understanding of system architecture and relationships

### 3. [Implementation Guide](./dashboard-implementation-guide.md)
**Step-by-step implementation instructions** with:
- Phase-by-phase breakdown
- Complete code examples
- File structure organization
- Testing checklist
- Troubleshooting tips
- Performance optimization

**Use this for:** Actual implementation work and coding

---

## 🎯 Quick Start

### For Product Managers / Designers
1. Start with: **Dashboard Design Specification**
2. Review: Component layouts and user flows
3. Check: UI/UX guidelines in Section 7

### For Architects / Tech Leads
1. Start with: **Dashboard Architecture**
2. Review: Component hierarchy and data flow diagrams
3. Check: State management and API architecture

### For Developers
1. Start with: **Implementation Guide**
2. Follow: Phase-by-phase instructions
3. Refer to: Design Specification for details
4. Use: Architecture diagrams for context

---

## 📋 Implementation Phases

### Phase 1: Foundation (P0 - Day 1)
**Goal:** Basic layout and structure
- DashboardLayout component
- Header with navigation
- Sidebar with category filter
- Responsive breakpoints

**Files to create:**
```
apps/web/src/app/(dashboard)/
├── layout.tsx
└── components/
    ├── header.tsx
    └── sidebar.tsx
```

### Phase 2: API Layer (P0 - Day 1-2)
**Goal:** Backend data endpoints
- Video feed API with pagination
- Bookmark management API
- Watch history API

**Files to create:**
```
apps/web/src/app/api/videos/
├── feed/route.ts
├── bookmark/route.ts
└── watch/route.ts
```

### Phase 3: Video Display (P0 - Day 2-3)
**Goal:** Video card and grid components
- VideoCard component
- VideoGrid container
- Image optimization
- Summary display

**Files to create:**
```
apps/web/src/components/dashboard/
├── video-card.tsx
└── video-grid.tsx
```

### Phase 4: Main Page (P0 - Day 3-4)
**Goal:** Complete dashboard page
- Server component for SSR
- Client component for interactivity
- State management
- User actions (bookmark, watch)

**Files to create:**
```
apps/web/src/app/(dashboard)/
├── page.tsx
└── components/
    └── video-feed-client.tsx
```

### Phase 5: Polish (P1 - Day 4-5)
**Goal:** Enhanced UX
- Loading skeletons
- Error states
- Empty states
- Animations

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│           User Browser                      │
│  ┌─────────────────────────────────────┐   │
│  │  Dashboard Page (RSC)                │   │
│  │    ├── DashboardLayout               │   │
│  │    ├── Header                        │   │
│  │    ├── Sidebar                       │   │
│  │    └── VideoFeedClient (Client)     │   │
│  │         ├── FeedHeader               │   │
│  │         └── VideoGrid                │   │
│  │              └── VideoCard[]         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓ API Calls
┌─────────────────────────────────────────────┐
│         Next.js API Routes                  │
│  /api/videos/feed     → Video List          │
│  /api/videos/bookmark → Bookmark Toggle     │
│  /api/videos/watch    → Mark Watched        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Supabase PostgreSQL                 │
│  tables: videos, channels, summaries,       │
│          bookmarks, watch_history           │
└─────────────────────────────────────────────┘
```

---

## 🎨 Design System

### Colors
Using Tailwind CSS with CSS variables:
- `primary` - Brand color
- `secondary` - Accent color
- `background` - Page background
- `card` - Card background
- `muted` - Subtle backgrounds
- `border` - Borders

### Typography
- `h1` - `text-3xl font-bold`
- `h2` - `text-2xl font-semibold`
- `h3` - `text-xl font-semibold`
- `body` - `text-base`
- `small` - `text-sm`

### Spacing
- Card padding: `p-4` (16px)
- Section spacing: `space-y-6` (24px)
- Grid gap: `gap-4` (16px)

### Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `≥ 1024px`

---

## 🔑 Key Features

### 1. Video Feed
- Paginated video list from subscribed channels
- AI summaries at 4 different detail levels
- Category filtering
- Multiple sort options (newest, oldest, views, duration)

### 2. User Actions
- Bookmark videos for later
- Mark videos as watched
- Adjustable summary detail level
- Open on YouTube

### 3. Responsive Design
- Desktop: 3-column grid with sidebar
- Tablet: 2-column grid with collapsible sidebar
- Mobile: Single column, no sidebar

### 4. Performance
- Server-side rendering for initial load
- Pagination (20 videos per page)
- Optimistic UI updates
- Image optimization with Next.js Image

---

## 📊 Data Models

### DashboardVideo (Extended Type)
```typescript
interface DashboardVideo extends VideoWithChannel {
  isBookmarked: boolean;
  isWatched: boolean;
  userSummaryLevel: SummaryLevel;
}
```

### API Response Format
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
```

---

## 🧪 Testing Strategy

### Unit Tests
- Component rendering
- State management logic
- Utility functions

### Integration Tests
- API endpoints
- Database queries
- Auth middleware

### E2E Tests (Future)
- User flows
- Bookmark/watch actions
- Filter/sort interactions

---

## 🚀 Performance Targets

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Largest Contentful Paint:** < 2.5s
- **API Response Time:** < 500ms (p95)
- **Pagination Load:** < 300ms

---

## ♿ Accessibility

- WCAG AA compliance (4.5:1 contrast ratio)
- Keyboard navigation support
- Screen reader friendly (semantic HTML + ARIA)
- Focus indicators on all interactive elements
- Dark mode support

---

## 🔒 Security Considerations

- Row Level Security (RLS) on all Supabase tables
- Server-side auth verification for all API routes
- User ID validation before data mutations
- CSRF protection via Next.js
- Sanitized user inputs

---

## 📈 Future Enhancements

### Priority 1 (Next Iteration)
- Search functionality
- Video player integration
- Bulk actions
- Custom playlists

### Priority 2 (Later)
- Video recommendations
- Share functionality
- Analytics dashboard
- Browser notifications

### Priority 3 (Nice to Have)
- Offline support (PWA)
- Mobile app
- Chrome extension
- Transcript display

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. No real-time updates (requires manual refresh)
2. Limited to 50 videos per API call
3. No infinite scroll (manual "Load More")
4. Summaries generated asynchronously (may not be available immediately)

### Planned Improvements
1. WebSocket for real-time updates
2. Virtual scrolling for large lists
3. Infinite scroll with intersection observer
4. Loading states for pending summaries

---

## 📝 Change Log

### v1.0 (2025-11-02)
- Initial design specification
- Complete architecture diagrams
- Implementation guide with code examples
- API contract definitions
- Component specifications

---

## 🤝 Contributing

When implementing or modifying the dashboard:

1. **Read the specs first** - Understand the design before coding
2. **Follow the file structure** - Keep components organized
3. **Use TypeScript** - Leverage type definitions from `@tubebrew/types`
4. **Write tests** - Add tests for new components/APIs
5. **Update docs** - Keep documentation in sync with code

---

## 📞 Support & Questions

For questions or clarifications:
- Review the design specification first
- Check implementation guide for code examples
- Consult architecture diagrams for system understanding
- Refer to troubleshooting section in implementation guide

---

## 📚 Related Documentation

- **Project README:** `/README.md`
- **API Documentation:** (TBD)
- **Component Library:** `/apps/web/src/components/ui/`
- **Type Definitions:** `/packages/types/src/index.ts`
- **Database Schema:** (See Supabase dashboard)

---

**Last Updated:** 2025-11-02
**Version:** 1.0
**Status:** Ready for Implementation
