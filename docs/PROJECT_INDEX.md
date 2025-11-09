# TubeBrew Project Documentation Index

**Last Updated**: 2025-11-08
**Project Version**: 0.1.0 (MVP - ~70% Complete)
**Status**: Active Development

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Documentation Structure](#documentation-structure)
4. [Architecture](#architecture)
5. [Development Workflow](#development-workflow)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## Quick Start

### For New Developers
1. **Read First**: [README.md](../README.md) - Overview and current status
2. **Setup**: [SETUP_GUIDE.md](../SETUP_GUIDE.md) - Complete environment setup
3. **Product Requirements**: [TubeBrew_PRD.md](../TubeBrew_PRD.md) - Feature specifications
4. **Quick Setup**: [SETUP.md](../SETUP.md) - Known issues and workarounds

### Essential Commands
```bash
# Install dependencies
pnpm install

# Start development servers (web + worker)
pnpm dev

# Run linting
pnpm lint

# Format code
pnpm format
```

**Development URLs**:
- Web App: http://localhost:3000
- Worker API: http://localhost:3001
- Worker Stats: http://localhost:3001/stats

---

## Project Overview

### What is TubeBrew?

TubeBrew is an AI-powered YouTube video summarization and curation service that helps users efficiently manage large numbers of subscribed channels.

**Core Features**:
- ✅ Google OAuth + YouTube API authentication
- ✅ AI-based channel classification (15 categories)
- ✅ Real-time video collection (WebSub + RSS fallback)
- ✅ 4-level AI summary generation
- ✅ Background job processing (BullMQ + Redis)
- 🚧 Dashboard UI for video browsing
- 🚧 Settings and channel management

### Technology Stack

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **UI**: shadcn/ui components
- **State**: TanStack Query + Zustand
- **Deployment**: Vercel

#### Backend
- **Web API**: Next.js API Routes
- **Worker**: Fastify + BullMQ
- **Database**: Supabase (PostgreSQL)
- **Cache/Queue**: Redis (Upstash)
- **Logging**: Pino (structured JSON)

#### AI & External Services
- **LLM**: OpenRouter (Llama 3.3 70B) / OpenAI GPT-4o-mini
- **Transcription**: youtube-transcript + Whisper API
- **YouTube**: Data API v3 + WebSub (PubSubHubbub)

### Current Status
- **Completed**: Authentication, onboarding, video collection, AI summaries
- **In Progress**: Dashboard UI, video feed, settings page
- **Planned**: Search, statistics, mobile optimization

---

## Documentation Structure

### Root Documentation
| File | Purpose | Audience |
|------|---------|----------|
| [README.md](../README.md) | Project overview, setup, roadmap | All developers |
| [TubeBrew_PRD.md](../TubeBrew_PRD.md) | Product requirements, features, architecture | Product, developers |
| [SETUP_GUIDE.md](../SETUP_GUIDE.md) | Step-by-step environment setup | New developers |
| [SETUP.md](../SETUP.md) | Quick setup, known issues | All developers |

### Package Documentation
| Package | Location | Description |
|---------|----------|-------------|
| db | `packages/db/` | Database utilities, migrations |
| youtube | `packages/youtube/` | YouTube API client |
| ai | `packages/ai/` | AI services (LiteLLM) |
| types | `packages/types/` | Shared TypeScript types |

### Generated Documentation
| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/API.md` | API endpoints reference | When APIs change |
| `docs/COMPONENTS.md` | Frontend component catalog | When components added |
| `docs/DATABASE.md` | Database schema reference | When schema changes |

---

## Architecture

### System Overview

```
┌─────────────────┐
│   User Browser  │
│   (Next.js UI)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Next.js Server │◄────►│  Supabase (DB)   │
│  (API Routes)   │      │  (PostgreSQL)    │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Fastify Worker │◄────►│  Redis (Upstash) │
│  (BullMQ Jobs)  │      │  (Queue + Cache) │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   External Services              │
│  - YouTube API (subscriptions)  │
│  - YouTube WebSub (real-time)   │
│  - OpenRouter/OpenAI (AI)       │
│  - Whisper API (transcription)  │
└─────────────────────────────────┘
```

### Monorepo Structure

```
tubebrew/
├── apps/
│   ├── web/                    # Next.js application
│   │   ├── src/
│   │   │   ├── app/            # App Router (pages + API)
│   │   │   ├── components/     # React components
│   │   │   └── utils/          # Client utilities
│   │   └── middleware.ts       # Auth middleware
│   │
│   └── worker/                 # Background worker
│       ├── src/
│       │   ├── jobs/           # BullMQ job processors
│       │   ├── routes/         # Fastify routes
│       │   └── services/       # Business logic
│       └── index.ts
│
├── packages/
│   ├── db/                     # Database package
│   │   ├── migrations/         # SQL migration files
│   │   └── src/                # DB utilities
│   ├── youtube/                # YouTube integration
│   ├── ai/                     # AI services
│   └── types/                  # Shared types
│
└── docs/                       # Documentation (this folder)
```

### Data Flow

#### Video Collection Pipeline
```
YouTube Video Upload
    ↓
WebSub Push Notification (< 1 min)
    ↓
Worker receives webhook
    ↓
Add to BullMQ Queue
    ↓
Process video (parallel):
    ├─ Fetch metadata (YouTube API)
    ├─ Download transcript (youtube-transcript)
    └─ Generate summaries (AI, 4 levels)
    ↓
Save to Supabase
    ↓
User sees in dashboard
```

#### User Authentication Flow
```
User clicks "Sign in with Google"
    ↓
Redirected to Google OAuth
    ↓
User grants YouTube permissions
    ↓
Callback to /auth/callback
    ↓
Supabase creates session
    ↓
Provider token stored
    ↓
User redirected to /onboarding or /dashboard
```

---

## Development Workflow

### Starting Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd tubebrew
   pnpm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Fill in required environment variables
   ```

3. **Start Development Servers**
   ```bash
   pnpm dev
   # Web: http://localhost:3000
   # Worker: http://localhost:3001
   ```

### Making Changes

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write Code**
   - Follow TypeScript strict mode
   - Use existing component patterns
   - Add types for all functions

3. **Test Locally**
   ```bash
   pnpm lint         # Check code quality
   pnpm format       # Format with Prettier
   pnpm dev          # Manual testing
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

### Code Quality Standards

- **TypeScript**: Strict mode, no `any` without justification
- **Formatting**: Prettier (automatic on save recommended)
- **Linting**: ESLint with Next.js config
- **Naming**: See [code_style_conventions.md](../packages/db/migrations/)

---

## API Reference

### Web API Routes

#### Authentication
- `POST /api/auth/signin` - Initiate Google OAuth
- `GET /api/auth/callback` - OAuth callback handler
- `POST /api/auth/signout` - Sign out user

#### YouTube Integration
- `GET /api/youtube/subscriptions` - Get user's YouTube subscriptions
- `GET /api/youtube/channel-videos?channelId={id}` - Get recent videos from channel

#### Channel Management
- `POST /api/channels/classify` - AI-based channel classification
- `POST /api/channels/save` - Save user's selected channels

#### Video Management
- `GET /api/videos/feed` - Get user's video feed
- `POST /api/videos/bookmark` - Bookmark/unbookmark video
- `POST /api/videos/watch` - Mark video as watched

#### Settings
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update user settings

### Worker API Routes

#### Health & Monitoring
- `GET /health` - Health check
- `GET /stats` - Queue statistics

#### WebSub (YouTube Real-time Notifications)
- `GET /websub/subscribe` - WebSub subscription endpoint
- `POST /websub/callback` - WebSub notification callback

---

## Database Schema

### Core Tables

#### users
- **Purpose**: User account information
- **Key Fields**: `google_id` (unique), `email`, `name`, `youtube_channel_id`
- **RLS**: Users can only access their own data

#### channels
- **Purpose**: YouTube channel metadata
- **Key Fields**: `youtube_id` (unique), `title`, `category`, `subscriber_count`

#### user_channels
- **Purpose**: User's subscribed channels (many-to-many)
- **Key Fields**: `user_id`, `channel_id`, `custom_category`, `is_hidden`

#### videos
- **Purpose**: Video metadata
- **Key Fields**: `youtube_id` (unique), `channel_id`, `title`, `published_at`, `duration`

#### transcripts
- **Purpose**: Video transcripts/captions
- **Key Fields**: `video_id`, `source` (youtube/whisper), `content`

#### summaries
- **Purpose**: AI-generated summaries
- **Key Fields**: `video_id`, `level` (1-4), `content`, `model`

#### websub_subscriptions
- **Purpose**: YouTube WebSub subscription tracking
- **Key Fields**: `channel_id`, `topic_url`, `expires_at`, `status`

### Migration Files
Located in `packages/db/migrations/`:
1. `20251101000001_initial_schema.sql` - Initial tables and RLS
2. `20251102000001_add_provider_token.sql` - OAuth token storage
3. `20251102000002_add_websub_subscriptions.sql` - WebSub table
4. `20251102000003_add_user_settings_insert_policy.sql` - Settings RLS

---

## Deployment

### Prerequisites
- Vercel account (frontend)
- Railway/Fly.io account (worker)
- Supabase project (production)
- Upstash Redis (production)
- OpenRouter/OpenAI API key

### Environment Variables

**Frontend (Vercel)**:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_SERVICE_ROLE_KEY=
YOUTUBE_API_KEY=
OPENROUTER_API_KEY=
```

**Worker (Railway/Fly.io)**:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
YOUTUBE_API_KEY=
OPENROUTER_API_KEY=
```

### Deployment Steps

1. **Frontend (Vercel)**
   ```bash
   # Connect repository to Vercel
   # Set environment variables
   # Deploy
   ```

2. **Worker (Railway)**
   ```bash
   # Connect repository to Railway
   # Set environment variables
   # Deploy from apps/worker
   ```

3. **Database (Supabase)**
   - Run migrations manually in SQL Editor
   - Enable RLS policies
   - Configure Google OAuth provider

---

## Troubleshooting

### Common Issues

#### Worker Module Resolution Error
**Symptom**: `Cannot find module` errors in worker
**Solution**: All packages use ESM (`type: "module"`), check imports use `.js` extension

#### Supabase RLS Policy Error
**Symptom**: "Row Level Security policy violation"
**Solution**: Check that policies use `google_id` not `id` for user matching

#### Redis Connection Failed
**Symptom**: Worker can't connect to Redis
**Solution**: Verify `REDIS_URL` format: `redis://default:[password]@[host]:[port]`

#### YouTube API Quota Exceeded
**Current Strategy**: Use RSS feed (quota-free) + WebSub (real-time)
**Monitoring**: Daily quota at https://console.cloud.google.com

### Development Issues

#### React 19 Type Conflicts
**Status**: Known issue with Next.js 16
**Workaround**: Use `pnpm dev` (works), avoid `pnpm build` until Next.js 16.1+

#### Environment Variables Not Loaded
**Solution**: Worker uses `tsx --env-file=../../.env.local`, ensure file exists

---

## Contributing

### Before You Start
1. Read this index document
2. Check [README.md](../README.md) for current status
3. Review [TubeBrew_PRD.md](../TubeBrew_PRD.md) for feature specs

### Development Process
1. Create feature branch
2. Follow code style conventions
3. Test manually in development
4. Commit with descriptive messages
5. (Future) Create pull request

### Code Review Checklist
- [ ] TypeScript compiles without errors
- [ ] ESLint passes (`pnpm lint`)
- [ ] Code formatted (`pnpm format`)
- [ ] Environment variables documented
- [ ] Database migrations created if schema changed
- [ ] README updated if setup changed

---

## Additional Resources

### External Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [BullMQ](https://docs.bullmq.io/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [WebSub Specification](https://www.w3.org/TR/websub/)

### Internal Knowledge Base
Serena MCP memories (project-specific):
- `project_overview.md` - High-level project summary
- `suggested_commands.md` - Development commands
- `code_style_conventions.md` - Coding standards
- `task_completion_checklist.md` - QA checklist
- `codebase_structure.md` - Detailed file organization

---

## Document Maintenance

This index should be updated when:
- New major features are added
- Architecture changes significantly
- New documentation files are created
- API endpoints change
- Database schema is modified

**Last Updated By**: Claude (Serena MCP)
**Next Review**: When dashboard UI is completed
